export interface RunningGameSnapshot {
  gameInfo: OverwolfGameInfo | null;
  raw: unknown;
}

export function getCurrentRunningGameInfo() {
  return new Promise<RunningGameSnapshot>((resolve) => {
    if (!window.overwolf) {
      resolve({ gameInfo: null, raw: null });
      return;
    }

    if (window.overwolf.games.getRunningGameInfo2) {
      window.overwolf.games.getRunningGameInfo2((result) => {
        resolve({
          gameInfo: result.gameInfo ?? null,
          raw: result
        });
      });
      return;
    }

    window.overwolf.games.getRunningGameInfo((result) => {
      resolve({
        gameInfo: result?.isRunning ? result : null,
        raw: result
      });
    });
  });
}

export function getGameClassId(gameInfo: OverwolfGameInfo | null) {
  if (!gameInfo) {
    return undefined;
  }

  if (typeof gameInfo.classId === "number") {
    return gameInfo.classId;
  }

  const gameId = gameInfo.gameId ?? gameInfo.id;
  if (typeof gameId === "number") {
    return Math.floor(gameId / 10);
  }

  return undefined;
}
