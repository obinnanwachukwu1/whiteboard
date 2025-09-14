import React, { useRef, useState } from 'react'
import { Button } from './ui/Button'
import { ArrowLeft, RefreshCw } from 'lucide-react'

type Props = {
  initialUrl: string
  onBackToApp: () => void
}

export const ExternalBrowser: React.FC<Props> = ({ initialUrl, onBackToApp }) => {
  const ref = useRef<any>(null)
  // track URL only for display
  const [url, setUrl] = useState(initialUrl)

  const updateNav = () => {
    const wv = ref.current as Electron.WebviewTag | null
    if (!wv) return
    setUrl(wv.getURL())
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={onBackToApp}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">{url}</div>
        <Button variant="ghost" size="sm" onClick={() => ref.current?.reload?.()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <webview
        ref={ref}
        src={initialUrl}
        style={{ display: 'inline-flex', width: '100%', height: '100%' }}
        allowpopups
        partition="persist:canvas"
        onLoad={() => updateNav()}
      />
    </div>
  )
}
