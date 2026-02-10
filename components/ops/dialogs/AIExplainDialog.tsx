"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { AiIntentResult } from "@/lib/ops/ai-intent";

type Props = {
  open: boolean;
  aiResult: AiIntentResult | null;
  canExecute: boolean;
  actionSummary: string;
  blockReason?: string;
  onConfirm: (aiResult: AiIntentResult) => void;
  onCancel: () => void;
  onSelectAmbiguity?: (option: string) => void;
};

export function AIExplainDialog({
  open,
  aiResult,
  canExecute,
  actionSummary,
  blockReason,
  onConfirm,
  onCancel,
  onSelectAmbiguity,
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!aiResult || !mounted) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal container={typeof document !== "undefined" ? document.body : undefined}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-purple-500/30 bg-slate-900/95 p-6 shadow-2xl">
          <Dialog.Title className="mb-3 text-lg font-semibold text-purple-300">
            AI Command Review
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Review AI intent, risk, and execution policy before continuing.
          </Dialog.Description>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-200">
              intent: {aiResult.intent}
            </span>
            <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
              confidence: {(aiResult.confidence * 100).toFixed(0)}%
            </span>
            <span
              className={`rounded px-2 py-1 ${
                aiResult.risk_level === "high"
                  ? "bg-rose-500/20 text-rose-200"
                  : aiResult.risk_level === "medium"
                  ? "bg-amber-500/20 text-amber-200"
                  : "bg-emerald-500/20 text-emerald-200"
              }`}
            >
              risk: {aiResult.risk_level}
            </span>
            <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-100">
              confirm: required
            </span>
          </div>

          <div className="mb-4 rounded-lg bg-slate-800/60 p-4 text-sm text-slate-200">
            <div className="mb-2 text-xs font-semibold text-purple-400">AI Understood</div>
            <p className="leading-relaxed">{aiResult.explanation}</p>
          </div>

          <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            <div className="text-xs font-semibold text-cyan-300">Planned Action</div>
            <p className="mt-1">{actionSummary}</p>
          </div>

          {blockReason ? (
            <div
              className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
              role="alert"
            >
              <div className="text-xs font-semibold text-amber-300">Blocked by Policy</div>
              <p className="mt-1">{blockReason}</p>
            </div>
          ) : null}

          {aiResult.ambiguity ? (
            <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              <div className="text-xs font-semibold text-yellow-300">Ambiguity</div>
              <p className="mt-1">{aiResult.ambiguity.question}</p>
              {Array.isArray(aiResult.ambiguity.options) && aiResult.ambiguity.options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiResult.ambiguity.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSelectAmbiguity?.(opt)}
                      className="rounded-md border border-yellow-400/40 bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-100 hover:bg-yellow-500/30"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {aiResult.parameters ? (
            <details className="mb-5 rounded-lg bg-slate-800/40 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-slate-400 hover:text-slate-300">
                Show Technical Details
              </summary>
              <pre className="mt-2 overflow-auto text-[10px] text-slate-500">
                {JSON.stringify(aiResult.parameters, null, 2)}
              </pre>
            </details>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-slate-700/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(aiResult)}
              disabled={!canExecute}
              className="rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm & Continue
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
