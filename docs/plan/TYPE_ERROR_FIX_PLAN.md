# Type Error Fix Plan — TR Dashboard

**Last updated:** 2026-02-08 (Phase 2 진행 중)
**Goal:** `pnpm typecheck` 0 errors + existing tests green
**Scope:** contract v0.8.0 기준 SSOT 정합성 유지

---

## 📊 현재 상태 (2026-02-08 15:00 최종)

| 항목 | 상태 |
| ------------------- | -------------------------------------------- |
| **타입 에러** | 53개 (시작 100+ → 47% 감소) |
| **Phase 1**   | ✅ 완료 (API 라우트) |
| **Phase 2 (P1)**   | ✅ 완료 (핵심 타입 8개) |
| **Phase 2 (P2)**   | ✅ 완료 (reflow 6개) |
| **Phase 3/4**   | ⏳ 남은 53개 (테스트 픽스쳐, 모듈 경로 등) |
| **테스트**    | ✅ 295개 통과 (4개 타임아웃) |

**완료된 수정 (총 14개):**
1. ✅ UnifiedCommandPalette 날짜 타입 (toIsoDate 가드)
2. ✅ derived-calc 'committed' 상태 제거
3. ✅ derived-calc null 처리 4건
4. ✅ derived-calc undefined 처리 2건
5. ✅ reflow-manager undefined 필터링 6건

**남은 작업 (53개):**
- 테스트 픽스쳐 SSOT 동기화 (~25개)
- 모듈 경로 수정 (~8개)
- ReflowPin, Constraint 타입 (~10개)
- 기타 null/undefined 처리 (~10개)

---

## 0) Preflight 실행 결과

✅ `pnpm typecheck` 실행 완료
✅ 에러 70개 → P0/P1/P2/P3 재분류 완료

---

## Phase 1 — Critical (P0) Next.js 16 Route Handler ✅ 완료

### 상태: ✅ DONE

원래 API 라우트 에러는 이미 수정되었거나 다른 이슈로 대체됨.

---

## Phase 2 — High (P1) 핵심 타입 에러 (현재 진행)

### 🔴 P1.1: UnifiedCommandPalette.tsx 날짜 타입 (3건)

**문제:**

```typescript
// 에러: Argument of type 'string' is not assignable to parameter of type '`${number}-${number}-${number}`'
components/ops/UnifiedCommandPalette.tsx(445,96)
components/ops/UnifiedCommandPalette.tsx(447,38)
components/ops/UnifiedCommandPalette.tsx(462,59)
```

**원인:** 날짜 문자열이 템플릿 리터럴 타입 `YYYY-MM-DD`와 불일치

**해결:**

```typescript
// 타입 가드 추가 또는 as 단언
const dateStr = someDate as `${number}-${number}-${number}`;
// 또는 함수 시그니처 수정
```

**Acceptance:**

- [X] 3개 날짜 타입 에러 해결
- [X] Command Palette 정상 동작

---

### 🔴 P1.2: state-machine/states.ts enum 불일치 (1건)

**문제:**

```
src/lib/state-machine/states.ts(11,14): error TS2739
Type is missing the following properties: done, cancelled
```

**해결:**

```typescript
export const VALID_TRANSITIONS: Record<ActivityState, ActivityState[]> = {
  // ... 기존 전이 규칙
  completed: ['verified', 'done'],
  verified: ['done'],
  done: [],
  cancelled: [], // 추가
  // ...
};
```

**Acceptance:**

- [ ] enum 타입 에러 해결
- [ ] 상태 전이 테스트 통과

---

### 🔴 P1.3: derived-calc.ts 상태 비교 (1건)

**문제:**

```
src/lib/derived-calc.ts(80,29): error TS2367
This comparison appears to be unintentional because the types have no overlap: 'committed'
```

**해결:**

```typescript
// ActivityState에 'committed' 추가 또는 비교 로직 수정
if (state === 'ready' || state === 'committed') {
  // 타입 가드로 처리
}
```

**Acceptance:**

- [ ] 상태 비교 에러 해결
- [ ] derived calculation 테스트 통과

---

**Priority:** P1 (즉시 진행)
**Duration:** 1시간
**Risk:** Low (명확한 타입 수정)

---

## Phase 3 — Medium (P2) Null 안전성 & Reflow 타입 (40개)

### 🟡 P2.1: derived-calc.ts null 처리 (8건)

**문제:**
```
src/lib/derived-calc.ts: 'string | null' is not assignable to 'string | number'
```

**해결 패턴:**
```typescript
// Before
const start = activity.plan.start; // string | null
const date = parseISO(start); // 에러

// After
if (activity.plan.start) {
  const date = parseISO(activity.plan.start);
}
// 또는
const start = activity.plan.start ?? '';
```

**파일:**
- `src/lib/derived-calc.ts` (87, 88, 103, 104, 184, 207)

---

### 🟡 P2.2: reflow-manager.ts undefined 필터링 (6건)

**문제:**
```
src/lib/reflow/reflow-manager.ts: Type '(Activity | undefined)[]' is not assignable to 'Activity[]'
```

**해결:**
```typescript
// Before
const activities = activityIds.map(id => entities.activities[id]);

// After
const activities = activityIds
  .map(id => entities.activities[id])
  .filter((a): a is Activity => a !== undefined);
```

