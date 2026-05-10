import * as React from "react";

import { loadAppEvents } from "../../shared/app-events";
import { getCurrentRunningGameInfo, isOverwolfAvailable } from "../../shared/overwolf-games";
import { deriveGameStatusFromEvents, formatGameStatus } from "../lib/game-status";
import { getCurrentWindow, getManifest } from "../lib/overwolf-window";

export type StatusKey = "runtime" | "manifest" | "game";

export interface LogEntry {
  id: number;
  message: string;
  payload?: unknown;
  time: string;
}

const initialStatus: Record<StatusKey, string> = {
  runtime: "Checking...",
  manifest: "Checking...",
  game: "Checking..."
};

export function useOverwolfRuntime() {
  const [statuses, setStatuses] = React.useState(initialStatus);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const currentWindowId = React.useRef<string | null>(null);
  const logId = React.useRef(0);

  const writeStatus = React.useCallback((key: StatusKey, value: string) => {
    setStatuses((current) => ({ ...current, [key]: value }));
  }, []);

  const addLog = React.useCallback((message: string, payload?: unknown) => {
    const entry: LogEntry = {
      id: logId.current++,
      message,
      payload,
      time: new Date().toLocaleTimeString()
    };
    setLogs((current) => [entry, ...current]);
  }, []);

  const refreshGameStatus = React.useCallback(async () => {
    if (!isOverwolfAvailable()) {
      writeStatus("game", "Unavailable outside Overwolf");
      return;
    }

    const { gameInfo: game, raw } = await getCurrentRunningGameInfo();
    if (game?.isRunning) {
      writeStatus("game", formatGameStatus(game));
      addLog("Running game detected", raw);
      return;
    }

    writeStatus("game", deriveGameStatusFromEvents(loadAppEvents()) ?? "No supported game running");
    addLog("No supported game running", raw);
  }, [addLog, writeStatus]);

  React.useEffect(() => {
    async function initializeOverwolf() {
      if (!isOverwolfAvailable()) {
        writeStatus("runtime", "Browser preview");
        writeStatus("manifest", "Load in Overwolf");
        writeStatus("game", "Unavailable outside Overwolf");
        addLog("Opened in browser preview mode");
        return;
      }

      writeStatus("runtime", "Overwolf API ready");

      try {
        const currentWindow = await getCurrentWindow();
        currentWindowId.current = currentWindow.id;
        addLog("Current window ready", {
          id: currentWindow.id,
          name: currentWindow.name
        });
      } catch (error) {
        addLog("Unable to read current window", {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      try {
        const manifest = await getManifest();
        writeStatus("manifest", `${manifest.meta?.name || "VALPRO"} ${manifest.meta?.version || ""}`.trim());
        addLog("Manifest loaded", {
          name: manifest.meta?.name,
          version: manifest.meta?.version
        });
      } catch (error) {
        writeStatus("manifest", "Unable to load");
        addLog("Unable to load manifest", {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      await refreshGameStatus();
    }

    initializeOverwolf();
  }, [addLog, refreshGameStatus, writeStatus]);

  const minimizeWindow = React.useCallback(() => {
    if (isOverwolfAvailable() && currentWindowId.current) {
      overwolf.windows.minimize(currentWindowId.current);
    }
  }, []);

  const closeApp = React.useCallback(() => {
    if (isOverwolfAvailable()) {
      overwolf.windows.close("background");
    }
  }, []);

  const dragMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button") || !isOverwolfAvailable() || !currentWindowId.current) {
      return;
    }

    overwolf.windows.dragMove(currentWindowId.current);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  return {
    statuses,
    logs,
    writeStatus,
    refreshGameStatus,
    minimizeWindow,
    closeApp,
    dragMove,
    clearLogs
  };
}
