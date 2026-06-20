import {
  createValorantRuntimeState,
  isValorantGameInfo,
  type OverwolfRunningGameInfo,
  shouldOpenDesktopWindowForLaunchOrigin,
  toValorantRuntimeGameInfo,
  type ValorantRuntimeState,
  type ValproExtensionInfo,
} from '@/shared/overwolf';

const DESKTOP_WINDOW = 'desktop';

let valorantRuntimeState: ValorantRuntimeState = createValorantRuntimeState('unknown', 'background-start');

if (isOverwolfAvailable()) {
  startValorantDetection();

  if (shouldOpenDesktopWindowForLaunchOrigin(window.location.href)) {
    openDesktopWindow();
  }

  overwolf.extensions.onAppLaunchTriggered.addListener((event) => {
    console.info('[VALPRO] App launch triggered', event);

    if (!shouldOpenDesktopWindowForLaunchOrigin(event.origin)) {
      refreshRunningGame('app-launch-triggered');
      return;
    }

    openDesktopWindow();
  });
} else {
  console.info('Overwolf API is unavailable. Build the app and load it as an unpacked Overwolf extension.');
}

function isOverwolfAvailable() {
  return typeof overwolf !== 'undefined';
}

function startValorantDetection() {
  publishValorantState();
  refreshRunningGame('initial-scan');

  overwolf.games.onGameLaunched.addListener((gameInfo) => {
    if (isValorantGameInfo(gameInfo)) {
      setValorantRunning(gameInfo, 'game-launched');
    }
  });

  overwolf.games.onGameInfoUpdated.addListener((event) => {
    const gameInfo = event.gameInfo;

    if (gameInfo && isValorantGameInfo(gameInfo)) {
      if (gameInfo.isRunning) {
        setValorantRunning(gameInfo, 'game-info-updated');
      } else {
        setValorantStopped('game-info-updated');
      }

      return;
    }

    if (!gameInfo && event.runningChanged && valorantRuntimeState.isRunning) {
      setValorantStopped('game-info-updated');
    }
  });
}

function refreshRunningGame(source: string) {
  overwolf.games.getRunningGameInfo2((result) => {
    if (!result.success) {
      console.error('[VALPRO] Unable to read running game info', result.error);
      return;
    }

    if (result.gameInfo && isValorantGameInfo(result.gameInfo)) {
      setValorantRunning(result.gameInfo, source);
      return;
    }

    if (!result.gameInfo && valorantRuntimeState.status === 'unknown') {
      setValorantStopped(source);
    }
  });
}

function setValorantRunning(gameInfo: OverwolfRunningGameInfo, source: string) {
  const previousSessionId = valorantRuntimeState.gameInfo?.sessionId;
  const wasRunning = valorantRuntimeState.isRunning;

  valorantRuntimeState = {
    status: 'running',
    isRunning: true,
    updatedAt: new Date().toISOString(),
    source,
    gameInfo: toValorantRuntimeGameInfo(gameInfo),
  };

  publishValorantState();

  if (!wasRunning || previousSessionId !== gameInfo.sessionId) {
    console.info('[VALPRO] VALORANT detected', valorantRuntimeState.gameInfo);
  }
}

function setValorantStopped(source: string) {
  if (valorantRuntimeState.status === 'stopped') {
    return;
  }

  valorantRuntimeState = createValorantRuntimeState('stopped', source);
  publishValorantState();
  console.info('[VALPRO] VALORANT stopped');
}

function publishValorantState() {
  const extensionInfo: ValproExtensionInfo = {
    valorant: valorantRuntimeState,
  };

  overwolf.extensions.setInfo(extensionInfo);
}

function openDesktopWindow() {
  overwolf.windows.obtainDeclaredWindow(DESKTOP_WINDOW, (result) => {
    if (!result.success) {
      console.error(`Unable to obtain ${DESKTOP_WINDOW} window`, result.error);
      return;
    }

    overwolf.windows.restore(result.window.id, (restoreResult) => {
      if (restoreResult && !restoreResult.success) {
        console.error(`Unable to restore ${DESKTOP_WINDOW} window`, restoreResult.error);
      }
    });
  });
}
