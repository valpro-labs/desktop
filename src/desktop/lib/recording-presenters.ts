import { formatDateTime, formatDuration } from '@/desktop/lib/format';

import type { RecordingEntry } from '@/shared/recordings';

export function getRecordingStatusLabel(status: RecordingEntry['status']) {
  const labels: Record<RecordingEntry['status'], string> = {
    starting: 'Starting',
    recording: 'Recording',
    stopping: 'Saving',
    saved: 'Saved',
    failed: 'Failed'
  };
  return labels[status];
}

export function getRecordingSummary(recording: RecordingEntry) {
  const endedAt = recording.endedAt ? `Ended ${formatDateTime(recording.endedAt)}` : 'In progress';
  return `${formatDateTime(recording.startedAt)} - ${endedAt} - ${formatDuration(recording.durationMs)}`;
}

export function openRecording(recording: RecordingEntry) {
  const target = recording.url ?? recording.filePath;
  if (target) {
    window.open(target, '_blank');
  }
}
