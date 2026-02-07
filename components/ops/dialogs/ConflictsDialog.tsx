"use client";

import * as React from "react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts";

export function ConflictsDialog({
  open,
  onClose,
  activities,
}: {
  open: boolean;
  onClose: () => void;
  activities: ScheduleActivity[];
}) {
  if (!open) return null;
  const conflicts = detectResourceConflicts(activities);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-10 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400">Conflicts</div>
            <div className="text-lg font-semibold text-slate-50">Detected Conflicts</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs text-slate-300 hover:text-cyan-300"
          >
            Close
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-auto">
          {conflicts.length === 0 ? (
            <div className="text-sm text-slate-400">No conflicts found.</div>
          ) : (
            <div className="space-y-2">
              {conflicts.map((c, idx) => (
                <div key={`${c.activity_id}-${idx}`} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">{c.activity_id}</div>
                  <div className="mt-1 text-slate-400">{c.message}</div>
                  {c.related_activity_ids?.length ? (
                    <div className="mt-1 text-slate-500">Related: {c.related_activity_ids.join(", ")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