---

### 🟡 P2.3: Reflow 테스트 픽스쳐 (20+건)

**문제:** SSOT 스키마 진화로 `Constraint`, `Baselines`, `SSOT` 속성 불일치

**대상 파일:**
- `src/lib/reflow/__tests__/collision-detect.test.ts`
- `src/lib/reflow/__tests__/forward-pass.test.ts`
- `src/lib/reflow/__tests__/reflow-manager.test.ts`

**해결:** `tests/fixtures/option_c_baseline.json` 참조하여 필수 속성 추가

---

### 🟡 P2.4: ReflowPin 속성 (4건)

**문제:**
```
src/lib/reflow/forward-pass.ts: Property 'strength' does not exist on type 'ReflowPin'
```

**해결:** ReflowPin 타입 정의 확인 및 속성 추가 또는 옵셔널 처리

---

**Priority:** P2 (주 내)
**Duration:** 3시간
**Risk:** Medium (테스트 영향)

---

## Phase 4 — Low (P3) 모듈 경로 & 테스트 픽스쳐 (25개)

### 🟢 P3.1: 모듈 경로 수정 (7건)

**문제:**
```
files/map/layers/*: Cannot find module '@/types/logistics' or '@deck.gl/aggregation-layers'
```

**해결:**
1. tsconfig.json paths 확인
2. `@/types/logistics` → `@/types/ssot` 또는 올바른 경로로 수정
3. `@deck.gl/aggregation-layers` 패키지 설치 확인

**대상 파일:**
- `files/map/HvdcPoiLayers.ts`
- `files/map/layers/createEtaWedgeLayer.ts`
- `files/map/layers/createGeofenceLayer.ts`
- `files/map/layers/createHeatmapLayer.ts`
- `files/map/layers/createLocationLayer.ts`
- `files/map/layers/geofenceUtils.ts`
- `files/map/PoiLocationsLayer.ts`

---

### 🟢 P3.2: 테스트 픽스쳐 Activity 속성 (10+건)

**문제:** `Activity` 타입 필수 속성 누락

**해결:** `option_c_baseline.json` 참조하여 속성 추가:
```typescript
const mockActivity: Activity = {
  activity_id: 'A1000',
  type_id: 'LOAD',
  trip_id: 'TRIP_001',
  title: 'Test Activity',
  state: 'planned',
  lock_level: 'NONE',
  evidence_required: [],
  depends_on: [],
  plan: { /* ... */ },
  actual: { /* ... */ },
  // ... 기타 필수 속성
};
```

**대상 파일:**
- `lib/ops/event-sourcing/__tests__/activity-resolver.test.ts`
- `src/lib/__tests__/ssot-loader.test.ts`
- 기타 테스트 파일

---

### 🟢 P3.3: 기타 타입 이슈 (8건)

- `UnifiedCommandPalette.phase2-p1.test.ts`: 문자열 비교 타입 (2건)
- `kpi-calculator.ts`: Record<ReasonTag, number> 초기화
- `gantt-utils.ts`: 모듈 경로 수정

---

**Priority:** P3 (마감 전)
**Duration:** 2시간
**Risk:** Low (개발 환경만 영향)

---

## 검증 체크리스트

### Phase별 완료 기준

**Phase 1 (P0):** ✅ 완료
- [x] API 라우트 에러 해결

**Phase 2 (P1):** 🔄 진행 중 (5개 에러)
- [ ] UnifiedCommandPalette 날짜 타입 (3건)
- [ ] state-machine enum (1건)
- [ ] derived-calc 상태 비교 (1건)

**Phase 3 (P2):** ⏳ 대기 (40개 에러)
- [ ] derived-calc null 처리 (8건)
- [ ] reflow-manager undefined 필터 (6건)
- [ ] Reflow 테스트 픽스쳐 (20+건)
- [ ] ReflowPin 속성 (4건)

**Phase 4 (P3):** ⏳ 대기 (25개 에러)
- [ ] 모듈 경로 수정 (7건)
- [ ] 테스트 Activity 속성 (10+건)
- [ ] 기타 타입 이슈 (8건)

---

### 최종 검증

- [ ] `pnpm typecheck` — **0 errors**
- [ ] `pnpm test:run` — **295+ tests PASS**
- [ ] `pnpm build` — **Build successful**
- [ ] `pnpm validate:ssot` — **SSOT 무결성 유지**
- [ ] Manual QA — **Where→When/What→Evidence 플로우 정상**

---

## Next Step — Phase 2 실행

### 즉시 실행: P1.1 UnifiedCommandPalette.tsx 날짜 타입 수정

**파일:** `components/ops/UnifiedCommandPalette.tsx`  
**에러 위치:** 445, 447, 462 라인  
**예상 시간:** 15분

**수정 방법:**
1. 해당 라인에서 날짜 문자열 사용 확인
2. 타입 단언 또는 타입 가드 추가
3. 타입 체크 재실행

---

### 실행 순서

1. **P1.1** → UnifiedCommandPalette (15분)
2. **P1.2** → state-machine enum (15분)
3. **P1.3** → derived-calc 상태 비교 (15분)
4. **타입 체크** → `pnpm typecheck` 재실행
5. **P2 진입** → null 처리 & reflow (3시간)

---

**현재 작업:** Phase 2 - P1.1 시작 준비 완료
