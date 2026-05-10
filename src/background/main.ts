const DESKTOP_WINDOW = "desktop";
const VALORANT_GAME_CLASS_ID = 21640;
const VALORANT_REQUIRED_FEATURES = ["match_info", "game_info"];
const MAX_GAME_EVENT_REGISTRATION_TRIES = 5;
const GAME_EVENT_REGISTRATION_RETRY_MS = 3000;

let activeStreamId: number | null = null;
let hasRegisteredValorantGameEvents = false;
let isMatchActive = false;
let isRegisteringValorantGameEvents = false;
let isStartingRecording = false;
let isStoppingRecording = false;
let isValorantRunningNow = false;

function openDeclaredWindow(windowName: string) {
  return new Promise<OverwolfWindow>((resolve, reject) => {
    window.overwolf?.windows.obtainDeclaredWindow(windowName, (result) => {
      if (result.status !== "success") {
        reject(new Error(`Unable to obtain ${windowName}: ${result.error || result.status}`));
        return;
      }

      const windowId = result.window.id;
      window.overwolf?.windows.restore(windowId, (restoreResult) => {
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

  bindRecordingEvents();
  syncRecordingWithRunningGame();

  window.overwolf.extensions.onAppLaunchTriggered.addListener((origin) => {
    const source = getLaunchSource(origin);
    if (source === "gamelaunchevent") {
      syncRecordingWithRunningGame();
      return;
    }

    openDeclaredWindow(DESKTOP_WINDOW).catch((error: unknown) => console.error(error));
  });

  try {
    if (getLaunchSource() !== "gamelaunchevent") {
      await openDeclaredWindow(DESKTOP_WINDOW);
    }
  } catch (error) {
    console.error(error);
  }
}

function bindRecordingEvents() {
  window.overwolf?.games.onGameLaunched.addListener((gameInfo) => {
    syncValorantGameState(gameInfo);
  });

  window.overwolf?.games.onGameInfoUpdated.addListener((event) => {
    syncValorantGameState(event.gameInfo ?? null);
  });

  window.overwolf?.games.events.onError.addListener((event) => {
    console.error("VALORANT game events error", event);
  });

  window.overwolf?.games.events.onNewEvents.addListener((event) => {
    handleValorantGameEvents(event);
  });

  window.overwolf?.games.events.onInfoUpdates2.addListener((event) => {
    handleValorantInfoUpdate(event.info);
  });

  window.overwolf?.streaming.onStartStreaming.addListener((event) => {
    console.info("Recording started", event);
  });

  window.overwolf?.streaming.onStopStreaming.addListener((event) => {
    console.info("Recording stopped", event);
    if (!isStoppingRecording) {
      activeStreamId = null;
    }
  });

  window.overwolf?.streaming.onStreamingError.addListener((event) => {
    console.error("Recording error", event);
    activeStreamId = null;
    isStartingRecording = false;
    isStoppingRecording = false;
  });

  window.overwolf?.streaming.onStreamingWarning.addListener((event) => {
    console.warn("Recording warning", event);
  });
}

function syncRecordingWithRunningGame() {
  window.overwolf?.games.getRunningGameInfo((gameInfo) => {
    syncValorantGameState(gameInfo);
  });
}

function syncValorantGameState(gameInfo: OverwolfGameInfo | null) {
  isValorantRunningNow = isValorantRunning(gameInfo);

  if (isValorantRunningNow) {
    registerValorantGameEvents();
    return;
  }

  hasRegisteredValorantGameEvents = false;
  isMatchActive = false;
  stopValorantRecording("VALORANT is not running");
}

async function registerValorantGameEvents() {
  if (hasRegisteredValorantGameEvents || isRegisteringValorantGameEvents) {
    return;
  }

  isRegisteringValorantGameEvents = true;

  for (let attempt = 1; attempt <= MAX_GAME_EVENT_REGISTRATION_TRIES; attempt++) {
    const result = await setRequiredFeatures(VALORANT_REQUIRED_FEATURES);

    if (result.success) {
      hasRegisteredValorantGameEvents = true;
      isRegisteringValorantGameEvents = false;
      console.info("VALORANT game events registered", {
        supportedFeatures: result.supportedFeatures
      });
      syncMatchStateFromGameEventsInfo();
      return;
    }

    console.warn("Unable to register VALORANT game events", {
      attempt,
      error: result.error
    });

    await delay(GAME_EVENT_REGISTRATION_RETRY_MS);
  }

  isRegisteringValorantGameEvents = false;
  console.error("VALORANT game events registration failed");
}

function setRequiredFeatures(features: string[]) {
  return new Promise<OverwolfSetRequiredFeaturesResult>((resolve) => {
    window.overwolf?.games.events.setRequiredFeatures(features, resolve);
  });
}

function syncMatchStateFromGameEventsInfo() {
  window.overwolf?.games.events.getInfo((result) => {
    if (!result.success) {
      console.warn("Unable to read VALORANT game events info", result);
      return;
    }

    handleValorantInfoUpdate(result.info);
  });
}

function handleValorantGameEvents(event: OverwolfNewGameEvents) {
  for (const gameEvent of event.events ?? []) {
    if (gameEvent.name === "match_start") {
      startMatchRecording("match_start");
    }

    if (gameEvent.name === "match_end") {
      stopMatchRecording("match_end");
    }
  }
}

function handleValorantInfoUpdate(info: OverwolfGameEventsInfo | undefined) {
  const state = getStringInfoValue(info, "game_info", "state");
  if (state === "InProgress") {
    startMatchRecording("game_info.state=InProgress");
  }

  if (state === "LeavingMap" || state === "Aborted") {
    stopMatchRecording(`game_info.state=${state}`);
  }

  const roundPhase = getStringInfoValue(info, "match_info", "round_phase");
  if (roundPhase === "game_start" || roundPhase === "shopping") {
    startMatchRecording(`match_info.round_phase=${roundPhase}`);
  }

  if (roundPhase === "game_end") {
    stopMatchRecording("match_info.round_phase=game_end");
  }
}

function startMatchRecording(reason: string) {
  if (!isValorantRunningNow) {
    console.info("Ignored match recording start because VALORANT is not running", { reason });
    return;
  }

  isMatchActive = true;
  startValorantRecording(reason);
}

function stopMatchRecording(reason: string) {
  isMatchActive = false;
  stopValorantRecording(reason);
}

function startValorantRecording(reason: string) {
  if (activeStreamId !== null || isStartingRecording) {
    return;
  }

  isStartingRecording = true;
  console.info("Starting VALORANT match recording", { reason });

  window.overwolf?.streaming.start(createRecordingSettings(), (result) => {
    isStartingRecording = false;

    if (result.status !== "success" || typeof result.stream_id !== "number") {
      console.error("Unable to start VALORANT recording", result);
      return;
    }

    activeStreamId = result.stream_id;
    console.info("VALORANT recording stream ready", { streamId: activeStreamId });

    if (!isMatchActive || !isValorantRunningNow) {
      stopValorantRecording("VALORANT match ended before recording startup completed");
    }
  });
}

function stopValorantRecording(reason: string) {
  if (activeStreamId === null || isStoppingRecording) {
    return;
  }

  const streamId = activeStreamId;
  activeStreamId = null;
  isStoppingRecording = true;
  console.info("Stopping VALORANT recording", { streamId, reason });

  window.overwolf?.streaming.stop(streamId, (result) => {
    isStoppingRecording = false;

    if (result?.status && result.status !== "success") {
      console.error("Unable to stop VALORANT recording", result);
      return;
    }

    console.info("VALORANT recording saved", result);
  });
}

function createRecordingSettings(): OverwolfStreamSettings {
  return {
    provider: window.overwolf!.streaming.enums.StreamingProvider.VideoRecorder,
    settings: {
      audio: {
        mic: { enable: false, volume: 0 },
        game: { enable: true, volume: 100 }
      },
      video: {
        auto_calc_kbps: true,
        fps: 60,
        include_full_size_video: true,
        game_window_capture: {
          enable_when_available: true,
          capture_overwolf_windows: false
        }
      },
      quota: {
        max_quota_gb: 10
      }
    }
  };
}

function isValorantRunning(gameInfo: OverwolfGameInfo | null) {
  if (!gameInfo?.isRunning) {
    return false;
  }

  const gameId = gameInfo.gameId ?? gameInfo.id;
  if (gameId === VALORANT_GAME_CLASS_ID || (gameId && Math.floor(gameId / 10) === VALORANT_GAME_CLASS_ID)) {
    return true;
  }

  return typeof gameInfo.title === "string" && gameInfo.title.toLowerCase().includes("valorant");
}

function getLaunchSource(origin = window.location.href) {
  try {
    return new URL(origin).searchParams.get("source");
  } catch {
    return null;
  }
}

function getStringInfoValue(
  info: OverwolfGameEventsInfo | undefined,
  feature: string,
  key: string
) {
  const value = info?.[feature]?.[key];
  return typeof value === "string" ? value : undefined;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

boot();
