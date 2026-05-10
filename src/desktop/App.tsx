import { Button, Text } from '@valpro-labs/ui';

import { ActivityPanel } from '@/desktop/components/ActivityPanel';
import { RecordingsPanel } from '@/desktop/components/RecordingsPanel';
import { StatusCard } from '@/desktop/components/StatusCard';

import { useActivityEvents } from '@/desktop/hooks/useActivityEvents';
import { useOverwolfRuntime } from '@/desktop/hooks/useOverwolfRuntime';
import { useRecordings } from '@/desktop/hooks/useRecordings';

import { formatLogPayload } from '@/desktop/lib/format';

import iconUrl from '@assets/icons/IconMouseOver.png';

export function App() {
  const { statuses, logs, writeStatus, refreshGameStatus, minimizeWindow, closeApp, dragMove, clearLogs } =
    useOverwolfRuntime();
  const { recordings, selectedRecordingId, setSelectedRecordingId, refreshRecordings } = useRecordings();
  const { activityEvents, refreshActivityEvents } = useActivityEvents((status) => writeStatus('game', status));

  const refreshPanels = () => {
    refreshRecordings();
    refreshActivityEvents();
  };

  return (
    <div className="app">
      <header className="titlebar" data-drag-region onMouseDown={dragMove}>
        <div className="brand">
          <img src={iconUrl} alt="" />
          <div className="brand-copy">
            <Text className="text-base font-bold leading-tight">VALPRO</Text>
            <Text className="text-muted-foreground text-xs leading-tight">VALPRO LABS</Text>
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
              <Button variant="ghost" size="sm" onPress={clearLogs}>
                <Text>Clear</Text>
              </Button>
            </div>
            <ol className="log">
              {logs.map((log) => (
                <li key={log.id}>
                  [{log.time}] {log.message}
                  {formatLogPayload(log.payload)}
                </li>
              ))}
            </ol>
          </section>
        </section>

        <aside className="side-column">
          <RecordingsPanel
            recordings={recordings}
            selectedRecordingId={selectedRecordingId}
            onRefresh={refreshPanels}
            onSelectRecording={setSelectedRecordingId}
          />
          <ActivityPanel events={activityEvents} />
        </aside>
      </main>
    </div>
  );
}
