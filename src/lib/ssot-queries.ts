/**
 * SSOT Query Helpers (Client-safe)
 *
 * Pure functions for reading option_c data. No Node.js dependencies.
 * Use ssot-loader.ts for server-side loading (fs, child_process).
 */

import type { OptionC } from '../types/ssot'

/**
 * Get activities as array (for iteration)
 *
 * Contract v0.8.0: entities.activities is a dict, not array.
 * Returns [] when ssot or entities.activities is missing (e.g. before load).
 */
export function getActivitiesArray(ssot: OptionC | null | undefined) {
  const activities = ssot?.entities?.activities
  if (activities == null || typeof activities !== 'object') return []
  return Object.values(activities)
}

/**
 * Get activity by ID
 */
export function getActivity(ssot: OptionC | null | undefined, activityId: string) {
  return ssot?.entities?.activities?.[activityId]
}

/**
 * Get trip by ID
 */
export function getTrip(ssot: OptionC | null | undefined, tripId: string) {
  return ssot?.entities?.trips?.[tripId]
}

/**
 * Get TR by ID
 */
export function getTR(ssot: OptionC | null | undefined, trId: string) {
  return ssot?.entities?.trs?.[trId]
}

/**
 * Get collision by ID
 */
export function getCollision(ssot: OptionC | null | undefined, collisionId: string) {
  return ssot?.collisions?.[collisionId]
}

/**
 * Get evidence item by ID
 */
export function getEvidence(ssot: OptionC | null | undefined, evidenceId: string) {
  return ssot?.entities?.evidence_items?.[evidenceId]
}

/**
 * Get activities for a trip
 */
export function getActivitiesForTrip(ssot: OptionC | null | undefined, tripId: string) {
  const trip = getTrip(ssot, tripId)
  if (!trip?.activity_ids) return []
  return trip.activity_ids.map((id) => getActivity(ssot, id)).filter(Boolean)
}

/**
 * Get activities for a TR
 */
export function getActivitiesForTR(ssot: OptionC | null | undefined, trId: string) {
  return getActivitiesArray(ssot).filter((activity) => activity?.tr_ids?.includes(trId))
}

/**
 * Get collisions for an activity
 */
export function getCollisionsForActivity(ssot: OptionC | null | undefined, activityId: string) {
  const activity = getActivity(ssot, activityId)
  const collisionIds = activity?.calc?.collision_ids
  if (!collisionIds?.length) return []
  return collisionIds.map((id) => getCollision(ssot, id)).filter(Boolean)
}
