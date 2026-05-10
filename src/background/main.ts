import { publishAppEvent } from "../shared/app-events";
import { getCurrentRunningGameInfo, getGameClassId } from "../shared/overwolf-games";
import {
  appendRecordingTimelineEvent,
  createRecordingId,
  updateRecording,
  upsertRecording
} from "../shared/recordings";

import type { AppEventSeverity, AppEventType } from "../shared/app-events";

const DESKTOP_WINDOW = "desktop";
const VALORANT_GAME_CLASS_ID = 21640;
const VALORANT_REQUIRED_FEATURES = ["match_info", "game_info"];
const MAX_GAME_EVENT_REGISTRATION_TRIES = 5;
const GAME_EVENT_REGISTRATION_RETRY_MS = 3000;
const GAME_DETECTION_POLL_MS = 5000;

let activeStreamId: number | null = null;
let hasRegisteredValorantGameEvents = false;
let isMatchActive = false;
let isRegisteringValorantGameEvents = false;
let isStartingRecording = false;
let isStoppingRecording = false;
let isValorantRunningNow = false;
let currentRecordingId: string | null = null;
let currentRecordingStartedAtMs: number | null = null;
let lastGameState: string | undefined;
let lastRoundPhase: string | undefined;
let lastGameDetectionSignature: string | undefined;

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
  window.setInterval(syncRecordingWithRunningGame, GAME_DETECTION_POLL_MS);

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
    publishGameDetectionSnapshot(gameInfo, gameInfo);
    syncValorantGameState(gameInfo);
  });

  window.overwolf?.games.onGameInfoUpdated.addListener((event) => {
    publishGameDetectionSnapshot(event.gameInfo ?? null, event);
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
  getCurrentRunningGameInfo().then(({ gameInfo, raw }) => {
    publishGameDetectionSnapshot(gameInfo, raw);
    syncValorantGameState(gameInfo);
  });
}

function syncValorantGameState(gameInfo: OverwolfGameInfo | null) {
  const wasValorantRunning = isValorantRunningNow;
  isValorantRunningNow = isValorantRunning(gameInfo);

  if (isValorantRunningNow) {
    if (!wasValorantRunning) {
      publishAppEvent({
        type: "valorant.detected",
        title: "VALORANT detected",
        source: "background",
        severity: "info",
        game: "VALORANT",
        payload: gameInfo
      });
    }

    registerValorantGameEvents();
    return;
  }

  if (wasValorantRunning) {
    publishAppEvent({
      type: "valorant.closed",
      title: "VALORANT closed",
      source: "background",
      severity: "info",
      game: "VALORANT"
    });
  }

  hasRegisteredValorantGameEvents = false;
  isMatchActive = false;
  lastGameState = undefined;
  lastRoundPhase = undefined;
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
      publishAppEvent({
        type: "valorant.events.registered",
        title: "VALORANT events ready",
        source: "background",
        severity: "success",
        game: "VALORANT",
        payload: {
          supportedFeatures: result.supportedFeatures
        }
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
  publishAppEvent({
    type: "valorant.events.failed",
    title: "Unable to register VALORANT events",
    source: "background",
    severity: "error",
    game: "VALORANT"
  });
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
    const appEvent = publishAppEvent({
      type: "valorant.game-event",
      title: gameEvent.name,
      source: "background",
      severity: "info",
      game: "VALORANT",
      payload: gameEvent
    });

    if (gameEvent.name === "match_start") {
      startMatchRecording("match_start");
      continue;
    }

    if (gameEvent.name === "match_end") {
      stopMatchRecording("match_end");
      continue;
    }

    appendCurrentRecordingTimelineEvent({
      type: appEvent.type,
      title: gameEvent.name,
      severity: appEvent.severity,
      payload: gameEvent
    });
  }
}

function handleValorantInfoUpdate(info: OverwolfGameEventsInfo | undefined) {
  const state = getStringInfoValue(info, "game_info", "state");
  const hasGameStateChanged = Boolean(state && state !== lastGameState);
  if (hasGameStateChanged) {
    lastGameState = state;
    const appEvent = publishAppEvent({
      type: "valorant.info-update",
      title: `Game state: ${state}`,
      source: "background",
      severity: "info",
      game: "VALORANT",
      payload: { feature: "game_info", key: "state", value: state }
    });
    appendCurrentRecordingTimelineEvent({
      type: appEvent.type,
      title: appEvent.title,
      severity: appEvent.severity,
      payload: appEvent.payload
    });
  }

  if (hasGameStateChanged && state === "InProgress") {
    startMatchRecording("game_info.state=InProgress");
  }

  if (hasGameStateChanged && (state === "LeavingMap" || state === "Aborted")) {
    stopMatchRecording(`game_info.state=${state}`);
  }

  const roundPhase = getStringInfoValue(info, "match_info", "round_phase");
  const hasRoundPhaseChanged = Boolean(roundPhase && roundPhase !== lastRoundPhase);
  if (hasRoundPhaseChanged) {
    lastRoundPhase = roundPhase;
    const appEvent = publishAppEvent({
      type: "valorant.info-update",
      title: `Round phase: ${roundPhase}`,
      source: "background",
      severity: "info",
      game: "VALORANT",
      payload: { feature: "match_info", key: "round_phase", value: roundPhase }
    });
    appendCurrentRecordingTimelineEvent({
      type: appEvent.type,
      title: appEvent.title,
      severity: appEvent.severity,
      payload: appEvent.payload
    });
  }

  if (hasRoundPhaseChanged && (roundPhase === "game_start" || roundPhase === "shopping")) {
    startMatchRecording(`match_info.round_phase=${roundPhase}`);
  }

  if (hasRoundPhaseChanged && roundPhase === "game_end") {
    stopMatchRecording("match_info.round_phase=game_end");
  }
}

function startMatchRecording(reason: string) {
  if (!isValorantRunningNow) {
    console.info("Ignored match recording start because VALORANT is not running", { reason });
    return;
  }

  const wasMatchActive = isMatchActive;
  isMatchActive = true;
  if (!wasMatchActive) {
    publishAppEvent({
      type: "valorant.match.started",
      title: "Match started",
      source: "background",
      severity: "success",
      game: "VALORANT",
      payload: { reason }
    });
  }

  startValorantRecording(reason);
  if (!wasMatchActive) {
    appendCurrentRecordingTimelineEvent({
      type: "valorant.match.started",
      title: "Match started",
      severity: "success",
      payload: { reason }
    });
  }
}

function stopMatchRecording(reason: string) {
  const wasMatchActive = isMatchActive;
  isMatchActive = false;
  if (wasMatchActive) {
    publishAppEvent({
      type: "valorant.match.ended",
      title: "Match ended",
      source: "background",
      severity: "info",
      game: "VALORANT",
      payload: { reason }
    });
    appendCurrentRecordingTimelineEvent({
      type: "valorant.match.ended",
      title: "Match ended",
      severity: "info",
      payload: { reason }
    });
  }

  stopValorantRecording(reason);
}

function startValorantRecording(reason: string) {
  if (activeStreamId !== null || isStartingRecording) {
    return;
  }

  currentRecordingId = createRecordingId();
  currentRecordingStartedAtMs = Date.now();
  const startedAt = new Date(currentRecordingStartedAtMs).toISOString();
  isStartingRecording = true;
  console.info("Starting VALORANT match recording", { reason });
  upsertRecording({
    id: currentRecordingId,
    title: "VALORANT Match",
    game: "VALORANT",
    status: "starting",
    startedAt,
    events: [
      {
        id: `recording.timeline-start-${currentRecordingStartedAtMs}`,
        type: "recording.starting",
        title: "Recording requested",
        timestamp: startedAt,
        offsetMs: 0,
        severity: "info",
        payload: { reason }
      }
    ]
  });
  publishAppEvent({
    type: "recording.starting",
    title: "Starting recording",
    source: "background",
    severity: "info",
    recordingId: currentRecordingId,
    game: "VALORANT",
    payload: { reason }
  });

  window.overwolf?.streaming.start(createRecordingSettings(), (result) => {
    isStartingRecording = false;

    if (result.status !== "success" || typeof result.stream_id !== "number") {
      console.error("Unable to start VALORANT recording", result);
      markCurrentRecordingFailed(result.error || "Unable to start recording");
      return;
    }

    activeStreamId = result.stream_id;
    updateCurrentRecording({
      status: "recording",
      streamId: activeStreamId
    });
    appendCurrentRecordingTimelineEvent({
      type: "recording.started",
      title: "Recording started",
      severity: "success",
      payload: { streamId: activeStreamId }
    });
    publishAppEvent({
      type: "recording.started",
      title: "Recording started",
      source: "background",
      severity: "success",
      recordingId: currentRecordingId ?? undefined,
      game: "VALORANT",
      payload: { streamId: activeStreamId }
    });
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
  updateCurrentRecording({
    status: "stopping",
    stopReason: reason
  });
  appendCurrentRecordingTimelineEvent({
    type: "recording.stopping",
    title: "Recording stopping",
    severity: "info",
    payload: { streamId, reason }
  });
  publishAppEvent({
    type: "recording.stopping",
    title: "Stopping recording",
    source: "background",
    severity: "info",
    recordingId: currentRecordingId ?? undefined,
    game: "VALORANT",
    payload: { streamId, reason }
  });

  window.overwolf?.streaming.stop(streamId, (result) => {
    isStoppingRecording = false;

    if (result?.status && result.status !== "success") {
      console.error("Unable to stop VALORANT recording", result);
      markCurrentRecordingFailed(result.error || "Unable to stop recording");
      return;
    }

    updateCurrentRecording({
      status: "saved",
      endedAt: new Date().toISOString(),
      durationMs: result?.duration,
      streamId: result?.stream_id ?? streamId,
      url: result?.url,
      filePath: result?.file_path,
      stopReason: reason
    });
    appendCurrentRecordingTimelineEvent({
      type: "recording.saved",
      title: "Recording saved",
      severity: "success",
      payload: {
        streamId: result?.stream_id ?? streamId,
        url: result?.url,
        filePath: result?.file_path,
        durationMs: result?.duration,
        reason
      }
    });
    publishAppEvent({
      type: "recording.saved",
      title: "Recording saved",
      source: "background",
      severity: "success",
      recordingId: currentRecordingId ?? undefined,
      game: "VALORANT",
      payload: {
        streamId: result?.stream_id ?? streamId,
        url: result?.url,
        filePath: result?.file_path,
        durationMs: result?.duration,
        reason
      }
    });
    currentRecordingId = null;
    currentRecordingStartedAtMs = null;
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

  const gameClassId = getGameClassId(gameInfo);
  if (gameClassId === VALORANT_GAME_CLASS_ID) {
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

function updateCurrentRecording(patch: Parameters<typeof updateRecording>[1]) {
  if (!currentRecordingId) {
    return;
  }

  updateRecording(currentRecordingId, patch);
}

function markCurrentRecordingFailed(error: string) {
  const recordingId = currentRecordingId;
  appendCurrentRecordingTimelineEvent({
    type: "recording.failed",
    title: "Recording failed",
    severity: "error",
    payload: { error }
  });
  updateCurrentRecording({
    status: "failed",
    endedAt: new Date().toISOString(),
    error
  });
  publishAppEvent({
    type: "recording.failed",
    title: "Recording failed",
    source: "background",
    severity: "error",
    recordingId: recordingId ?? undefined,
    game: "VALORANT",
    payload: { error }
  });
  currentRecordingId = null;
  currentRecordingStartedAtMs = null;
}

function publishGameDetectionSnapshot(gameInfo: OverwolfGameInfo | null, raw: unknown) {
  const signature = JSON.stringify({
    id: gameInfo?.id,
    classId: gameInfo?.classId,
    gameId: gameInfo?.gameId,
    isRunning: gameInfo?.isRunning,
    title: gameInfo?.title
  });

  if (signature === lastGameDetectionSignature) {
    return;
  }

  lastGameDetectionSignature = signature;
  publishAppEvent({
    type: "game.detection",
    title: gameInfo ? `Detected game: ${gameInfo.title || gameInfo.id || "unknown"}` : "No running game detected",
    source: "background",
    severity: gameInfo ? "info" : "warning",
    payload: raw
  });
}

function appendCurrentRecordingTimelineEvent({
  type,
  title,
  severity,
  payload
}: {
  type: AppEventType;
  title: string;
  severity: AppEventSeverity;
  payload?: unknown;
}) {
  if (!currentRecordingId || currentRecordingStartedAtMs === null) {
    return;
  }

  appendRecordingTimelineEvent(currentRecordingId, {
    type,
    title,
    severity,
    payload,
    offsetMs: Date.now() - currentRecordingStartedAtMs
  });
}

boot();
