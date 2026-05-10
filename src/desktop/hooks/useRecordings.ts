import * as React from "react";

import { type RecordingEntry, loadRecordings, subscribeRecordings } from "../../shared/recordings";

export function useRecordings() {
  const [recordings, setRecordings] = React.useState<RecordingEntry[]>(() => loadRecordings());
  const [selectedRecordingId, setSelectedRecordingId] = React.useState<string | null>(null);

  const refreshRecordings = React.useCallback((nextRecordings = loadRecordings()) => {
    setRecordings(nextRecordings);
    setSelectedRecordingId((currentId) => {
      if (currentId && nextRecordings.some((recording) => recording.id === currentId)) {
        return currentId;
      }

      return nextRecordings[0]?.id ?? null;
    });
  }, []);

  React.useEffect(() => {
    refreshRecordings();
    return subscribeRecordings(refreshRecordings);
  }, [refreshRecordings]);

  return {
    recordings,
    selectedRecordingId,
    setSelectedRecordingId,
    refreshRecordings
  };
}
