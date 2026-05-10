import { GAME_DETECTION_POLL_MS } from '@/background/constants';
import { publishGameDetectionSnapshot } from '@/background/game-detection';
import { bindStreamingEvents } from '@/background/recording-controller';
import { bindValorantEvents, syncValorantGameState } from '@/background/valorant-controller';
import { getLaunchSource, openDesktopWindow } from '@/background/windows';
import { getCurrentRunningGameInfo, isOverwolfAvailable } from '@/shared/overwolf-games';

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
