import * as React from "react";
import { createRoot } from "react-dom/client";
import { Uniwind } from "uniwind";
import { Button, Text } from "@valpro-labs/ui";

import iconUrl from "../../assets/icons/IconMouseOver.png";
import { type AppEvent, loadAppEvents, subscribeAppEvents } from "../shared/app-events";
import { getCurrentRunningGameInfo } from "../shared/overwolf-games";
import { type RecordingEntry, loadRecordings, subscribeRecordings } from "../shared/recordings";
import "./styles.css";

Uniwind.setTheme("dark");

type StatusKey = "runtime" | "manifest" | "game";

interface LogEntry {
  id: number;
  message: string;
  payload?: unknown;
  time: string;
}

const initialStatus: Record<StatusKey, string> = {
  runtime: "Checking...",
  manifest: "Checking...",
  game: "Checking..."
};

function addPayload(payload: unknown) {
  return payload ? ` ${JSON.stringify(payload)}` : "";
}

function getCurrentWindow() {
  return new Promise<OverwolfWindow>((resolve, reject) => {
    window.overwolf?.windows.getCurrentWindow((result) => {
      if (result.status !== "success") {
        reject(new Error(result.error || result.status));
        return;
      }

      resolve(result.window);
    });
  });
}

function getManifest() {
  return new Promise<OverwolfManifest>((resolve, reject) => {
    const handleManifest = (result: OverwolfCallbackResult | OverwolfManifest) => {
      const manifest = "object" in result && result.object ? result.object : result;
      if (!manifest || typeof manifest !== "object" || !("meta" in manifest)) {
        reject(new Error("Manifest was not returned."));
        return;
      }

      resolve(manifest as OverwolfManifest);
    };

    if (window.overwolf?.extensions.current?.getManifest) {
      window.overwolf.extensions.current.getManifest(handleManifest);
      return;
    }

    if (window.overwolf?.extensions.getManifest) {
      window.overwolf.extensions.getManifest(handleManifest);
      return;
    }

    reject(new Error("Manifest API is not available."));
  });
}

