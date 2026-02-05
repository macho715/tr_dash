import type { ScheduleActivity } from "@/lib/ssot/schedule"

const MARINE_RESOURCE_TAGS = new Set([
  "marine",
  "barge",
  "tow",
  "offshore",
  "sea",
])

const MARINE_ANCHOR_TYPES = new Set([
  "SAIL_AWAY",
  "BERTHING",
  "LOADOUT",
  "LOADIN",
  "TURNING",
  "JACKDOWN",
])

const MARINE_KEYWORDS = ["MARINE", "SEA", "BARGE", "TOW", "OFFSHORE"]

function hasKeyword(value: string | null | undefined): boolean {
  if (!value) return false
  const upper = value.toUpperCase()
  return MARINE_KEYWORDS.some((keyword) => upper.includes(keyword))
}

export function isMarineActivity(activity: ScheduleActivity): boolean {
  const tags = activity.resource_tags ?? []
  const hasMarineTag = tags.some((tag) =>
    MARINE_RESOURCE_TAGS.has(tag.toLowerCase())
  )
  if (hasMarineTag) return true

  if (activity.anchor_type && MARINE_ANCHOR_TYPES.has(activity.anchor_type)) {
    return true
  }

  if (hasKeyword(activity.level1) || hasKeyword(activity.level2)) {
    return true
  }

  return false
}

