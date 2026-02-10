"use client";

import * as React from "react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { addUTCDays, dateToIsoUtc, diffUTCDays, parseUTCDate, toUtcNoon } from "@/lib/ssot/schedule";
import type { PreviewResult } from "@/lib/ops/agi/types";
import { parseBulkText } from "@/lib/ops/agi/parseCommand";
import { toast } from "sonner";

const CRITICAL_SHIFT_DAYS = 7;

type Anchor = { activityId: string; newStart: string };

type Template = {
  id: string;
  label: string;
  description: string;
  buildAnchors: (activities: ScheduleActivity[]) => Anchor[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  activities: ScheduleActivity[];
  preview: PreviewResult | null;
  setPreview: (preview: PreviewResult | null) => void;
  onPreview: (anchors: Anchor[]) => PreviewResult;
  onApplyPreview: (preview: PreviewResult | null) => boolean;
  canApply: boolean;
  initialAnchors?: Anchor[] | null;
  initialLabel?: string | null;
};

function formatIso(d: Date) {
  return dateToIsoUtc(toUtcNoon(d));
}

function shiftDate(dateStr: string, delta: number) {
  const d = parseUTCDate(dateStr);
  return dateToIsoUtc(addUTCDays(d, delta));
}

function diffDays(before?: string, after?: string) {
  if (!before || !after) return 0;
  return Math.abs(diffUTCDays(before, after));
}

const TEMPLATES: Template[] = [
  {
    id: "weather_delay_3",
    label: "Weather delay +3 days",
    description: "Load-out + Sea transport",
    buildAnchors: (activities) =>
      activities
        .filter(
          (a) =>
            a.activity_id &&
            (a.anchor_type === "LOADOUT" || a.anchor_type === "SAIL_AWAY")
        )
        .map((a) => ({ activityId: a.activity_id as string, newStart: shiftDate(a.planned_start, 3) })),
  },
  {
    id: "voyage2_delay_2",
    label: "Delay Voyage 2 by +2 days",
    description: "All TR-2 activities",
    buildAnchors: (activities) =>
      activities
        .filter(
          (a) =>
            a.activity_id &&
            (a.tr_unit_id === "TR-2" || a.voyage_id === "V2")
        )
        .map((a) => ({ activityId: a.activity_id as string, newStart: shiftDate(a.planned_start, 2) })),
  },
  {
    id: "jackdown_advance_1",
    label: "Advance Jack-down by -1 day",
    description: "All Jack-down activities",
    buildAnchors: (activities) =>
      activities
        .filter((a) => a.activity_id && a.anchor_type === "JACKDOWN")
        .map((a) => ({ activityId: a.activity_id as string, newStart: shiftDate(a.planned_start, -1) })),
  },
];

export function BulkEditDialog({
  open,
  onClose,
  activities,
  preview,
  setPreview,
  onPreview,
  onApplyPreview,
  canApply,
  initialAnchors,
  initialLabel,
}: Props) {
  const dialogTitleId = "bulk-dialog-title";
  const dialogDescId = "bulk-dialog-desc";
  const dialogErrorId = "bulk-dialog-error";
  const [bulkText, setBulkText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = React.useState<string | null>(null);
  const appliedInitialPresetKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      appliedInitialPresetKeyRef.current = null;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !initialAnchors || initialAnchors.length === 0) return;

    const presetKey = `${initialLabel ?? ""}::${initialAnchors
      .map((a) => `${a.activityId}:${a.newStart}`)
      .join("|")}`;

    if (appliedInitialPresetKeyRef.current === presetKey) return;

    appliedInitialPresetKeyRef.current = presetKey;
    const lines = initialAnchors.map((a) => `${a.activityId} ${a.newStart}`).join("\n");
    setBulkText(lines);
    setActiveTemplate(initialLabel ?? null);
    const p = onPreview(initialAnchors);
    setPreview(p);
  }, [open, initialAnchors, initialLabel, onPreview, setPreview]);

  if (!open) return null;

  const runPreview = () => {
    setError(null);
    try {
      const anchors = parseBulkText(bulkText) as Anchor[];
      const p = onPreview(anchors);
      setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
            <div className="text-xs text-slate-400">Bulk Edit</div>
            <div id={dialogTitleId} className="text-lg font-semibold text-slate-50">
              Bulk Anchors
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
          Paste anchor rows, preview changes, then apply in live mode.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="text-xs text-slate-400">Quick Templates</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTemplate(t.label);
                  const anchors = t.buildAnchors(activities);
                  const lines = anchors.map((a) => `${a.activityId} ${a.newStart}`).join("\n");
                  setBulkText(lines);
                  const p = onPreview(anchors);
                  setPreview(p);
                }}
                className={`rounded-xl border px-3 py-2 text-left text-xs ${
                  activeTemplate === t.label
                    ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                    : "border-slate-700/60 bg-slate-900/60 text-slate-300"
                }`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="mt-1 text-[11px] text-slate-400">{t.description}</div>
              </button>
            ))}
          </div>

          <textarea
            className="min-h-[120px] w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder={`예시)
ACT-001 2026-02-15
ACT-023=2026-02-18`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            aria-label="Bulk Anchors Input"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedBy}
          />

          {error ? (
            <div id={dialogErrorId} role="alert" className="text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runPreview}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            >
              Preview
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
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
