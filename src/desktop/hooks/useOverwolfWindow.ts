import * as React from 'react';

const MAXIMIZED_WINDOW_STATE = 'maximized';

export function useOverwolfWindow() {
  const [isOverwolfReady] = React.useState(() => isOverwolfAvailable());
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [windowName, setWindowName] = React.useState('Browser preview');
  const currentWindowId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isOverwolfAvailable()) {
      return;
    }

    overwolf.windows.getCurrentWindow((result) => {
      if (!result.success) {
        console.error('Unable to read current Overwolf window', result.error);
        return;
      }

      currentWindowId.current = result.window.id;
      setWindowName(result.window.name || 'Overwolf window');
      setIsMaximized(result.window.stateEx === MAXIMIZED_WINDOW_STATE);
    });
  }, []);

  React.useEffect(() => {
    if (!isOverwolfAvailable()) {
      return;
    }

    const handleStateChanged = (event: overwolf.windows.WindowStateChangedEvent) => {
      if (event.window_id !== currentWindowId.current) {
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
    if (currentWindowId.current) {
      overwolf.windows.minimize(currentWindowId.current);
    }
  }, []);

  const toggleMaximizeWindow = React.useCallback(() => {
    if (!currentWindowId.current) {
      return;
    }

    const windowId = currentWindowId.current;
    const updateWindow = isMaximized ? overwolf.windows.restore : overwolf.windows.maximize;

    updateWindow(windowId, (result) => {
      if (!result.success) {
        console.error('Unable to update window state', result.error);
        return;
      }

      setIsMaximized((current) => !current);
    });
  }, [isMaximized]);

  const closeWindow = React.useCallback(() => {
    if (currentWindowId.current) {
      overwolf.windows.close(currentWindowId.current);
    }
  }, []);

  const dragMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button') || !currentWindowId.current) {
      return;
    }

    overwolf.windows.dragMove(currentWindowId.current);
  }, []);

  return {
    isMaximized,
    isOverwolfReady,
    windowName,
    closeWindow,
    dragMove,
    minimizeWindow,
    toggleMaximizeWindow
  };
}

function isOverwolfAvailable() {
  return typeof overwolf !== 'undefined';
}
