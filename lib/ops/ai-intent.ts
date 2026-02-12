export type AiRiskLevel = "low" | "medium" | "high";

export type AiIntent =
  | "shift_activities"
  | "prepare_bulk"
  | "explain_conflict"
  | "explain_why"
  | "navigate_query"
  | "set_mode"
  | "apply_preview"
  | "briefing"
  | "unclear";

export type ShiftFilter = {
  voyage_ids?: string[];
  tr_unit_ids?: string[];
  anchor_types?: string[];
  activity_ids?: string[];
};

export type ShiftAction = {
  type: "shift_days";
  delta_days: number;
  preserve_constraints?: string[];
};

export type PrepareBulkParams = {
  anchors: Array<{ activityId: string; newStart: string }>;
  label?: string;
};

export type ExplainConflictParams = {
  target?: {
    activity_ids?: string[];
    conflict_kind?: string;
  };
  analysis?: {
    root_cause_code?: string;
    suggested_actions?: string[];
  };
};

export type ExplainWhyParams = {
  target_activity_id?: string;
  summary?: string;
};

export type NavigateQueryParams = {
  target?: "where" | "when" | "what";
  filter?: ShiftFilter;
};

export type SetModeParams = {
  mode: "live" | "history" | "approval" | "compare";
  reason?: string;
};

export type ApplyPreviewParams = {
  preview_ref: "current";
};

export type AiIntentResult = {
  intent: AiIntent;
  explanation: string;
  parameters?: {
    filter?: ShiftFilter;
    action?: ShiftAction;
  } & Partial<PrepareBulkParams> &
    Partial<ExplainConflictParams> &
    Partial<ExplainWhyParams> &
    Partial<NavigateQueryParams> &
    Partial<SetModeParams> &
    Partial<ApplyPreviewParams>;
  ambiguity?: {
    question: string;
    options?: string[];
  } | null;
  affected_activities?: string[];
  affected_count?: number;
  confidence: number;
  risk_level: AiRiskLevel;
  requires_confirmation: true;
  model_trace?: {
    provider: "ollama" | "openai";
    primary_model?: string;
    review_model?: string;
    review_verdict?: "approve" | "clarify";
    review_reason?: string;
  };
  recommendations?: {
    what_if_shift_days?: number[];
    next_steps?: string[];
  };
  governance_checks?: Array<{
    code: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
  briefing?: {
    where: string;
    when_what: string;
    evidence_gap: string;
  };
  impact_preview?: {
    impacted_activities: number;
    estimated_conflicts: number;
    risk_level: AiRiskLevel;
  };
};
