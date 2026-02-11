"use client"

import { AlertTriangle, ExternalLink, X } from "lucide-react"
import type { ScheduleConflict, SuggestedAction } from "@/lib/ssot/schedule"
import { getCollisionHeadline } from "@/src/lib/collision-card"

type WhyPanelProps = {
  collision: ScheduleConflict | null
  onClose: () => void
  onViewInTimeline?: (collision: ScheduleConflict, activityId?: string) => void
  onJumpToEvidence?: (collision: ScheduleConflict) => void
  onJumpToHistory?: (collision: ScheduleConflict) => void
  onRelatedActivityClick?: (activityId: string) => void
  onApplyAction?: (collision: ScheduleConflict, action: SuggestedAction) => void
  onOpenWhyDetail?: (collision: ScheduleConflict) => void
}

export function WhyPanel({
  collision,
  onClose,
  onViewInTimeline,
  onJumpToEvidence,
  onJumpToHistory,
  onRelatedActivityClick,
  onApplyAction,
  onOpenWhyDetail,
}: WhyPanelProps) {
  if (!collision) return null

  const severityStyles: Record<ScheduleConflict["severity"], string> = {
    warn: "border-amber-400/60 bg-amber-500/15 text-amber-200",
    error: "border-red-400/60 bg-red-500/15 text-red-200",
  }

  const severityLabels: Record<ScheduleConflict["severity"], string> = {
    warn: "Warning",
    error: "Critical",
  }

  const typeLabels: Record<ScheduleConflict["type"], string> = {
    RESOURCE: "Resource",
    CONSTRAINT: "Constraint",
    LOCK_VIOLATION: "Lock",
    DEPENDENCY_CYCLE: "Dependency",
  }

  const suggestedActions = collision.suggested_actions ?? []
  const headline = getCollisionHeadline(collision)
  const activityIds = collision.activity_ids ?? collision.related_activity_ids ?? [collision.activity_id]
  const resourceIds = collision.resource_ids ?? (collision.resource ? [collision.resource] : [])

  return (
    <div
      className="rounded-xl border border-red-500/30 bg-red-900/20 p-3"
      data-testid="why-panel"
      role="region"
      aria-label="Why delayed"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
          <AlertTriangle className="h-4 w-4" />
          Collision Card
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm font-semibold text-foreground">{headline}</p>
      <p className="mt-1 text-xs text-slate-300">{collision.message}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase">
        <span className={`rounded-full border px-2 py-0.5 tracking-wide ${severityStyles[collision.severity]}`}>
          {severityLabels[collision.severity]}
        </span>
        <span className="rounded-full border border-slate-600/60 bg-slate-800/60 px-2 py-0.5 text-slate-200">
          {typeLabels[collision.type]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700/80"
          onClick={() => onViewInTimeline?.(collision, collision.activity_id)}
        >
          View in Timeline
        </button>
        <button
          type="button"
          className="rounded border border-cyan-600/60 px-3 py-1 text-xs font-semibold text-cyan-200 hover:border-cyan-400"
          onClick={() => onOpenWhyDetail?.(collision)}
        >
          Why 상세 열기
        </button>
      </div>

      {suggestedActions.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-300">Suggested actions</div>
          <ul className="mt-1.5 space-y-1">
            {suggestedActions.map((action, idx) => (
              <li key={`${action.kind}-${idx}`}>
                <button
                  type="button"
                  className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25"
                  onClick={() => onApplyAction?.(collision, action)}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-slate-700/60 pt-2 text-xs text-slate-400">
        <p>ID: {collision.collision_id ?? collision.conflictKey ?? "N/A"}</p>
        {collision.root_cause_code && <p>Root cause: {collision.root_cause_code}</p>}
        <p>Activities: {activityIds.filter(Boolean).join(", ") || "N/A"}</p>
        <p>Resources: {resourceIds.filter(Boolean).join(", ") || "N/A"}</p>
        {collision.time_range?.start && collision.time_range?.end && (
          <p>Time: {collision.time_range.start} ~ {collision.time_range.end}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100"
            onClick={() => onJumpToEvidence?.(collision)}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Evidence
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100"
            onClick={() => onJumpToHistory?.(collision)}
          >
            <ExternalLink className="h-3.5 w-3.5" /> History
          </button>
        </div>
      </div>

      {activityIds.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-300">Related activities</div>
          <ul className="mt-1 space-y-1">
            {activityIds.map((activityId) => (
              <li key={activityId}>
                <button
                  type="button"
                  className="text-xs font-medium text-cyan-200 hover:text-cyan-100"
                  onClick={() => onRelatedActivityClick?.(activityId)}
                >
                  {activityId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
