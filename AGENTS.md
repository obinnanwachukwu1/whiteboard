# Agent Rules

1.  **Package Manager**: Always use `pnpm` for package management. Do not use `npm` or `yarn`.
2.  **Environment**: This is an Electron + React + Vite + Tailwind project.
3.  **Security**: Adhere to the strict security guidelines established in `PLAN.md` (no `ipcRenderer`, sanitized HTML, hardened windows).
4.  **Dev Server / Build**: Do not run `pnpm dev`, `pnpm build`, or similar commands unless explicitly asked by the user.
