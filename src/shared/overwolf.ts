export const VALORANT_CLASS_ID = 21640;
export const OVERWOLF_GAME_LAUNCH_SOURCE = 'gamelaunchevent';

export type OverwolfRunningGameInfo =
  | overwolf.games.RunningGameInfo
  | overwolf.games.GetRunningGameInfoResult2GameInfo;

export type ValorantRuntimeStatus = 'unknown' | 'running' | 'stopped';

export interface ValorantRuntimeGameInfo {
  classId: number;
  id: number;
  title: string;
  displayName: string;
  processId: number;
  sessionId: string;
  executionPath: string;
  commandLine: string;
  detectedRenderer: string;
  isInFocus: boolean;
  gameIsInFocus: boolean;
  isOverlayEnabled: boolean;
  isOverlaySupported: boolean;
}

export interface ValorantRuntimeState {
  status: ValorantRuntimeStatus;
  isRunning: boolean;
  updatedAt: string;
  source: string;
  gameInfo: ValorantRuntimeGameInfo | null;
}

export interface ValproExtensionInfo {
  valorant: ValorantRuntimeState;
}

export function createValorantRuntimeState(
  status: ValorantRuntimeStatus,
  source: string,
): ValorantRuntimeState {
  return {
    status,
    isRunning: status === 'running',
    updatedAt: new Date().toISOString(),
    source,
    gameInfo: null,
  };
}

export function isValorantGameInfo(gameInfo: OverwolfRunningGameInfo) {
  return gameInfo.classId === VALORANT_CLASS_ID || Math.floor(gameInfo.id / 10) === VALORANT_CLASS_ID;
}

export function toValorantRuntimeGameInfo(gameInfo: OverwolfRunningGameInfo): ValorantRuntimeGameInfo {
  return {
    classId: gameInfo.classId,
    id: gameInfo.id,
    title: gameInfo.title,
    displayName: gameInfo.displayName,
    processId: gameInfo.processId,
    sessionId: gameInfo.sessionId,
    executionPath: gameInfo.executionPath,
    commandLine: gameInfo.commandLine,
    detectedRenderer: gameInfo.detectedRenderer,
    isInFocus: gameInfo.isInFocus,
    gameIsInFocus: gameInfo.gameIsInFocus,
    isOverlayEnabled: gameInfo.isOverlayEnabled,
    isOverlaySupported: gameInfo.isOverlaySupported,
  };
}

export function shouldOpenDesktopWindowForLaunchOrigin(origin: string) {
  return getOverwolfLaunchSource(origin) !== OVERWOLF_GAME_LAUNCH_SOURCE;
}

function getOverwolfLaunchSource(origin: string) {
  try {
    return new URL(origin).searchParams.get('source');
  } catch {
    return null;
  }
}
