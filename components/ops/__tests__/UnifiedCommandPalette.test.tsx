// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  },
  {
    activity_id: "A2040",
    activity_name: "Sail-away",
    level1: "Voyage 2",
    level2: null,
    duration: 2,
    planned_start: "2026-02-03",
    planned_finish: "2026-02-04",
    tr_unit_id: "TR-2",
    anchor_type: "SAIL_AWAY",
  },
];

function renderPalette() {
  return render(
    <ViewModeProvider>
      <UnifiedCommandPalette
        activities={activities}
        setActivities={vi.fn()}
      />
    </ViewModeProvider>
  );
}

describe("UnifiedCommandPalette", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    window.localStorage.clear();
  });

  it("opens with Ctrl+K and shows command groups", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByPlaceholderText(/Search command\/activity/i)).toBeTruthy();
    expect(screen.getByText("Commands")).toBeTruthy();
    expect(screen.getByText("Quick Actions")).toBeTruthy();
    expect(screen.getByText(/\/shift/i)).toBeTruthy();
    expect(screen.getByText(/pivot=2026-02-01 delta=\+3/i)).toBeTruthy();
    expect(screen.getByText(/ACT-001 2026-02-15/i)).toBeTruthy();
  });

  it("returns activity matches for fuzzy query", async () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/Search command\/activity/i);
    fireEvent.input(input, { target: { value: "loadng tr2" } });

    await waitFor(() => {
      expect(screen.getByText(/A2030: Loading of AGI TR Unit 2 on SPMT/)).toBeTruthy();
    });
  });

  it("focuses input immediately when palette opens", async () => {
    renderPalette();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/Search command\/activity/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  it("renders input before mode toggle button in DOM order", () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/Search command\/activity/i);
    const toggleButton = screen.getByRole("button", { name: /Standard Mode/i });

    const relation = input.compareDocumentPosition(toggleButton);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps input auto-focus after toggling AI mode and reopening", async () => {
    renderPalette();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    fireEvent.click(screen.getByRole("button", { name: /Standard Mode/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/Press Enter to send to AI/i);
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });
});
