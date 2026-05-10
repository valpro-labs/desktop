import { VALORANT_GAME_CLASS_ID } from '@/background/constants';
import { publishAppEvent } from '@/shared/app-events';
import { getGameClassId, type RunningGameInfo } from '@/shared/overwolf-games';

let lastGameDetectionSignature: string | undefined;

export function publishGameDetectionSnapshot(gameInfo: RunningGameInfo | null, raw: unknown) {
  const signature = JSON.stringify({
    id: gameInfo?.id,
    classId: gameInfo?.classId,
    isRunning: gameInfo?.isRunning,
    title: gameInfo?.title
  });

  if (signature === lastGameDetectionSignature) {
    return;
  }

  lastGameDetectionSignature = signature;
  publishAppEvent({
    type: 'game.detection',
    title: gameInfo ? `Detected game: ${gameInfo.title || gameInfo.id || 'unknown'}` : 'No running game detected',
    source: 'background',
    severity: gameInfo ? 'info' : 'warning',
    payload: raw
  });
}

export function isValorantRunning(gameInfo: RunningGameInfo | null) {
  if (!gameInfo?.isRunning) {
    return false;
  }

  const gameClassId = getGameClassId(gameInfo);
  if (gameClassId === VALORANT_GAME_CLASS_ID) {
    return true;
  }

  return typeof gameInfo.title === 'string' && gameInfo.title.toLowerCase().includes('valorant');
}
