import { describe, expect, it } from 'vitest'
import type { ScheduleActivity } from '@/lib/ssot/schedule'
import { previewScheduleReflow } from '../schedule-reflow-manager'

const activities: ScheduleActivity[] = [
  {
    activity_id: 'A1',
    activity_name: 'Loadout',
    level1: 'Trip 1',
    level2: null,
    duration: 2,
    planned_start: '2026-02-01',
    planned_finish: '2026-02-02',
  },
  {
    activity_id: 'A2',
    activity_name: 'Sail Away',
    level1: 'Trip 1',
    level2: null,
    duration: 2,
    planned_start: '2026-02-03',
    planned_finish: '2026-02-04',
    depends_on: [{ predecessorId: 'A1', type: 'FS', lagDays: 0 }],
  },
]

describe('schedule reflow preview call paths', () => {
  it('includes dependency cascade impact summary in canonical preview', () => {
    const preview = previewScheduleReflow({
      activities,
      anchors: [{ activityId: 'A1', newStart: '2026-02-05' }],
      mode: 'shift',
    })
    const shiftedA2 = preview.nextActivities.find((activity) => activity.activity_id === 'A2')
    expect(shiftedA2?.planned_start).toBe('2026-02-06')
    expect(preview.meta.cascade).toEqual({
      impacted_count: 2,
      anchor_count: 1,
      blocked_by_freeze_lock: 0,
    })
  })

  it('is deterministic for same input in canonical path (10 runs)', () => {
    const outputs = Array.from({ length: 10 }, () =>
      previewScheduleReflow({
        activities: JSON.parse(JSON.stringify(activities)),
        anchors: [{ activityId: 'A1', newStart: '2026-02-05' }],
        mode: 'shift',
      })
    )

    const fingerprint = outputs.map((out) =>
      JSON.stringify({ nextActivities: out.nextActivities, impact: out.impact, collisions: out.collisions })
    )

    expect(new Set(fingerprint).size).toBe(1)
  })
})
