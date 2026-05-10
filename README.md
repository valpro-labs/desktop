# Valpro Labs Desktop

Overwolf Native starter using plain HTML, CSS, and JavaScript.

## Prerequisites

- Windows with the Overwolf desktop client installed.
- An Overwolf account enabled for loading unpacked extensions.

## Run In Overwolf

1. Open Overwolf.
2. Open Settings, then the Packages or Development Options screen.
3. Choose Load unpacked extension.
4. Select this folder: `f:\Code\valpro-labs\desktop`.
5. Launch `Valpro Labs Desktop` from the Overwolf dock.

The app starts from `windows/background/background.html`, then opens the desktop window declared in `manifest.json`.

## Project Layout

- `manifest.json` declares app metadata, permissions, developer auto-refresh, and windows.
- `windows/background/` owns startup orchestration.
- `windows/desktop/` contains the visible desktop UI.
- `assets/icons/` contains the dock/window icon assets referenced by the manifest.

## Next Steps

- Add an in-game window under `manifest.json > data.windows`.
- Add `game_targeting`, `game_events`, and `launch_events` when you choose the game IDs to support.
- Add hotkeys under `manifest.json > data.hotkeys` for overlay show/hide behavior.

## Official References

- Overwolf Native getting started: https://dev.overwolf.com/ow-native/getting-started/overview/
- Basic one-window app: https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/creating-a-basic-one-window-app/
- Manifest reference: https://dev.overwolf.com/ow-native/reference/manifest/manifest-json/
- Official sample app: https://github.com/overwolf/sample-app/

