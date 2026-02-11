// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReflowPreviewPanel } from "../ReflowPreviewPanel"

describe("ReflowPreviewPanel freeze/lock section", () => {
  it("shows warning-only section and no apply button in approval mode", () => {
    render(
      <ReflowPreviewPanel
        changes={[
          {
            activity_id: "A-1",
            old_start: "2026-02-01",
            new_start: "2026-02-02",
            old_finish: "2026-02-01",
            new_finish: "2026-02-02",
            delta_days: 1,
          },
        ]}
        conflicts={[]}
        freezeLockViolations={[
          {
            activity_id: "A-1",
            old_start: "2026-02-01",
            new_start: "2026-02-02",
            reason: "actual_frozen",
            reason_label: "actual.start/end 존재 activity 이동 시도",
          },
        ]}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        canApply={false}
        isApprovalMode
      />
    )

    expect(screen.getAllByText(/freeze\/lock violations/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/warning only/i)).toBeTruthy()
    expect(screen.getByText(/Apply 불가/i)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "적용" })).toBeNull()
    expect(screen.getByRole("button", { name: "닫기" })).toBeTruthy()
  })
})
