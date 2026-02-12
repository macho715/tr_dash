// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"
import { DetailPanel } from "../DetailPanel"

function makeActivity(partial?: Partial<ScheduleActivity>): ScheduleActivity {
  return {
    activity_id: "A1000",
    activity_name: "Loadout",
    level1: "Trip 1",
    level2: "Loadout",
    duration: 2,
    planned_start: "2026-02-01",
    planned_finish: "2026-02-02",
    ...partial,
  }
}

const noConflicts: ScheduleConflict[] = []

describe("DetailPanel actual update flow", () => {
  it("calls onActualUpdate and supports parent rerender with updated activity", async () => {
    const onActualUpdate = vi.fn<
      (activityId: string, payload: { actualStart: string | null; actualEnd: string | null }) => Promise<{ transition: { success: boolean } }>
    >(async () => ({ transition: { success: true } }))
    const { rerender } = render(
      <DetailPanel
        activity={makeActivity()}
        conflicts={noConflicts}
        onClose={vi.fn()}
        onCollisionClick={vi.fn()}
        onActualUpdate={onActualUpdate}
      />
    )

    fireEvent.change(screen.getByTestId("actual-start-input"), {
      target: { value: "2026-02-03T09:00" },
    })
    fireEvent.change(screen.getByTestId("actual-end-input"), {
      target: { value: "2026-02-03T18:00" },
    })
    fireEvent.click(screen.getByTestId("actual-save-button"))

    await waitFor(() => {
      expect(onActualUpdate).toHaveBeenCalledTimes(1)
    })
    expect(onActualUpdate.mock.calls[0][0]).toBe("A1000")
    expect(onActualUpdate.mock.calls[0][1]).toMatchObject({
      actualStart: expect.any(String),
      actualEnd: expect.any(String),
    })

    rerender(
      <DetailPanel
        activity={makeActivity({
          actual_start: "2026-02-03",
          actual_finish: "2026-02-03",
        })}
        conflicts={noConflicts}
        onClose={vi.fn()}
        onCollisionClick={vi.fn()}
        onActualUpdate={onActualUpdate}
      />
    )

    expect((screen.getByTestId("actual-start-input") as HTMLInputElement).value).toContain(
      "2026-02-03T00:00"
    )
    expect((screen.getByTestId("actual-end-input") as HTMLInputElement).value).toContain(
      "2026-02-03T00:00"
    )
  })
})
