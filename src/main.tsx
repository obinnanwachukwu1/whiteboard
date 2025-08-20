import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastProvider } from './components/ui/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Electron app: avoid noisy refetches
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      staleTime: 1000 * 60, // 1 minute default
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
