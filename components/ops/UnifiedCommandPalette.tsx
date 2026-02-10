"use client";

import * as React from "react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import * as Dialog from "@radix-ui/react-dialog";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { ViewMode } from "@/src/lib/stores/view-mode-store";
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store";
import { parseAgiCommand } from "@/lib/ops/agi/parseCommand";
import type { PreviewResult } from "@/lib/ops/agi/types";
import type { AiIntentResult, ShiftFilter } from "@/lib/ops/ai-intent";
import { useAgiCommandEngine } from "@/lib/ops/agi/useAgiCommandEngine";
import { loadRecentPaletteItems, saveRecentPaletteItem, type RecentPaletteItem } from "@/lib/ops/agi/history";
import { toast } from "sonner";
import { ShiftScheduleDialog } from "./dialogs/ShiftScheduleDialog";
import { BulkEditDialog } from "./dialogs/BulkEditDialog";
import { ConflictsDialog } from "./dialogs/ConflictsDialog";
import { ExportDialog } from "./dialogs/ExportDialog";
import { HelpDialog } from "./dialogs/HelpDialog";
import { AIExplainDialog } from "./dialogs/AIExplainDialog";

const COMMANDS = [
  {
    id: "/shift",
    label: "Shift Schedule",
    description: "Example: /shift pivot=2026-02-01 delta=+3 (or new=2026-02-05)",
  },
  {
    id: "/bulk",
    label: "Bulk Edit",
    description: "Example anchors: ACT-001 2026-02-15 or ACT-001=2026-02-15",
  },
  { id: "/conflicts", label: "Show Conflicts", description: "Detect schedule conflicts" },
  { id: "/export", label: "Export Schedule", description: "Export patch/full JSON" },
  { id: "/undo", label: "Undo Last Change", description: "Undo last Apply (live mode only)" },
  { id: "/redo", label: "Redo", description: "Redo most recent undone Apply (live mode only)" },
  { id: "/reset", label: "Reset History", description: "Clear local undo/redo stack only" },
  { id: "/help", label: "Help", description: "Show help and tips" },
];

type Anchor = { activityId: string; newStart: string };
type AiDecision = "reviewing" | "approved" | "cancelled";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  deltaDays: number;
  buildAnchors: (activities: ScheduleActivity[]) => Anchor[];
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "weather_delay_3",
    label: "Weather delay +3 days",
    description: "Load-out + Sea transport",
    deltaDays: 3,
    buildAnchors: (activities) =>
      activities
        .filter(
          (a) =>
            a.activity_id &&
            (a.anchor_type === "LOADOUT" || a.anchor_type === "SAIL_AWAY")
        )
        .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start })),
  },
  {
    id: "voyage2_delay_2",
    label: "Delay Voyage 2 by +2 days",
    description: "All TR-2 activities",
    deltaDays: 2,
    buildAnchors: (activities) =>
      activities
        .filter((a) => a.activity_id && (a.tr_unit_id === "TR-2" || a.voyage_id === "V2"))
        .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start })),
  },
  {
    id: "jackdown_advance_1",
    label: "Advance Jack-down by -1 day",
    description: "All Jack-down activities",
    deltaDays: -1,
    buildAnchors: (activities) =>
      activities
        .filter((a) => a.activity_id && a.anchor_type === "JACKDOWN")
        .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start })),
  },
];

