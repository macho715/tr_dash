import { describe, it, expect } from "vitest"
import {
  validatePairClosure,
  validateHoldClosure,
  validateMilestoneUsage,
  validateTimestampOrder,
} from "../validators"
import type { EventLogItem } from "../types"

function makeEvent(partial: Partial<EventLogItem>): EventLogItem {
  return {
    event_id: "EVT-000",
    trip_id: "V1",
    site: "MZP",
    asset: "SPMT",
    event_type: "STATE_CHANGE",
    phase: "LOADOUT",
    state: "START",
    ts: "2026-01-01T08:00:00+04:00",
    activity_id: "A1000",
    ...partial,
  }
}

describe("validators", () => {
  it("detects unpaired START/END", () => {
    const events = [makeEvent({ state: "START" })]
    const result = validatePairClosure(events)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("detects missing HOLD reason_tag", () => {
    const events = [makeEvent({ state: "HOLD", reason_tag: undefined })]
    const result = validateHoldClosure(events)
    expect(result.valid).toBe(false)
    expect(result.errors[0].code).toBe("HOLD_MISSING_REASON_TAG")
  })

  it("flags milestone misuse", () => {
    const events = [makeEvent({ event_type: "MILESTONE", state: "START" })]
    const result = validateMilestoneUsage(events)
    expect(result.valid).toBe(false)
    expect(result.errors[0].code).toBe("MILESTONE_AS_DURATION")
  })

  it("detects invalid timestamp", () => {
    const events = [makeEvent({ ts: "invalid" })]
    const result = validateTimestampOrder(events)
    expect(result.valid).toBe(false)
    expect(result.errors[0].code).toBe("INVALID_ISO8601_TIMESTAMP")
  })
})
