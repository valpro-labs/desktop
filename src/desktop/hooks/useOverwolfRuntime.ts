import * as React from 'react';

import { deriveGameStatusFromEvents, formatGameStatus } from '@/desktop/lib/game-status';
import { getCurrentWindow, getManifest } from '@/desktop/lib/overwolf-window';

import { loadAppEvents } from '@/shared/app-events';
import { getCurrentRunningGameInfo, isOverwolfAvailable } from '@/shared/overwolf-games';

export type StatusKey = 'runtime' | 'manifest' | 'game';

export interface LogEntry {
  id: number;
  message: string;
  payload?: unknown;
  time: string;
}

const initialStatus: Record<StatusKey, string> = {
  runtime: 'Checking...',
  manifest: 'Checking...',
  game: 'Checking...'
};

const MAXIMIZED_WINDOW_STATE = 'maximized';

export function useOverwolfRuntime() {
  const [statuses, setStatuses] = React.useState(initialStatus);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const currentWindowId = React.useRef<string | null>(null);
  const logId = React.useRef(0);

  const writeStatus = React.useCallback((key: StatusKey, value: string) => {
    setStatuses((current) => ({ ...current, [key]: value }));
  }, []);

  const addLog = React.useCallback((message: string, payload?: unknown) => {
    const entry: LogEntry = {
      id: logId.current++,
      message,
      payload,
      time: new Date().toLocaleTimeString()
    };
    setLogs((current) => [entry, ...current]);
  }, []);

  const refreshGameStatus = React.useCallback(async () => {
    if (!isOverwolfAvailable()) {
      writeStatus('game', 'Unavailable outside Overwolf');
      return;
    }

    const { gameInfo: game, raw } = await getCurrentRunningGameInfo();
    if (game?.isRunning) {
      writeStatus('game', formatGameStatus(game));
      addLog('Running game detected', raw);
      return;
    }

    writeStatus('game', deriveGameStatusFromEvents(loadAppEvents()) ?? 'No supported game running');
    addLog('No supported game running', raw);
  }, [addLog, writeStatus]);

  React.useEffect(() => {
    async function initializeOverwolf() {
      if (!isOverwolfAvailable()) {
        writeStatus('runtime', 'Browser preview');
        writeStatus('manifest', 'Load in Overwolf');
        writeStatus('game', 'Unavailable outside Overwolf');
        addLog('Opened in browser preview mode');
        return;
      }

      writeStatus('runtime', 'Overwolf API ready');

      try {
        const currentWindow = await getCurrentWindow();
        currentWindowId.current = currentWindow.id;
        setIsMaximized(currentWindow.stateEx === MAXIMIZED_WINDOW_STATE);
        addLog('Current window ready', {
          id: currentWindow.id,
          name: currentWindow.name
        });
      } catch (error) {
        addLog('Unable to read current window', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      try {
        const manifest = await getManifest();
        writeStatus('manifest', `${manifest.meta?.name || 'VALPRO'} ${manifest.meta?.version || ''}`.trim());
        addLog('Manifest loaded', {
          name: manifest.meta?.name,
          version: manifest.meta?.version
        });
      } catch (error) {
        writeStatus('manifest', 'Unable to load');
        addLog('Unable to load manifest', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      await refreshGameStatus();
    }

    initializeOverwolf();
  }, [addLog, refreshGameStatus, writeStatus]);

  React.useEffect(() => {
    if (!isOverwolfAvailable()) {
      return;
    }

    const handleStateChanged = (event: overwolf.windows.WindowStateChangedEvent) => {
      if (!currentWindowId.current || event.window_id !== currentWindowId.current) {
        return;
      }

      setIsMaximized(event.window_state_ex === MAXIMIZED_WINDOW_STATE);
    };

    overwolf.windows.onStateChanged.addListener(handleStateChanged);

    return () => {
      overwolf.windows.onStateChanged.removeListener(handleStateChanged);
    };
  }, []);

  const minimizeWindow = React.useCallback(() => {
    if (isOverwolfAvailable() && currentWindowId.current) {
      overwolf.windows.minimize(currentWindowId.current);
    }
  }, []);

  const toggleMaximizeWindow = React.useCallback(() => {
    if (!isOverwolfAvailable() || !currentWindowId.current) {
      return;
    }

    const windowId = currentWindowId.current;

    overwolf.windows.getWindowState(windowId, (stateResult) => {
      if (!stateResult.success) {
        addLog('Unable to read window state', {
          error: stateResult.error || 'unknown error'
        });
        return;
      }

      const shouldRestore = stateResult.window_state_ex === MAXIMIZED_WINDOW_STATE;
      const updateWindow = shouldRestore ? overwolf.windows.restore : overwolf.windows.maximize;

      updateWindow(windowId, (result) => {
        if (!result.success) {
          addLog(shouldRestore ? 'Unable to restore window' : 'Unable to maximize window', {
            error: result.error || 'unknown error'
          });
          return;
        }

        setIsMaximized(!shouldRestore);
      });
    });
  }, [addLog]);

  const closeApp = React.useCallback(() => {
    if (isOverwolfAvailable()) {
      overwolf.windows.close('background');
    }
  }, []);

  const dragMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button') || !isOverwolfAvailable() || !currentWindowId.current) {
      return;
    }

    overwolf.windows.dragMove(currentWindowId.current);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  return {
    statuses,
    logs,
    isMaximized,
    writeStatus,
    refreshGameStatus,
    minimizeWindow,
    toggleMaximizeWindow,
    closeApp,
    dragMove,
    clearLogs
  };
}
