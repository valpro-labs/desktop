# VALPRO

Minimal Overwolf Native starter using React, Vite, and `@valpro-labs/ui`.

## Prerequisites

- Windows with the Overwolf desktop client installed.
- An Overwolf account enabled for loading unpacked extensions.
- Node.js 20 or newer.

## Install

```powershell
npm install
```

## Build

```powershell
npm run build
```

The background and React desktop windows are built into `dist/windows/`, which is the folder declared in `manifest.json`.

## Run In Overwolf

1. Run `npm run build`.
2. Open Overwolf.
3. Open Settings, then the Packages or Development Options screen.
4. Choose Load unpacked extension.
5. Select this project folder.
6. Launch `VALPRO` from the Overwolf dock.

The app starts from `dist/windows/background/background.html`, then opens the native React desktop window declared in `manifest.json`.

## Overwolf Dev Mode

For live Vite development inside Overwolf, run:

```powershell
npm.cmd run dev
```

Then load this project folder as an unpacked extension in Overwolf:

```text
F:\Code\valpro-labs\desktop
```

The manifest keeps local `file` entries for packaged builds, but in unpacked dev mode Overwolf uses the `debug_url` entries:

- `http://127.0.0.1:5173/background/background.html`
- `http://127.0.0.1:5173/desktop/desktop.html`

Keep the Vite server running while testing in Overwolf. If Overwolf complains that a `dist/windows/...` file does not exist, run `npm.cmd run build` once so the mandatory local files exist, then continue using `npm.cmd run dev` for live edits.

## Browser Preview

```powershell
npm run dev
```

Open `http://127.0.0.1:5173/desktop/desktop.html`. Browser preview shows the UI shell, but native Overwolf APIs are only available after loading the built extension in Overwolf.

## Project Layout

- `manifest.json` declares app metadata, developer auto-refresh, and the two windows.
- `src/background/main.ts` contains the minimal background startup script that opens the desktop window.
- `src/desktop/` contains the React desktop window source.
- `assets/icons/` contains the dock/window icon assets referenced by the manifest.

## Add Features Back Later

- Add permissions such as `GameInfo`, `Streaming`, or `Tray` only when a feature needs them.
- Add `game_targeting`, `game_events`, and `launch_events` when you are ready to support a specific game.
- Add recording, activity, diagnostics, and dashboard panels as separate desktop components.

## Official References

- Overwolf Native getting started: https://dev.overwolf.com/ow-native/getting-started/overview/
- Basic one-window app: https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/creating-a-basic-one-window-app/
- Manifest reference: https://dev.overwolf.com/ow-native/reference/manifest/manifest-json/
- Official sample app: https://github.com/overwolf/sample-app/
