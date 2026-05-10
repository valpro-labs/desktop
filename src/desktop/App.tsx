import { Button, Text } from '@valpro-labs/ui';

import { ActivityPanel } from '@/desktop/components/ActivityPanel';
import { RecordingsPanel } from '@/desktop/components/RecordingsPanel';

import { useActivityEvents } from '@/desktop/hooks/useActivityEvents';
import { useOverwolfRuntime } from '@/desktop/hooks/useOverwolfRuntime';
import { useRecordings } from '@/desktop/hooks/useRecordings';

import { formatLogPayload } from '@/desktop/lib/format';

import iconUrl from '@assets/icons/IconMouseOver.png';

export function App() {
  const {
    statuses,
    logs,
    isMaximized,
    writeStatus,
    refreshGameStatus,
    minimizeWindow,
    toggleMaximizeWindow,
    closeApp,
    dragMove,
    clearLogs
  } = useOverwolfRuntime();
  const { recordings, selectedRecordingId, setSelectedRecordingId, refreshRecordings } = useRecordings();
  const { activityEvents, refreshActivityEvents } = useActivityEvents((status) => writeStatus('game', status));

  const refreshPanels = () => {
    refreshRecordings();
    refreshActivityEvents();
  };

  return (
    <div className="app">
      <header className="titlebar" data-drag-region onMouseDown={dragMove}>
        <div className="titlebar-brand">
          <div className="brand">
            <span className="brand-mark">
              <img src={iconUrl} alt="" />
            </span>
            <div className="brand-copy">
              <Text className="text-sm font-bold leading-tight">VALPRO</Text>
              <Text className="text-muted-foreground text-xs leading-tight">Desktop</Text>
            </div>
          </div>
        </div>

        <div className="titlebar-main">
          <nav className="breadcrumb" aria-label="Current location">
            <Text className="breadcrumb-muted">Dashboard</Text>
            <span className="breadcrumb-separator" aria-hidden="true" />
            <Text className="breadcrumb-current">Capture</Text>
          </nav>

          <div className="titlebar-status">
            <span className="titlebar-status-dot" />
            <Text className="titlebar-status-text">{statuses.game}</Text>
          </div>
        </div>

        <div className="window-actions">
          <button type="button" className="window-button" onClick={minimizeWindow} aria-label="Minimize" title="Minimize">
            <span className="window-icon minimize" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="window-button"
            onClick={toggleMaximizeWindow}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <span className={`window-icon ${isMaximized ? 'restore' : 'maximize'}`} aria-hidden="true" />
          </button>
          <button type="button" className="window-button danger" onClick={closeApp} aria-label="Close">
            <span className="window-icon close" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <Text className="sidebar-label">Workspace</Text>
            <button type="button" className="sidebar-item is-active">
              <span className="sidebar-item-dot" />
              <span>
                <span className="sidebar-item-title">Capture</span>
                <span className="sidebar-item-meta">VALORANT recorder</span>
              </span>
            </button>
          </div>

          <section className="sidebar-section" aria-label="Runtime status">
            <Text className="sidebar-label">Status</Text>
            <div className="status-list">
              <div className="status-row">
                <Text className="status-row-label">Runtime</Text>
                <Text className="status-row-value">{statuses.runtime}</Text>
              </div>
              <div className="status-row">
                <Text className="status-row-label">Manifest</Text>
                <Text className="status-row-value">{statuses.manifest}</Text>
              </div>
              <div className="status-row">
                <Text className="status-row-label">Game</Text>
                <Text className="status-row-value">{statuses.game}</Text>
              </div>
            </div>
          </section>

          <div className="sidebar-footer">
            <Text className="sidebar-label">Saved</Text>
            <Text className="sidebar-metric">{recordings.length}</Text>
            <Text className="sidebar-muted">recordings in library</Text>
          </div>
        </aside>

        <section className="dashboard-main">
          <div className="workspace-header">
            <div className="workspace-title">
              <Text className="eyebrow">Dashboard</Text>
              <Text variant="h1" className="text-left text-3xl">
                Capture workspace
              </Text>
              <Text className="workspace-subtitle">Monitor VALORANT capture status and review match recordings.</Text>
            </div>
            <Button onPress={refreshGameStatus}>
              <Text>Refresh</Text>
            </Button>
          </div>

          <div className="workspace-grid">
            <section className="content-column">
              <RecordingsPanel
                recordings={recordings}
                selectedRecordingId={selectedRecordingId}
                onRefresh={refreshPanels}
                onSelectRecording={setSelectedRecordingId}
              />
            </section>

            <aside className="inspector-column">
              <ActivityPanel events={activityEvents} />

              <section className="panel diagnostics-panel">
                <div className="panel-header">
                  <div>
                    <Text className="eyebrow">Diagnostics</Text>
                    <Text variant="h4">Event Log</Text>
                  </div>
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
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
