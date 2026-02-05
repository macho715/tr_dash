const fs = require('fs');
const path = require('path');

const ssotPath = path.join(__dirname, '..', 'data', 'schedule', 'option_c_v0.8.0.json');
const backupPath = path.join(__dirname, '..', 'data', 'schedule', 'option_c_v0.8.0.backup.json');

// Read original
const data = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));

// Backup original
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
console.log('✅ Backup created:', backupPath);

// Timestamp for history events
const now = new Date().toISOString().replace(/\.\d{3}Z$/, '+04:00');

// ============================================================================
// 1. ADD LOCATIONS
// ============================================================================

if (!data.entities.locations) {
  data.entities.locations = {};
}

data.entities.locations['LOC_MZP'] = {
  location_id: 'LOC_MZP',
  name: 'Mina Zayed Port',
  lat: 24.5327093,
  lon: 54.3781822,
  zone: 'port',
  notes: 'Main port facility'
};

data.entities.locations['LOC_AGI'] = {
  location_id: 'LOC_AGI',
  name: 'AGI Jetty (Al Ghallan Island)',
  lat: 24.841096,
  lon: 53.658619,
  zone: 'offshore',
  notes: 'Al Ghallan Island destination'
};

console.log('✅ Locations added: LOC_MZP, LOC_AGI');

// ============================================================================
// 2. ADD TR_03 ~ TR_07 (with TRIP_03 ~ TRIP_07)
// ============================================================================

for (let i = 3; i <= 7; i++) {
  const trId = `TR_0${i}`;
  const tripId = `TRIP_0${i}`;
  
  // Add Trip if doesn't exist
  if (!data.entities.trips[tripId]) {
    data.entities.trips[tripId] = {
      trip_id: tripId,
      name: `Trip 0${i}`,
      sequence: i,
      tr_ids: [trId],
      activity_ids: []
    };
  }
  
  // Add TR
  data.entities.trs[trId] = {
    tr_id: trId,
    trip_id: tripId,
    name: `TR 0${i}`,
    sequence: i,
    activity_ids: [],
    calc: {
      current_activity_id: null,
      current_location_id: null,
      risk_score: 0.0
    }
  };
  
  console.log(`✅ Created ${trId} and ${tripId}`);
}

// ============================================================================
// 3. SET TR_01 to AGI (mark first activity as done)
// ============================================================================

const tr01 = data.entities.trs['TR_01'];
const tr01FirstActId = tr01.activity_ids[0]; // A1004
const tr01FirstAct = data.entities.activities[tr01FirstActId];

// Set location for TR_01 first activity (MZP → AGI)
tr01FirstAct.plan.location.from_location_id = 'LOC_MZP';
tr01FirstAct.plan.location.to_location_id = 'LOC_AGI';
tr01FirstAct.plan.location.route_id = 'ROUTE_MZP_AGI';
tr01FirstAct.title = 'TR-01 Transit: MZP → AGI';

// Mark as done (completed transit)
tr01FirstAct.state = 'done';
tr01FirstAct.actual.start_ts = '2026-01-28T08:00:00+04:00'; // Jan 28, 8am
tr01FirstAct.actual.end_ts = '2026-01-28T18:00:00+04:00'; // Jan 28, 6pm
tr01FirstAct.actual.progress_pct = 100;

console.log(`✅ TR_01 set to AGI (${tr01FirstActId} marked as done)`);

// ============================================================================
// 4. SET TR_02 ~ TR_07 to MZP (keep planned)
// ============================================================================

