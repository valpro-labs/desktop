export function createRecordingSettings(): overwolf.streaming.StreamSettings {
  return {
    provider: "VideoRecorder" as overwolf.streaming.enums.StreamingProvider,
    settings: {
      audio: {
        mic: { enable: false, volume: 0 },
        game: {
          enable: true,
          volume: 100,
          filtered_capture: {
            enable: false,
            additional_process_names: []
          }
        }
      },
      video: {
        auto_calc_kbps: false,
        fps: 60,
        width: 1920,
        height: 1080,
        max_kbps: 12000,
        include_full_size_video: true,
        game_window_capture: {
          enable_when_available: true,
          capture_overwolf_windows: false
        }
      },
      quota: {
        max_quota_gb: 10
      }
    }
  };
}
