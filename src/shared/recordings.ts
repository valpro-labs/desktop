import type { AppEventSeverity, AppEventType } from './app-events';

export const RECORDINGS_STORAGE_KEY = 'valpro-labs.recordings';
export const RECORDINGS_CHANGE_EVENT = 'valpro-labs:recordings-change';

export type RecordingStatus = 'starting' | 'recording' | 'stopping' | 'saved' | 'failed';

export interface RecordingTimelineEvent {
  id: string;
  type: AppEventType;
  title: string;
  timestamp: string;
  offsetMs: number;
  severity: AppEventSeverity;
  payload?: unknown;
}

export interface RecordingEntry {
  id: string;
  title: string;
  game: 'VALORANT';
  status: RecordingStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  streamId?: number;
  url?: string;
  filePath?: string;
  stopReason?: string;
  error?: string;
  events?: RecordingTimelineEvent[];
}

const MAX_RECORDINGS = 50;
const MAX_TIMELINE_EVENTS_PER_RECORDING = 500;

export function loadRecordings(): RecordingEntry[] {
  try {
    const raw = window.localStorage.getItem(RECORDINGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecordingEntry).sort(sortNewestFirst);
  } catch {
    return [];
  }
}

export function saveRecordings(recordings: RecordingEntry[]) {
  const normalized = recordings.filter(isRecordingEntry).sort(sortNewestFirst).slice(0, MAX_RECORDINGS);
  window.localStorage.setItem(RECORDINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(RECORDINGS_CHANGE_EVENT));
}

export function upsertRecording(entry: RecordingEntry) {
  const current = loadRecordings();
  const next = [entry, ...current.filter((recording) => recording.id !== entry.id)];
  saveRecordings(next);
}

export function updateRecording(id: string, patch: Partial<RecordingEntry>) {
  const current = loadRecordings();
  const existing = current.find((recording) => recording.id === id);
  if (!existing) {
    return;
  }

  upsertRecording({ ...existing, ...patch, id });
}

export function appendRecordingTimelineEvent(
  recordingId: string,
  event: Omit<RecordingTimelineEvent, 'id' | 'timestamp'> &
    Partial<Pick<RecordingTimelineEvent, 'id' | 'timestamp'>>
) {
  const current = loadRecordings();
  const existing = current.find((recording) => recording.id === recordingId);
  if (!existing) {
    return;
  }

  const timelineEvent: RecordingTimelineEvent = {
    ...event,
    id: event.id ?? createRecordingTimelineEventId(event.type),
    timestamp: event.timestamp ?? new Date().toISOString(),
    offsetMs: Math.max(0, Math.round(event.offsetMs))
  };
  const events = [...(existing.events ?? []), timelineEvent]
    .sort((a, b) => a.offsetMs - b.offsetMs)
    .slice(-MAX_TIMELINE_EVENTS_PER_RECORDING);

  upsertRecording({ ...existing, events });
}

export function createRecordingId() {
  return `valorant-${Date.now()}`;
}

export function subscribeRecordings(listener: (recordings: RecordingEntry[]) => void) {
  const handleChange = () => {
    listener(loadRecordings());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECORDINGS_STORAGE_KEY) {
      handleChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(RECORDINGS_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(RECORDINGS_CHANGE_EVENT, handleChange);
  };
}

function isRecordingEntry(value: unknown): value is RecordingEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const recording = value as RecordingEntry;
  return typeof recording.id === 'string' && typeof recording.startedAt === 'string';
}

function sortNewestFirst(a: RecordingEntry, b: RecordingEntry) {
  return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
}

function createRecordingTimelineEventId(type: AppEventType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
