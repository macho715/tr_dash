/**
 * Event Sourcing Core Types
 * ISO 8601+TZ 기준, RFC 6902 JSON Patch 준수
 */

// ============================================================================
// Event Log Types
// ============================================================================

export type EventType = "STATE_CHANGE" | "MILESTONE" | "ISSUE" | "GATE"
export type EventState =
  | "START"
  | "END"
  | "HOLD"
  | "RESUME"
  | "ARRIVE"
  | "DEPART"
  | "APPROVED"
  | "REJECTED"
export type EventPhase =
  | "MOBILIZATION"
  | "LOADOUT"
  | "SAIL"
  | "SAIL_AWAY"
  | "BERTHING"
  | "LOADIN"
  | "TURNING"
  | "JACKDOWN"
export type EventSite = "MZP" | "AGI" | "DAS"
export type EventAsset = string // "SPMT" | "LCT" | "CRANE" | "FORKLIFT" | "BERTH" | etc.
export type ReasonTag =
  | "WEATHER"
  | "TIDE"
  | "BERTH_OCCUPIED"
  | "PTW"
  | "HM"
  | "MWS"
  | "CERT"
  | "RESOURCE"
  | "OTHER"

export interface EventLogItem {
  event_id: string // "EVT-00001"
  trip_id: string // "V1", "PREP_MZP"
  tr_unit?: string // "TRUnit1"
  site: EventSite
  asset: EventAsset // "SPMT/LCT"
  event_type: EventType
  phase: EventPhase
  state: EventState
  ts: string // ISO 8601+TZ: "2026-01-26T08:00:00+04:00"
  activity_id: string // "A1000"
  reason_tag?: ReasonTag // HOLD 시 필수
  actor?: string // "HM", "MWS", "SCT"
  note?: string
}

// ============================================================================
// Resolution Types
// ============================================================================

export interface ResolutionResult {
  resolvedId: string | null
  method: "direct" | "alias" | "auto" | "unlinked"
  confidence: number // 0.0 ~ 1.0
}

export interface AutoMatchResult {
  activityId: string | null
  confidence: number
  reason: string
  scores: {
    phase_match: number
    tr_match: number
    date_proximity: number
  }
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationGate =
  | "pair_closure"
  | "hold_closure"
  | "milestone_usage"
  | "timestamp_order"

export interface ValidationResult {
  valid: boolean
  gate: ValidationGate
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ValidationError {
  severity: "error" | "warning"
  code: string
  message: string
  events: string[] // event_id[]
  details?: Record<string, unknown>
}

// ============================================================================
// JSON Patch Types (RFC 6902)
// ============================================================================

export type JsonPatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "replace"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "test"; path: string; value: unknown }

export interface PatchValidationResult {
  valid: boolean
  errors: ValidationError[]
  forbidden_paths: string[] // plan.* 경로
}

// ============================================================================
// KPI Types
// ============================================================================

export interface DerivedKPI {
  cal: CalendarTrackKPI
  wd: WorkdayTrackKPI
}

export interface CalendarTrackKPI {
  actual_duration_hr: number // END - START
  planned_duration_hr: number // plan.end_ts - plan.start_ts
  variance_hr: number // actual - planned
  delay_cal_hr: number // Σ(HOLD ~ RESUME)
  delay_breakdown_hr: Record<ReasonTag | "OTHER", number>
}

export interface WorkdayTrackKPI {
  workday_duration: number // WD 기준 유효 근무일
  workday_efficiency: number // wd / cal (0~1.0)
}

export interface ShiftRule {
  site: EventSite
  team: string // "SPMT", "CRANE", "GEN"
  valid_from: string // ISO 8601 date
  valid_to: string
  shift_start: string // "07:00"
  shift_end: string // "17:00"
  break_min: number
  workdays: string[] // ["Sun", "Mon", "Tue", "Wed", "Thu"]
  overtime_rule?: string
}

// ============================================================================
// Report Types
// ============================================================================

export interface PR1Report {
  timestamp: string
  total_events: number
  linked_count: number
  unlinked_count: number
  matching_rate: number // ≥0.95
  validation_results: ValidationResult[]
  unlinked_events: Array<{
    event_id: string
    activity_id: string
    suggested_activity_id: string | null
    confidence_score: number
    reason: string
  }>
  suggested_aliases: Array<{
    from: string
    to: string
    confidence: number
    reason: string
  }>
}

export interface PR2Report {
  timestamp: string
  total_operations: number
  validation_result: PatchValidationResult
  patch_file: {
    schema: string // RFC 6902 URL
    generated_at: string
    source: {
      pr1_report_id: string
      events_count: number
      linked_events_count: number
    }
    operations: JsonPatchOp[]
  }
  operations_by_type: Record<string, number>
  affected_activities: number
  statistics?: {
    by_field: Record<string, number>
    avg_operations_per_activity: number
  }
}

export interface PR3Report {
  timestamp: string
  total_activities_with_kpi: number
  kpi_results: Record<string, DerivedKPI>
  kpi_patches: JsonPatchOp[]
  summary: {
    avg_variance_hr: number
    total_delay_hr: number
    delay_breakdown_total: Record<string, number>
  }
  high_variance_alerts: Array<{
    activity_id: string
    variance_hr: number
    severity: "high" | "critical"
  }>
}
