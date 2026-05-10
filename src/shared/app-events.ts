export const APP_EVENTS_STORAGE_KEY = "valpro-labs.app-events";
export const APP_EVENTS_CHANGE_EVENT = "valpro-labs:app-events-change";

export type AppEventSeverity = "info" | "success" | "warning" | "error";

export type AppEventType =
  | "game.detection"
  | "recording.starting"
  | "recording.started"
  | "recording.stopping"
  | "recording.saved"
  | "recording.failed"
  | "valorant.detected"
  | "valorant.closed"
  | "valorant.events.registered"
  | "valorant.events.failed"
  | "valorant.game-event"
  | "valorant.info-update"
  | "valorant.match.started"
  | "valorant.match.ended";

export interface AppEvent {
  id: string;
  type: AppEventType;
  title: string;
  timestamp: string;
  source: "background" | "desktop";
  severity: AppEventSeverity;
  recordingId?: string;
  game?: "VALORANT";
  payload?: unknown;
}

const MAX_APP_EVENTS = 200;
const CHANNEL_NAME = "valpro-labs-events";

let broadcastChannel: BroadcastChannel | null = null;

export function loadAppEvents(): AppEvent[] {
  try {
    const raw = window.localStorage.getItem(APP_EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isAppEvent).sort(sortNewestFirst);
  } catch {
    return [];
  }
}

export function publishAppEvent(input: Omit<AppEvent, "id" | "timestamp"> & Partial<Pick<AppEvent, "id" | "timestamp">>) {
  const event: AppEvent = {
    ...input,
    id: input.id ?? createAppEventId(input.type),
    timestamp: input.timestamp ?? new Date().toISOString()
  };

  const next = [event, ...loadAppEvents()].slice(0, MAX_APP_EVENTS);
  window.localStorage.setItem(APP_EVENTS_STORAGE_KEY, JSON.stringify(next));
  notifyAppEventSubscribers(event);
  return event;
}

export function subscribeAppEvents(listener: (events: AppEvent[]) => void) {
  const handleChange = () => {
    listener(loadAppEvents());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === APP_EVENTS_STORAGE_KEY) {
      handleChange();
    }
  };

  const handleWindowEvent = () => {
    handleChange();
  };

  const channel = getBroadcastChannel();
  const handleMessage = () => {
    handleChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(APP_EVENTS_CHANGE_EVENT, handleWindowEvent);
  channel?.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(APP_EVENTS_CHANGE_EVENT, handleWindowEvent);
    channel?.removeEventListener("message", handleMessage);
  };
}

function notifyAppEventSubscribers(event: AppEvent) {
  window.dispatchEvent(new CustomEvent(APP_EVENTS_CHANGE_EVENT, { detail: event }));
  getBroadcastChannel()?.postMessage(event);
}

function getBroadcastChannel() {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  broadcastChannel ??= new BroadcastChannel(CHANNEL_NAME);
  return broadcastChannel;
}

function createAppEventId(type: AppEventType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAppEvent(value: unknown): value is AppEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as AppEvent;
  return typeof event.id === "string" && typeof event.type === "string" && typeof event.timestamp === "string";
}

function sortNewestFirst(a: AppEvent, b: AppEvent) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}
