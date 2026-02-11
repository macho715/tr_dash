import { useCallback, useMemo, useState } from "react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { reflowSchedule } from "@/lib/utils/schedule-reflow";
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts";
import { buildChanges } from "@/lib/ops/agi/adapters";
import {
  applyBulkAnchors,
  computeDeltaByNewDate,
  shiftAfterPivot,
} from "@/lib/ops/agi/applyShift";
import {
  initHistory,
  pushPast,
  redo,
  undo,
  type HistoryState,
} from "@/lib/ops/agi/history";
import type { AgiCommand, IsoDate, PreviewResult } from "@/lib/ops/agi/types";
import { makeFullJSON, makePatchJSON, downloadJSON } from "@/lib/ops/agi/exporters";

const DEFAULT_REFLOW_OPTIONS = {
  respectLocks: true,
  respectConstraints: true,
  checkResourceConflicts: true,
  detectCycles: true,
};

type PreviewMeta = PreviewResult["meta"];

type EngineArgs = {
  activities: ScheduleActivity[];
  setActivities: (next: ScheduleActivity[]) => void;
  canApply?: boolean;
};

/**
 * Central command engine for AGI schedule operations.
 *
 * Responsibilities:
 * - Build deterministic previews from shift/bulk commands.
 * - Apply previewed changes to activity state when `canApply` is true.
 * - Manage local undo/redo history snapshots for applied changes.
 * - Export preview data as patch/full JSON.
 */
export function useAgiCommandEngine({ activities, setActivities, canApply = true }: EngineArgs) {
  const [history, setHistory] = useState<HistoryState>(() => initHistory());

  const buildPreview = useCallback(
    (before: ScheduleActivity[], next: ScheduleActivity[], meta: PreviewMeta): PreviewResult => {
      const changes = buildChanges(before, next);
      const conflicts = detectResourceConflicts(next);
      return { nextActivities: next, changes, conflicts, meta };
    },
    []
  );

  /** Preview a reflow for one selected activity start date change. */
  const previewShiftByActivity = useCallback(
    (activityId: string, newStart: IsoDate): PreviewResult => {
      const result = reflowSchedule(activities, activityId, newStart, DEFAULT_REFLOW_OPTIONS);
      return buildPreview(activities, result.activities, {
        mode: "shift",
        anchors: [{ activityId, newStart }],
      });
    },
    [activities, buildPreview]
  );

  const previewShiftByPivot = useCallback(
    (pivot: IsoDate, deltaDays?: number, newDate?: IsoDate, includeLocked?: boolean): PreviewResult => {
      const computedDelta =
        typeof deltaDays === "number"
          ? deltaDays
          : newDate
            ? computeDeltaByNewDate(pivot, newDate)
            : 0;
      const next = shiftAfterPivot({
        activities,
        pivot,
        deltaDays: computedDelta,
        includeLocked: includeLocked ?? false,
      });
      return buildPreview(activities, next, {
        mode: "shift",
        anchors: [{ pivot, deltaDays: computedDelta }],
      });
    },
    [activities, buildPreview]
  );

  const previewBulkAnchors = useCallback(
    (anchors: Array<{ activityId: string; newStart: IsoDate }>, includeLocked?: boolean): PreviewResult => {
      const next = applyBulkAnchors({
        activities,
        anchors,
        includeLocked: includeLocked ?? false,
      });
      return buildPreview(activities, next, {
        mode: "bulk",
        anchors: anchors.map((a) => ({ activityId: a.activityId, newStart: a.newStart })),
      });
    },
    [activities, buildPreview]
  );

  /**
   * Apply a preview to live activities.
   * Returns false when preview is missing or apply is blocked by mode.
   */
  const applyPreview = useCallback(
    (preview: PreviewResult | null) => {
      if (!preview || !canApply) return false;
      setHistory((h) => pushPast(h, activities));
      setActivities(preview.nextActivities);
      return true;
    },
    [activities, canApply, setActivities]
  );

  const resetHistory = useCallback(() => setHistory(initHistory()), []);

  const undoLast = useCallback(() => {
    if (!canApply) return;
    const r = undo(history, activities);
    setHistory(r.h);
    if (r.next) setActivities(r.next);
  }, [activities, canApply, history, setActivities]);

  const redoLast = useCallback(() => {
    if (!canApply) return;
    const r = redo(history, activities);
    setHistory(r.h);
    if (r.next) setActivities(r.next);
  }, [activities, canApply, history, setActivities]);

  const exportPatch = useCallback((preview: PreviewResult | null) => {
    if (!preview) return;
    const afterMap = new Map(preview.nextActivities.map((a) => [a.activity_id ?? "", a]));
    downloadJSON("schedule_patch.json", makePatchJSON({ changes: preview.changes, afterById: afterMap }));
  }, []);

  const exportFull = useCallback((preview: PreviewResult | null) => {
    if (!preview) return;
    downloadJSON("schedule_full.json", makeFullJSON(preview.nextActivities));
  }, []);

  /**
   * Execute a parsed slash command.
   * SHIFT/BULK may return a preview, other commands act on history/export side effects.
   */
  const executeCommand = useCallback(
    (cmd: AgiCommand, raw: string): { preview?: PreviewResult } => {
      switch (cmd.kind) {
        case "SHIFT": {
          const preview = previewShiftByPivot(
            cmd.pivot,
            cmd.deltaDays,
            cmd.newDate,
            cmd.includeLocked
          );
          if (!cmd.previewOnly) {
            applyPreview(preview);
          }
          return { preview };
        }
        case "BULK": {
          const preview = previewBulkAnchors(cmd.anchors as any, cmd.includeLocked);
          if (!cmd.previewOnly) {
            applyPreview(preview);
          }
          return { preview };
        }
        case "UNDO":
          undoLast();
          return {};
        case "REDO":
          redoLast();
          return {};
        case "RESET":
          resetHistory();
          return {};
        case "EXPORT":
          return {};
        case "CONFLICTS":
        case "FOCUS":
        default:
          return {};
      }
    },
    [applyPreview, previewShiftByPivot, previewBulkAnchors, redoLast, resetHistory, undoLast]
  );

  const hasUndo = history.past.length > 0;
  const hasRedo = history.future.length > 0;

  return {
    history,
    hasUndo,
    hasRedo,
    previewShiftByActivity,
    previewShiftByPivot,
    previewBulkAnchors,
    applyPreview,
    exportPatch,
    exportFull,
    undoLast,
    redoLast,
    resetHistory,
    executeCommand,
  };
}
