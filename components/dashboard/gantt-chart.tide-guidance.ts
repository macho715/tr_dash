import {
  buildShiftDayWhatIf,
  findNearestSafeSlot,
  validateTaskSafety,
  type TaskSafetyResult,
  type TideRuleConfig,
  type TideSafeSlotSuggestion,
  type TideShiftWhatIf,
  type TideTaskInput,
  type TideWindow,
} from "@/lib/services/tideService"

export interface DragTideGuidance {
  taskId: string
  taskName: string
  dragSafety: TaskSafetyResult
  nearestSafe: TideSafeSlotSuggestion | null
  whatIf: TideShiftWhatIf[]
}

export interface ComposeDragTideGuidanceInput {
  task: TideTaskInput
  windows: TideWindow[]
  config?: Partial<TideRuleConfig>
  shiftDays?: number[]
  searchHorizonHours?: number
}

export function composeDragTideGuidance(
  input: ComposeDragTideGuidanceInput
): DragTideGuidance | null {
  const { task, windows, config, shiftDays = [1, 2], searchHorizonHours = 24 * 14 } = input
  if (!windows.length) return null

  const dragSafety = validateTaskSafety(task, windows, config)
  if (dragSafety.status !== "DANGER") {
    return null
  }

  const nearestSafe = findNearestSafeSlot(task, windows, config, searchHorizonHours)
  const whatIf = buildShiftDayWhatIf(task, windows, shiftDays, config)

  return {
    taskId: task.id,
    taskName: task.name,
    dragSafety,
    nearestSafe,
    whatIf,
  }
}
