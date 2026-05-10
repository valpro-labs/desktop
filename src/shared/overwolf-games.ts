export type RunningGameInfo =
  | overwolf.games.RunningGameInfo
  | overwolf.games.GetRunningGameInfoResult
  | overwolf.games.GetRunningGameInfoResult2GameInfo;

export interface RunningGameSnapshot {
  gameInfo: RunningGameInfo | null;
  raw: unknown;
}

export function isOverwolfAvailable() {
  return typeof overwolf !== "undefined";
}

export function getCurrentRunningGameInfo() {
  return new Promise<RunningGameSnapshot>((resolve) => {
    if (!isOverwolfAvailable()) {
      resolve({ gameInfo: null, raw: null });
      return;
    }

    if (typeof overwolf.games.getRunningGameInfo2 === "function") {
      overwolf.games.getRunningGameInfo2((result) => {
        resolve({
          gameInfo: result.gameInfo ?? null,
          raw: result
        });
      });
      return;
    }

    overwolf.games.getRunningGameInfo((result) => {
      resolve({
        gameInfo: result?.isRunning ? result : null,
        raw: result
      });
    });
  });
}

export function getGameClassId(gameInfo: RunningGameInfo | null) {
  if (!gameInfo) {
    return undefined;
  }

  if (typeof gameInfo.classId === "number") {
    return gameInfo.classId;
  }

  const gameId = (gameInfo as RunningGameInfo & { gameId?: number }).gameId ?? gameInfo.id;
  if (typeof gameId === "number") {
    return Math.floor(gameId / 10);
  }

  return undefined;
}
