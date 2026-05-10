import { Text } from '@valpro-labs/ui';

export function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="status-card">
      <Text className="text-muted-foreground text-xs font-extrabold uppercase">{label}</Text>
      <Text className="text-xl font-bold leading-snug">{value}</Text>
    </article>
  );
}
