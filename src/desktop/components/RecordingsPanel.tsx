import * as React from "react";
import { Button, Text } from "@valpro-labs/ui";

import type { RecordingEntry } from "../../shared/recordings";
import { formatDateTime, formatDuration } from "../lib/format";
import { getRecordingStatusLabel, getRecordingSummary, openRecording } from "../lib/recording-presenters";

export function RecordingsPanel({
  recordings,
  selectedRecordingId,
  onRefresh,
  onSelectRecording
}: {
  recordings: RecordingEntry[];
  selectedRecordingId: string | null;
  onRefresh: () => void;
  onSelectRecording: (id: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const selectedRecording =
    recordings.find((recording) => recording.id === selectedRecordingId) ?? recordings[0] ?? null;
  const activeRecording = recordings.find((recording) =>
    ["starting", "recording", "stopping"].includes(recording.status)
  );
  const timelineEvents = selectedRecording?.events ?? [];

  const seekToTimelineEvent = React.useCallback((offsetMs: number) => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime = Math.max(0, offsetMs / 1000);
  }, []);

  return (
    <section className="recordings-panel" aria-label="Match recordings">
      <div className="panel-header">
        <div>
          <Text className="eyebrow">VALORANT</Text>
          <Text variant="h4">Recordings</Text>
        </div>
        <Button variant="ghost" size="sm" onPress={onRefresh}>
          <Text>Refresh</Text>
        </Button>
      </div>

      <div className={`recording-state ${activeRecording ? "is-live" : ""}`}>
        <span className="recording-dot" />
        <div>
          <Text className="text-sm font-semibold">
            {activeRecording ? getRecordingStatusLabel(activeRecording.status) : "Ready for next match"}
          </Text>
          <Text className="text-muted-foreground text-xs">
            {activeRecording ? "Recording will save after match end" : `${recordings.length} saved recordings`}
          </Text>
        </div>
      </div>

      {selectedRecording ? (
        <div className="recording-detail">
          {selectedRecording.url ? (
            <video ref={videoRef} className="recording-player" src={selectedRecording.url} controls />
          ) : (
            <div className="recording-preview-empty">
              <Text className="text-sm font-semibold">{getRecordingStatusLabel(selectedRecording.status)}</Text>
              <Text className="text-muted-foreground text-xs">
                {selectedRecording.filePath || "Preview appears when Overwolf returns a playable URL"}
              </Text>
            </div>
          )}
          <div className="recording-detail-meta">
            <Text className="text-sm font-semibold">{selectedRecording.title}</Text>
            <Text className="text-muted-foreground text-xs">{getRecordingSummary(selectedRecording)}</Text>
          </div>
          {(selectedRecording.url || selectedRecording.filePath) && (
            <Button variant="outline" size="sm" onPress={() => openRecording(selectedRecording)}>
              <Text>Open</Text>
            </Button>
          )}
          <div className="recording-timeline">
            <div className="recording-timeline-header">
              <Text className="text-sm font-semibold">Timeline</Text>
              <Text className="text-muted-foreground text-xs">{timelineEvents.length} events</Text>
            </div>
            {timelineEvents.length === 0 ? (
              <div className="recording-timeline-empty">
                <Text className="text-muted-foreground text-xs">Match events will appear here with video offsets.</Text>
              </div>
            ) : (
              <div className="recording-timeline-list">
                {timelineEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`timeline-row ${event.severity}`}
                    onClick={() => seekToTimelineEvent(event.offsetMs)}
                  >
                    <span className="timeline-offset">{formatDuration(event.offsetMs)}</span>
                    <span className="timeline-content">
                      <span className="timeline-title">{event.title}</span>
                      <span className="timeline-meta">{event.type}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="recording-empty">
          <Text className="text-sm font-semibold">No recordings yet</Text>
          <Text className="text-muted-foreground text-xs">Completed matches will show up here automatically.</Text>
        </div>
      )}

      <div className="recording-list" role="list">
        {recordings.map((recording) => (
          <button
            key={recording.id}
            type="button"
            className={`recording-row ${recording.id === selectedRecording?.id ? "is-selected" : ""}`}
            onClick={() => onSelectRecording(recording.id)}
          >
            <span className={`status-pill ${recording.status}`}>{getRecordingStatusLabel(recording.status)}</span>
            <span className="recording-row-main">
              <span className="recording-row-title">{recording.title}</span>
              <span className="recording-row-meta">{formatDateTime(recording.startedAt)}</span>
            </span>
            <span className="recording-row-duration">{formatDuration(recording.durationMs)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
