# Security Remediation + TypeScript Error Check Report
**Date:** 2026-02-06  
**Status:** ✅ COMPLETE (Security) | ⚠️ ACTION REQUIRED (TypeScript)

---

## 1. Security Remediation: `.env.vercel.production`

### ✅ Completed Actions

**1.1 Git Tracking Removal**
- **Status:** Successfully untracked from git repository
- **Command Executed:** `git rm --cached .env.vercel.production`
- **Git Status:** File marked for deletion (`D .env.vercel.production`)
- **Local File:** Preserved (not deleted from filesystem)

**1.2 `.gitignore` Coverage**
- **Status:** ✅ VERIFIED
- **Coverage:** Line 16 of `.gitignore` explicitly excludes `.env.vercel.production`
- **Pattern Match:** Also covered by `.env.vercel.*` (line 17)

### ⚠️ Action Required: Secret Rotation

**Critical Next Steps (Manual Action Required):**

1. **Access Vercel Dashboard:**
   - Navigate to: https://vercel.com/[your-team]/[tr-dashboard-project]/settings/environment-variables
   - Or use CLI: `vercel project ls` to find project ID

2. **Rotate ALL Environment Variables:**
   - Review each environment variable in Production scope
   - For sensitive values (API keys, tokens, database URLs):
     - Generate new secrets/credentials from the original service
     - Update in Vercel Dashboard: Delete old → Add new with same name
     - Record rotation in your security log

3. **Pull Fresh Environment for Local Development:**
   ```bash
   vercel env pull .env.local
   ```

4. **Commit the Removal:**
   ```bash
   git commit -m "security: untrack .env.vercel.production per AGENTS.md P0"
   ```

**⚠️ Security Notice:**
- The file was tracked in git history. Consider this a **potential exposure** event.
- Any secrets in `.env.vercel.production` should be treated as **compromised** and rotated immediately.
- Review git log for commit history: `git log --all --full-history -- .env.vercel.production`

---

## 2. TypeScript Error Check

### 📊 Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Errors** | 1,024 |
| **Affected Files** | ~50+ files |
| **Command Used** | `pnpm exec tsc --noEmit --incremental false --pretty false` |
| **Exit Code** | 2 (errors present) |

### 🔥 Top 10 Offenders (by error count)

| Errors | File Path |
|--------|-----------|
| 39 | `files/map/bundle-geofence-heatmap-eta/dashboard/HeaderBar.tsx` |
| 39 | `tr_dash/files/map/bundle-geofence-heatmap-eta/dashboard/HeaderBar.tsx` (duplicate) |
| 31 | `files/map/bundle-geofence-heatmap-eta/store/logisticsStore.ts` |
| 31 | `tr_dash/files/map/bundle-geofence-heatmap-eta/store/logisticsStore.ts` (duplicate) |
| 22 | `files/map/bundle-geofence-heatmap-eta/MapView.tsx` |
| 22 | `tr_dash/files/map/bundle-geofence-heatmap-eta/MapView.tsx` (duplicate) |
| 20 | `files/map/MapView.tsx` |
| 20 | `tr_dash/files/map/MapView.tsx` (duplicate) |
| 14 | `__tests__/integration/what-if-simulation-flow.test.ts` |
| 14 | `tr_dash/__tests__/integration/what-if-simulation-flow.test.ts` (duplicate) |

**Note:** The `tr_dash/` directory appears to be a duplicate of the root workspace, doubling the error count artificially.

### 📋 Error Categories

#### **Category 1: Missing Type Declarations (High Priority)**
```
Cannot find module 'leaflet' - Missing @types/leaflet
Cannot find module '@deck.gl/layers' - Missing @deck.gl/layers types
Cannot find module 'zustand' - Missing zustand types
Cannot find module 'maplibre-gl' - Missing maplibre-gl types
```

**Fix:** Install missing type declarations:
```bash
pnpm add -D @types/leaflet @deck.gl/layers @deck.gl/core @deck.gl/mapbox zustand maplibre-gl
```

