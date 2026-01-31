import { SettingsSection } from './SettingsSection'
import { useAppFlags } from '../../context/AppContext'

export function AboutSettings() {
  const { embeddingsEnabled } = useAppFlags()

  return (
    <SettingsSection title="About">
      <div className="px-4 py-3">
        <div className="text-sm text-slate-600 dark:text-neutral-400 space-y-2">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Whiteboard</strong> is an open-source Canvas LMS client designed for speed and focus.
          </p>
          <p>
            Your data (tokens, cache, and search index) is stored locally on your device.
            {embeddingsEnabled && ' AI features run entirely on-device.'}
          </p>
          <div className="flex gap-4 text-xs pt-2">
            <a
              href="https://github.com/obinnanwachukwu/whiteboard"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://github.com/obinnanwachukwu/whiteboard/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              License (GPLv3)
            </a>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
