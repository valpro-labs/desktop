import { Button, Text } from '@valpro-labs/ui';

interface WorkspaceHeaderProps {
  onRefreshGameStatus: () => void;
}

export function WorkspaceHeader({ onRefreshGameStatus }: WorkspaceHeaderProps) {
  return (
    <div className="workspace-header">
      <div className="workspace-title">
        <Text className="eyebrow">Dashboard</Text>
        <Text variant="h1" className="text-left text-3xl">
          Capture workspace
        </Text>
        <Text className="workspace-subtitle">Monitor VALORANT capture status and review match recordings.</Text>
      </div>
      <Button onPress={onRefreshGameStatus}>
        <Text>Refresh</Text>
      </Button>
    </div>
  );
}
