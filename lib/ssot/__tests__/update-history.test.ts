import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { setHistoryEventDeleted } from '../update-history'
import { composeHistoryEventsWithDeletionState } from '../history-deletion'
import type { HistoryEvent } from '@/src/types/ssot'

function createBaseSsot() {
  return {
    contract: {
      name: 'TR Dashboard SSOT',
      version: '0.8.0',
      timezone: 'Asia/Dubai',
      generated_at: new Date().toISOString(),
      ssot: {
        activity_is_source_of_truth: true,
        derived_fields_read_only: true,
      },
    },
    constraint_rules: { wx: { profiles: {}, data_sources: { primary: '', fallback: '' } }, linkspan: { assets: {} }, barge: { assets: {} }, ptw: { permit_types: {}, certificate_types: {} } },
    activity_types: {},
    entities: {
      locations: {},
      resource_pools: {},
      activities: {
        ACT_1: {
          activity_id: 'ACT_1',
          type_id: 'T1',
          trip_id: 'TRIP_1',
          tr_ids: ['TR_1'],
          title: 'A1',
          state: 'planned',
          lock_level: 'none',
          blocker_code: null,
          evidence_required: [],
          evidence_ids: [],
          reflow_pins: [],
          plan: {
            start_ts: null,
            end_ts: null,
            duration_min: null,
            duration_mode: 'work',
            location: { from_location_id: 'A', to_location_id: 'B', route_id: null, geo_fence_ids: [] },
            dependencies: [],
            resources: [],
            constraints: [],
            notes: '',
          },
          actual: {
            start_ts: null,
            end_ts: null,
            progress_pct: 0,
            location_override: null,
            resource_assignments: [],
            notes: '',
          },
          calc: {
            es_ts: null,
            ef_ts: null,
            ls_ts: null,
            lf_ts: null,
            slack_min: null,
            critical_path: false,
            collision_ids: [],
            collision_severity_max: null,
            risk_score: 0,
            predicted_end_ts: null,
            reflow: { last_preview_run_id: null, last_apply_run_id: null },
          },
        },
      },
      trips: {},
      trs: {},
      resources: {},
      evidence_items: {},
    },
    collisions: {},
    reflow_runs: [],
    baselines: { current_baseline_id: null, items: {} },
    history_events: [
      {
        event_id: 'HE_ORIGINAL',
        ts: '2026-02-10T10:00:00.000Z',
        actor: 'user',
        event_type: 'note',
        entity_ref: { entity_type: 'activity', entity_id: 'ACT_1' },
        details: { message: 'hello' },
      },
    ],
  }
}

describe('setHistoryEventDeleted append-only tombstone events', () => {
  it('keeps original event and appends delete/restore history events', async () => {
    const cwd = process.cwd()
    const tempDir = mkdtempSync(path.join(tmpdir(), 'trdash-history-'))

    try {
      process.chdir(tempDir)
      const ssotPath = path.join(tempDir, 'option_c.json')
      writeFileSync(ssotPath, `${JSON.stringify(createBaseSsot(), null, 2)}\n`, 'utf-8')

      await setHistoryEventDeleted({
        eventId: 'HE_ORIGINAL',
        deleted: true,
        actor: 'tester',
        reason: 'wrong entry',
      })

      await setHistoryEventDeleted({
        eventId: 'HE_ORIGINAL',
        deleted: false,
        actor: 'tester',
        reason: 'restored',
      })

      const updated = JSON.parse(readFileSync(ssotPath, 'utf-8')) as {
        history_events: HistoryEvent[]
      }
      const allEvents = updated.history_events

      expect(allEvents).toHaveLength(3)
      expect(allEvents.filter((event) => event.event_id === 'HE_ORIGINAL')).toHaveLength(1)

      const tombstones = allEvents.filter(
        (event) => event.event_type === 'history_soft_deleted' || event.event_type === 'history_restored'
      )
      expect(tombstones).toHaveLength(2)
      expect(tombstones.map((event) => event.details?.target_event_id)).toEqual([
        'HE_ORIGINAL',
        'HE_ORIGINAL',
      ])

      const projected = composeHistoryEventsWithDeletionState(allEvents)
      expect(projected).toHaveLength(1)
      expect(projected[0].event_id).toBe('HE_ORIGINAL')
      expect(projected[0].deleted).toBe(false)
    } finally {
      process.chdir(cwd)
    }
  })
})
