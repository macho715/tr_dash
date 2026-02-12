"use client"

import { useState } from "react"
import { FileSearch, X, Check, AlertTriangle } from "lucide-react"
import type { DateChange, FreezeLockViolation } from "@/lib/ssot/schedule"

type ReflowPreviewPanelProps = {
  changes: DateChange[]
  conflicts: { message: string; severity?: string }[]
  freezeLockViolations?: FreezeLockViolation[]
  onApply: (reason: string) => void
  onCancel: () => void
  canApply?: boolean
  isApprovalMode?: boolean
}

/**
 * Reflow Preview UI (Phase 7 T7.7, M2-PR3)
 * Impact Summary + Reason (required) + Apply/Cancel. 실행 전 요약 → 승인 → 결과 → Undo 계약.
 */
export function ReflowPreviewPanel({
  changes,
  conflicts,
  freezeLockViolations = [],
  onApply,
  onCancel,
  canApply = true,
  isApprovalMode = false,
}: ReflowPreviewPanelProps) {
  const [reason, setReason] = useState("")
  const hasChanges = changes.length > 0
  const hasBlocking = conflicts.some((c) => c.severity === "error" || c.severity === "blocking")
  const hasFreezeLockViolations = freezeLockViolations.length > 0
  const reasonOk = reason.trim().length > 0
  const applyBlocked = !canApply || hasBlocking || hasFreezeLockViolations

  const handleApply = () => {
    if (!reasonOk || applyBlocked) return
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
          <div className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 text-xs text-slate-300">
            <span className="font-semibold text-foreground">영향 요약:</span> 변경 활동 {changes.length}건
            {conflicts.length > 0 && <> · 충돌 {conflicts.length}건</>}
            {hasFreezeLockViolations && <> · freeze/lock violations {freezeLockViolations.length}건</>}
          </div>
          <div className="text-xs font-semibold text-slate-300">제안 변경 ({changes.length}건)</div>
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
                  <span className="ml-1 text-emerald-400">({c.delta_days > 0 ? "+" : ""}{c.delta_days}d)</span>
                )}
              </li>
            ))}
          </ul>

          {hasFreezeLockViolations && (
            <div className="mt-2 rounded border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-100">
              <div className="mb-1 flex items-center gap-1 font-semibold text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                freeze/lock violations ({isApprovalMode ? "warning only" : "apply blocked"})
              </div>
              <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                {freezeLockViolations.map((violation) => (
                  <li
                    key={`${violation.activity_id}-${violation.old_start}-${violation.new_start}-${violation.reason}`}
                    className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5"
                  >
                    <div className="font-medium text-amber-100">{violation.activity_id}</div>
                    <div className="text-amber-200/90">기존: {violation.old_start}</div>
                    <div className="text-amber-200/90">제안: {violation.new_start}</div>
                    <div className="text-amber-300">차단 사유: {violation.reason_label}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
              충돌 {conflicts.length}건 감지
            </div>
          )}

          {applyBlocked && (
            <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-200">
              정책: freeze/lock violations 또는 blocking 충돌이 존재하면 Apply 불가
            </div>
          )}

          {!isApprovalMode && (
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
          )}

          <div className="mt-3 flex gap-2">
            {!isApprovalMode && (
              <button
                type="button"
                className="flex items-center gap-1 rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleApply}
                disabled={applyBlocked || !reasonOk}
              >
                <Check className="h-3.5 w-3.5" />
                적용
              </button>
            )}
            <button
              type="button"
              className="rounded border border-slate-600/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
              onClick={onCancel}
            >
              {isApprovalMode ? "닫기" : "취소"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">제안된 날짜 변경 없음.</p>
      )}
    </div>
  )
}
