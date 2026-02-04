"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"

/**
 * Story Header (patch.md §2.1, P1-2)
 * TR 선택 시 3초 내: Location / Schedule / Verification
 */
type StoryHeaderProps = {
  trId: string | null
  where?: string
  whenWhat?: string
  evidence?: string
}

export function StoryHeader({ trId, where, whenWhat, evidence }: StoryHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false)

  if (!trId) {
    return (
      <div
        className="min-h-[96px] rounded-xl border border-accent/30 bg-card/60 px-4 py-3"
        data-testid="story-header-empty"
        role="region"
        aria-label="TR story summary"
      >
        <div className="flex items-center justify-end gap-2 mb-2">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/20 hover:text-foreground"
            aria-label={helpOpen ? "Collapse Help" : "Expand Help"}
            title={helpOpen ? "Collapse Guide" : "Expand Guide"}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </button>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Location
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Select TR from Map (left)</p>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Schedule
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Check Timeline (center)</p>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Verification
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Verify Evidence (right)</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid min-h-[96px] gap-2 rounded-xl border border-accent/30 bg-card/60 px-4 py-3 sm:grid-cols-3 sm:gap-4"
      data-testid="story-header"
      role="region"
      aria-label="TR story summary"
    >
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Location
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={where}>
          {where ?? "—"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Schedule
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={whenWhat}>
          {whenWhat ?? "—"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Verification
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={evidence}>
          {evidence ?? "—"}
        </p>
      </div>
    </div>
  )
}
