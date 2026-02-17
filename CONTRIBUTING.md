# Contributing to Whiteboard

Thanks for contributing.

## Prerequisites
- Node.js 22+
- pnpm 9+

## Setup
1. Install dependencies:
   - `pnpm install`
2. Run checks before opening a PR:
   - `pnpm exec tsc -p tsconfig.json --noEmit`
   - `pnpm lint`
   - `pnpm test`

## Development Notes
- Renderer code lives in `src/`.
- Electron main/preload code lives in `electron/`.
- Do not use `ipcRenderer` directly in renderer code; use preload APIs (`window.canvas`, `window.settings`, etc.).
- Render untrusted HTML only via `src/components/HtmlContent.tsx`.

## Packaging Notes
- The `afmbridge-server` binary is fetched on demand for macOS arm64 packaging via:
  - `pnpm run prepare:afmbridge`
- Build scripts call this automatically.

## Pull Requests
- Keep PRs focused.
- Include a clear description of behavior changes.
- Call out any security-sensitive changes (IPC, file access, HTML rendering, auth/token flow).
