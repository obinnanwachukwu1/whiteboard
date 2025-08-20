import React from 'react'
import { Card } from './ui/Card'
import { ExternalLink, CalendarCheck, ListChecks } from 'lucide-react'
import { useTodo, useUpcoming } from '../hooks/useCanvasQueries'
import { useToast } from './ui/Toaster'

export const Agenda: React.FC = () => {
  const upcomingQ = useUpcoming()
  const todoQ = useTodo()
  const { add: addToast } = useToast()
  const error = upcomingQ.error?.message || todoQ.error?.message || null

  React.useEffect(() => {
    if (upcomingQ.error) addToast({ title: 'Failed to load upcoming events', description: String(upcomingQ.error.message), variant: 'destructive' })
  }, [upcomingQ.error, addToast])
  React.useEffect(() => {
    if (todoQ.error) addToast({ title: 'Failed to load to‑do items', description: String(todoQ.error.message), variant: 'destructive' })
  }, [todoQ.error, addToast])

  return (
    <Card>
      <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Agenda</h2>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            <CalendarCheck className="w-3.5 h-3.5" /> Upcoming
          </div>
          {upcomingQ.isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
          {!upcomingQ.isLoading && (upcomingQ.data || []).length === 0 && (
            <div className="text-slate-500 dark:text-slate-400 text-sm">Nothing upcoming</div>
          )}
          {!upcomingQ.isLoading && (upcomingQ.data || []).length > 0 && (
            <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
              {(upcomingQ.data || []).slice(0, 6).map((ev: any, i: number) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium leading-snug hover:text-slate-700 dark:hover:text-slate-100/90 transition-colors">
                        {ev.title || ev.assignment?.name || 'Untitled'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {(ev.start_at || ev.assignment?.due_at) &&
                          new Date(ev.start_at || ev.assignment?.due_at).toLocaleString()}
                        {ev.context_name ? ` · ${ev.context_name}` : ''}
                      </div>
                    </div>
                    {ev.html_url && (
                      <a className="no-underline" href={ev.html_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            <ListChecks className="w-3.5 h-3.5" /> To‑Do
          </div>
          {todoQ.isLoading && <div className="text-slate-500 dark:text-slate-400 text-sm">Loading…</div>}
          {!todoQ.isLoading && (todoQ.data || []).length === 0 && (
            <div className="text-slate-500 dark:text-slate-400 text-sm">All caught up</div>
          )}
          {!todoQ.isLoading && (todoQ.data || []).length > 0 && (
            <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
              {(todoQ.data || []).slice(0, 6).map((t: any, i: number) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium leading-snug hover:text-slate-700 dark:hover:text-slate-100/90 transition-colors">
                        {t.title || t.assignment?.name || 'Task'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.context_name ? t.context_name : ''}
                      </div>
                    </div>
                    {t.html_url && (
                      <a className="no-underline" href={t.html_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
