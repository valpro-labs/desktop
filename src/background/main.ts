const DESKTOP_WINDOW = 'desktop';

if (isOverwolfAvailable()) {
  openDesktopWindow();

  overwolf.extensions.onAppLaunchTriggered.addListener(() => {
    openDesktopWindow();
  });
} else {
  console.info('Overwolf API is unavailable. Build the app and load it as an unpacked Overwolf extension.');
}

function isOverwolfAvailable() {
  return typeof overwolf !== 'undefined';
}

function openDesktopWindow() {
  overwolf.windows.obtainDeclaredWindow(DESKTOP_WINDOW, (result) => {
    if (!result.success) {
      console.error(`Unable to obtain ${DESKTOP_WINDOW} window`, result.error);
      return;
    }

    overwolf.windows.restore(result.window.id, (restoreResult) => {
      if (restoreResult && !restoreResult.success) {
        console.error(`Unable to restore ${DESKTOP_WINDOW} window`, restoreResult.error);
      }
    });
  });
}
