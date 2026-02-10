export type AiRiskLevel = "low" | "medium" | "high";

export type AiIntent =
  | "shift_activities"
  | "prepare_bulk"
  | "explain_conflict"
  | "set_mode"
  | "apply_preview"
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
};
