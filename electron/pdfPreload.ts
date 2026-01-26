/**
 * PDF Viewer Preload Script (CommonJS)
 *
 * IMPORTANT: Electron preloads are loaded as classic scripts (not ES modules),
 * so this file must not use `import` syntax.
 *
 * Security considerations:
 * - No Node.js APIs exposed
 * - IPC only to main process (no sendToHost)
 * - Validates message payloads
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge: pdfContextBridge, ipcRenderer: pdfIpcRenderer } = require('electron') as typeof import('electron')

// Valid command types that can be received from parent
const VALID_COMMANDS = new Set([
  'LOAD_PDF',
  'GO_TO_PAGE',
  'NEXT_PAGE',
  'PREV_PAGE',
  'SET_SCALE',
  'SET_SCALE_MODE',
  'ZOOM_IN',
  'ZOOM_OUT',
  'SET_SELECTION_MODE',
  'GET_STATE',
  'SET_THEME',
  'SET_APP_STYLE',
  'DOWNLOAD',
])

// Valid event types that can be sent to parent
const VALID_EVENTS = new Set([
  'READY',
  'DOC_LOADED',
  'PAGE_CHANGED',
  'SCALE_CHANGED',
  'SELECTION_MODE_CHANGED',
  'STATE',
  'ERROR',
  'LOADING_STARTED',
  'COPY',
  'DOWNLOAD_REQUESTED',
])

// Store command handler callback
let commandHandler: ((command: any) => void) | null = null

// Listen for commands from owner window via IPC
pdfIpcRenderer.on('viewer-command', (_event, command) => {
  // Validate command has required type
  if (!command || typeof command !== 'object' || !command.type) {
    console.warn('[pdfPreload] Invalid command received:', command)
    return
  }
  
  // Validate command type is allowed
  if (!VALID_COMMANDS.has(command.type)) {
    console.warn('[pdfPreload] Unknown command type:', command.type)
    return
  }
  
  // Forward to registered handler
  if (commandHandler) {
    commandHandler(command)
  }
})

// Expose minimal bridge API to the webview content
pdfContextBridge.exposeInMainWorld('pdfBridge', {
  /**
   * Register a callback to receive commands from parent
   */
  onCommand: (callback: (command: any) => void) => {
    if (typeof callback === 'function') {
      commandHandler = callback
    }
  },
  
  /**
   * Send an event to the parent renderer
   */
  sendToParent: (event: { type: string; [key: string]: any }) => {
    // Validate event structure
    if (!event || typeof event !== 'object' || !event.type) {
      console.warn('[pdfPreload] Invalid event:', event)
      return
    }
    
    // Validate event type is allowed
    if (!VALID_EVENTS.has(event.type)) {
      console.warn('[pdfPreload] Unknown event type:', event.type)
      return
    }
    
    // Sanitize payload - only allow primitive values and simple objects
    const sanitizedEvent = sanitizePayload(event)
    
    // Main process routes to owning window.
    try {
      pdfIpcRenderer.send('viewer:event', sanitizedEvent)
    } catch {}
  },
})

/**
 * Sanitize event payload to prevent injection attacks
 * Only allows primitive values, arrays of primitives, and simple objects
 */
function sanitizePayload(obj: any, depth = 0): any {
  // Prevent deeply nested objects (potential DoS)
  if (depth > 5) {
    return undefined
  }
  
  if (obj === null || obj === undefined) {
    return obj
  }
  
  const type = typeof obj
  
  // Allow primitives
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return obj
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePayload(item, depth + 1)).filter(item => item !== undefined)
  }
  
  // Handle plain objects
  if (type === 'object') {
    const result: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      // Only allow alphanumeric keys
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        const value = sanitizePayload(obj[key], depth + 1)
        if (value !== undefined) {
          result[key] = value
        }
      }
    }
    return result
  }
  
  // Reject functions, symbols, etc.
  return undefined
}
