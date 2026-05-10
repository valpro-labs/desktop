import * as React from "react";
import { createRoot } from "react-dom/client";
import { View } from "react-native";
import { Uniwind } from "uniwind";
import {
  Button,
  MissionCard,
  Separator,
  SettingsGroup,
  SettingsRow,
  Text
} from "@valpro-labs/ui";

import iconUrl from "../../assets/icons/IconMouseOver.png";
import "./styles.css";

Uniwind.setTheme("dark");

type StatusKey = "runtime" | "manifest" | "game";

interface LogEntry {
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

function addPayload(payload: unknown) {
  return payload ? ` ${JSON.stringify(payload)}` : "";
}

function getCurrentWindow() {
  return new Promise<OverwolfWindow>((resolve, reject) => {
    window.overwolf?.windows.getCurrentWindow((result) => {
      if (result.status !== "success") {
        reject(new Error(result.error || result.status));
        return;
      }

      resolve(result.window);
    });
  });
}

function getManifest() {
  return new Promise<OverwolfManifest>((resolve, reject) => {
    const handleManifest = (result: OverwolfCallbackResult | OverwolfManifest) => {
      const manifest = "object" in result && result.object ? result.object : result;
      if (!manifest || typeof manifest !== "object" || !("meta" in manifest)) {
        reject(new Error("Manifest was not returned."));
        return;
      }

      resolve(manifest as OverwolfManifest);
    };

    if (window.overwolf?.extensions.current?.getManifest) {
      window.overwolf.extensions.current.getManifest(handleManifest);
      return;
    }

    if (window.overwolf?.extensions.getManifest) {
      window.overwolf.extensions.getManifest(handleManifest);
      return;
    }

    reject(new Error("Manifest API is not available."));
  });
}

function getRunningGameInfo() {
  return new Promise<OverwolfGameInfo>((resolve) => {
    window.overwolf?.games.getRunningGameInfo((info) => resolve(info));
  });
}

function App() {
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
    if (!window.overwolf) {
      writeStatus("game", "Unavailable outside Overwolf");
      return;
    }

    const game = await getRunningGameInfo();
    if (game?.isRunning) {
      writeStatus("game", `${game.title || "Running game"} (${game.id})`);
      addLog("Running game detected", game);
      return;
    }

    writeStatus("game", "No supported game running");
    addLog("No supported game running");
  }, [addLog, writeStatus]);

  React.useEffect(() => {
    async function initializeOverwolf() {
      if (!window.overwolf) {
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
        writeStatus(
          "manifest",
          `${manifest.meta?.name || "Valpro Labs Desktop"} ${manifest.meta?.version || ""}`.trim()
        );
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
    if (window.overwolf && currentWindowId.current) {
      window.overwolf.windows.minimize(currentWindowId.current);
    }
  }, []);

  const closeApp = React.useCallback(() => {
    if (window.overwolf) {
      window.overwolf.windows.close("background");
    }
  }, []);

  const dragMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button") || !window.overwolf || !currentWindowId.current) {
      return;
    }

    window.overwolf.windows.dragMove(currentWindowId.current);
  }, []);

  return (
    <div className="app">
      <header className="titlebar" data-drag-region onMouseDown={dragMove}>
        <div className="brand">
          <img src={iconUrl} alt="" />
          <div className="brand-copy">
            <Text className="text-base font-bold leading-tight">Valpro Labs</Text>
            <Text className="text-muted-foreground text-xs leading-tight">React + @valpro-labs/ui</Text>
          </div>
        </div>

        <div className="window-actions">
          <button type="button" className="window-button" onClick={minimizeWindow} aria-label="Minimize">
            _
          </button>
          <button type="button" className="window-button danger" onClick={closeApp} aria-label="Close">
            x
          </button>
        </div>
      </header>

      <main className="shell">
        <section className="main-column">
          <div className="hero">
            <div className="hero-copy">
              <Text className="eyebrow">Desktop App Starter</Text>
              <Text variant="h1" className="text-left text-4xl">
                Native Overwolf app is ready.
              </Text>
            </div>
            <Button onPress={refreshGameStatus}>
              <Text>Refresh</Text>
            </Button>
          </div>

          <section className="status-grid" aria-label="Runtime status">
            <StatusCard label="Runtime" value={statuses.runtime} />
            <StatusCard label="Manifest" value={statuses.manifest} />
            <StatusCard label="Game" value={statuses.game} />
          </section>

          <section className="panel">
            <div className="panel-header">
              <Text variant="h4">Event Log</Text>
              <Button variant="ghost" size="sm" onPress={() => setLogs([])}>
                <Text>Clear</Text>
              </Button>
            </div>
            <ol className="log">
              {logs.map((log) => (
                <li key={log.id}>
                  [{log.time}] {log.message}
                  {addPayload(log.payload)}
                </li>
              ))}
            </ol>
          </section>
        </section>

        <aside className="side-column">
          <section className="library-panel" aria-label="@valpro-labs/ui preview">
            <Text className="eyebrow">@valpro-labs/ui</Text>
            <Text variant="h4">Library preview</Text>
            <View className="library-stack">
              <MissionCard
                title="Win 10 Competitive matches"
                xpReward={15000}
                progress={4}
                total={10}
              />
              <SettingsGroup label="Desktop shell">
                <SettingsRow label="Renderer" rightSlot={<Text className="text-muted-foreground text-sm">React</Text>} />
                <Separator />
                <SettingsRow label="UI package" rightSlot={<Text className="text-muted-foreground text-sm">1.9.10</Text>} />
              </SettingsGroup>
            </View>
          </section>
        </aside>
      </main>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="status-card">
      <Text className="text-muted-foreground text-xs font-extrabold uppercase">{label}</Text>
      <Text className="text-xl font-bold leading-snug">{value}</Text>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
