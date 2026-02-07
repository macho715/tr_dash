"use client";

import * as React from "react";
import type { PreviewResult } from "@/lib/ops/agi/types";

export function ExportDialog({
  open,
  onClose,
  preview,
  onExportPatch,
  onExportFull,
}: {
  open: boolean;
  onClose: () => void;
  preview: PreviewResult | null;
  onExportPatch: (preview: PreviewResult | null) => void;
  onExportFull: (preview: PreviewResult | null) => void;
}) {
  const dialogTitleId = "export-dialog-title";
  const dialogDescId = "export-dialog-desc";
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescId}
        className="absolute left-1/2 top-10 w-full max-w-md -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400">Export</div>
            <div id={dialogTitleId} className="text-lg font-semibold text-slate-50">
              Export Schedule
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
          Export the current preview as patch or full schedule JSON.
        </p>

        {!preview ? (
          <div className="mt-4 text-sm text-slate-400">No preview available. Run a preview first.</div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onExportPatch(preview)}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100"
            >
              Export Patch JSON
            </button>
            <button
              type="button"
              onClick={() => onExportFull(preview)}
              className="rounded-lg border border-accent/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            >
              Export Full JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
