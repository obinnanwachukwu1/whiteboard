/// <reference types="vite/client" />
/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { WhiteboardWindow } from './types/ipc'

declare global {
  interface Window extends WhiteboardWindow {}
}

export {}
