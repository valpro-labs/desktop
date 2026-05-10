export function getCurrentWindow() {
  return new Promise<overwolf.windows.WindowInfo>((resolve, reject) => {
    overwolf.windows.getCurrentWindow((result) => {
      if (!result.success) {
        reject(new Error(result.error || 'Unable to read current window'));
        return;
      }

      resolve(result.window);
    });
  });
}

export function getManifest() {
  return new Promise<overwolf.extensions.GetManifestResult>((resolve, reject) => {
    overwolf.extensions.current.getManifest((result) => {
      if (!result.success) {
        reject(new Error(result.error || 'Unable to load manifest'));
        return;
      }

      resolve(result);
    });
  });
}
