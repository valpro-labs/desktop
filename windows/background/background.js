const DESKTOP_WINDOW = "desktop";

function openDeclaredWindow(windowName) {
  return new Promise((resolve, reject) => {
    overwolf.windows.obtainDeclaredWindow(windowName, (result) => {
      if (result.status !== "success") {
        reject(new Error(`Unable to obtain ${windowName}: ${result.error || result.status}`));
        return;
      }

      const windowId = result.window.id;
      overwolf.windows.restore(windowId, (restoreResult) => {
        if (restoreResult?.status && restoreResult.status !== "success") {
          reject(new Error(`Unable to restore ${windowName}: ${restoreResult.error || restoreResult.status}`));
          return;
        }

        resolve(result.window);
      });
    });
  });
}

async function boot() {
  if (!window.overwolf) {
    console.info("Overwolf API is not available. Load this folder as an unpacked Overwolf extension.");
    return;
  }

  overwolf.extensions.onAppLaunchTriggered.addListener(() => {
    openDeclaredWindow(DESKTOP_WINDOW).catch((error) => console.error(error));
  });

  try {
    await openDeclaredWindow(DESKTOP_WINDOW);
  } catch (error) {
    console.error(error);
  }
}

boot();