function applyDelta(anchors: Anchor[], delta: number): Anchor[] {
  return anchors.map((a) => {
    const [y, m, d] = a.newStart.split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + delta);
    const iso = base.toISOString().slice(0, 10);
    return { ...a, newStart: iso };
  });
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function parseNaturalSuggestion(query: string, activities: ScheduleActivity[]): { label: string; anchors: Anchor[]; description: string } | null {
  const q = query.toLowerCase();
  const delayMatch = q.match(/delay\s+voyage\s+(\d)\s+by\s+(\d+)/);
  if (delayMatch) {
    const voyage = delayMatch[1];
    const delta = Number(delayMatch[2]);
    const anchors = activities
      .filter((a) => a.activity_id && (a.tr_unit_id === `TR-${voyage}` || a.voyage_id === `V${voyage}`))
      .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start }));
    return {
      label: `Delay Voyage ${voyage} by +${delta} days`,
      anchors: applyDelta(anchors, delta),
      description: `Auto parsed from “${query}”`,
    };
  }

  const loadoutMatch = q.match(/(delay|move)\s+loadout\s+(\d+)/);
  if (loadoutMatch) {
    const delta = Number(loadoutMatch[2]);
    const anchors = activities
      .filter((a) => a.activity_id && a.anchor_type === "LOADOUT")
      .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start }));
    return {
      label: `Shift Load-out by +${delta} days`,
      anchors: applyDelta(anchors, delta),
      description: `Auto parsed from “${query}”`,
    };
  }

  const jackMatch = q.match(/(advance|delay)\s+jack/);
  if (jackMatch && q.match(/(\d+)/)) {
    const num = Number(q.match(/(\d+)/)?.[1] ?? "0");
    const delta = jackMatch[1] === "advance" ? -num : num;
    const anchors = activities
      .filter((a) => a.activity_id && a.anchor_type === "JACKDOWN")
      .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start }));
    return {
      label: `Shift Jack-down by ${delta > 0 ? "+" : ""}${delta} days`,
      anchors: applyDelta(anchors, delta),
      description: `Auto parsed from “${query}”`,
    };
  }

  // Pattern: "move loadout (forward|back) X days" (P2-P1 신규)
  const loadoutForwardMatch = q.match(/move\s+loadout\s+(forward|back)\s+(\d+)\s*days?/);
  if (loadoutForwardMatch) {
    const direction = loadoutForwardMatch[1];
    const num = Number(loadoutForwardMatch[2]);
    const delta = direction === "forward" ? -num : num;
    const anchors = activities
      .filter((a) => a.activity_id && a.anchor_type === "LOADOUT")
      .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start }));
    return {
      label: `Move Load-out ${direction} ${Math.abs(delta)} days`,
      anchors: applyDelta(anchors, delta),
      description: `Auto parsed from "${query}"`,
    };
  }

  // Pattern: "advance all TR-N by X days" (P2-P1 신규)
  const trAdvanceMatch = q.match(/(advance|delay)\s+all\s+tr[-\s]?(\d)\s+by\s+(\d+)\s*days?/);
  if (trAdvanceMatch) {
    const action = trAdvanceMatch[1];
    const trNum = trAdvanceMatch[2];
    const num = Number(trAdvanceMatch[3]);
    const delta = action === "advance" ? -num : num;
    const anchors = activities
      .filter((a) => a.activity_id && a.tr_unit_id === `TR-${trNum}`)
      .map((a) => ({ activityId: a.activity_id as string, newStart: a.planned_start }));
    return {
      label: `${action === "advance" ? "Advance" : "Delay"} all TR-${trNum} by ${Math.abs(delta)} days`,
      anchors: applyDelta(anchors, delta),
      description: `Auto parsed from "${query}"`,
    };
  }


  return null;
}

type Props = {
  activities: ScheduleActivity[];
  setActivities: (next: ScheduleActivity[]) => void;
  onFocusActivity?: (activityId: string) => void;
  viewMode?: ViewMode;
};

