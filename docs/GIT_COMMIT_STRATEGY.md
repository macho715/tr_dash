# Git Commit Strategy

## Commit 1: What-If + Record Actual Enhancement (원안 기준 재구현)

### Modified Files (10)
```
M  __tests__/integration/what-if-simulation-flow.test.ts
M  app/globals.css
M  app/page.tsx
M  components/dashboard/gantt-chart.tsx
M  lib/gantt/__tests__/grouping.test.ts
M  lib/gantt/__tests__/visTimelineMapper.test.ts
M  lib/gantt/grouping.ts
M  lib/gantt/visTimelineMapper.ts
?? components/detail/__tests__/detail-panel-actual.test.tsx
?? components/ops/__tests__/UnifiedCommandPalette.phase2-p1.test.ts (수정)
```

### Commit Message
```
feat: enhance What-If simulation and Record Actual visualization

Summary:
- What-If: Dual ghost bars (old/new) + affected activity highlights
- Record Actual: Immediate visualization + History mode gating/clamping
- Tests: 302 tests passed, build successful

Changes:
1. What-If Metadata Enhancement
   - Add affected_count, conflict_count to reflowPreview
   - Clear stale preview on Actual save

2. Dual Ghost Bars for What-If
   - reflow_ghost_old_* (before simulation)
   - reflow_ghost_new_* (after simulation)
   - Apply what-if-affected class to changed activities

3. Actual Immediate Visualization
   - Create actual__${activity_id} range items
   - Apply variance-positive/negative/progress styles
   - History gating: hide if actual_start > selectedDate
   - History clamping: end = min(actual_end, selectedDate)

4. Item Identification & Mapping
   - Add reflow_ghost_old_/new_ to normalizeItemId
   - Pass actualOverlay to buildGroupedVisData
   - Extend GhostBarMetadata types

5. Style Hierarchy
   - ghost-bar-what-if-old/new
   - what-if-affected
   - actual-bar.variance-progress
   - Fix vis-range selector specificity

6. Tests
   - grouping.test.ts: dual ghost + affected verification
   - visTimelineMapper.test.ts: metadata title verification
   - what-if-simulation-flow.test.ts: dual ghost expectations
   - detail-panel-actual.test.tsx: onActualUpdate scenario

Related: #what-if-simulation #record-actual-dates
Refs: docs/WHATIF_RECORD_ACTUAL_VERIFICATION_REPORT.md
```

---

## Commit 2: Phase 2 P1 - Unified Command Palette (Natural Language)

### New Files
```
?? components/ops/UnifiedCommandPalette.tsx
?? components/ops/__tests__/UnifiedCommandPalette.test.tsx
?? components/ops/__tests__/UnifiedCommandPalette.phase2-p1.test.ts
?? components/ops/dialogs/*.tsx
?? lib/ops/agi/useAgiCommandEngine.ts
?? lib/ops/__tests__/history.recent-palette.test.ts
?? docs/PHASE2_P1_IMPLEMENTATION_REPORT.md
```

### Modified Files
```
M  app/page.tsx (UnifiedCommandPalette integration)
M  components/dashboard/sections/overview-section.tsx (hide old UI)
M  lib/ops/agi/history.ts (Recent Items)
M  package.json (fuse.js)
M  pnpm-lock.yaml
```

### Commit Message
```
feat(phase2-p1): add Natural Language patterns to Unified Command Palette

Summary:
- Natural Language: "move loadout forward 5 days", "advance all TR-3 by 2 days"
- Recent Items: kind+id unique key deduplication
- Fuse.js: useMemo caching for search performance
- Tests: 9/9 passed (phase2-p1), 302 total tests passed

Patterns Added:
1. "move loadout (forward|back) X days"
   - forward = advance (negative delta)
   - back = delay (positive delta)
   
2. "advance/delay all TR-N by X days"
   - Filters activities by tr_unit_id
   - Calculates delta based on action

Implementation:
- components/ops/UnifiedCommandPalette.tsx (lines 133-163)
- Integrated with existing parseNaturalSuggestion
- Opens BulkEditDialog for preview/apply

Verification:
- Unit tests: components/ops/__tests__/UnifiedCommandPalette.phase2-p1.test.ts
- Build: Compiled successfully in 10.6s
- Browser: Command Palette (Ctrl+K) working

Related: #unified-command-palette #phase2-p1
Refs: docs/PHASE2_P1_IMPLEMENTATION_REPORT.md
```

