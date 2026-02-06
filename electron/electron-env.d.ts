/// <reference types="vite-plugin-electron/electron-env" />

import type { WhiteboardWindow } from '../src/types/ipc'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The built directory structure
       *
       * ```tree
       * ├─┬─┬ dist
       * │ │ └── index.html
       * │ │
       * │ ├─┬ dist-electron
       * │ │ ├── main.js
       * │ │ └── preload.js / preload.mjs
       * │
       * ```
       */
      APP_ROOT: string
      /** /dist/ or /public/ */
      VITE_PUBLIC: string
    }
  }

  interface Window extends WhiteboardWindow {
    ipcRenderer: import('electron').IpcRenderer
  }
}

export {}
