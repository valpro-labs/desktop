import { getCurrentRunningGameInfo, isOverwolfAvailable } from '../shared/overwolf-games';
import { GAME_DETECTION_POLL_MS } from './constants';
import { publishGameDetectionSnapshot } from './game-detection';
import { bindStreamingEvents } from './recording-controller';
import { bindValorantEvents, syncValorantGameState } from './valorant-controller';
import { getLaunchSource, openDesktopWindow } from './windows';

export async function boot() {
  if (!isOverwolfAvailable()) {
    console.info('Overwolf API is not available. Load this folder as an unpacked Overwolf extension.');
    return;
  }

  bindStreamingEvents();
  bindValorantEvents();
  syncRecordingWithRunningGame();
  window.setInterval(syncRecordingWithRunningGame, GAME_DETECTION_POLL_MS);

  overwolf.extensions.onAppLaunchTriggered.addListener((event) => {
    const source = getLaunchSource(event.origin);
    if (source === 'gamelaunchevent') {
      syncRecordingWithRunningGame();
      return;
    }

    openDesktopWindow().catch((error: unknown) => console.error(error));
  });

  try {
    if (getLaunchSource() !== 'gamelaunchevent') {
      await openDesktopWindow();
    }
  } catch (error) {
    console.error(error);
  }
}

function syncRecordingWithRunningGame() {
  getCurrentRunningGameInfo().then(({ gameInfo, raw }) => {
    publishGameDetectionSnapshot(gameInfo, raw);
    syncValorantGameState(gameInfo);
  });
}
