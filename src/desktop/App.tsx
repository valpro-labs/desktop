import { ActivityPanel } from '@/desktop/components/ActivityPanel';
import { DashboardSidebar } from '@/desktop/components/DashboardSidebar';
import { DesktopTitlebar } from '@/desktop/components/DesktopTitlebar';
import { DiagnosticsPanel } from '@/desktop/components/DiagnosticsPanel';
import { RecordingsPanel } from '@/desktop/components/RecordingsPanel';
import { WorkspaceHeader } from '@/desktop/components/WorkspaceHeader';

import { useActivityEvents } from '@/desktop/hooks/useActivityEvents';
import { useOverwolfRuntime } from '@/desktop/hooks/useOverwolfRuntime';
import { useRecordings } from '@/desktop/hooks/useRecordings';

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
      <DesktopTitlebar
        gameStatus={statuses.game}
        isMaximized={isMaximized}
        onClose={closeApp}
        onDragMove={dragMove}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
      />

      <main className="dashboard-shell">
        <DashboardSidebar recordingsCount={recordings.length} statuses={statuses} />

        <section className="dashboard-main">
          <WorkspaceHeader onRefreshGameStatus={refreshGameStatus} />

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

              <DiagnosticsPanel logs={logs} onClearLogs={clearLogs} />
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
