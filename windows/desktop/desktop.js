const selectors = {
  runtime: '[data-status="runtime"]',
  manifest: '[data-status="manifest"]',
  game: '[data-status="game"]',
  log: "[data-log]"
};

const state = {
  currentWindowId: null
};

function $(selector) {
  return document.querySelector(selector);
}

function writeStatus(key, value) {
  const element = $(selectors[key]);
  if (element) {
    element.textContent = value;
  }
}

function addLog(message, payload) {
  const list = $(selectors.log);
  const item = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  const detail = payload ? ` ${JSON.stringify(payload)}` : "";
  item.textContent = `[${time}] ${message}${detail}`;
  list.prepend(item);
}

function getCurrentWindow() {
  return new Promise((resolve, reject) => {
    overwolf.windows.getCurrentWindow((result) => {
      if (result.status !== "success") {
        reject(new Error(result.error || result.status));
        return;
      }

      resolve(result.window);
    });
  });
}

function getManifest() {
  return new Promise((resolve, reject) => {
    const handleManifest = (result) => {
      const manifest = result?.object || result;
      if (!manifest?.meta) {
        reject(new Error("Manifest was not returned."));
        return;
      }

      resolve(manifest);
    };

    if (overwolf.extensions?.current?.getManifest) {
      overwolf.extensions.current.getManifest(handleManifest);
      return;
    }

    if (overwolf.extensions?.getManifest) {
      overwolf.extensions.getManifest(handleManifest);
      return;
    }

    reject(new Error("Manifest API is not available."));
  });
}

function getRunningGameInfo() {
  return new Promise((resolve) => {
    overwolf.games.getRunningGameInfo((info) => resolve(info));
  });
}

async function refreshGameStatus() {
  if (!window.overwolf) {
    writeStatus("game", "Unavailable outside Overwolf");
    return;
  }

  const game = await getRunningGameInfo();
  if (game?.isRunning) {
    writeStatus("game", `${game.title || "Running game"} (${game.id})`);
    addLog("Running game detected", game);
    return;
  }

  writeStatus("game", "No supported game running");
  addLog("No supported game running");
}

async function initializeOverwolf() {
  if (!window.overwolf) {
    writeStatus("runtime", "Browser preview");
    writeStatus("manifest", "Load in Overwolf");
    writeStatus("game", "Unavailable outside Overwolf");
    addLog("Opened in browser preview mode");
    return;
  }

  writeStatus("runtime", "Overwolf API ready");

  try {
    const currentWindow = await getCurrentWindow();
    state.currentWindowId = currentWindow.id;
    addLog("Current window ready", { id: currentWindow.id, name: currentWindow.name });
  } catch (error) {
    addLog("Unable to read current window", { error: error.message });
  }

  try {
    const manifest = await getManifest();
    writeStatus("manifest", `${manifest.meta.name} ${manifest.meta.version}`);
    addLog("Manifest loaded", { name: manifest.meta.name, version: manifest.meta.version });
  } catch (error) {
    writeStatus("manifest", "Unable to load");
    addLog("Unable to load manifest", { error: error.message });
  }

  await refreshGameStatus();
}

function bindWindowControls() {
  document.querySelector('[data-action="minimize"]').addEventListener("click", () => {
    if (window.overwolf && state.currentWindowId) {
      overwolf.windows.minimize(state.currentWindowId);
    }
  });

  document.querySelector('[data-action="close"]').addEventListener("click", () => {
    if (window.overwolf) {
      overwolf.windows.close("background");
    }
  });

  document.querySelector("[data-drag-region]").addEventListener("mousedown", (event) => {
    if (event.target.closest("button") || !window.overwolf || !state.currentWindowId) {
      return;
    }

    overwolf.windows.dragMove(state.currentWindowId);
  });
}

function bindActions() {
  document.querySelector('[data-action="refresh-game"]').addEventListener("click", refreshGameStatus);
  document.querySelector('[data-action="clear-log"]').addEventListener("click", () => {
    $(selectors.log).replaceChildren();
  });
}

bindWindowControls();
bindActions();
initializeOverwolf();