function App() {
  const [statuses, setStatuses] = React.useState(initialStatus);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [recordings, setRecordings] = React.useState<RecordingEntry[]>(() => loadRecordings());
  const [activityEvents, setActivityEvents] = React.useState<AppEvent[]>(() => loadAppEvents());
  const [selectedRecordingId, setSelectedRecordingId] = React.useState<string | null>(null);
  const currentWindowId = React.useRef<string | null>(null);
  const logId = React.useRef(0);

  const writeStatus = React.useCallback((key: StatusKey, value: string) => {
    setStatuses((current) => ({ ...current, [key]: value }));
  }, []);

  const addLog = React.useCallback((message: string, payload?: unknown) => {
    const entry: LogEntry = {
      id: logId.current++,
      message,
      payload,
      time: new Date().toLocaleTimeString()
    };
    setLogs((current) => [entry, ...current]);
  }, []);

  const refreshGameStatus = React.useCallback(async () => {
    if (!window.overwolf) {
      writeStatus("game", "Unavailable outside Overwolf");
      return;
    }

    const { gameInfo: game, raw } = await getCurrentRunningGameInfo();
    if (game?.isRunning) {
      writeStatus("game", `${game.title || "Running game"} (${game.classId ?? game.id})`);
      addLog("Running game detected", raw);
      return;
    }

    writeStatus("game", "No supported game running");
    addLog("No supported game running", raw);
  }, [addLog, writeStatus]);

  React.useEffect(() => {
    async function initializeOverwolf() {
      if (!window.overwolf) {
        writeStatus("runtime", "Browser preview");
        writeStatus("manifest", "Load in Overwolf");
        writeStatus("game", "Unavailable outside Overwolf");
        addLog("Opened in browser preview mode");
        return;
      }

      writeStatus("runtime", "Overwolf API ready");

      try {
        const currentWindow = await getCurrentWindow();
        currentWindowId.current = currentWindow.id;
        addLog("Current window ready", {
          id: currentWindow.id,
          name: currentWindow.name
        });
      } catch (error) {
        addLog("Unable to read current window", {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      try {
        const manifest = await getManifest();
        writeStatus(
          "manifest",
          `${manifest.meta?.name || "Valpro Labs Desktop"} ${manifest.meta?.version || ""}`.trim()
        );
        addLog("Manifest loaded", {
          name: manifest.meta?.name,
          version: manifest.meta?.version
        });
      } catch (error) {
        writeStatus("manifest", "Unable to load");
        addLog("Unable to load manifest", {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      await refreshGameStatus();
    }

    initializeOverwolf();
  }, [addLog, refreshGameStatus, writeStatus]);

  React.useEffect(() => {
    const refreshRecordings = (nextRecordings = loadRecordings()) => {
      setRecordings(nextRecordings);
      setSelectedRecordingId((currentId) => {
        if (currentId && nextRecordings.some((recording) => recording.id === currentId)) {
          return currentId;
        }

        return nextRecordings[0]?.id ?? null;
      });
    };

    refreshRecordings();
    setActivityEvents(loadAppEvents());

    const unsubscribeRecordings = subscribeRecordings(refreshRecordings);
    const unsubscribeAppEvents = subscribeAppEvents(setActivityEvents);

    return () => {
      unsubscribeRecordings();
      unsubscribeAppEvents();
    };
  }, []);

  const minimizeWindow = React.useCallback(() => {
    if (window.overwolf && currentWindowId.current) {
      window.overwolf.windows.minimize(currentWindowId.current);
    }
  }, []);

  const closeApp = React.useCallback(() => {
    if (window.overwolf) {
      window.overwolf.windows.close("background");
    }
  }, []);

  const dragMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button") || !window.overwolf || !currentWindowId.current) {
      return;
    }

    window.overwolf.windows.dragMove(currentWindowId.current);
  }, []);

  return (
    <div className="app">
      <header className="titlebar" data-drag-region onMouseDown={dragMove}>
        <div className="brand">
          <img src={iconUrl} alt="" />
          <div className="brand-copy">
            <Text className="text-base font-bold leading-tight">Valpro Labs</Text>
            <Text className="text-muted-foreground text-xs leading-tight">React + @valpro-labs/ui</Text>
          </div>
        </div>

        <div className="window-actions">
          <button type="button" className="window-button" onClick={minimizeWindow} aria-label="Minimize">
            _
          </button>
          <button type="button" className="window-button danger" onClick={closeApp} aria-label="Close">
            x
          </button>
        </div>
      </header>

      <main className="shell">
        <section className="main-column">
          <div className="hero">
            <div className="hero-copy">
              <Text className="eyebrow">Desktop App Starter</Text>
              <Text variant="h1" className="text-left text-4xl">
                Native Overwolf app is ready.
              </Text>
            </div>
            <Button onPress={refreshGameStatus}>
              <Text>Refresh</Text>
            </Button>
          </div>

          <section className="status-grid" aria-label="Runtime status">
            <StatusCard label="Runtime" value={statuses.runtime} />
            <StatusCard label="Manifest" value={statuses.manifest} />
            <StatusCard label="Game" value={statuses.game} />
          </section>

          <section className="panel">
            <div className="panel-header">
              <Text variant="h4">Event Log</Text>
              <Button variant="ghost" size="sm" onPress={() => setLogs([])}>
                <Text>Clear</Text>
              </Button>
            </div>
            <ol className="log">
              {logs.map((log) => (
                <li key={log.id}>
                  [{log.time}] {log.message}
                  {addPayload(log.payload)}
                </li>
              ))}
            </ol>
          </section>
        </section>

        <aside className="side-column">
          <RecordingsPanel
            recordings={recordings}
            selectedRecordingId={selectedRecordingId}
            onRefresh={() => {
              setRecordings(loadRecordings());
              setActivityEvents(loadAppEvents());
            }}
            onSelectRecording={setSelectedRecordingId}
          />
          <ActivityPanel events={activityEvents} />
        </aside>
      </main>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="status-card">
      <Text className="text-muted-foreground text-xs font-extrabold uppercase">{label}</Text>
      <Text className="text-xl font-bold leading-snug">{value}</Text>
    </article>
  );
}

function RecordingsPanel({
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
              <Text className="text-muted-foreground text-xs">{selectedRecording.filePath || "Preview appears when Overwolf returns a playable URL"}</Text>
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

function ActivityPanel({ events }: { events: AppEvent[] }) {
  return (
    <section className="activity-panel" aria-label="Live activity">
      <div className="panel-header">
        <div>
          <Text className="eyebrow">Events</Text>
          <Text variant="h4">Live Activity</Text>
        </div>
      </div>
      <ol className="activity-list">
        {events.length === 0 ? (
          <li className="activity-empty">
            <Text className="text-sm font-semibold">No activity yet</Text>
            <Text className="text-muted-foreground text-xs">Game events and recording updates will appear here.</Text>
          </li>
        ) : (
          events.slice(0, 30).map((event) => (
            <li key={event.id} className={`activity-item ${event.severity}`}>
              <span className="activity-marker" />
              <span className="activity-content">
                <span className="activity-title">{event.title}</span>
                <span className="activity-meta">
                  {formatTime(event.timestamp)} - {event.type}
                </span>
                {event.payload ? <span className="activity-payload">{summarizePayload(event.payload)}</span> : null}
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function getRecordingStatusLabel(status: RecordingEntry["status"]) {
  const labels: Record<RecordingEntry["status"], string> = {
    starting: "Starting",
    recording: "Recording",
    stopping: "Saving",
    saved: "Saved",
    failed: "Failed"
  };
  return labels[status];
}

function getRecordingSummary(recording: RecordingEntry) {
  const endedAt = recording.endedAt ? `Ended ${formatDateTime(recording.endedAt)}` : "In progress";
  return `${formatDateTime(recording.startedAt)} - ${endedAt} - ${formatDuration(recording.durationMs)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}

function formatDuration(durationMs?: number) {
  if (!durationMs) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function summarizePayload(payload: unknown) {
  try {
    const summary = JSON.stringify(payload);
    return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
  } catch {
    return String(payload);
  }
}

function openRecording(recording: RecordingEntry) {
  const target = recording.url ?? recording.filePath;
  if (target) {
    window.open(target, "_blank");
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
