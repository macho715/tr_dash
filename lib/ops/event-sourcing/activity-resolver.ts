import type { Activity } from "@/src/types/ssot"
import type { EventLogItem, ResolutionResult, AutoMatchResult } from "./types"

/**
 * Activity ID Alias 매핑 테이블
 * 임시 운영용 - 장기적으로는 SSOT에 추가 권장
 */
export const ACTIVITY_ID_ALIAS: Record<string, string> = {
  // 예시: "A1103": "A1100"
  // Excel 분석 후 실제 값으로 채우기
}

/**
 * 1단계: Alias 매핑
 */
export function resolveActivityIdByAlias(eventActivityId: string): string {
  return ACTIVITY_ID_ALIAS[eventActivityId] || eventActivityId
}

/**
 * 2단계: 자동 매칭 (phase + TR + date proximity)
 */
export function autoMatchActivityId(
  event: EventLogItem,
  activities: Map<string, Activity>
): AutoMatchResult {
  const candidates: Array<{
    activity: Activity
    score: number
    scores: AutoMatchResult["scores"]
  }> = []

  for (const activity of activities.values()) {
    const scores = {
      phase_match: 0,
      tr_match: 0,
      date_proximity: 0,
    }

    // Phase 매칭 (+40점)
    if (phaseMatchesTypeId(event.phase, activity.type_id)) {
      scores.phase_match = 40
    }

    // TR Unit 매칭 (+30점)
    if (event.tr_unit && activity.tr_ids?.includes(event.tr_unit)) {
      scores.tr_match = 30
    }

    // 날짜 근접도 (+30점, ±2일)
    const dateDiff = Math.abs(daysDiff(activity.plan?.start_ts ?? null, event.ts))
    if (dateDiff <= 2) {
      scores.date_proximity = 30 - dateDiff * 10
    }

    const totalScore = scores.phase_match + scores.tr_match + scores.date_proximity

    if (totalScore > 0) {
      candidates.push({ activity, score: totalScore, scores })
    }
  }

  // 최고점 선택
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length > 0 && candidates[0].score >= 70) {
    return {
      activityId: candidates[0].activity.activity_id,
      confidence: candidates[0].score / 100,
      reason: Object.entries(candidates[0].scores)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}(${v})`)
        .join(", "),
      scores: candidates[0].scores,
    }
  }

  return {
    activityId: null,
    confidence: 0,
    reason: "no_match_above_threshold",
    scores: { phase_match: 0, tr_match: 0, date_proximity: 0 },
  }
}

/**
 * 통합 해결기
 */
export function resolveActivityId(
  event: EventLogItem,
  activities: Map<string, Activity>
): ResolutionResult {
  // 1) 직접 매칭
  if (activities.has(event.activity_id)) {
    return {
      resolvedId: event.activity_id,
      method: "direct",
      confidence: 1.0,
    }
  }

  // 2) Alias 매핑
  const aliasId = resolveActivityIdByAlias(event.activity_id)
  if (aliasId !== event.activity_id && activities.has(aliasId)) {
    return {
      resolvedId: aliasId,
      method: "alias",
      confidence: 0.95,
    }
  }

  // 3) 자동 매칭
  const autoMatch = autoMatchActivityId(event, activities)
  if (autoMatch.activityId) {
    return {
      resolvedId: autoMatch.activityId,
      method: "auto",
      confidence: autoMatch.confidence,
    }
  }

  // 4) 미연결
  return {
    resolvedId: null,
    method: "unlinked",
    confidence: 0,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function phaseMatchesTypeId(phase: string, typeId: string): boolean {
  const mapping: Record<string, string> = {
    MOBILIZATION: "mobilization",
    LOADOUT: "loadout",
    SAIL: "transport",
    SAIL_AWAY: "transport",
    BERTHING: "transport",
    LOADIN: "loadin",
    TURNING: "turning",
    JACKDOWN: "jackdown",
  }
  return mapping[phase] === typeId
}

function daysDiff(ts1: string | null, ts2: string): number {
  if (!ts1) return 999
  const d1 = new Date(ts1)
  const d2 = new Date(ts2)
  return Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
}
