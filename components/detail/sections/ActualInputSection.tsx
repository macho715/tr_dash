"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"

type ActualInputSectionProps = {
  activity: ScheduleActivity
  onSave: (
    activityId: string,
    payload: { actualStart: string | null; actualEnd: string | null }
  ) => Promise<{
    transition?: { success: boolean; blocker_code?: string; reason?: string }
  } | void>
}

function toInputValue(value?: string | null): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.includes("T")) return trimmed.slice(0, 16)
  return `${trimmed}T00:00`
}

function toIsoOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function ActualInputSection({ activity, onSave }: ActualInputSectionProps) {
  const viewMode = useViewModeOptional()
  const canEdit = viewMode?.canEdit ?? true
  const [actualStart, setActualStart] = useState(() => toInputValue(activity.actual_start))
  const [actualEnd, setActualEnd] = useState(() => toInputValue(activity.actual_finish))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActualStart(toInputValue(activity.actual_start))
    setActualEnd(toInputValue(activity.actual_finish))
    setError(null)
  }, [activity.activity_id, activity.actual_start, activity.actual_finish])

  const hasChanges = useMemo(() => {
    const currentStart = toInputValue(activity.actual_start)
    const currentEnd = toInputValue(activity.actual_finish)
    return currentStart !== actualStart || currentEnd !== actualEnd
  }, [activity.actual_start, activity.actual_finish, actualStart, actualEnd])

  const handleSave = async () => {
    if (!activity.activity_id || saving || !canEdit) return

    const startIso = toIsoOrNull(actualStart)
    const endIso = toIsoOrNull(actualEnd)

    if (actualStart && !startIso) {
      setError("Invalid actual start date/time.")
      return
    }
    if (actualEnd && !endIso) {
      setError("Invalid actual end date/time.")
      return
    }
    if (startIso && endIso && new Date(startIso).getTime() > new Date(endIso).getTime()) {
      setError("Actual end must be after actual start.")
      return
    }

    setSaving(true)
    try {
      const result = await onSave(activity.activity_id, {
        actualStart: startIso,
        actualEnd: endIso,
      })
      setError(null)
      toast.success("Actual dates saved.")
      if (result && result.transition && !result.transition.success) {
        const reason = result.transition.blocker_code || result.transition.reason || "blocked"
        toast.error(`State transition blocked: ${reason}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save actual dates."
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-3"
      data-testid="actual-input-section"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">
          Record Actual Dates
        </span>
        {!canEdit && <span className="text-[11px] text-amber-400">Live mode only</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs text-slate-400">
          Actual Start
          <input
            type="datetime-local"
            value={actualStart}
            onChange={(e) => setActualStart(e.target.value)}
            disabled={!canEdit}
            className="mt-1 w-full rounded border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 disabled:opacity-60"
            data-testid="actual-start-input"
          />
        </label>
        <label className="text-xs text-slate-400">
          Actual End
          <input
            type="datetime-local"
            value={actualEnd}
            onChange={(e) => setActualEnd(e.target.value)}
            disabled={!canEdit}
            className="mt-1 w-full rounded border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 disabled:opacity-60"
            data-testid="actual-end-input"
          />
        </label>
      </div>
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || !hasChanges || saving}
          className="rounded border border-cyan-500/50 px-3 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
          data-testid="actual-save-button"
        >
          {saving ? "Saving..." : "Save Actual Dates"}
        </button>
        {hasChanges && !saving && (
          <span className="text-[11px] text-slate-500">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
