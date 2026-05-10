import * as React from "react";

import { loadRecordings, subscribeRecordings } from "../../shared/recordings";

export function useRecordings() {
  const [{ recordings, selectedRecordingId }, setRecordingsState] = React.useState(() => {
    const initialRecordings = loadRecordings();
    return {
      recordings: initialRecordings,
      selectedRecordingId: initialRecordings[0]?.id ?? null
    };
  });

  const refreshRecordings = React.useCallback((nextRecordings = loadRecordings()) => {
    setRecordingsState((current) => ({
      recordings: nextRecordings,
      selectedRecordingId:
        current.selectedRecordingId && nextRecordings.some((recording) => recording.id === current.selectedRecordingId)
          ? current.selectedRecordingId
          : (nextRecordings[0]?.id ?? null)
    }));
  }, []);

  const setSelectedRecordingId = React.useCallback((recordingId: string) => {
    setRecordingsState((current) => ({
      ...current,
      selectedRecordingId: recordingId
    }));
  }, []);

  React.useEffect(() => {
    const refreshHandle = window.setTimeout(refreshRecordings, 0);
    const unsubscribe = subscribeRecordings(refreshRecordings);

    return () => {
      window.clearTimeout(refreshHandle);
      unsubscribe();
    };
  }, [refreshRecordings]);

  return {
    recordings,
    selectedRecordingId,
    setSelectedRecordingId,
    refreshRecordings
  };
}
