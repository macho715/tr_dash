# Voyage Display Fix Report
**Date:** 2026-02-06  
**Issue:** Voyage Overview showing only Voyage 2 instead of all 7 voyages

---

## Problem Analysis

### Root Cause
The `VoyageCards` component in `components/dashboard/voyage-cards.tsx` was filtering voyages based on the current selected date:

```typescript
// Lines 34-38 (OLD)
const filteredVoyages = voyages.filter((v) => {
  const loadOutDate = parseVoyageDate(v.loadOut)
  const jackDownDate = parseVoyageDate(v.jackDown)
  return selectedDate >= loadOutDate && selectedDate <= jackDownDate
})
```

### Why Only Voyage 2 Was Showing
- Current date: **Feb 6, 2026** (from `getSmartInitialDate()`)
- Voyage 2 range: **Feb 05 - Feb 14**
- Date falls within Voyage 2's active window → only Voyage 2 was displayed

---

## Solution Applied

### Change: Remove Date-Based Filtering
**File:** `components/dashboard/voyage-cards.tsx`

```typescript
// Lines 31-35 (NEW)
export function VoyageCards({ onSelectVoyage, selectedVoyage }: VoyageCardsProps) {
  const { selectedDate } = useDate()

  // Show all voyages always (removed filtering)
  const displayVoyages = voyages
```

### Removed Elements
1. **Filtering logic** (lines 34-38)
2. **Conditional text** showing "X of 7 visible" (lines 55-59)

### Preserved Functionality
- **Status color coding** still works:
  - `planned` (gray): Future voyages
  - `in_progress` (blue): Current voyage based on selected date
  - `completed` (green): Past voyages
- **Voyage selection** via click
- **Tide table** for each voyage

---

## Result

**Before:** Only 1 voyage visible (Voyage 2)  
**After:** All 7 voyages always visible with status color coding

---

## Testing Instructions

1. **Refresh browser:** http://localhost:3000
2. **Verify:** All 7 voyages display in Voyage Overview section
3. **Check status colors:**
   - Voyages 1: Should show as `completed` (green)
   - Voyage 2: Should show as `in_progress` (blue)
   - Voyages 3-7: Should show as `planned` (gray)
4. **Test date navigation:**
   - Change date cursor
   - Verify all 7 voyages remain visible
   - Verify status colors update correctly

---

## Related Files
- `components/dashboard/voyage-cards.tsx` - Main fix
- `lib/dashboard-data.ts` - Voyages data source (7 voyages)
- `lib/contexts/date-context.tsx` - Date selection context
- `lib/ssot/map-status-colors.ts` - Status color mapping
