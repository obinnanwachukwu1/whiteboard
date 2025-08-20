import React from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

type DueItem = {
  course_id: number | string
  course_name?: string
  name: string
  dueAt: string
  pointsPossible?: number
  htmlUrl?: string
}

type Props = {
  due: DueItem[]
  loading: boolean
}

export const Dashboard: React.FC<Props> = ({ due, loading }) => {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mt-0 mb-3 text-slate-900 dark:text-slate-100 text-lg font-semibold">Coming Up</h2>
        {loading && (
          <div className="text-slate-500 dark:text-slate-400 p-4 text-sm flex items-center gap-2">
            <span>⏳</span>
            <span>Loading assignments...</span>
          </div>
        )}
        {!loading && due.length === 0 && (
          <div className="text-slate-500 dark:text-slate-400 p-4 text-sm flex items-center gap-2">
            <span>🎉</span>
            <span>No upcoming assignments</span>
          </div>
        )}
        {!loading && due.length > 0 && (
          <ul className="list-none m-0 p-0 divide-y divide-gray-200 dark:divide-slate-700">
            {due.map((d, i) => (
              <li className="py-3" key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-block w-2 h-2 rounded-full bg-brand" />
                    <div>
                      <div className="font-medium leading-snug hover:text-slate-700 transition-colors dark:hover:text-slate-100/90">{d.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {d.course_name && (
                          <span className="inline-flex items-center gap-1 mr-1.5">
                            <Badge>{d.course_name}</Badge>
                            <span>·</span>
                          </span>
                        )}
                        Due {new Date(d.dueAt).toLocaleString()}
                        {d.pointsPossible ? ` · ${d.pointsPossible} pts` : ''}
                      </div>
                    </div>
                  </div>
                  {d.htmlUrl && (
                    <a className="no-underline" href={d.htmlUrl} target="_blank" rel="noreferrer">
                      <Button size="sm">Open</Button>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
