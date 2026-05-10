import { Button, Text } from '@valpro-labs/ui';

import type { LogEntry } from '@/desktop/hooks/useOverwolfRuntime';

import { formatLogPayload } from '@/desktop/lib/format';

interface DiagnosticsPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function DiagnosticsPanel({ logs, onClearLogs }: DiagnosticsPanelProps) {
  return (
    <section className="panel diagnostics-panel">
      <div className="panel-header">
        <div>
          <Text className="eyebrow">Diagnostics</Text>
          <Text variant="h4">Event Log</Text>
        </div>
        <Button variant="ghost" size="sm" onPress={onClearLogs}>
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
  );
}