export function UnifiedCommandPalette({ activities, setActivities, onFocusActivity, viewMode }: Props) {
  const viewModeContext = useViewModeOptional();
  const resolvedMode = viewMode ?? viewModeContext?.state.mode ?? "live";
  const canApply =
    viewMode !== undefined
      ? resolvedMode === "live"
      : (viewModeContext?.canApplyReflow ?? true);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<RecentPaletteItem[]>([]);
  
  // AI Mode state (NEW for Idea 2)
  const [aiMode, setAiMode] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [pendingAiAction, setPendingAiAction] = React.useState<AiIntentResult | null>(null);
  const [aiDecision, setAiDecision] = React.useState<AiDecision>("cancelled");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [dialog, setDialog] = React.useState<"activity" | "pivot" | "bulk" | "conflicts" | "export" | "help" | "ai-explain" | null>(null);
  const [selectedActivity, setSelectedActivity] = React.useState<ScheduleActivity | null>(null);
  const [preview, setPreview] = React.useState<PreviewResult | null>(null);
  const [bulkPreset, setBulkPreset] = React.useState<{ anchors: Anchor[]; label: string } | null>(null);
  const [pivotPreset, setPivotPreset] = React.useState<{ pivot: string; delta?: number; newDate?: string } | null>(null);

  const engine = useAgiCommandEngine({ activities, setActivities, canApply });

  const focusInput = React.useCallback(() => {
    if (!inputRef.current || aiLoading) return;
    requestAnimationFrame(() => {
      if (!inputRef.current || aiLoading) return;
      inputRef.current.focus();
    });
  }, [aiLoading]);

  React.useEffect(() => {
    setRecent(loadRecentPaletteItems());
  }, []);

  React.useEffect(() => {
    if (!open || aiLoading) return;
    focusInput();
  }, [open, aiLoading, focusInput]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fuse = React.useMemo(() => {
    return new Fuse(activities, {
      keys: ["activity_id", "activity_name", "anchor_type", "tr_unit_id", "voyage_id"],
      threshold: 0.4,
    });
  }, [activities]);

  const commandMatches = React.useMemo(() => {
    const q = query.startsWith("/") ? query.slice(1).toLowerCase() : query.toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.id.slice(1).includes(q) || c.label.toLowerCase().includes(q));
  }, [query]);

  const activityMatches = React.useMemo(() => {
    if (!query || query.startsWith("/")) return [];
    return fuse.search(query).slice(0, 50).map((r) => r.item);
  }, [query, fuse]);

  const suggestion = React.useMemo(() => {
    if (!query || query.startsWith("/")) return null;
    return parseNaturalSuggestion(query, activities);
  }, [query, activities]);

  const anchorsFromFilter = React.useCallback(
    (filter: ShiftFilter | undefined, deltaDays: number) => {
      const safeFilter = filter || {};
      const affected = activities.filter((a) => {
        const matchVoyage = !safeFilter.voyage_ids || safeFilter.voyage_ids.includes(a.voyage_id);
        const matchTR = !safeFilter.tr_unit_ids || safeFilter.tr_unit_ids.includes(a.tr_unit_id);
        const matchAnchor =
          !safeFilter.anchor_types || safeFilter.anchor_types.includes(a.anchor_type || "");
        const matchId =
          !safeFilter.activity_ids || safeFilter.activity_ids.includes(a.activity_id || "");
        return matchVoyage && matchTR && matchAnchor && matchId;
      });
      return affected.map((a) => ({
        activityId: a.activity_id as string,
        newStart: addDays(a.planned_start, deltaDays),
      }));
    },
    [activities]
  );

  const getAiExecutionGuard = React.useCallback(
    (aiResult: AiIntentResult | null): { canExecute: boolean; blockReason?: string; actionSummary: string } => {
      if (!aiResult) {
        return { canExecute: false, blockReason: "No AI action to execute.", actionSummary: "No action" };
      }

      if (aiResult.intent === "shift_activities") {
        return { canExecute: true, actionSummary: "Create bulk preset from activity filter and open Bulk Edit preview." };
      }
      if (aiResult.intent === "prepare_bulk") {
        return { canExecute: true, actionSummary: "Open Bulk Edit with AI-provided anchors." };
      }
      if (aiResult.intent === "explain_conflict") {
        return { canExecute: true, actionSummary: "Open conflicts dialog and show conflict analysis guidance." };
      }
      if (aiResult.intent === "set_mode") {
        const mode = aiResult.parameters?.mode;
        if (!mode) {
          return { canExecute: false, blockReason: "Missing target mode.", actionSummary: "Switch view mode" };
        }
        return { canExecute: true, actionSummary: `Switch view mode to ${mode} (read-only restrictions still apply).` };
      }
      if (aiResult.intent === "apply_preview") {
        if (!canApply || resolvedMode !== "live") {
          return {
            canExecute: false,
            blockReason: "Apply is blocked outside live mode or without reflow permission.",
            actionSummary: "Apply current preview",
          };
        }
        if (!preview) {
          return {
            canExecute: false,
            blockReason: "No preview exists. Generate preview first.",
            actionSummary: "Apply current preview",
          };
        }
        return { canExecute: true, actionSummary: "Apply current preview to schedule in live mode." };
      }

      return {
        canExecute: false,
        blockReason: "Intent is informational or unclear; no direct execution.",
        actionSummary: "No execution",
      };
    },
    [canApply, preview, resolvedMode]
  );

  const onSelectActivity = (a: ScheduleActivity) => {
    if (!a.activity_id) return;
    setSelectedActivity(a);
    setDialog("activity");
    setOpen(false);
    onFocusActivity?.(a.activity_id);
    saveRecentPaletteItem({
      kind: "activity",
      id: a.activity_id,
      label: `${a.activity_id}: ${a.activity_name}`,
      timestamp: Date.now(),
    });
    setRecent(loadRecentPaletteItems());
  };

  const onSelectCommand = (id: string) => {
    if (id === "/shift") {
      setDialog("pivot");
    } else if (id === "/bulk") {
      setDialog("bulk");
    } else if (id === "/conflicts") {
      setDialog("conflicts");
    } else if (id === "/export") {
      setDialog("export");
    } else if (id === "/undo") {
      engine.undoLast();
      toast.success("Undo applied");
    } else if (id === "/redo") {
      engine.redoLast();
      toast.success("Redo applied");
    } else if (id === "/reset") {
      engine.resetHistory();
      toast.success("History reset");
    } else if (id === "/help") {
      setDialog("help");
    }

    saveRecentPaletteItem({ kind: "command", id, label: id, timestamp: Date.now() });
    setRecent(loadRecentPaletteItems());
    setOpen(false);
  };

  const onSelectQuickAction = (qa: QuickAction) => {
    const anchors = applyDelta(qa.buildAnchors(activities), qa.deltaDays);
    setBulkPreset({ anchors, label: qa.label });
    setDialog("bulk");
    saveRecentPaletteItem({ kind: "quick", id: qa.id, label: qa.label, timestamp: Date.now() });
    setRecent(loadRecentPaletteItems());
    setOpen(false);
  };

  const onSelectSuggestion = (label: string, anchors: Anchor[]) => {
    setBulkPreset({ anchors, label });
    setDialog("bulk");
    saveRecentPaletteItem({ kind: "quick", id: label, label, timestamp: Date.now() });
    setRecent(loadRecentPaletteItems());
    setOpen(false);
  };

  const executeAiIntent = React.useCallback(
    (aiResult: AiIntentResult) => {
      if (aiResult.intent === "shift_activities") {
        const deltaDays = aiResult.parameters?.action?.delta_days ?? 0;
        const anchors = anchorsFromFilter(aiResult.parameters?.filter, deltaDays);
        if (anchors.length === 0) {
          toast.warning("No matching activities found for this AI command.");
          return;
        }
        setBulkPreset({ anchors, label: aiResult.explanation });
        setDialog("bulk");
        setOpen(false);
        toast.success(`AI prepared bulk preview for ${anchors.length} activities.`);
        return;
      }

      if (aiResult.intent === "prepare_bulk") {
        const anchors = Array.isArray(aiResult.parameters?.anchors)
          ? aiResult.parameters.anchors.filter((a): a is Anchor => Boolean(a?.activityId && a?.newStart))
          : [];
        if (anchors.length === 0) {
          toast.warning("AI did not provide valid anchors.");
          return;
        }
        setBulkPreset({ anchors, label: aiResult.parameters?.label || aiResult.explanation });
        setDialog("bulk");
        setOpen(false);
        toast.success(`AI prepared ${anchors.length} anchors.`);
        return;
      }

      if (aiResult.intent === "explain_conflict") {
        setDialog("conflicts");
        setOpen(false);
        toast.info(aiResult.explanation);
        return;
      }

      if (aiResult.intent === "set_mode") {
        const targetMode = aiResult.parameters?.mode;
        if (!targetMode) {
          toast.warning("AI mode change request is missing target mode.");
          return;
        }
        viewModeContext?.setMode(targetMode);
        setOpen(false);
        setDialog(null);
        if (targetMode === "approval" || targetMode === "history") {
          toast.info(`Switched to ${targetMode}. This mode is read-only.`);
        } else {
          toast.success(`Switched to ${targetMode} mode.`);
        }
        return;
      }

      if (aiResult.intent === "apply_preview") {
        if (!canApply || resolvedMode !== "live") {
          toast.warning("Apply is blocked outside live mode.");
          return;
        }
        if (!preview) {
          toast.warning("No preview to apply.");
          return;
        }
        const ok = engine.applyPreview(preview);
        if (ok) {
          toast.success("Preview applied.");
        } else {
          toast.error("Failed to apply preview.");
        }
        setOpen(false);
        setDialog(null);
        return;
      }

      setDialog(null);
      toast.info(aiResult.explanation);
    },
    [anchorsFromFilter, canApply, engine, preview, resolvedMode, viewModeContext]
  );

  const runAiCommand = React.useCallback(
    async (queryText: string, clarification?: string) => {
      if (!queryText.trim() || aiLoading) return;

      setAiLoading(true);
      try {
        const response = await fetch("/api/nl-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryText, activities, clarification }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(`AI Command failed: ${error.error || "Unknown error"}`);
          return;
        }

        const result = (await response.json()) as AiIntentResult;
        setPendingAiAction(result);
        setAiDecision("reviewing");
        setDialog("ai-explain");
        toast.info("AI command parsed. Review and confirm before execution.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[AI Command] Error:", error);
        toast.error(`AI Command error: ${message}`);
      } finally {
        setAiLoading(false);
      }
    },
    [activities, aiLoading]
  );

  const onAICommand = React.useCallback(() => {
    void runAiCommand(query);
  }, [query, runAiCommand]);

  const onSelectAmbiguity = React.useCallback(
    (option: string) => {
      if (!query.trim()) return;
      toast.info(`Clarification selected: ${option}`);
      void runAiCommand(query, option);
    },
    [query, runAiCommand]
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ensure delete keys are handled by the input itself (avoid cmdk/root interception).
    if (e.key === "Backspace" || e.key === "Delete") {
      e.stopPropagation();
      return;
    }

    // AI Mode: Enter triggers LLM parsing
    if (e.key === "Enter" && aiMode && query && !query.startsWith("/")) {
      e.preventDefault();
      onAICommand();
      return;
    }

    if (e.key === "Tab" && query.startsWith("/")) {
      e.preventDefault();
      const next = COMMANDS.find((c) => c.id.startsWith(query));
      if (next) setQuery(next.id);
    }
    if (e.key === "Enter" && query.startsWith("/") && query.includes("=")) {
      try {
        const cmd = parseAgiCommand(query);
        const { preview: p } = engine.executeCommand(cmd, query);
        if (p) setPreview(p);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Command parse failed");
      }
    }
    if (e.key === "?" && query === "") {
      setDialog("help");
      setOpen(false);
    }
  };

  const aiGuard = React.useMemo(
    () => getAiExecutionGuard(pendingAiAction),
    [getAiExecutionGuard, pendingAiAction]
  );

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        contentClassName="overflow-visible"
        className="fixed left-1/2 top-10 z-[100] w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-2xl"
      >
        <Dialog.Title className="sr-only">Unified Command Palette</Dialog.Title>
        <Dialog.Description className="sr-only">
          Search commands, activities, quick actions, and recent items. AI mode available for complex natural language commands.
        </Dialog.Description>
        
        {/* Input row: ensure visible and focusable */}
        <div className="min-h-[2.75rem] flex shrink-0 items-center">
          <Command.Input
            ref={inputRef}
            autoFocus
            value={query}
            onValueChange={setQuery}
            onKeyDown={onInputKeyDown}
            placeholder={
              aiMode
                ? "Try: 'Move all Voyage 3 forward 5 days but keep PTW windows' (Press Enter to send to AI)"
                : "Search command/activity (e.g. /shift pivot=2026-02-01 delta=+3, move loadout forward 3 days)"
            }
            className="flex-1 min-w-0 w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            disabled={aiLoading}
            aria-label="Command or natural language input"
          />
        </div>
        <div className="mt-2 px-1 text-[11px] text-slate-500">
          {aiMode 
            ? `✨ AI will parse your command and require confirmation (${aiDecision})`
            : "Tab autocomplete · ? help · Enter execute (/...=...)"}
        </div>
        {/* AI Mode Toggle (NEW) */}
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAiMode(!aiMode)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              aiMode
                ? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
            }`}
          >
            <span className="text-sm">{aiMode ? "✨" : "🔧"}</span>
            {aiMode ? "AI Command Mode" : "Standard Mode"}
          </button>
          {aiMode && (
            <span className="text-[10px] text-purple-400">
              Powered by GPT-4 {aiLoading && "· Processing..."}
            </span>
          )}
        </div>
        <Command.List className="mt-3 max-h-[60vh] overflow-auto text-sm">
          {query === "" && recent.length > 0 ? (
            <Command.Group heading="Recent" className="mb-3 text-xs text-slate-400">
              {recent.map((r) => (
                <Command.Item
                  key={`${r.kind}-${r.id}`}
                  value={r.label}
                  onSelect={() => {
                    if (r.kind === "activity") {
                      const a = activities.find((x) => x.activity_id === r.id);
                      if (a) onSelectActivity(a);
                    } else if (r.kind === "command") {
                      onSelectCommand(r.label);
                    }
                  }}
                  className="rounded-md px-3 py-2 text-slate-200 hover:bg-cyan-500/10"
                >
                  {r.label}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {commandMatches.length > 0 ? (
            <Command.Group heading="Commands" className="mb-3 text-xs text-slate-400">
              {commandMatches.map((c) => (
                <Command.Item
                  key={c.id}
                  value={c.id}
                  onSelect={() => onSelectCommand(c.id)}
                  className="rounded-md px-3 py-2 text-slate-200 hover:bg-cyan-500/10"
                >
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-[11px] text-slate-400">{c.id} · {c.description}</div>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {suggestion ? (
            <Command.Group heading="Suggestions" className="mb-3 text-xs text-slate-400">
              <Command.Item
                value={suggestion.label}
                onSelect={() => onSelectSuggestion(suggestion.label, suggestion.anchors)}
                className="rounded-md px-3 py-2 text-slate-200 hover:bg-cyan-500/10"
              >
                <div className="font-semibold">{suggestion.label}</div>
                <div className="text-[11px] text-slate-400">{suggestion.description}</div>
              </Command.Item>
            </Command.Group>
          ) : null}

          {query === "" ? (
            <Command.Group heading="Quick Actions" className="mb-3 text-xs text-slate-400">
              {QUICK_ACTIONS.map((qa) => (
                <Command.Item
                  key={qa.id}
                  value={qa.label}
                  onSelect={() => onSelectQuickAction(qa)}
                  className="rounded-md px-3 py-2 text-slate-200 hover:bg-cyan-500/10"
                >
                  <div className="font-semibold">{qa.label}</div>
                  <div className="text-[11px] text-slate-400">{qa.description}</div>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {activityMatches.length > 0 ? (
            <Command.Group heading="Activities" className="text-xs text-slate-400">
              {activityMatches.map((a) => (
                <Command.Item
                  key={a.activity_id ?? a.activity_name}
                  value={`${a.activity_id} ${a.activity_name}`}
                  onSelect={() => onSelectActivity(a)}
                  className="rounded-md px-3 py-2 text-slate-200 hover:bg-cyan-500/10"
                >
                  {a.activity_id}: {a.activity_name}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          <Command.Empty className="px-3 py-2 text-xs text-slate-500">No results</Command.Empty>
        </Command.List>
      </Command.Dialog>

      <ShiftScheduleDialog
        open={dialog === "activity" || dialog === "pivot"}
        onClose={() => {
          setDialog(null);
          setPivotPreset(null);
        }}
        mode={dialog === "pivot" ? "pivot" : "activity"}
        activity={selectedActivity}
        initialPivotDate={pivotPreset?.pivot ?? null}
        initialDeltaDays={pivotPreset?.delta ?? null}
        initialNewDate={pivotPreset?.newDate ?? null}
        preview={preview}
        setPreview={setPreview}
        onPreviewActivity={(activityId, newStart) => engine.previewShiftByActivity(activityId, newStart)}
        onPreviewPivot={(pivot, deltaDays, newDate, includeLocked) =>
          engine.previewShiftByPivot(pivot, deltaDays, newDate, includeLocked)
        }
        onApplyPreview={engine.applyPreview}
        canApply={canApply}
      />

      <BulkEditDialog
        open={dialog === "bulk"}
        onClose={() => {
          setDialog(null);
          setBulkPreset(null);
        }}
        activities={activities}
        preview={preview}
        setPreview={setPreview}
        onPreview={(anchors) => engine.previewBulkAnchors(anchors)}
        onApplyPreview={engine.applyPreview}
        canApply={canApply}
        initialAnchors={bulkPreset?.anchors ?? null}
        initialLabel={bulkPreset?.label ?? null}
      />

      <ConflictsDialog open={dialog === "conflicts"} onClose={() => setDialog(null)} activities={activities} />

      <ExportDialog
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        preview={preview}
        onExportPatch={engine.exportPatch}
        onExportFull={engine.exportFull}
      />

      <HelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />

      <AIExplainDialog
        open={dialog === "ai-explain"}
        aiResult={pendingAiAction}
        canExecute={aiGuard.canExecute}
        actionSummary={aiGuard.actionSummary}
        blockReason={aiGuard.blockReason}
        onSelectAmbiguity={onSelectAmbiguity}
        onCancel={() => {
          setAiDecision("cancelled");
          setDialog(null);
          setPendingAiAction(null);
        }}
        onConfirm={(result) => {
          setAiDecision("approved");
          executeAiIntent(result);
          setPendingAiAction(null);
        }}
      />
    </>
  );
}