for (const trId of ['TR_02', 'TR_03', 'TR_04', 'TR_05', 'TR_06', 'TR_07']) {
  const tr = data.entities.trs[trId];
  
  if (tr.activity_ids.length === 0) {
    // Create a placeholder activity for new TRs
    const actId = `${trId}_PREP_MZP`;
    const tripId = tr.trip_id;
    
    data.entities.activities[actId] = {
      activity_id: actId,
      type_id: 'preparation',
      trip_id: tripId,
      tr_ids: [trId],
      title: `${tr.name} Preparation at MZP`,
      state: 'planned',
      lock_level: 'none',
      blocker_code: null,
      blocker_detail: {},
      evidence_required: [],
      evidence_ids: [],
      reflow_pins: [],
      plan: {
        start_ts: '2026-02-10T00:00:00+04:00',
        end_ts: '2026-02-10T23:59:59+04:00',
        duration_min: 1440,
        duration_mode: 'work',
        location: {
          from_location_id: 'LOC_MZP',
          to_location_id: 'LOC_MZP',
          route_id: null,
          geo_fence_ids: []
        },
        dependencies: [],
        resources: [],
        constraints: [],
        notes: `Placeholder activity for ${tr.name} at Mina Zayed Port`
      },
      actual: {
        start_ts: null,
        end_ts: null,
        progress_pct: null,
        location_override: null,
        resource_assignments: [],
        notes: ''
      },
      calc: {
        es_ts: '2026-02-10T00:00:00+04:00',
        ef_ts: '2026-02-10T23:59:59+04:00',
        ls_ts: '2026-02-10T00:00:00+04:00',
        lf_ts: '2026-02-10T23:59:59+04:00',
        slack_min: 0,
        critical_path: false,
        collision_ids: [],
        collision_severity_max: null,
        risk_score: null,
        predicted_end_ts: null,
        reflow: {
          last_preview_run_id: null,
          last_apply_run_id: null
        }
      }
    };
    
    tr.activity_ids.push(actId);
    data.entities.trips[tripId].activity_ids.push(actId);
    
    console.log(`✅ Created placeholder activity ${actId} for ${trId} at MZP`);
  } else {
    // Set location for existing first activity
    const firstActId = tr.activity_ids[0];
    const firstAct = data.entities.activities[firstActId];
    
    firstAct.plan.location.from_location_id = 'LOC_MZP';
    firstAct.plan.location.to_location_id = 'LOC_MZP';
    firstAct.title = firstAct.title || `${tr.name} at MZP`;
    
    console.log(`✅ ${trId} first activity (${firstActId}) set to MZP (planned state)`);
  }
}

// ============================================================================
// 5. ADD HISTORY EVENTS
// ============================================================================

if (!data.history_events) {
  data.history_events = [];
}

// Event: Locations initialized
data.history_events.push({
  event_id: `EVT_${Date.now()}_LOC_INIT`,
  timestamp: now,
  event_type: 'location_data_initialization',
  actor: 'tr-implementer',
  activity_id: null,
  delta: {
    'entities.locations': {
      old: {},
      new: { LOC_MZP: 'added', LOC_AGI: 'added' }
    }
  }
});

// Event: TR_03~07 created
data.history_events.push({
  event_id: `EVT_${Date.now()}_TR_CREATED`,
  timestamp: now,
  event_type: 'tr_entities_created',
  actor: 'tr-implementer',
  activity_id: null,
  delta: {
    'entities.trs': {
      old: ['TR_01', 'TR_02'],
      new: ['TR_01', 'TR_02', 'TR_03', 'TR_04', 'TR_05', 'TR_06', 'TR_07']
    }
  }
});

// Event: TR_01 moved to AGI
data.history_events.push({
  event_id: `EVT_${Date.now()}_TR01_AGI`,
  timestamp: now,
  event_type: 'actual_completed',
  actor: 'tr-implementer',
  activity_id: tr01FirstActId,
  delta: {
    state: { old: 'planned', new: 'done' },
    'actual.start_ts': { old: null, new: '2026-01-28T08:00:00+04:00' },
    'actual.end_ts': { old: null, new: '2026-01-28T18:00:00+04:00' },
    'plan.location.to_location_id': { old: null, new: 'LOC_AGI' }
  }
});

console.log(`✅ Added ${data.history_events.length} history events`);

// ============================================================================
// 6. SAVE MODIFIED SSOT
// ============================================================================

fs.writeFileSync(ssotPath, JSON.stringify(data, null, 2));
console.log(`✅ Updated SSOT saved: ${ssotPath}`);

// ============================================================================
// 7. SUMMARY
// ============================================================================

console.log('\n=== SUMMARY ===');
console.log(`TRs: ${Object.keys(data.entities.trs).length}`);
console.log(`Trips: ${Object.keys(data.entities.trips).length}`);
console.log(`Activities: ${Object.keys(data.entities.activities).length}`);
console.log(`Locations: ${Object.keys(data.entities.locations).length}`);
console.log(`History events: ${data.history_events.length}`);

console.log('\n=== TR Locations ===');
for (const trId of ['TR_01', 'TR_02', 'TR_03', 'TR_04', 'TR_05', 'TR_06', 'TR_07']) {
  const tr = data.entities.trs[trId];
  if (tr && tr.activity_ids.length > 0) {
    const firstActId = tr.activity_ids[0];
    const firstAct = data.entities.activities[firstActId];
    const state = firstAct.state;
    const loc = firstAct.actual.end_ts 
      ? firstAct.plan.location.to_location_id 
      : firstAct.plan.location.from_location_id;
    console.log(`  ${trId}: ${loc} (${state})`);
  }
}

console.log('\n✅ All modifications completed!');
