import { describe, expect, it } from 'vitest'
import type { ScheduleActivity } from '@/lib/ssot/schedule'
import { previewScheduleReflow } from '../schedule-reflow-manager'
import { reflowSchedule } from '@/lib/utils/schedule-reflow'

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
  it('returns identical output for same input across canonical and legacy wrapper paths', () => {
    const canonical = previewScheduleReflow({
      activities,
      anchors: [{ activityId: 'A1', newStart: '2026-02-05' }],
      mode: 'shift',
    })
    const legacy = reflowSchedule(activities, 'A1', '2026-02-05')

    expect(canonical.nextActivities).toEqual(legacy.activities)
    expect(canonical.impact).toEqual(legacy.impact_report)
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
