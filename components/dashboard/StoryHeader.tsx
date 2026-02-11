"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Story Header (patch.md §2.1, P1-2)
 * TR 선택 시 3초 내: Location / Schedule / Verification
 */
type StoryHeaderProps = {
  trId: string | null
  where?: string
  whenWhat?: string
  evidence?: string
  // Phase 1: TR 선택 드롭다운
  trs?: { tr_id: string; name: string }[]
  onTrSelect?: (trId: string) => void
  // Phase 2: Evidence 배지
  evidenceBadgeVariant?: "success" | "warning" | "destructive" | "secondary"
  // Phase 3: 블록 클릭 핸들러
  onWhereClick?: () => void
  onWhenWhatClick?: () => void
  onEvidenceClick?: () => void
}

const badgeStyles = {
  success: {
    variant: "default" as const,
    className: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
    label: "✓",
  },
  warning: {
    variant: "secondary" as const,
    className: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
    label: "⚠",
  },
  destructive: {
    variant: "destructive" as const,
    className: "",
    label: "!",
  },
  secondary: {
    variant: "secondary" as const,
    className: "",
    label: "",
  },
}

export function StoryHeader({ 
  trId, 
  where, 
  whenWhat, 
  evidence,
  trs = [],
  onTrSelect,
  evidenceBadgeVariant = "secondary",
  onWhereClick,
  onWhenWhatClick,
  onEvidenceClick,
}: StoryHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const badgeStyle = badgeStyles[evidenceBadgeVariant]

  // TR이 없을 때 (빈 상태)
  if (!trId) {
    return (
      <div
        className="min-h-[96px] rounded-xl border border-accent/30 bg-card/60 px-4 py-3"
        data-testid="story-header-empty"
        role="region"
        aria-label="TR story summary"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* TR 선택 드롭다운 (항상 표시) */}
          {trs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Select TR:</span>
              <Select value={trId ?? ""} onValueChange={onTrSelect}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choose a TR..." />
                </SelectTrigger>
                <SelectContent>
                  {trs.map((tr) => (
                    <SelectItem key={tr.tr_id} value={tr.tr_id}>
                      {tr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/20 hover:text-foreground"
            aria-label={helpOpen ? "Collapse Help" : "Expand Help"}
            title={helpOpen ? "Collapse Guide" : "Expand Guide"}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </button>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Location
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Select TR from dropdown or Map</p>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Schedule
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Current activity will appear here</p>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Verification
            </span>
            {helpOpen && (
              <p className="text-sm font-medium text-foreground">Evidence status will appear here</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // TR이 선택된 상태
  return (
    <div
      className="rounded-xl border border-accent/30 bg-card/60 px-4 py-3"
      data-testid="story-header"
      role="region"
      aria-label="TR story summary"
    >
      {/* TR 선택 드롭다운 (상단) */}
      {trs.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">TR:</span>
          <Select value={trId ?? ""} onValueChange={onTrSelect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose a TR..." />
            </SelectTrigger>
            <SelectContent>
              {trs.map((tr) => (
                <SelectItem key={tr.tr_id} value={tr.tr_id}>
                  {tr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Where / When-What / Evidence 블록 */}
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
        {/* Where 블록 (클릭 가능) */}
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Location
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onWhereClick}
            disabled={!onWhereClick}
            className="h-auto w-full justify-start p-0 text-left font-medium hover:bg-accent/20 disabled:opacity-100"
          >
            <p className="truncate text-sm text-foreground" title={where}>
              {where ?? "—"}
            </p>
          </Button>
        </div>

        {/* When/What 블록 (클릭 가능) */}
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Schedule
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onWhenWhatClick}
            disabled={!onWhenWhatClick}
            className="h-auto w-full justify-start p-0 text-left font-medium hover:bg-accent/20 disabled:opacity-100"
          >
            <p className="truncate text-sm text-foreground" title={whenWhat}>
              {whenWhat ?? "—"}
            </p>
          </Button>
        </div>

        {/* Evidence 블록 (클릭 가능 + 배지) */}
        <div className="min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Verification
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEvidenceClick}
            disabled={!onEvidenceClick}
            className="h-auto w-full justify-start p-0 text-left font-medium hover:bg-accent/20 disabled:opacity-100"
          >
            <div className="flex items-center gap-2 truncate">
              <p className="truncate text-sm text-foreground" title={evidence}>
                {evidence ?? "—"}
              </p>
              {evidenceBadgeVariant !== "secondary" && (
                <Badge
                  variant={badgeStyle.variant}
                  className={`shrink-0 ${badgeStyle.className}`}
                >
                  {badgeStyle.label}
                </Badge>
              )}
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
