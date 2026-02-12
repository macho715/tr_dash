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

  it("opens AI review from template action without natural language input", async () => {
    renderPalette("live");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    fireEvent.click(screen.getByRole("button", { name: /Voyage N \+2일/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI Command Review/i)).toBeTruthy();
    });
    expect(screen.getByText(/Shift Voyage 3 by \+2 days/i)).toBeTruthy();
  });

  it("opens 3-line AI briefing from Korean preset button", async () => {
    renderPalette("live");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    fireEvent.click(screen.getByRole("button", { name: /AI 요약 브리핑/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI 요약 브리핑/i)).toBeTruthy();
    });
    expect(screen.getByText(/자동 영향 미리보기/i)).toBeTruthy();
  });

  it("injects clarification prompt first when confidence is low", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        intent: "shift_activities",
        explanation: "Shift activities",
        parameters: {
          filter: { voyage_ids: ["V2"] },
          action: { type: "shift_days", delta_days: 2 },
        },
        confidence: 0.42,
        risk_level: "medium",
        requires_confirmation: true,
      }),
    }) as unknown as typeof fetch;

    renderPalette("live");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));

    const input = screen.getByLabelText(/Command or natural language input/i);
    fireEvent.input(input, { target: { value: "move voyage 2 by 2 days" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Confidence is low. Which target\/action should be applied/i)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /Confirm & Continue/i }).getAttribute("disabled")).not.toBeNull();
  });

  it("shows 2~3 clarify options and auto re-queries on click", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "unclear",
          explanation: "Need clarification",
          parameters: {},
          ambiguity: {
            question: "Which target should be changed?",
            options: [],
          },
          confidence: 0.4,
          risk_level: "low",
          requires_confirmation: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "prepare_bulk",
          explanation: "Prepared anchors",
          parameters: {
            anchors: [{ activityId: "A2030", newStart: "2026-02-03" }],
            label: "clarified",
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
      expect(screen.getByText(/Which target should be changed/i)).toBeTruthy();
    });

    const optionButtons = screen
      .getAllByRole("button")
      .filter((btn) =>
        ["Voyage", "Load-out", "Cancel"].some((token) => btn.textContent?.includes(token))
      );
    expect(optionButtons.length).toBeGreaterThanOrEqual(2);
    expect(optionButtons.length).toBeLessThanOrEqual(3);

    fireEvent.click(optionButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCallInit = fetchMock.mock.calls[1][1] as RequestInit;
    const secondBody = JSON.parse(String(secondCallInit.body));
    expect(typeof secondBody.clarification).toBe("string");
    expect(secondBody.clarification.length).toBeGreaterThan(0);
  });

  it("humanizes raw clarify options and shows TR-targeted 2~3 choices", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "unclear",
          explanation: "Need clarification",
          parameters: {},
          ambiguity: {
            question: "Did you mean ... ?",
            options: ["check_activities", "shift_activities", "status_inquiry"],
          },
          confidence: 0.2,
          risk_level: "low",
          requires_confirmation: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intent: "prepare_bulk",
          explanation: "Prepared anchors",
          parameters: {
            anchors: [{ activityId: "A2030", newStart: "2026-02-03" }],
            label: "clarified",
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
    fireEvent.input(input, { target: { value: "tr3" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Did you mean/i)).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: /TR-3 activities only/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Shift TR-3 schedule/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /TR-3 status only/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /TR-3 activities only/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
