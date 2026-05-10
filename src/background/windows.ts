const DESKTOP_WINDOW = 'desktop';

export function openDesktopWindow() {
  return openDeclaredWindow(DESKTOP_WINDOW);
}

export function openDeclaredWindow(windowName: string) {
  return new Promise<overwolf.windows.WindowInfo>((resolve, reject) => {
    overwolf.windows.obtainDeclaredWindow(windowName, (result) => {
      if (!result.success) {
        reject(new Error(`Unable to obtain ${windowName}: ${result.error || 'unknown error'}`));
        return;
      }

      const windowId = result.window.id;
      overwolf.windows.restore(windowId, (restoreResult) => {
        if (restoreResult && !restoreResult.success) {
          reject(new Error(`Unable to restore ${windowName}: ${restoreResult.error || 'unknown error'}`));
          return;
        }

        resolve(result.window);
      });
    });
  });
}

export function getLaunchSource(origin = window.location.href) {
  try {
    return new URL(origin).searchParams.get('source');
  } catch {
    return null;
  }
}
