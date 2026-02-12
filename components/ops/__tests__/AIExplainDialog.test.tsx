// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AIExplainDialog } from "../dialogs/AIExplainDialog";
import type { AiIntentResult } from "@/lib/ops/ai-intent";

const baseResult: AiIntentResult = {
  intent: "prepare_bulk",
  explanation: "Prepared anchors for load-out",
  parameters: {
    anchors: [{ activityId: "A300", newStart: "2026-02-15" }],
    label: "AI bulk",
  },
  ambiguity: null,
  affected_activities: ["A300"],
  affected_count: 1,
  confidence: 0.85,
  risk_level: "medium",
  requires_confirmation: true,
};

describe("AIExplainDialog", () => {
  it("shows confidence/risk and technical details", () => {
    render(
      <AIExplainDialog
        open={true}
        aiResult={baseResult}
        canExecute={true}
        actionSummary="Open Bulk Edit with AI anchors."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/intent: prepare_bulk/i)).toBeTruthy();
    expect(screen.getByText(/confidence: high \(85%\)/i)).toBeTruthy();
    expect(screen.getByText(/risk: medium/i)).toBeTruthy();
    expect(screen.getByText(/confirm: required/i)).toBeTruthy();
    expect(screen.getByText(/Open Bulk Edit with AI anchors/i)).toBeTruthy();
  });

  it("shows block reason and disables confirm when cannot execute", () => {
    const onConfirm = vi.fn();
    render(
      <AIExplainDialog
        open={true}
        aiResult={baseResult}
        canExecute={false}
        actionSummary="Apply current preview"
        blockReason="Apply is blocked outside live mode."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    const confirmButton = screen.getByRole("button", { name: /Confirm & Continue/i });
    expect(confirmButton.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(0);
  });

  it("emits ambiguity option click", () => {
    const onSelectAmbiguity = vi.fn();
    const ambiguous: AiIntentResult = {
      ...baseResult,
      intent: "unclear",
      ambiguity: {
        question: "Which voyage should be shifted?",
        options: ["Voyage 2", "Voyage 3"],
      },
    };

    render(
      <AIExplainDialog
        open={true}
        aiResult={ambiguous}
        canExecute={false}
        actionSummary="No execution"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onSelectAmbiguity={onSelectAmbiguity}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Voyage 2" }));
    expect(onSelectAmbiguity).toHaveBeenCalledWith("Voyage 2");
  });

  it("renders model trace, what-if suggestions, and governance checks", () => {
    const enriched: AiIntentResult = {
      ...baseResult,
      model_trace: {
        provider: "ollama",
        primary_model: "exaone3.5:7.8b",
        review_model: "llama3.1:8b",
        review_verdict: "approve",
      },
      recommendations: {
        what_if_shift_days: [1, 2],
      },
      governance_checks: [
        { code: "CONFIRM_REQUIRED", status: "pass", message: "Confirmation is required." },
        { code: "HIGH_RISK_CONFIRM", status: "warn", message: "Needs explicit confirmation." },
      ],
    };

    render(
      <AIExplainDialog
        open={true}
        aiResult={enriched}
        canExecute={true}
        actionSummary="Preview before apply"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/model: exaone3.5:7.8b/i)).toBeTruthy();
    expect(screen.getByText(/What-if Suggestions/i)).toBeTruthy();
    expect(screen.getByText(/shift \+1d/i)).toBeTruthy();
    expect(screen.getByText(/Governance Checks/i)).toBeTruthy();
    expect(screen.getByText(/CONFIRM_REQUIRED/i)).toBeTruthy();
  });

  it("shows plain_summary when present instead of explanation", () => {
    const withPlain: AiIntentResult = {
      ...baseResult,
      explanation: "Shift all Voyage 3 activities forward by 5 days",
      plain_summary: "Voyage 3 전체 활동을 5일 앞당깁니다.",
    };

    render(
      <AIExplainDialog
        open={true}
        aiResult={withPlain}
        canExecute={true}
        actionSummary="Create bulk preset"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Voyage 3 전체 활동을 5일 앞당깁니다.")).toBeTruthy();
    expect(screen.queryByText("Shift all Voyage 3 activities forward by 5 days")).toBeNull();
  });

  it("renders 3-line briefing and impact preview chips", () => {
    const withBriefing: AiIntentResult = {
      ...baseResult,
      intent: "briefing",
      briefing: {
        where: "TR-3 · V3 · LOADOUT",
        when_what: "Load-out (2026-02-12 -> 2026-02-13)",
        evidence_gap: "증빙 부족 2건",
      },
      impact_preview: {
        impacted_activities: 4,
        estimated_conflicts: 1,
        risk_level: "low",
      },
    };

    render(
      <AIExplainDialog
        open={true}
        aiResult={withBriefing}
        canExecute={true}
        actionSummary="Dismiss briefing and close dialog."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/AI 요약 브리핑 \(3줄\)/i)).toBeTruthy();
    expect(screen.getByText(/어디: TR-3/i)).toBeTruthy();
    expect(screen.getByText(/영향 활동 수: 4/i)).toBeTruthy();
    expect(screen.getByText(/추정 충돌 수: 1/i)).toBeTruthy();
  });
});
