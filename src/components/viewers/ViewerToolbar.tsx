import React from 'react'
import { Download } from 'lucide-react'

type Props = {
  onDownload?: () => void
  disableDownload?: boolean
}

export const ViewerToolbar: React.FC<Props> = ({ onDownload, disableDownload }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/95 dark:bg-neutral-900/95 shadow-xl rounded-full border border-gray-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={onDownload}
        disabled={disableDownload}
        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        title="Download"
      >
        <Download className="w-4 h-4" />
        <span>Download</span>
      </button>
    </div>
  )
}

export default ViewerToolbar
