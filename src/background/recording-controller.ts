import { createRecordingSettings } from '@/background/recording-settings';
import type { AppEventSeverity, AppEventType } from '@/shared/app-events';
import { publishAppEvent } from '@/shared/app-events';
import {
  appendRecordingTimelineEvent,
  createRecordingId,
  updateRecording,
  upsertRecording
} from '@/shared/recordings';

let activeStreamId: number | null = null;
let isStartingRecording = false;
let isStoppingRecording = false;
let currentRecordingId: string | null = null;
let currentRecordingStartedAtMs: number | null = null;

export function bindStreamingEvents() {
  overwolf.streaming.onStartStreaming.addListener((event) => {
    console.info('Recording started', event);
  });

  overwolf.streaming.onStopStreaming.addListener((event) => {
    console.info('Recording stopped', event);
    if (!isStoppingRecording) {
      activeStreamId = null;
    }
  });

  overwolf.streaming.onStreamingError.addListener((event) => {
    console.error('Recording error', event);
    activeStreamId = null;
    isStartingRecording = false;
    isStoppingRecording = false;
  });

  overwolf.streaming.onStreamingWarning.addListener((event) => {
    console.warn('Recording warning', event);
  });
}

export function startValorantRecording(reason: string, shouldKeepRecording: () => boolean) {
  if (activeStreamId !== null || isStartingRecording) {
    return;
  }

  currentRecordingId = createRecordingId();
  currentRecordingStartedAtMs = Date.now();
  const startedAt = new Date(currentRecordingStartedAtMs).toISOString();
  isStartingRecording = true;
  console.info('Starting VALORANT match recording', { reason });
  upsertRecording({
    id: currentRecordingId,
    title: 'VALORANT Match',
    game: 'VALORANT',
    status: 'starting',
    startedAt,
    events: [
      {
        id: `recording.timeline-start-${currentRecordingStartedAtMs}`,
        type: 'recording.starting',
        title: 'Recording requested',
        timestamp: startedAt,
        offsetMs: 0,
        severity: 'info',
        payload: { reason }
      }
    ]
  });
  publishAppEvent({
    type: 'recording.starting',
    title: 'Starting recording',
    source: 'background',
    severity: 'info',
    recordingId: currentRecordingId,
    game: 'VALORANT',
    payload: { reason }
  });

  overwolf.streaming.start(createRecordingSettings(), (result) => {
    isStartingRecording = false;

    if (!result.success || typeof result.stream_id !== 'number') {
      console.error('Unable to start VALORANT recording', result);
      markCurrentRecordingFailed(result.error || 'Unable to start recording');
      return;
    }

    activeStreamId = result.stream_id;
    updateCurrentRecording({
      status: 'recording',
      streamId: activeStreamId
    });
    appendCurrentRecordingTimelineEvent({
      type: 'recording.started',
      title: 'Recording started',
      severity: 'success',
      payload: { streamId: activeStreamId }
    });
    publishAppEvent({
      type: 'recording.started',
      title: 'Recording started',
      source: 'background',
      severity: 'success',
      recordingId: currentRecordingId ?? undefined,
      game: 'VALORANT',
      payload: { streamId: activeStreamId }
    });
    console.info('VALORANT recording stream ready', { streamId: activeStreamId });

    if (!shouldKeepRecording()) {
      stopValorantRecording('VALORANT match ended before recording startup completed');
    }
  });
}

export function stopValorantRecording(reason: string) {
  if (activeStreamId === null || isStoppingRecording) {
    return;
  }

  const streamId = activeStreamId;
  activeStreamId = null;
  isStoppingRecording = true;
  console.info('Stopping VALORANT recording', { streamId, reason });
  updateCurrentRecording({
    status: 'stopping',
    stopReason: reason
  });
  appendCurrentRecordingTimelineEvent({
    type: 'recording.stopping',
    title: 'Recording stopping',
    severity: 'info',
    payload: { streamId, reason }
  });
  publishAppEvent({
    type: 'recording.stopping',
    title: 'Stopping recording',
    source: 'background',
    severity: 'info',
    recordingId: currentRecordingId ?? undefined,
    game: 'VALORANT',
    payload: { streamId, reason }
  });

  overwolf.streaming.stop(streamId, (result) => {
    isStoppingRecording = false;

    if (result && !result.success) {
      console.error('Unable to stop VALORANT recording', result);
      markCurrentRecordingFailed(result.error || 'Unable to stop recording');
      return;
    }

    const stopResult = getStopStreamingResult(result);

    updateCurrentRecording({
      status: 'saved',
      endedAt: new Date().toISOString(),
      durationMs: stopResult?.duration,
      streamId: result?.stream_id ?? streamId,
      url: stopResult?.url,
      filePath: stopResult?.file_path,
      stopReason: reason
    });
    appendCurrentRecordingTimelineEvent({
      type: 'recording.saved',
      title: 'Recording saved',
      severity: 'success',
      payload: {
        streamId: result?.stream_id ?? streamId,
        url: stopResult?.url,
        filePath: stopResult?.file_path,
        durationMs: stopResult?.duration,
        reason
      }
    });
    publishAppEvent({
      type: 'recording.saved',
      title: 'Recording saved',
      source: 'background',
      severity: 'success',
      recordingId: currentRecordingId ?? undefined,
      game: 'VALORANT',
      payload: {
        streamId: result?.stream_id ?? streamId,
        url: stopResult?.url,
        filePath: stopResult?.file_path,
        durationMs: stopResult?.duration,
        reason
      }
    });
    currentRecordingId = null;
    currentRecordingStartedAtMs = null;
    console.info('VALORANT recording saved', result);
  });
}

export function appendCurrentRecordingTimelineEvent({
  type,
  title,
  severity,
  payload
}: {
  type: AppEventType;
  title: string;
  severity: AppEventSeverity;
  payload?: unknown;
}) {
  if (!currentRecordingId || currentRecordingStartedAtMs === null) {
    return;
  }

  appendRecordingTimelineEvent(currentRecordingId, {
    type,
    title,
    severity,
    payload,
    offsetMs: Date.now() - currentRecordingStartedAtMs
  });
}

function getStopStreamingResult(
  result: overwolf.streaming.StreamResult | overwolf.streaming.StopStreamingResult | undefined
) {
  if (result && 'file_path' in result) {
    return result;
  }

  return undefined;
}

function updateCurrentRecording(patch: Parameters<typeof updateRecording>[1]) {
  if (!currentRecordingId) {
    return;
  }

  updateRecording(currentRecordingId, patch);
}

function markCurrentRecordingFailed(error: string) {
  const recordingId = currentRecordingId;
  appendCurrentRecordingTimelineEvent({
    type: 'recording.failed',
    title: 'Recording failed',
    severity: 'error',
    payload: { error }
  });
  updateCurrentRecording({
    status: 'failed',
    endedAt: new Date().toISOString(),
    error
  });
  publishAppEvent({
    type: 'recording.failed',
    title: 'Recording failed',
    source: 'background',
    severity: 'error',
    recordingId: recordingId ?? undefined,
    game: 'VALORANT',
    payload: { error }
  });
  currentRecordingId = null;
  currentRecordingStartedAtMs = null;
}