---

## Commit 3: Phase 1 Consolidation (Gantt Controls, Docs)

### Modified Files
```
M  components/dashboard/gantt-chart.tsx (simplified legend)
M  components/dashboard/milestone-tracker.tsx
M  components/dashboard/timeline-controls.tsx (removed pan buttons)
M  lib/gantt-legend-guide.ts (SPECIAL_DEFS)
```

### New Docs
```
?? docs/AGI_SCHEDULE_UPDATER_*.md
?? docs/COMMAND_*.md
?? docs/GANTT_*.md
?? docs/MILESTONE_*.md
?? docs/WHATIF_*.md
```

### Commit Message
```
docs: add verification reports and implementation plans

Summary:
- Gantt Chart controls simplification (Phase 1)
- Command Palette UX consolidation plans
- What-If + Actual verification reports
- Milestone Tracker verification
- AGI Schedule Updater UX improvement plan

Reports Added:
- GANTT_CONTROLS_PHASE1_IMPLEMENTATION.md (64% control reduction)
- COMMAND_PALETTE_UNIFIED_UX_PLAN.md (full 4-week scope)
- WHATIF_RECORD_ACTUAL_VERIFICATION_REPORT.md (browser-based)
- MILESTONE_TRACKER_VERIFICATION.md (production ready)
- AGI_SCHEDULE_UPDATER_UX_IMPROVEMENT_PLAN.md

Changes:
- Gantt: Remove Pan Left/Right, consolidate legend
- Timeline: Simplified zoom/pan controls
- Docs: Comprehensive verification and planning

Related: #documentation #phase1-consolidation
```

---

## Staging Commands

### Option 1: 3 Separate Commits (Recommended)
```bash
# Commit 1: What-If + Actual
git add __tests__/integration/what-if-simulation-flow.test.ts
git add app/globals.css
git add app/page.tsx
git add components/dashboard/gantt-chart.tsx
git add components/detail/__tests__/detail-panel-actual.test.tsx
git add lib/gantt/__tests__/grouping.test.ts
git add lib/gantt/__tests__/visTimelineMapper.test.ts
git add lib/gantt/grouping.ts
git add lib/gantt/visTimelineMapper.ts
git commit -m "$(cat <<'EOF'
feat: enhance What-If simulation and Record Actual visualization

Summary:
- What-If: Dual ghost bars (old/new) + affected activity highlights
- Record Actual: Immediate visualization + History mode gating/clamping
- Tests: 302 tests passed, build successful

(full message from above)
EOF
)"

# Commit 2: Phase 2 P1
git add components/ops/
git add lib/ops/
git add docs/PHASE2_P1_IMPLEMENTATION_REPORT.md
git add lib/ops/agi/history.ts
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase2-p1): add Natural Language patterns to Unified Command Palette
(full message from above)
EOF
)"

# Commit 3: Docs
git add docs/*.md
git add docs/plan/*.md
git add components/dashboard/milestone-tracker.tsx
git add components/dashboard/timeline-controls.tsx
git add lib/gantt-legend-guide.ts
git commit -m "$(cat <<'EOF'
docs: add verification reports and implementation plans
(full message from above)
EOF
)"
```

### Option 2: 1 Consolidated Commit (Faster)
```bash
git add -A
git commit -m "feat: What-If/Actual enhancement + Phase2-P1 Natural Language + Docs

- What-If: Dual ghost bars + affected highlights
- Record Actual: Immediate viz + History gating
- Command Palette: Natural Language patterns (move loadout, advance TR-N)
- Gantt: Controls simplification (Phase 1)
- Docs: Comprehensive verification reports

Tests: 302/302 passed, Build: Success"
```

---

## Recommendation

**3 Separate Commits** (Option 1) for:
- Clear history
- Easy revert if needed
- Better code review

Would you like me to:
1. Execute Option 1 (3 commits)
2. Execute Option 2 (1 commit)
3. Custom selection?
