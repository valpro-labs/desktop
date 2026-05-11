import { Text } from '@valpro-labs/ui';

interface StarterPanelProps {
  isOverwolfReady: boolean;
  windowName: string;
}

export function StarterPanel({ isOverwolfReady, windowName }: StarterPanelProps) {
  return (
    <main className="starter-shell">
      <section className="starter-card">
        <div className="status-row">
          <span className={`status-dot ${isOverwolfReady ? 'ready' : 'preview'}`} />
          <Text className="text-muted-foreground text-xs font-extrabold uppercase">
            {isOverwolfReady ? 'Overwolf connected' : 'Browser preview'}
          </Text>
        </div>

        <div className="starter-copy">
          <Text variant="h1" className="text-left text-3xl">
            VALPRO desktop starter
          </Text>
          <Text className="text-muted-foreground text-sm leading-6">
            This is the smallest Overwolf shell: one background page opens one native desktop window. Add game events,
            recording, and dashboard panels back when you are ready.
          </Text>
        </div>

        <dl className="facts-grid">
          <div className="fact-card">
            <dt>Window</dt>
            <dd>{windowName}</dd>
          </div>
          <div className="fact-card">
            <dt>Runtime</dt>
            <dd>{isOverwolfReady ? 'Overwolf API ready' : 'Open in Overwolf to test native APIs'}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
