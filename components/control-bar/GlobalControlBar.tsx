'use client'

import { Search, Calendar } from 'lucide-react'
import { useViewMode } from '@/src/lib/stores/view-mode-store'
import type { ViewMode, RiskOverlay } from '@/src/lib/stores/view-mode-store'
import { useDate } from '@/lib/contexts/date-context'
import { parseDateInput } from '@/lib/ssot/schedule'

/** P1-3: English labels for i18n */
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'history', label: 'History' },
  { value: 'approval', label: 'Approval' },
  { value: 'compare', label: 'Compare' },
]

const RISK_OVERLAYS: { value: RiskOverlay; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All' },
  { value: 'wx', label: 'Weather' },
  { value: 'resource', label: 'Resource' },
  { value: 'permit', label: 'Permit' },
]

type GlobalControlBarProps = {
  trips?: { trip_id: string; name: string }[]
  trs?: { tr_id: string; name: string }[]
  onDateCursorChange?: (cursor: string) => void
  onReflowPreview?: () => void
}

export function GlobalControlBar({
  trips = [],
  trs = [],
  onDateCursorChange,
  onReflowPreview,
}: GlobalControlBarProps) {
  const {
    state,
    setMode,
    setDateCursor,
    setSelectedTrip,
    setSelectedTrs,
    setRiskOverlay,
    setSearch,
  } = useViewMode()
  const { setSelectedDate } = useDate()

  const handleDateChange = (value: string) => {
    const datePart = value.trim().slice(0, 10)
    const normalized = parseDateInput(datePart)
    if (!normalized) return
    const iso = normalized.toISOString()
    setDateCursor(iso)
    setSelectedDate(normalized)
    onDateCursorChange?.(iso)
    onReflowPreview?.()
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-xl border border-accent/20 bg-card/80 px-4 py-3"
      data-testid="global-control-bar"
    >
      {/* Trip selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Trip</span>
        <select
          value={state.selectedTripId ?? ''}
          onChange={(e) => setSelectedTrip(e.target.value || null)}
          className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-xs"
          data-testid="trip-select"
          aria-label="Select Trip"
        >
          <option value="">Select Trip</option>
          {trips.map((t) => (
            <option key={t.trip_id} value={t.trip_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* TR selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">TR</span>
        <select
          value={state.selectedTrIds[0] ?? ''}
          onChange={(e) => setSelectedTrs(e.target.value ? [e.target.value] : [])}
          className="h-8 w-[120px] rounded-md border border-input bg-background px-2 text-xs"
          data-testid="tr-select"
          aria-label="Select TR"
        >
          <option value="">Select TR</option>
          {trs.map((t) => (
            <option key={t.tr_id} value={t.tr_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Cursor (UTC) — M2-PR1 */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Date (UTC)</span>
        <input
          type="datetime-local"
          value={state.dateCursor.slice(0, 16)}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={state.mode === 'history'}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          data-testid="date-cursor"
          aria-label="Selected Date (UTC)"
          title={`Selected Date (UTC): ${state.dateCursor.slice(0, 10)}`}
        />
      </div>

      {/* View Mode switcher — M2-PR4: min 24px touch target */}
      <div className="flex items-center gap-2" role="group" aria-label="View Mode">
        <span className="text-xs font-medium text-muted-foreground">View</span>
        <div className="flex rounded-lg border border-input p-0.5">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`min-h-[24px] min-w-[24px] rounded-md px-2 py-1 text-xs font-medium transition ${
                state.mode === m.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`view-mode-${m.value}`}
              aria-pressed={state.mode === m.value ? 'true' : 'false'}
              aria-label={`View: ${m.label}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Overlay — M2-PR1: All/None vs category separation */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Risk Overlay">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Risk</span>
        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
          <button
            type="button"
            onClick={() => setRiskOverlay('none')}
            className={`min-h-[24px] min-w-[24px] rounded px-2 py-1 text-xs font-medium transition ${
              state.riskOverlay === 'none' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent/20'
            }`}
            data-testid="risk-none"
            aria-pressed={state.riskOverlay === 'none' ? 'true' : 'false'}
            aria-label="Risk: None"
          >
            {RISK_OVERLAYS.find((x) => x.value === 'none')?.label}
          </button>
          <button
            type="button"
            onClick={() => setRiskOverlay('all')}
            className={`min-h-[24px] min-w-[24px] rounded px-2 py-1 text-xs font-medium transition ${
              state.riskOverlay === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20'
            }`}
            data-testid="risk-all"
            aria-pressed={state.riskOverlay === 'all' ? 'true' : 'false'}
            aria-label="Risk: All"
          >
            {RISK_OVERLAYS.find((x) => x.value === 'all')?.label}
          </button>
        </div>
        <span className="text-xs text-muted-foreground/70">|</span>
        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
          {(['wx', 'resource', 'permit'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRiskOverlay(r)}
              className={`min-h-[24px] min-w-[24px] rounded px-2 py-1 text-xs font-medium transition ${
                state.riskOverlay === r ? 'bg-amber-500/20 text-amber-300' : 'text-muted-foreground hover:bg-accent/20'
              }`}
              data-testid={`risk-${r}`}
              aria-pressed={state.riskOverlay === r ? 'true' : 'false'}
              aria-label={`Risk: ${RISK_OVERLAYS.find((x) => x.value === r)?.label ?? r}`}
            >
              {RISK_OVERLAYS.find((x) => x.value === r)?.label ?? r}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search..."
          value={state.searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-[160px] rounded-md border border-input bg-background pl-8 pr-2 text-xs"
          data-testid="search-input"
        />
      </div>
    </div>
  )
}
