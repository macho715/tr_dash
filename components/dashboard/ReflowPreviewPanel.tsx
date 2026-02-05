"use client"

import { useState } from "react"
import { FileSearch, X, Check } from "lucide-react"
import type { DateChange } from "@/lib/ssot/schedule"

type ReflowPreviewPanelProps = {
  changes: DateChange[]
  conflicts: { message: string; severity?: string }[]
  onApply: (reason: string) => void
  onCancel: () => void
  canApply?: boolean
}

/**
 * Reflow Preview UI (Phase 7 T7.7, M2-PR3)
 * Impact Summary + Reason (required) + Apply/Cancel. 실행 전 요약 → 승인 → 결과 → Undo 계약.
 */
export function ReflowPreviewPanel({
  changes,
  conflicts,
  onApply,
  onCancel,
  canApply = true,
}: ReflowPreviewPanelProps) {
  const [reason, setReason] = useState("")
  const hasChanges = changes.length > 0
  const hasBlocking = conflicts.some((c) => c.severity === "error" || c.severity === "blocking")
  const reasonOk = reason.trim().length > 0

  const handleApply = () => {
    if (!reasonOk || hasBlocking || !canApply) return
    onApply(reason.trim())
  }

  return (
    <div
      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3"
      data-testid="reflow-preview-panel"
      role="region"
      aria-label="리플로우 미리보기"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <FileSearch className="h-4 w-4" />
          미리보기 (Preview)
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-foreground"
          aria-label="미리보기 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {hasChanges ? (
        <div className="space-y-2">
          {/* M2-PR3: Impact Summary */}
          <div className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 text-xs text-slate-300">
            <span className="font-semibold text-foreground">영향 요약:</span> 변경 활동 {changes.length}건
            {conflicts.length > 0 && (
              <> · 충돌 {conflicts.length}건</>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-300">
            제안 변경 ({changes.length}건)
          </div>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {changes.map((c) => (
              <li
                key={`${c.activity_id}-${c.old_start}-${c.new_start}`}
                className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 text-xs"
              >
                <span className="font-medium text-foreground">{c.activity_id}</span>
                <span className="text-slate-400">: </span>
                <span className="text-slate-300">
                  {c.old_start} → {c.new_start}
                </span>
                {c.delta_days !== 0 && (
                  <span className="ml-1 text-emerald-400">
                    ({c.delta_days > 0 ? "+" : ""}{c.delta_days}d)
                  </span>
                )}
              </li>
            ))}
          </ul>
          {conflicts.length > 0 && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
              충돌 {conflicts.length}건 감지
            </div>
          )}
          {/* M2-PR3: Reason (required) */}
          <div className="mt-2">
            <label htmlFor="reflow-reason" className="block text-xs font-medium text-slate-300 mb-1">
              사유 (필수)
            </label>
            <input
              id="reflow-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 지연 승인, 자원 변경"
              className="w-full rounded border border-slate-600/60 bg-slate-900/60 px-2 py-1.5 text-xs text-foreground placeholder:text-slate-500"
              aria-required="true"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleApply}
              disabled={!canApply || hasBlocking || !reasonOk}
            >
              <Check className="h-3.5 w-3.5" />
              적용
            </button>
            <button
              type="button"
              className="rounded border border-slate-600/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
              onClick={onCancel}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">제안된 날짜 변경 없음.</p>
      )}
    </div>
  )
}
