"use client";

import * as React from "react";

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogTitleId = "help-dialog-title";
  const dialogDescId = "help-dialog-desc";
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescId}
        className="absolute left-1/2 top-10 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400">Help</div>
            <div id={dialogTitleId} className="text-lg font-semibold text-slate-50">
              Command Palette Help
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
          Quick guide for keyboard commands, safe apply flow, and mode limits.
        </p>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div>
            <div className="font-semibold text-slate-100">Shortcuts</div>
            <div className="text-slate-400">Ctrl/⌘+K open palette · Esc close · Tab autocomplete · Enter execute slash command</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Slash Commands</div>
            <div className="text-slate-400">/shift pivot=2026-02-01 delta=+3 · /shift pivot=2026-02-01 new=2026-02-05</div>
            <div className="text-slate-400">/bulk includeLocked=false previewOnly=true · /conflicts · /export</div>
            <div className="text-slate-400">/undo /redo /reset (history stack commands)</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Natural Language</div>
            <div className="text-slate-400">Examples: "move loadout forward 3 days", "delay voyage 2 by 2"</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Safety</div>
            <div className="text-slate-400">Always use Preview first. Apply is enabled only in live mode.</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Mode Limits</div>
            <div className="text-slate-400">History/Approval/Compare modes are read-focused and block schedule apply.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
