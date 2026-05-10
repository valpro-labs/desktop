import { Text } from '@valpro-labs/ui';

import type { StatusKey } from '@/desktop/hooks/useOverwolfRuntime';

interface DashboardSidebarProps {
  recordingsCount: number;
  statuses: Record<StatusKey, string>;
}

const statusRows: Array<{ key: StatusKey; label: string }> = [
  { key: 'runtime', label: 'Runtime' },
  { key: 'manifest', label: 'Manifest' },
  { key: 'game', label: 'Game' }
];

export function DashboardSidebar({ recordingsCount, statuses }: DashboardSidebarProps) {
  return (
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
          {statusRows.map((status) => (
            <div key={status.key} className="status-row">
              <Text className="status-row-label">{status.label}</Text>
              <Text className="status-row-value">{statuses[status.key]}</Text>
            </div>
          ))}
        </div>
      </section>

      <div className="sidebar-footer">
        <Text className="sidebar-label">Saved</Text>
        <Text className="sidebar-metric">{recordingsCount}</Text>
        <Text className="sidebar-muted">recordings in library</Text>
      </div>
    </aside>
  );
}
