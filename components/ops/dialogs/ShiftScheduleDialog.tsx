"use client";

import * as React from "react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { addUTCDays, dateToIsoUtc, diffUTCDays, parseUTCDate, toUtcNoon } from "@/lib/ssot/schedule";
import type { PreviewResult } from "@/lib/ops/agi/types";
import { toast } from "sonner";

const CRITICAL_SHIFT_DAYS = 7;

type ShiftMode = "activity" | "pivot";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: ShiftMode;
  activity?: ScheduleActivity | null;
  initialPivotDate?: string | null;
  initialDeltaDays?: number | null;
  initialNewDate?: string | null;
  preview: PreviewResult | null;
  setPreview: (preview: PreviewResult | null) => void;
  onPreviewActivity: (activityId: string, newStart: string) => PreviewResult;
  onPreviewPivot: (pivot: string, deltaDays?: number, newDate?: string, includeLocked?: boolean) => PreviewResult;
  onApplyPreview: (preview: PreviewResult | null) => boolean;
  canApply: boolean;
};

function formatIso(d: Date) {
  return dateToIsoUtc(toUtcNoon(d));
}

function diffDays(before?: string, after?: string) {
  if (!before || !after) return 0;
  return Math.abs(diffUTCDays(before, after));
}

export function ShiftScheduleDialog({
  open,
  onClose,
  mode,
  activity,
  initialPivotDate,
  initialDeltaDays,
  initialNewDate,
  preview,
  setPreview,
  onPreviewActivity,
  onPreviewPivot,
  onApplyPreview,
  canApply,
}: Props) {
  const dialogTitleId = "shift-dialog-title";
  const dialogDescId = "shift-dialog-desc";
  const dialogErrorId = "shift-dialog-error";
  const [newStart, setNewStart] = React.useState("");
  const [pivotDate, setPivotDate] = React.useState("");
  const [deltaDays, setDeltaDays] = React.useState("");
  const [newDate, setNewDate] = React.useState("");
  const [includeLocked, setIncludeLocked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isWorking, setIsWorking] = React.useState(false);

  React.useEffect(() => {
    if (mode === "activity" && activity?.planned_start) {
      setNewStart(activity.planned_start);
    }
  }, [activity, mode]);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setIsWorking(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (open && mode === "pivot") {
      if (initialPivotDate) setPivotDate(initialPivotDate);
      if (typeof initialDeltaDays === "number") setDeltaDays(String(initialDeltaDays));
      if (initialNewDate) setNewDate(initialNewDate);
    }
  }, [open, mode, initialPivotDate, initialDeltaDays, initialNewDate]);

  if (!open) return null;

  const todayIso = formatIso(new Date());
  const plus3 = formatIso(addUTCDays(parseUTCDate(todayIso), 3));
  const plus7 = formatIso(addUTCDays(parseUTCDate(todayIso), 7));

  const runPreview = () => {
    setError(null);
    setIsWorking(true);
    try {
      if (mode === "activity") {
        if (!activity?.activity_id) throw new Error("활동을 선택하세요.");
        if (!newStart) throw new Error("새 시작일을 입력하세요.");
        const p = onPreviewActivity(activity.activity_id, newStart);
        setPreview(p);
      } else {
        if (!pivotDate) throw new Error("Pivot 날짜를 입력하세요.");
        const delta = deltaDays ? Number(deltaDays) : undefined;
        const p = onPreviewPivot(pivotDate, delta, newDate || undefined, includeLocked);
        setPreview(p);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsWorking(false);
    }
  };

  const apply = () => {
    const ok = onApplyPreview(preview);
    if (ok && preview) {
      toast.success(`✅ ${preview.changes.length}개 Activity 업데이트 완료`, {
        description: `${preview.meta.anchors.length}개 anchor 적용됨`,
        duration: 3000,
      });
      onClose();
    }
  };

  const criticalIds = new Set(
    (preview?.changes ?? [])
      .filter((c) => diffDays(c.beforeStart, c.afterStart) >= CRITICAL_SHIFT_DAYS)
      .map((c) => c.activityId)
  );
  const describedBy = error ? `${dialogDescId} ${dialogErrorId}` : dialogDescId;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={describedBy}
        className="absolute left-1/2 top-10 w-full max-w-3xl -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400">Shift Schedule</div>
            <div id={dialogTitleId} className="text-lg font-semibold text-slate-50">
              {mode === "activity" ? "Change Activity Start" : "Shift After Pivot"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs text-slate-300 hover:text-cyan-300"
          >
            Close
          </button>
        </div>
        <p id={dialogDescId} className="mt-2 text-xs text-slate-400">
          Preview schedule impact first, then apply in live mode when approved.
        </p>

        {mode === "activity" ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-300">
              <div className="font-semibold text-slate-100">
                {activity?.activity_id ?? "—"}
              </div>
              <div className="text-xs text-slate-400">{activity?.activity_name ?? ""}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                aria-label="New Start Date"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy}
                className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={() => setNewStart(todayIso)}
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setNewStart(plus3)}
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200"
              >
                +3d
              </button>
              <button
                type="button"
                onClick={() => setNewStart(plus7)}
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200"
              >
                +7d
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Pivot Date
              <input
                type="date"
                value={pivotDate}
                onChange={(e) => setPivotDate(e.target.value)}
                aria-label="Pivot Date"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Delta Days (optional)
              <input
                type="number"
                value={deltaDays}
                onChange={(e) => setDeltaDays(e.target.value)}
                aria-label="Delta Days"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                placeholder="+3"
              />
            </label>
            <label className="text-xs text-slate-400">
              New Pivot Date (optional)
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                aria-label="New Pivot Date"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={describedBy}
                className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400 flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeLocked}
                onChange={(e) => setIncludeLocked(e.target.checked)}
              />
              Include locked activities
            </label>
          </div>
        )}

        {error ? (
          <div id={dialogErrorId} role="alert" className="mt-3 text-xs text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runPreview}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            disabled={isWorking}
          >
            {isWorking ? "계산중…" : "Preview"}
          </button>
          {canApply && (
            <button
              type="button"
              onClick={apply}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-50"
              disabled={!preview}
            >
              Apply
            </button>
          )}
        </div>

        {preview ? (
          <div className="mt-5 rounded-lg border border-slate-700/50 bg-slate-900/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div>
                영향 작업: <span className="font-semibold text-slate-100">{preview.changes.length}</span>개
              </div>
              <div>
                ⚠️ 주요 변경: {preview.changes.filter((c) => criticalIds.has(c.activityId)).length}개
              </div>
            </div>
            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full text-xs text-slate-200">
                <thead className="sticky top-0 bg-slate-900/80">
                  <tr>
                    <th className="py-2 pr-2 text-left">ID</th>
                    <th className="py-2 pr-2 text-left">작업</th>
                    <th className="py-2 pr-2 text-left">시작</th>
                    <th className="py-2 pr-2 text-left">종료</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.slice(0, 200).map((c) => (
                    <tr
                      key={c.activityId}
                      className={`border-t border-slate-700/40 ${
                        criticalIds.has(c.activityId) ? "bg-rose-500/10" : ""
                      }`}
                    >
                      <td className="py-2 pr-2 font-mono">{c.activityId}</td>
                      <td className="py-2 pr-2">{c.name}</td>
                      <td className="py-2 pr-2">
                        <span className="text-slate-500">{c.beforeStart}</span>{" "}
                        <span className="text-cyan-200">{c.afterStart}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <span className="text-slate-500">{c.beforeFinish}</span>{" "}
                        <span className="text-cyan-200">{c.afterFinish}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.changes.length > 200 ? (
                <div className="mt-2 text-xs text-slate-500">표시는 200개까지만 (전체 {preview.changes.length}개)</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
