// lib/ops/agi/types.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { ScheduleConflict } from "@/lib/ssot/schedule";
import type { ImpactReport } from "@/lib/ssot/schedule";

export type IsoDate = `${number}-${number}-${number}`;

/**
 * Type guard to validate ISO date format YYYY-MM-DD
 */
export function isIsoDate(value: string): value is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Asserts that a string is a valid ISO date format
 * @throws Error if not valid
 */
export function assertIsoDate(value: string): asserts value is IsoDate {
  if (!isIsoDate(value)) {
    throw new Error(`Invalid ISO date format: ${value}. Expected YYYY-MM-DD`);
  }
}

/**
 * Safely converts string to IsoDate with validation
 */
export function toIsoDate(value: string): IsoDate {
  assertIsoDate(value);
  return value;
}

export type CommandKind =
  | "SHIFT"
  | "BULK"
  | "CONFLICTS"
  | "EXPORT"
  | "UNDO"
  | "REDO"
  | "RESET"
  | "FOCUS";

export type ExportMode = "patch" | "full";

export type AgiCommand =
  | {
      kind: "SHIFT";
      pivot: IsoDate;
      deltaDays?: number; // delta=+N/-N
      newDate?: IsoDate; // new=YYYY-MM-DD -> deltaDays 자동 산출
      includeLocked?: boolean;
      previewOnly?: boolean;
    }
  | {
      kind: "BULK";
      includeLocked?: boolean;
      previewOnly?: boolean;
      // anchors: [{activityId, newStart}]
      anchors: Array<{ activityId: string; newStart: IsoDate }>;
    }
  | { kind: "CONFLICTS" }
  | { kind: "EXPORT"; mode: ExportMode }
  | { kind: "UNDO" }
  | { kind: "REDO" }
  | { kind: "RESET" }
  | { kind: "FOCUS"; query: string };

export type ChangeRow = {
  activityId: string;
  name: string;
  beforeStart: string;
  afterStart: string;
  beforeFinish: string;
  afterFinish: string;
  voyageId?: string;
  milestoneId?: string;
  isLocked?: boolean;
};

export type PreviewResult = {
  nextActivities: ScheduleActivity[];
  changes: ChangeRow[];
  collisions: ScheduleConflict[];
  impact: ImpactReport;
  meta: {
    mode: "shift" | "bulk";
    anchors: Array<{ activityId?: string; pivot?: IsoDate; newStart?: IsoDate; deltaDays?: number }>;
    cascade?: {
      impacted_count: number;
      anchor_count: number;
      blocked_by_freeze_lock: number;
    };
  };
};
