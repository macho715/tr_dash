export const IMMEDIATE_ACTION_STORAGE_PREFIX = "tr-dashboard-immediate-actions"

export type ImmediateActionId = "load_tr1" | "spmt_keep" | "finalize_schedule"

export type ImmediateActionState = Record<ImmediateActionId, boolean>

export type ImmediateActionItem = {
  id: ImmediateActionId
  label: string
}

export const IMMEDIATE_ACTION_ITEMS: ImmediateActionItem[] = [
  {
    id: "load_tr1",
    label: "1차 항차: TR 1유닛 로드 (LCT 밸러스팅 제외)",
  },
  {
    id: "spmt_keep",
    label: "SPMT 2세트 유지 · MOB 1/26 변경 없음",
  },
  {
    id: "finalize_schedule",
    label: "잔여 일정 확정 후 반영",
  },
]

const EMPTY_STATE: ImmediateActionState = {
  load_tr1: false,
  spmt_keep: false,
  finalize_schedule: false,
}

export function createEmptyImmediateActionState(): ImmediateActionState {
  return { ...EMPTY_STATE }
}

export function toSelectedDateKey(selectedDate: Date): string {
  if (Number.isNaN(selectedDate.getTime())) return "invalid-date"
  return selectedDate.toISOString().slice(0, 10)
}

export function getImmediateActionStorageKey(dateKey: string): string {
  return `${IMMEDIATE_ACTION_STORAGE_PREFIX}:${dateKey}`
}

export function normalizeImmediateActionState(value: unknown): ImmediateActionState {
  if (!value || typeof value !== "object") return createEmptyImmediateActionState()
  const source = value as Partial<Record<ImmediateActionId, unknown>>
  return {
    load_tr1: source.load_tr1 === true,
    spmt_keep: source.spmt_keep === true,
    finalize_schedule: source.finalize_schedule === true,
  }
}

export function toggleImmediateAction(
  prev: ImmediateActionState,
  actionId: ImmediateActionId
): ImmediateActionState {
  return {
    ...prev,
    [actionId]: !prev[actionId],
  }
}

export function countCompletedImmediateActions(state: ImmediateActionState): number {
  return IMMEDIATE_ACTION_ITEMS.reduce(
    (count, item) => (state[item.id] ? count + 1 : count),
    0
  )
}

export function loadImmediateActionsForDate(
  dateKey: string,
  storage?: Pick<Storage, "getItem">
): ImmediateActionState {
  if (!storage) return createEmptyImmediateActionState()
  try {
    const raw = storage.getItem(getImmediateActionStorageKey(dateKey))
    if (!raw) return createEmptyImmediateActionState()
    return normalizeImmediateActionState(JSON.parse(raw))
  } catch {
    return createEmptyImmediateActionState()
  }
}

export function saveImmediateActionsForDate(
  dateKey: string,
  state: ImmediateActionState,
  storage?: Pick<Storage, "setItem">
): void {
  if (!storage) return
  try {
    storage.setItem(getImmediateActionStorageKey(dateKey), JSON.stringify(state))
  } catch {
    // localStorage can fail in private mode / quota exceeded
  }
}
