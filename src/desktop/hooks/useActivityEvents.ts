import * as React from 'react';

import { deriveGameStatusFromEvents } from '@/desktop/lib/game-status';
import { type AppEvent, loadAppEvents, subscribeAppEvents } from '@/shared/app-events';

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
    const refreshHandle = window.setTimeout(refreshActivityEvents, 0);
    const unsubscribe = subscribeAppEvents(refreshActivityEvents);

    return () => {
      window.clearTimeout(refreshHandle);
      unsubscribe();
    };
  }, [refreshActivityEvents]);

  return {
    activityEvents,
    refreshActivityEvents
  };
}
