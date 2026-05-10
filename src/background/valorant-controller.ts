import { publishAppEvent } from "../shared/app-events";
import type { RunningGameInfo } from "../shared/overwolf-games";
import {
  GAME_EVENT_REGISTRATION_RETRY_MS,
  MAX_GAME_EVENT_REGISTRATION_TRIES,
  VALORANT_REQUIRED_FEATURES
} from "./constants";
import { isValorantRunning, publishGameDetectionSnapshot } from "./game-detection";
import {
  appendCurrentRecordingTimelineEvent,
  startValorantRecording,
  stopValorantRecording
} from "./recording-controller";

type ValorantGameEventsInfo = Record<string, Record<string, unknown> | undefined>;

let hasRegisteredValorantGameEvents = false;
let isMatchActive = false;
let isRegisteringValorantGameEvents = false;
let isValorantRunningNow = false;
let lastGameState: string | undefined;
let lastRoundPhase: string | undefined;

export function bindValorantEvents() {
  overwolf.games.onGameLaunched.addListener((gameInfo) => {
    publishGameDetectionSnapshot(gameInfo, gameInfo);
    syncValorantGameState(gameInfo);
  });

  overwolf.games.onGameInfoUpdated.addListener((event) => {
    publishGameDetectionSnapshot(event.gameInfo ?? null, event);
    syncValorantGameState(event.gameInfo ?? null);
  });

  overwolf.games.events.onError.addListener((event) => {
    console.error("VALORANT game events error", event);
  });

  overwolf.games.events.onNewEvents.addListener((event) => {
    handleValorantGameEvents(event);
  });

  overwolf.games.events.onInfoUpdates2.addListener((event) => {
    handleValorantInfoUpdate(getValorantInfoUpdate(event));
  });
}

export function syncValorantGameState(gameInfo: RunningGameInfo | null) {
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
  return new Promise<overwolf.games.events.SetRequiredFeaturesResult>((resolve) => {
    overwolf.games.events.setRequiredFeatures(features, resolve);
  });
}

function syncMatchStateFromGameEventsInfo() {
  overwolf.games.events.getInfo((result) => {
    if (!result.success) {
      console.warn("Unable to read VALORANT game events info", result);
      return;
    }

    handleValorantInfoUpdate(getValorantGameEventsInfo(result));
  });
}

function handleValorantGameEvents(event: overwolf.games.events.NewGameEvents) {
  for (const gameEvent of event.events) {
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

function handleValorantInfoUpdate(info: ValorantGameEventsInfo | undefined) {
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

  startValorantRecording(reason, shouldKeepRecording);
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

function shouldKeepRecording() {
  return isMatchActive && isValorantRunningNow;
}

function getStringInfoValue(info: ValorantGameEventsInfo | undefined, feature: string, key: string) {
  const value = info?.[feature]?.[key];
  return typeof value === "string" ? value : undefined;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getValorantGameEventsInfo(
  result: overwolf.games.events.GetInfoResult
): ValorantGameEventsInfo | undefined {
  return isValorantGameEventsInfo(result.res) ? result.res : undefined;
}

function getValorantInfoUpdate(
  event: overwolf.games.events.InfoUpdates2Event
): ValorantGameEventsInfo | undefined {
  if (!event.feature || !event.info || typeof event.info !== "object") {
    return undefined;
  }

  return {
    [String(event.feature)]: event.info as Record<string, unknown>
  };
}

function isValorantGameEventsInfo(value: unknown): value is ValorantGameEventsInfo {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
