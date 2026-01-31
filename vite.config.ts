import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plugin to copy pdf.js assets to the output directory
function copyPdfJsAssets(): Plugin {
  return {
    name: 'copy-pdfjs-assets',
    writeBundle() {
      const pdfJsDir = path.resolve(__dirname, 'node_modules/pdfjs-dist')
      const outDir = path.resolve(__dirname, 'dist/pdfviewer')
      
      // Ensure output directory exists
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }
      
      // Copy pdf.js core files
      const filesToCopy = [
        { src: 'build/pdf.js', dest: 'pdf.js' },
        { src: 'build/pdf.worker.js', dest: 'pdf.worker.js' },
        { src: 'web/pdf_viewer.js', dest: 'pdf_viewer.js' },
        { src: 'web/pdf_viewer.css', dest: 'pdf_viewer.css' },
      ]
      
      for (const file of filesToCopy) {
        const srcPath = path.join(pdfJsDir, file.src)
        const destPath = path.join(outDir, file.dest)
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath)
        }
      }
      
      // Copy cmaps directory for CJK support
      const cmapsSrc = path.join(pdfJsDir, 'cmaps')
      const cmapsDest = path.join(outDir, 'cmaps')
      if (fs.existsSync(cmapsSrc) && !fs.existsSync(cmapsDest)) {
        fs.mkdirSync(cmapsDest, { recursive: true })
        for (const file of fs.readdirSync(cmapsSrc)) {
          fs.copyFileSync(path.join(cmapsSrc, file), path.join(cmapsDest, file))
        }
      }
      
      // Copy our custom files from public/pdfviewer
      const publicPdfViewer = path.resolve(__dirname, 'public/pdfviewer')
      if (fs.existsSync(publicPdfViewer)) {
        for (const file of fs.readdirSync(publicPdfViewer)) {
          fs.copyFileSync(path.join(publicPdfViewer, file), path.join(outDir, file))
        }
      }
    }
  }
}

// Ensure preload stays valid CJS (no ESM export tokens)
function fixPreloadCjsExport(): Plugin {
  return {
    name: 'fix-preload-cjs-export',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist-electron')
      const preloadPath = path.join(outDir, 'preload.cjs')
      if (!fs.existsSync(preloadPath)) return
      const src = fs.readFileSync(preloadPath, 'utf8')

      let updated = src

      // Some builds incorrectly leave ESM import in the CJS preload output.
      // Electron loads preloads as classic scripts, so this must be `require`.
      const electronImportRegex = /^import\s+\{\s*contextBridge\s*,\s*ipcRenderer\s*\}\s+from\s+['"]electron['"];?\s*$/m
      if (electronImportRegex.test(updated)) {
        updated = updated.replace(
          electronImportRegex,
          'const { contextBridge, ipcRenderer } = require("electron");',
        )
      }

      const exportDefaultRegex = /export default ([a-zA-Z0-9_$]+)\(\);/
      if (exportDefaultRegex.test(updated)) {
        updated = updated.replace(exportDefaultRegex, 'module.exports = $1();')
      }

      if (updated !== src) {
        fs.writeFileSync(preloadPath, updated)
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve' || !!process.env.VITE_DEV_SERVER_URL

  return {
    base: isDev ? '/' : './',
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.{ts,tsx}'],
      exclude: ['native/**', 'dist/**', 'dist-electron/**', 'release/**', 'node_modules/**'],
    },
    optimizeDeps: {
      exclude: ['keytar'],
    },
    build: {
      chunkSizeWarningLimit: 600, // Raise limit slightly for acceptable chunks like tiptap
      rollupOptions: {
        // Suppress pdfjs-dist eval warning (it's safe - used for font loading)
        onwarn(warning, warn) {
          if (warning.code === 'EVAL' && warning.id?.includes('pdfjs-dist')) {
            return
          }
          warn(warning)
        },
        output: {
          manualChunks(id) {
            // Split large vendor libraries into separate chunks
            if (id.includes('node_modules')) {
              // TipTap editor (rich text)
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'tiptap'
              }
              // Apollo GraphQL client
              if (id.includes('@apollo') || id.includes('graphql')) {
                return 'apollo'
              }
              // React Query
              if (id.includes('@tanstack/react-query') && !id.includes('devtools')) {
                return 'react-query'
              }
              // React Router
              if (id.includes('@tanstack/react-router') && !id.includes('devtools')) {
                return 'react-router'
              }
              // Icons
              if (id.includes('lucide-react')) {
                return 'icons'
              }
              // DnD Kit
              if (id.includes('@dnd-kit')) {
                return 'dnd-kit'
              }
              // Marked (markdown)
              if (id.includes('marked')) {
                return 'marked'
              }
            }
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      copyPdfJsAssets(),
      electron([
        // Main process
        {
          entry: 'electron/main.ts',
          onstart(args) {
            // Start Electron app in development
            args.startup()
          },
          vite: {
            build: {
              rollupOptions: {
                external: ['keytar', 'onnxruntime-node'],
              },
            },
          },
        },
        // Main preload script
        {
          entry: 'electron/preload.ts',
          onstart(args) {
            // Reload the page when preload script is rebuilt
            args.reload()
          },
          vite: {
            plugins: [fixPreloadCjsExport()],
            build: {
              rollupOptions: {
                external: ['keytar'],
                output: {
                  // BrowserWindow preloads must be classic scripts (CJS), not ESM.
                  // (ESM `import` in preload will throw "Cannot use import statement outside a module".)
                  format: 'cjs',
                  entryFileNames: 'preload.cjs',
                },
              },
            },
          },
        },
      ]),
      // Polyfill the Electron and Node.js API for Renderer process
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      process.env.NODE_ENV === 'test' ? null : renderer(),
    ].filter(Boolean),
  }
})
