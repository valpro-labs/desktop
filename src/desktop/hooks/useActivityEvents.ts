import * as React from "react";

import { type AppEvent, loadAppEvents, subscribeAppEvents } from "../../shared/app-events";
import { deriveGameStatusFromEvents } from "../lib/game-status";

export function useActivityEvents(onGameStatusChange: (status: string) => void) {
  const [activityEvents, setActivityEvents] = React.useState<AppEvent[]>(() => loadAppEvents());

  const refreshActivityEvents = React.useCallback(
    (nextEvents = loadAppEvents()) => {
      setActivityEvents(nextEvents);
      const derivedGameStatus = deriveGameStatusFromEvents(nextEvents);
      if (derivedGameStatus) {
        onGameStatusChange(derivedGameStatus);
      }
    },
    [onGameStatusChange]
  );

  React.useEffect(() => {
    refreshActivityEvents();
    return subscribeAppEvents(refreshActivityEvents);
  }, [refreshActivityEvents]);

  return {
    activityEvents,
    refreshActivityEvents
  };
}