#### **Category 2: SSOT Schema Mismatches (Critical)**
```
__tests__/integration/story-header-ssot.test.ts:
- Activity type missing required properties: type_id, trip_id, lock_level, evidence_required
- Location type missing 'type' property
- Trip type missing 'sequence' property
- TR type missing 'weight_tons' property
```

**Root Cause:** Test fixtures not aligned with current `option_c.json` schema (Contract v0.8.0).

**Fix:** Update test fixtures to match SSOT schema in `lib/ssot/utils/schedule-mapper.ts`.

#### **Category 3: Type Safety Violations (Medium Priority)**
```
Type 'null' is not assignable to type 'string | undefined'
Property 'dependencies' does not exist on type 'ScheduleActivity'
Parameter 'd' implicitly has an 'any' type
```

**Fix:** Enable stricter null checks and add explicit type annotations.

#### **Category 4: Component Props Mismatches (Medium Priority)**
```
components/history/HistoryEvidencePanel.tsx:
- Property 'onAddEvidence' does not exist on type 'EvidenceTabProps'
- Property 'canAddEvidence' does not exist on type 'EvidenceTabProps'

components/dashboard/StoryHeader.tsx:
- Type '"warning"' not in Badge variant union
```

**Fix:** Update component interfaces to match implementation.

#### **Category 5: Leaflet/React-Leaflet Integration Issues**
```
components/map/MapContent.tsx:
- Property 'center' does not exist on type 'MapContainerProps'
- Property 'icon' does not exist on type 'MarkerProps'
```

**Fix:** Check react-leaflet version compatibility and prop naming.

---

## 3. Recommendations

### 🚨 Immediate Actions (P0)
1. **Rotate Vercel secrets** (see Section 1.2 above)
2. **Commit the untracked file:** `git commit -m "security: untrack .env.vercel.production"`
3. **Install missing type packages** (see Category 1)

### 📝 High Priority (P1)
1. **Fix SSOT schema mismatches** in integration tests (Category 2)
2. **Remove duplicate `tr_dash/` directory** (artificially doubling error count)
3. **Add missing component props** in EvidenceTab and StoryHeader

### 🔧 Medium Priority (P2)
1. **Enable `strictNullChecks`** in `tsconfig.json` (currently disabled)
2. **Fix implicit `any` types** in event handlers and parameters
3. **Resolve react-leaflet prop type issues**

### 🧹 Low Priority (P3)
1. **Clean up archived/experimental map code** in `files/map/bundle-geofence-heatmap-eta/`
2. **Consider moving map experiments** to a separate branch
3. **Add ESLint rules** to catch these issues earlier

---

## 4. Next Steps

### For Security:
```bash
# 1. Rotate secrets in Vercel Dashboard (manual step)
# 2. Commit the removal
git commit -m "security: untrack .env.vercel.production per AGENTS.md P0"

# 3. Pull fresh env vars for local dev
vercel env pull .env.local
```

### For TypeScript Errors:
```bash
# 1. Install missing types
pnpm add -D @types/leaflet @deck.gl/layers @deck.gl/core @deck.gl/mapbox zustand maplibre-gl

# 2. Re-run typecheck
pnpm exec tsc --noEmit --incremental false

# 3. Fix SSOT test mismatches (use tr-implementer or manual fix)
# 4. Remove duplicate tr_dash/ directory if not needed
```

---

## 5. Compliance Notes

- ✅ Followed **AGENTS.md Section 1.5** (Security/Deployment Hygiene)
- ✅ No `.env` file contents were read or displayed
- ✅ No git history rewrite performed (safe removal method used)
- ✅ Local file preserved for manual secret rotation reference
- ⚠️ **Action Required:** Secret rotation must be completed before next deployment

---

**Report Generated:** 2026-02-06  
**Verification Commands:**
```bash
# Verify file is untracked
git status | grep .env.vercel.production

# Verify .gitignore coverage
grep -E '\.env' .gitignore

# Check TypeScript error count
pnpm exec tsc --noEmit 2>&1 | grep -c 'error TS'
```
