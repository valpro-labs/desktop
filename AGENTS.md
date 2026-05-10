# Agent Instructions

## Desktop UI Direction

Build the desktop app as a focused, operational dashboard for VALPRO rather than a marketing page or game launcher.

The visual language should feel close to shadcn dashboards: calm app chrome, clear hierarchy, thin separators, restrained surfaces, dense but readable spacing, and small radii. Keep the VALPRO identity through the existing `@valpro-labs/ui` components and design tokens instead of adding another UI system.

Favor layouts that reveal real product state: capture readiness, game/runtime status, recordings, activity, and diagnostics. If a feature does not exist yet, avoid pretending it does with empty navigation or decorative sections. Let secondary/dev-facing information stay secondary.

## Desktop Architecture

Keep page files easy to scan. `src/desktop/App.tsx` should primarily compose hooks, data, and top-level regions; substantial UI regions should live in named components under `src/desktop/components/`.

When adding UI, prefer components that describe product concepts or layout regions over large anonymous markup blocks. Keep styling consistent with the existing CSS/token approach unless the project establishes a different convention.

## Commit Messages

Use Conventional Commits, keep messages short, and do not end summaries with a period.

Common types: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `build`, `ci`, `chore`.

Examples:

```text
feat: add Overwolf native starter
fix: restore desktop window on app relaunch
docs: update setup notes
```
