import { describe, expect, it } from "vitest"
import {
  createEmptyImmediateActionState,
  getImmediateActionStorageKey,
  loadImmediateActionsForDate,
  saveImmediateActionsForDate,
  toSelectedDateKey,
} from "@/lib/alerts/immediate-actions"

type MemoryStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem(key) {
      return store.get(key) ?? null
    },
    setItem(key, value) {
      store.set(key, value)
    },
  }
}

describe("immediate-actions", () => {
  it("builds YYYY-MM-DD key from selected date", () => {
    const date = new Date("2026-02-11T12:00:00.000Z")
    expect(toSelectedDateKey(date)).toBe("2026-02-11")
  })

  it("round-trips state via storage", () => {
    const storage = createMemoryStorage()
    const dateKey = "2026-02-11"
    const state = {
      load_tr1: true,
      spmt_keep: false,
      finalize_schedule: true,
    }

    saveImmediateActionsForDate(dateKey, state, storage)
    expect(loadImmediateActionsForDate(dateKey, storage)).toEqual(state)
  })

  it("falls back to empty state when stored JSON is invalid", () => {
    const dateKey = "2026-02-12"
    const storage = createMemoryStorage({
      [getImmediateActionStorageKey(dateKey)]: "{invalid-json",
    })

    expect(loadImmediateActionsForDate(dateKey, storage)).toEqual(
      createEmptyImmediateActionState()
    )
  })
})
