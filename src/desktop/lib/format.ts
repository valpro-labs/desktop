export function formatLogPayload(payload: unknown) {
  return payload ? ` ${JSON.stringify(payload)}` : "";
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}

export function formatDuration(durationMs?: number) {
  if (!durationMs) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function summarizePayload(payload: unknown) {
  try {
    const summary = JSON.stringify(payload);
    return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
  } catch {
    return String(payload);
  }
}
