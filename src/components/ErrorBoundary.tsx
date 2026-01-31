import React from 'react'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type State = { hasError: boolean; error: any }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-sm text-red-700 dark:text-red-300">
            <div className="font-semibold mb-1">Something went wrong.</div>
            <div className="opacity-80 break-words">
              {String(this.state.error?.message || this.state.error)}
            </div>
            <div className="mt-3 text-slate-500 dark:text-neutral-400">
              Try reloading or navigating back.
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
