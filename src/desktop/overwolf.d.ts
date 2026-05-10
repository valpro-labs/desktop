declare global {
  type OverwolfStatus = "success" | string;

  interface OverwolfCallbackResult {
    status: OverwolfStatus;
    error?: string;
    object?: unknown;
  }

  interface OverwolfWindow {
    id: string;
    name: string;
  }

  interface OverwolfWindowResult extends OverwolfCallbackResult {
    window: OverwolfWindow;
  }

  interface OverwolfGameInfo {
    id?: number;
    isRunning?: boolean;
    title?: string;
    [key: string]: unknown;
  }

  interface OverwolfManifest {
    meta?: {
      name?: string;
      version?: string;
    };
  }

  interface OverwolfApi {
    extensions: {
      current?: {
        getManifest?: (callback: (result: OverwolfCallbackResult | OverwolfManifest) => void) => void;
      };
      getManifest?: (callback: (result: OverwolfCallbackResult | OverwolfManifest) => void) => void;
      onAppLaunchTriggered: {
        addListener: (callback: () => void) => void;
      };
    };
    games: {
      getRunningGameInfo: (callback: (info: OverwolfGameInfo) => void) => void;
    };
    windows: {
      close: (windowName: string) => void;
      dragMove: (windowId: string) => void;
      getCurrentWindow: (callback: (result: OverwolfWindowResult) => void) => void;
      minimize: (windowId: string) => void;
      obtainDeclaredWindow: (
        windowName: string,
        callback: (result: OverwolfWindowResult) => void
      ) => void;
      restore: (
        windowId: string,
        callback?: (result?: OverwolfCallbackResult) => void
      ) => void;
    };
  }

  interface Window {
    overwolf?: OverwolfApi;
  }
}

export {};
