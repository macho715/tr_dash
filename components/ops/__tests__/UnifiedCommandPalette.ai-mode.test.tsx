// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ViewModeProvider } from "@/src/lib/stores/view-mode-store";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { UnifiedCommandPalette } from "../UnifiedCommandPalette";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const activities: ScheduleActivity[] = [
  {
    activity_id: "A2030",
    activity_name: "Loading of AGI TR Unit 2 on SPMT",
    level1: "Voyage 2",
    level2: null,
    duration: 2,
    planned_start: "2026-02-01",
    planned_finish: "2026-02-02",
    tr_unit_id: "TR-2",
    anchor_type: "LOADOUT",
    voyage_id: "V2",
  },
];

function renderPalette(viewMode?: "live" | "history" | "approval" | "compare") {
  return render(
    <ViewModeProvider>
      <UnifiedCommandPalette activities={activities} setActivities={vi.fn()} viewMode={viewMode} />
    </ViewModeProvider>
  );
}

describe("UnifiedCommandPalette AI mode", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    window.localStorage.clear();
  });

  it("opens AI review first and executes only after confirmation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: "shift_activities",
        explanation: "Shift load-out by 2 days",
        parameters: {
          filter: { anchor_types: ["LOADOUT"] },
          action: { type: "shift_days", delta_days: 2 },
        },
        confidence: 0.8,
        risk_level: "medium",
        requires_confirmation: true,
      }),
    }) as unknown as typeof fetch;

    renderPalette("live");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    const input = screen.getByLabelText(/Command or natural language input/i);
    fireEvent.input(input, { target: { value: "delay load-out by 2 days" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/AI Command Review/i)).toBeTruthy();
    });
    expect(screen.queryByText(/Bulk Anchors/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Confirm & Continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/Bulk Anchors/i)).toBeTruthy();
    });
  });

  it("shows policy block for apply_preview in approval mode", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: "apply_preview",
        explanation: "Apply current preview",
        parameters: { preview_ref: "current" },
        confidence: 0.9,
        risk_level: "high",
        requires_confirmation: true,
      }),
    }) as unknown as typeof fetch;

    renderPalette("approval");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    const input = screen.getByLabelText(/Command or natural language input/i);
    fireEvent.input(input, { target: { value: "apply current preview" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Blocked by Policy/i)).toBeTruthy();
    });
    expect(screen.getByText(/Apply is blocked outside live mode/i)).toBeTruthy();
  });

  it("re-queries with clarification when ambiguity option is selected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "unclear",
          explanation: "I need a target voyage.",
          parameters: {},
          ambiguity: {
            question: "Which voyage should I move?",
            options: ["Voyage 2", "Voyage 3"],
          },
          confidence: 0.45,
          risk_level: "low",
          requires_confirmation: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "prepare_bulk",
          explanation: "Prepared anchors for Voyage 2",
          parameters: {
            anchors: [{ activityId: "A2030", newStart: "2026-02-03" }],
            label: "Voyage 2 +2 days",
          },
          confidence: 0.82,
          risk_level: "medium",
          requires_confirmation: true,
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderPalette("live");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    const input = screen.getByLabelText(/Command or natural language input/i);
    fireEvent.input(input, { target: { value: "move voyage by 2 days" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Which voyage should I move/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Voyage 2" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCallInit = fetchMock.mock.calls[1][1] as RequestInit;
    const secondBody = JSON.parse(String(secondCallInit.body));
    expect(secondBody.clarification).toBe("Voyage 2");

    await waitFor(() => {
      expect(screen.getByText(/Prepared anchors for Voyage 2/i)).toBeTruthy();
    });
  });
});
