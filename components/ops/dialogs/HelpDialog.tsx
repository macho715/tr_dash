"use client";

import * as React from "react";

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-10 w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400">Help</div>
            <div className="text-lg font-semibold text-slate-50">Command Palette Help</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs text-slate-300 hover:text-cyan-300"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div>
            <div className="font-semibold text-slate-100">Shortcuts</div>
            <div className="text-slate-400">Ctrl/⌘+K: Open palette · Esc: Close · Tab: Autocomplete</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Commands</div>
            <div className="text-slate-400">/shift /bulk /conflicts /export /undo /redo /reset</div>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Tips</div>
            <div className="text-slate-400">Type “?” to open this help. Fuzzy search supports typos.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
