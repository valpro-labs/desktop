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
    classId?: number;
    id?: number;
    gameId?: number;
    isRunning?: boolean;
    title?: string;
    [key: string]: unknown;
  }

  interface OverwolfGameInfoUpdatedEvent {
    gameInfo?: OverwolfGameInfo | null;
    reason?: string;
    [key: string]: unknown;
  }

  interface OverwolfEvent<TCallback extends (...args: any[]) => void> {
    addListener: (callback: TCallback) => void;
    removeListener?: (callback: TCallback) => void;
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
      onAppLaunchTriggered: OverwolfEvent<(origin?: string) => void>;
    };
    games: {
      events: {
        setRequiredFeatures: (
          features: string[],
          callback: (result: OverwolfSetRequiredFeaturesResult) => void
        ) => void;
        getInfo: (callback: (result: OverwolfGameEventsGetInfoResult) => void) => void;
        onError: OverwolfEvent<(event: OverwolfGameEventsErrorEvent) => void>;
        onInfoUpdates2: OverwolfEvent<(event: OverwolfInfoUpdates2Event) => void>;
        onNewEvents: OverwolfEvent<(event: OverwolfNewGameEvents) => void>;
      };
      getRunningGameInfo: (callback: (info: OverwolfGameInfo) => void) => void;
      getRunningGameInfo2?: (callback: (result: OverwolfGetRunningGameInfoResult) => void) => void;
      onGameInfoUpdated: OverwolfEvent<(event: OverwolfGameInfoUpdatedEvent) => void>;
      onGameLaunched: OverwolfEvent<(gameInfo: OverwolfGameInfo) => void>;
    };
    streaming: {
      enums: {
        StreamingProvider: {
          VideoRecorder: string;
        };
      };
      start: (
        settings: OverwolfStreamSettings,
        callback: (result: OverwolfStreamResult) => void
      ) => void;
      stop: (
        streamId: number,
        callback?: (result: OverwolfStopStreamingResult) => void
      ) => void;
      onStartStreaming: OverwolfEvent<(event: OverwolfStreamEvent) => void>;
      onStopStreaming: OverwolfEvent<(event: OverwolfStopStreamingResult) => void>;
      onStreamingError: OverwolfEvent<(event: OverwolfStreamEvent) => void>;
      onStreamingWarning: OverwolfEvent<(event: OverwolfStreamEvent) => void>;
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

  interface OverwolfStreamSettings {
    provider: string;
    settings: {
      audio?: {
        mic?: {
          enable?: boolean;
          volume?: number;
        };
        game?: {
          enable?: boolean;
          volume?: number;
        };
      };
      video?: {
        auto_calc_kbps?: boolean;
        fps?: number;
        width?: number;
        height?: number;
        max_kbps?: number;
        include_full_size_video?: boolean;
        game_window_capture?: {
          enable_when_available?: boolean;
          capture_overwolf_windows?: boolean;
        };
      };
      quota?: {
        max_quota_gb?: number;
        excluded_directories?: string[];
      };
    };
  }

  interface OverwolfStreamResult extends OverwolfCallbackResult {
    stream_id?: number;
  }

  interface OverwolfStreamEvent extends OverwolfCallbackResult {
    stream_id?: number;
    [key: string]: unknown;
  }

  interface OverwolfStopStreamingResult extends OverwolfCallbackResult {
    success?: boolean;
    stream_id?: number;
    url?: string;
    file_path?: string;
    duration?: number;
    [key: string]: unknown;
  }

  interface OverwolfSetRequiredFeaturesResult {
    success: boolean;
    error?: string;
    supportedFeatures?: string[];
  }

  interface OverwolfGameEventsGetInfoResult {
    success: boolean;
    error?: string;
    info?: OverwolfGameEventsInfo;
    [key: string]: unknown;
  }

  interface OverwolfInfoUpdates2Event {
    feature?: string;
    info?: OverwolfGameEventsInfo;
    [key: string]: unknown;
  }

  interface OverwolfNewGameEvents {
    events?: OverwolfGameEvent[];
  }

  interface OverwolfGameEvent {
    name: string;
    data?: unknown;
  }

  interface OverwolfGameEventsErrorEvent {
    reason?: string;
    [key: string]: unknown;
  }

  interface OverwolfGameEventsInfo {
    game_info?: Record<string, unknown>;
    match_info?: Record<string, unknown>;
    [feature: string]: Record<string, unknown> | undefined;
  }

  interface OverwolfGetRunningGameInfoResult {
    success: boolean;
    error?: string;
    gameInfo?: OverwolfGameInfo | null;
  }
}

export {};
