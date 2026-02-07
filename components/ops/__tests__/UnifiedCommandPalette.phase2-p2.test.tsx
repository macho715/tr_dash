// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
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
      <UnifiedCommandPalette activities={activities} setActivities={vi.fn()} />
    </ViewModeProvider>
  );
}

function openPalette() {
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
}

function openDialogFromCommand(commandLabel: string) {
  openPalette();
  fireEvent.click(screen.getByText(commandLabel));
}

describe("UnifiedCommandPalette Phase2 P2 accessibility", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    window.localStorage.clear();
  });

  it("adds aria dialog attributes for conflicts/export/help dialogs", () => {
    renderPalette();

    openDialogFromCommand("Show Conflicts");
    const conflictsDialog = screen.getByRole("dialog", { name: /Detected Conflicts/i });
    expect(conflictsDialog.getAttribute("aria-modal")).toBe("true");
    expect(conflictsDialog.getAttribute("aria-labelledby")).toBe("conflicts-dialog-title");
    expect(conflictsDialog.getAttribute("aria-describedby")).toBe("conflicts-dialog-desc");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    openDialogFromCommand("Export Schedule");
    const exportDialog = screen.getByRole("dialog", { name: /Export Schedule/i });
    expect(exportDialog.getAttribute("aria-modal")).toBe("true");
    expect(exportDialog.getAttribute("aria-labelledby")).toBe("export-dialog-title");
    expect(exportDialog.getAttribute("aria-describedby")).toBe("export-dialog-desc");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    openDialogFromCommand("Help");
    const helpDialog = screen.getByRole("dialog", { name: /Command Palette Help/i });
    expect(helpDialog.getAttribute("aria-modal")).toBe("true");
    expect(helpDialog.getAttribute("aria-labelledby")).toBe("help-dialog-title");
    expect(helpDialog.getAttribute("aria-describedby")).toBe("help-dialog-desc");
  });

  it("connects shift and bulk errors to aria-invalid and role=alert", async () => {
    renderPalette();

    openDialogFromCommand("Shift Schedule");
    const shiftDialog = screen.getByRole("dialog", { name: /Shift After Pivot/i });
    expect(shiftDialog.getAttribute("aria-describedby")).toBe("shift-dialog-desc");

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    const pivotInput = screen.getByLabelText("Pivot Date");
    expect(pivotInput.getAttribute("aria-invalid")).toBe("true");
    expect(pivotInput.getAttribute("aria-describedby")).toContain("shift-dialog-error");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    openDialogFromCommand("Bulk Edit");
    const bulkDialog = screen.getByRole("dialog", { name: /Bulk Anchors/i });
    expect(bulkDialog.getAttribute("aria-describedby")).toBe("bulk-dialog-desc");

    const bulkInput = screen.getByLabelText("Bulk Anchors Input");
    fireEvent.change(bulkInput, { target: { value: "invalid-row" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(bulkInput.getAttribute("aria-invalid")).toBe("true");
    expect(bulkInput.getAttribute("aria-describedby")).toContain("bulk-dialog-error");
  });
});
