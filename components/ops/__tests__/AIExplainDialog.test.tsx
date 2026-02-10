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
    expect(screen.getByText(/confidence: 85%/i)).toBeTruthy();
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
});
