// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { PreviewResult } from "@/lib/ops/agi/types";
import { BulkEditDialog } from "../dialogs/BulkEditDialog";

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
];

const previewResult: PreviewResult = {
  nextActivities: activities,
  changes: [],
  collisions: [],
  impact: {
    affected_count: 0,
    affected_ids: [],
    changes: [],
    conflicts: [],
  },
  meta: {
    mode: "bulk",
    anchors: [],
  },
};

describe("BulkEditDialog", () => {
  it("applies initial anchors preview only once for the same open preset", () => {
    const onPreview = vi.fn(() => previewResult);
    const setPreview = vi.fn();

    const props = {
      open: true,
      onClose: vi.fn(),
      activities,
      preview: null,
      setPreview,
      onPreview,
      onApplyPreview: vi.fn(() => true),
      canApply: true,
      initialAnchors: [{ activityId: "A2030", newStart: "2026-02-03" }],
      initialLabel: "Delay Voyage 2 by +2 days",
    };

    const { rerender } = render(<BulkEditDialog {...props} />);
    rerender(<BulkEditDialog {...props} />);

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(setPreview).toHaveBeenCalledTimes(1);
  });

  it("re-applies initial anchors when dialog closes and opens again", () => {
    const onPreview = vi.fn(() => previewResult);
    const setPreview = vi.fn();

    const baseProps = {
      onClose: vi.fn(),
      activities,
      preview: null,
      setPreview,
      onPreview,
      onApplyPreview: vi.fn(() => true),
      canApply: true,
      initialAnchors: [{ activityId: "A2030", newStart: "2026-02-03" }],
      initialLabel: "Delay Voyage 2 by +2 days",
    };

    const { rerender } = render(<BulkEditDialog {...baseProps} open={true} />);
    rerender(<BulkEditDialog {...baseProps} open={false} />);
    rerender(<BulkEditDialog {...baseProps} open={true} />);

    expect(onPreview).toHaveBeenCalledTimes(2);
    expect(setPreview).toHaveBeenCalledTimes(2);
  });
});
