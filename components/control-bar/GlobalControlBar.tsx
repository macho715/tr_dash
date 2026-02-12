'use client'

import { useMemo, useState } from 'react'
import { Search, Calendar, SlidersHorizontal } from 'lucide-react'
import { useViewMode } from '@/src/lib/stores/view-mode-store'
import type { ViewMode, RiskOverlay } from '@/src/lib/stores/view-mode-store'
import { useDate } from '@/lib/contexts/date-context'
import { parseDateInput } from '@/lib/ssot/schedule'
import { FilterDrawer } from '@/components/dashboard/FilterDrawer'
import { MOBILE_UX_FLAGS } from '@/lib/feature-flags'

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
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const selectedTripName = useMemo(
    () => trips.find((trip) => trip.trip_id === state.selectedTripId)?.name ?? null,
    [state.selectedTripId, trips]
  )
  const selectedTrName = useMemo(
    () => trs.find((tr) => tr.tr_id === state.selectedTrIds[0])?.name ?? null,
    [state.selectedTrIds, trs]
  )
  const selectedModeLabel = useMemo(
    () => VIEW_MODES.find((mode) => mode.value === state.mode)?.label ?? state.mode,
    [state.mode]
  )
  const selectedRiskLabel = useMemo(
    () => RISK_OVERLAYS.find((risk) => risk.value === state.riskOverlay)?.label ?? state.riskOverlay,
    [state.riskOverlay]
  )

  const appliedChips = [
    selectedTripName ? `Trip: ${selectedTripName}` : null,
    selectedTrName ? `TR: ${selectedTrName}` : null,
    `Mode: ${selectedModeLabel}`,
    state.riskOverlay !== 'none' ? `Risk: ${selectedRiskLabel}` : null,
  ].filter((chip): chip is string => Boolean(chip))

  const controlGroups = (prefix = '') => (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Trip</span>
        <select
          value={state.selectedTripId ?? ''}
          onChange={(e) => setSelectedTrip(e.target.value || null)}
          className="h-11 w-full rounded-md border border-input bg-background px-2 text-xs md:h-8 md:w-[140px]"
          data-testid={`${prefix}trip-select`}
          aria-label="Select Trip"
        >
          <option value="">Select Trip</option>
          {trips.map((trip) => (
            <option key={trip.trip_id} value={trip.trip_id}>
              {trip.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">TR</span>
        <select
          value={state.selectedTrIds[0] ?? ''}
          onChange={(e) => setSelectedTrs(e.target.value ? [e.target.value] : [])}
          className="h-11 w-full rounded-md border border-input bg-background px-2 text-xs md:h-8 md:w-[120px]"
          data-testid={`${prefix}tr-select`}
          aria-label="Select TR"
        >
          <option value="">Select TR</option>
          {trs.map((tr) => (
            <option key={tr.tr_id} value={tr.tr_id}>
              {tr.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Date (UTC)</span>
        <input
          type="datetime-local"
          value={state.dateCursor.slice(0, 16)}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={state.mode === 'history'}
          className="h-11 w-full rounded-md border border-input bg-background px-2 text-xs md:h-8 md:w-auto"
          data-testid={`${prefix}date-cursor`}
          aria-label="Selected Date (UTC)"
          title={`Selected Date (UTC): ${state.dateCursor.slice(0, 10)}`}
        />
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="View Mode">
        <span className="text-xs font-medium text-muted-foreground">View</span>
        <div className="flex flex-wrap rounded-lg border border-input p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setMode(mode.value)}
              className={`touch-target rounded-md px-2 py-1 text-xs font-medium transition ${
                state.mode === mode.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`${prefix}view-mode-${mode.value}`}
              aria-pressed={state.mode === mode.value ? 'true' : 'false'}
              aria-label={`View: ${mode.label}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Risk Overlay">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Risk</span>
        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
          <button
            type="button"
            onClick={() => setRiskOverlay('none')}
            className={`touch-target rounded px-2 py-1 text-xs font-medium transition ${
              state.riskOverlay === 'none'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-accent/20'
            }`}
            data-testid={`${prefix}risk-none`}
            aria-pressed={state.riskOverlay === 'none' ? 'true' : 'false'}
            aria-label="Risk: None"
          >
            None
          </button>
          <button
            type="button"
            onClick={() => setRiskOverlay('all')}
            className={`touch-target rounded px-2 py-1 text-xs font-medium transition ${
              state.riskOverlay === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent/20'
            }`}
            data-testid={`${prefix}risk-all`}
            aria-pressed={state.riskOverlay === 'all' ? 'true' : 'false'}
            aria-label="Risk: All"
          >
            All
          </button>
        </div>
        <span className="text-xs text-muted-foreground/70">|</span>
        <div className="flex items-center gap-1 rounded-lg border border-input p-0.5">
          {(['wx', 'resource', 'permit'] as const).map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => setRiskOverlay(risk)}
              className={`touch-target rounded px-2 py-1 text-xs font-medium transition ${
                state.riskOverlay === risk
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-muted-foreground hover:bg-accent/20'
              }`}
              data-testid={`${prefix}risk-${risk}`}
              aria-pressed={state.riskOverlay === risk ? 'true' : 'false'}
              aria-label={`Risk: ${risk}`}
            >
              {RISK_OVERLAYS.find((item) => item.value === risk)?.label ?? risk}
            </button>
          ))}
        </div>
      </div>

      <div className="relative md:ml-auto">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search..."
          value={state.searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs md:h-8 md:w-[160px]"
          data-testid={`${prefix}search-input`}
        />
      </div>
    </>
  )

  if (!MOBILE_UX_FLAGS.M9_FILTER_DRAWER) {
    return (
      <div
        className="flex flex-wrap items-center gap-4 rounded-xl border border-accent/20 bg-card/80 px-4 py-3"
        data-testid="global-control-bar"
      >
        {controlGroups('')}
      </div>
    )
  }

  return (
    <>
      <div
        className="rounded-xl border border-accent/20 bg-card/80 px-4 py-3"
        data-testid="global-control-bar"
      >
        <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
          <button
            type="button"
            className="touch-target inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-card/60 px-3 text-sm font-semibold"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Filters"
            data-testid="open-filter-drawer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              value={state.searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs"
              data-testid="search-input-mobile"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:hidden">
          {appliedChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-cyan-200"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="hidden flex-wrap items-center gap-4 md:flex">{controlGroups('')}</div>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters">
        {controlGroups('drawer-')}
      </FilterDrawer>
    </>
  )
}

