"use client"

import React from "react"

type Props = {
  children: React.ReactNode
  fallback: React.ReactNode
  widgetName: string
}

type State = { hasError: boolean; error?: Error }

/**
 * Error boundary for Map/Gantt per AGENTS.md: fail-soft with fallback (list/table or skeleton).
 * Prevents widget runtime errors from crashing the whole page.
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[WidgetErrorBoundary] ${this.props.widgetName}:`, error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

/**
 * Default fallback UI for a failed widget: compact message + retry hint.
 */
export function WidgetErrorFallback({
  widgetName,
  onRetry,
}: {
  widgetName: string
  onRetry?: () => void
}) {
  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4 text-center text-sm text-amber-800 dark:text-amber-200"
      data-testid={`${widgetName.toLowerCase().replace(/\s+/g, "-")}-error-fallback`}
    >
      <span className="font-medium">{widgetName} failed to load.</span>
      <span className="text-muted-foreground">Refresh the page to try again.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-amber-600/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/30"
        >
          Retry
        </button>
      )}
    </div>
  )
}
