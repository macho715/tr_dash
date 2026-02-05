const fs = require('fs');
const path = require('path');

// ALWAYS reload from file (no require cache)
const ssotPath = path.join(__dirname, '..', 'data', 'schedule', 'option_c_v0.8.0.json');
const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));

console.log('=== VERIFICATION REPORT ===\n');

// ============================================================================
// 1. CALCULATE CURRENT LOCATION FOR EACH TR
// ============================================================================

function calculateCurrentLocationForTR(ssot, trId) {
  const tr = ssot.entities.trs[trId];
  if (!tr || tr.activity_ids.length === 0) return null;
  
  const activities = tr.activity_ids.map(id => ssot.entities.activities[id]);
  
  // Find in-progress activities
  const inProgress = activities.filter(a => 
    a.actual.start_ts !== null && a.actual.end_ts === null
  );
  
  if (inProgress.length > 0) {
    const act = inProgress[0];
    return act.plan.location.to_location_id;
  }
  
  // Find most recent completed activity
  const completed = activities
    .filter(a => a.actual.end_ts !== null)
    .sort((a, b) => {
      const aEnd = new Date(a.actual.end_ts).getTime();
      const bEnd = new Date(b.actual.end_ts).getTime();
      return bEnd - aEnd;
    });
  
  if (completed.length > 0) {
    return completed[0].plan.location.to_location_id;
  }
  
  // Default: from_location of first planned activity
  const firstPlanned = activities.find(a => a.state === 'planned');
  return firstPlanned?.plan.location.from_location_id || null;
}

console.log('1. TR Current Locations:');
const expectedLocations = {
  'TR_01': 'LOC_AGI',
  'TR_02': 'LOC_MZP',
  'TR_03': 'LOC_MZP',
  'TR_04': 'LOC_MZP',
  'TR_05': 'LOC_MZP',
  'TR_06': 'LOC_MZP',
  'TR_07': 'LOC_MZP'
};

let locationChecksPassed = 0;
let locationChecksFailed = 0;

for (const [trId, expectedLoc] of Object.entries(expectedLocations)) {
  const actualLoc = calculateCurrentLocationForTR(ssot, trId);
  const status = actualLoc === expectedLoc ? '✅' : '❌';
  
  if (actualLoc === expectedLoc) {
    locationChecksPassed++;
  } else {
    locationChecksFailed++;
  }
  
  console.log(`   ${status} ${trId}: ${actualLoc} (expected: ${expectedLoc})`);
}

// ============================================================================
// 2. VERIFY LOCATIONS ENTITY
// ============================================================================

console.log('\n2. Locations Entity:');
const locations = ssot.entities.locations || {};
const requiredLocations = ['LOC_MZP', 'LOC_AGI'];

let locationsChecksPassed = 0;
let locationsChecksFailed = 0;

for (const locId of requiredLocations) {
  if (locations[locId]) {
    console.log(`   ✅ ${locId}: ${locations[locId].name}`);
    locationsChecksPassed++;
  } else {
    console.log(`   ❌ ${locId}: MISSING`);
    locationsChecksFailed++;
  }
}

// ============================================================================
// 3. VERIFY TR ENTITIES
// ============================================================================

console.log('\n3. TR Entities:');
const trs = ssot.entities.trs || {};
const requiredTRs = ['TR_01', 'TR_02', 'TR_03', 'TR_04', 'TR_05', 'TR_06', 'TR_07'];

let trsChecksPassed = 0;
let trsChecksFailed = 0;

for (const trId of requiredTRs) {
  if (trs[trId]) {
    console.log(`   ✅ ${trId}: ${trs[trId].name} (${trs[trId].activity_ids.length} activities)`);
    trsChecksPassed++;
  } else {
    console.log(`   ❌ ${trId}: MISSING`);
    trsChecksFailed++;
  }
}

// ============================================================================
// 4. VERIFY ACTIVITIES
// ============================================================================

console.log('\n4. Activity Location Data:');
let activitiesWithLocation = 0;
let activitiesWithoutLocation = 0;

for (const tr of Object.values(trs)) {
  if (tr.activity_ids.length === 0) continue;
  
  const firstActId = tr.activity_ids[0];
  const firstAct = ssot.entities.activities[firstActId];
  
  if (firstAct.plan.location.from_location_id && firstAct.plan.location.to_location_id) {
    console.log(`   ✅ ${firstActId}: ${firstAct.plan.location.from_location_id} → ${firstAct.plan.location.to_location_id}`);
    activitiesWithLocation++;
  } else {
    console.log(`   ❌ ${firstActId}: Missing location data`);
    activitiesWithoutLocation++;
  }
}

// ============================================================================
// 5. VERIFY TR_01 STATE
// ============================================================================

console.log('\n5. TR_01 Completion Status:');
const tr01 = trs['TR_01'];
const tr01FirstAct = ssot.entities.activities[tr01.activity_ids[0]];

const tr01Checks = [
  { name: 'State is "completed"', pass: tr01FirstAct.state === 'completed' },
  { name: 'actual.start_ts set', pass: tr01FirstAct.actual.start_ts !== null },
  { name: 'actual.end_ts set', pass: tr01FirstAct.actual.end_ts !== null },
  { name: 'to_location is LOC_AGI', pass: tr01FirstAct.plan.location.to_location_id === 'LOC_AGI' }
];

let tr01ChecksPassed = 0;
let tr01ChecksFailed = 0;

for (const check of tr01Checks) {
  console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  if (check.pass) {
    tr01ChecksPassed++;
  } else {
    tr01ChecksFailed++;
  }
}

// ============================================================================
// 6. VERIFY HISTORY EVENTS
// ============================================================================

console.log('\n6. History Events:');
const historyEvents = ssot.history_events || [];
console.log(`   Total events: ${historyEvents.length}`);

if (historyEvents.length > 0) {
  console.log(`   ✅ History events recorded`);
  historyEvents.forEach((evt, idx) => {
    console.log(`      ${idx + 1}. ${evt.event_type} (${evt.event_id})`);
  });
}

// ============================================================================
// 7. SUMMARY
// ============================================================================

const totalPassed = locationChecksPassed + locationsChecksPassed + trsChecksPassed + 
                    activitiesWithLocation + tr01ChecksPassed;
const totalFailed = locationChecksFailed + locationsChecksFailed + trsChecksFailed + 
                    activitiesWithoutLocation + tr01ChecksFailed;

console.log('\n=== VERIFICATION SUMMARY ===');
console.log(`Total Checks: ${totalPassed + totalFailed}`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('\n🎉 ALL CHECKS PASSED! SSOT modifications successful.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Review issues above.');
  process.exit(1);
}
