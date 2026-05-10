import type { AppEvent } from '../../shared/app-events';
import { getGameClassId, type RunningGameInfo } from '../../shared/overwolf-games';

export function deriveGameStatusFromEvents(events: AppEvent[]) {
  const lastValorantClosed = events.find((event) => event.type === 'valorant.closed');
  const lastValorantActive = events.find(isValorantActiveEvent);

  if (lastValorantActive && isNewerThan(lastValorantActive, lastValorantClosed)) {
    return getValorantStatusLabel(lastValorantActive);
  }

  const lastGameDetection = events.find((event) => event.type === 'game.detection');
  if (!lastGameDetection) {
    return null;
  }

  const gameInfo = getGameInfoFromPayload(lastGameDetection.payload);
  if (gameInfo?.isRunning) {
    return formatGameStatus(gameInfo);
  }

  return 'No supported game running';
}

export function formatGameStatus(gameInfo: RunningGameInfo) {
  return `${gameInfo.title || 'Running game'} (${getGameClassId(gameInfo) ?? gameInfo.id ?? 'unknown'})`;
}

function isValorantActiveEvent(event: AppEvent) {
  return (
    event.type === 'valorant.detected' ||
    event.type === 'valorant.events.registered' ||
    event.type === 'valorant.game-event' ||
    event.type === 'valorant.info-update' ||
    event.type === 'valorant.match.started' ||
    event.type === 'recording.starting' ||
    event.type === 'recording.started' ||
    event.type === 'recording.stopping'
  );
}

function getValorantStatusLabel(event: AppEvent) {
  if (event.type === 'valorant.events.registered') {
    return 'VALORANT events ready';
  }

  if (event.type === 'valorant.match.started') {
    return 'VALORANT match active';
  }

  if (event.type.startsWith('recording.')) {
    return 'VALORANT recording';
  }

  return 'VALORANT (21640)';
}

function isNewerThan(event: AppEvent, comparedEvent?: AppEvent) {
  if (!comparedEvent) {
    return true;
  }

  return new Date(event.timestamp).getTime() > new Date(comparedEvent.timestamp).getTime();
}

function getGameInfoFromPayload(payload: unknown): RunningGameInfo | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as { gameInfo?: unknown; isRunning?: unknown };
  if (candidate.gameInfo && typeof candidate.gameInfo === 'object') {
    return candidate.gameInfo as RunningGameInfo;
  }

  if (typeof candidate.isRunning === 'boolean') {
    return candidate as RunningGameInfo;
  }

  return null;
}
