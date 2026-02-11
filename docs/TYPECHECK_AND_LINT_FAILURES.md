# Typecheck / Lint 실패 원인 정리

**작성일**: 2026-02-11  
**최종 업데이트**: 2026-02-11 — **해결 완료**  
**기준**: `pnpm run typecheck`, `pnpm run lint` (전체 레포)

---

## 상태: 해결 완료 (2026-02-11)

- **`pnpm exec tsc --noEmit --incremental false`**: 0 errors ✅  
- **`pnpm exec eslint . --quiet`**: 0 errors ✅  
- **관련 테스트**: dependency-cascade, schedule-preview-paths, what-if-simulation, TideOverlayGantt, tideService 등 통과 ✅  

이후 반영(Reflow dependency cascade, TideOverlayGantt 수동 가이던스)에서도 tsc·eslint 0 유지. 적용된 변경 요약은 [§4. 적용 완료 내역](#4-적용-완료-내역-2026-02-11) 참고. 아래 §1–§3은 **당시 실패 원인 및 조치 방향** 참고용으로 유지.

---

## 1. Typecheck 실패 (tsc --noEmit) — 당시 원인

### 1.1 요약

| 구분 | 개수 | 비고 |
|------|------|------|
| **모듈 없음 (TS2307)** | 8건 | 경로/패키지 누락 |
| **타입 불일치 (TS2345, TS2322, TS2352, TS2353)** | 20건+ | 인자/리터럴/변환 |
| **속성 없음 (TS2339, TS2551)** | 12건 | ReflowPin, Constraint, Resource, LocationWithStatus |
| **implicit any (TS7006)** | 2건 | 파라미터 타입 명시 필요 |
| **possibly undefined/null (TS18047, TS18048)** | 4건 | null 체크 또는 단언 |
| **비교 타입 불일치 (TS2367)** | 2건 | 테스트 리터럴 |
| **필수 속성 누락 (TS2740, TS2741)** | 6건+ | OptionC contract, ReasonTag, Baselines 등 |

총 **50건 이상** (파일·라인 기준).

---

### 1.2 원인별 분류

#### A. 모듈/경로 없음 (TS2307)

| 파일 | 내용 |
|------|------|
| `app/api/nl-command/route.ts` | `@/lib/types/schedule` 없음 (경로 또는 파일 부재) |
| `files/map/HvdcPoiLayers.ts` | `../../lib/map/hvdcPoiLocations` 없음 |
| `files/map/layers/createEtaWedgeLayer.ts` | `@/types/logistics` 없음 |
| `files/map/layers/createGeofenceLayer.ts` | `@/types/logistics` 없음 |
| `files/map/layers/createHeatmapLayer.ts` | `@deck.gl/aggregation-layers`, `@/types/logistics` 없음 |
| `files/map/layers/createLocationLayer.ts` | `@/types/logistics` 없음 |
| `files/map/layers/geofenceUtils.ts` | `@/types/logistics` 없음 |
| `files/map/PoiLocationsLayer.ts` | `@/lib/map/poiTypes` 없음 |

**조치 방향**: `tsconfig` paths 추가, 해당 모듈 생성, 또는 `files/map`이 비빌드 참조용이면 `exclude`/별도 프로젝트 처리.

---

#### B. Reflow/SSOT 타입 스키마 변경 (라이브 코드)

| 파일 | 내용 |
|------|------|
| `src/lib/reflow/forward-pass.ts` | `ReflowPin`에 `strength`, `pin_type`, `target_ts` 없음 (스키마와 불일치) |
| `src/lib/reflow/forward-pass.ts` | `Constraint`에 `constraint_type` 없음 → `kind` 등 현재 스키마에 맞게 수정 |
| `src/lib/reflow/forward-pass.ts` | `Resource`에 `calendar_id` 없음 → `calendar` 사용 여부 확인 |
| `src/lib/reflow/forward-pass.ts` | `number | null`을 `number` 인자에 전달 (259, 262행) |
| `src/lib/reflow/backward-pass.ts` | `number | null` 전달 (75행), `activity.plan.duration_min` possibly null (174행) |
| `lib/ops/event-sourcing/kpi-calculator.ts` | `Record<ReasonTag, number>` 초기값에 필수 키(OTHER, RESOURCE, PTW, CERT 등) 누락 |

**조치 방향**: SSOT 타입 정의(`ReflowPin`, `Constraint`, `Resource`, `ReasonTag` 등)와 동기화하거나, null/undefined 가드 추가.

---

#### C. 테스트/픽스처 타입 (OptionC, Baselines, Constraint 등)

| 파일 | 내용 |
|------|------|
| `lib/reports/__tests__/trip-report.test.ts` | `OptionC` 변환 시 `constraint_rules` 형태 불일치 → `as unknown as OptionC` 또는 픽스처 보강 |
| `src/lib/__tests__/ssot-loader.test.ts` | `OptionC` 픽스처 필수 필드 누락, `activity` possibly undefined |
| `src/lib/reflow/__tests__/reflow-manager.test.ts` | `OptionC` contract에 `name`, `timezone`, `generated_at` 등 누락 |
| `src/lib/reflow/__tests__/collision-detect.test.ts` | `Constraint[]` vs `constraint_type` 형태, `Baselines.current` 없음, `derived_fields_read_only` 누락 |
| `src/lib/reflow/__tests__/forward-pass.test.ts` | `DurationMode`에 `"work_hours"` 없음, `Baselines`, `Constraint` 리터럴 불일치 |
| `src/lib/state-machine/__tests__/state-machine.test.ts` | contract에 `derived_fields_read_only` 누락 |
| `lib/gantt/__tests__/visTimelineMapper.test.ts` | `CompareResult`에 `kpis` 필드 누락 |

**조치 방향**: 테스트용 타입/헬퍼 정리, `as OptionC` 등 단언 시 `unknown` 경유, 공통 픽스처에 SSOT 필수 필드 반영.

---

#### D. UI/API (실사용 코드)

| 파일 | 내용 |
|------|------|
| `components/ops/UnifiedCommandPalette.tsx` | 276·277행: `string | undefined` → `string` 인자에 전달 (null 체크 또는 기본값) |
| `components/ops/__tests__/UnifiedCommandPalette.phase2-p1.test.ts` | 리터럴 `"back"`/`"forward"`, `"delay"`/`"advance"` 비교로 인한 TS2367 |
| `src/lib/__tests__/derived-calc.test.ts` | `calc` possibly undefined (225행) |
| `files/map/layers/createLocationLayer.ts` | `LocationWithStatus`에 `lon`/`lat` 없음 (타입 정의 또는 필드명 확인) |
| `files/map/layers/createHeatmapLayer.ts` | 파라미터 `d` implicit any (28행) |
| `app/api/nl-command/route.ts` | 파라미터 `c` implicit any (257행) |

**조치 방향**: 선택적 체이닝/기본값, 테스트 기대값 타입 맞추기, `any` 대신 구체 타입 또는 `unknown` 사용.

---

#### E. agi-schedule-updater-bar (과거 실행 기준)

- `getId`, `getName`, `getStart`, `getEnd`를 찾을 수 없음 (77, 86, 89, 313–314, 326–329행 등).
- **조치 방향**: 해당 헬퍼가 제거/이동됐다면 import 경로 복구 또는 동일 역할 함수로 대체.

---

## 2. Lint 실패 (ESLint) — 당시 원인

### 2.1 요약

- **에러**: 규칙 위반으로 빌드/CI에서 실패로 간주되는 항목.
- **경고**: 수백 건 (no-explicit-any, no-unused-vars, set-state-in-effect, exhaustive-deps 등).  
  실패(exit 1)의 직접 원인은 **에러**만 해당.

---

### 2.2 에러 (실패 원인)

#### A. react-hooks/purity — 렌더 중 비순수 함수 호출

| 파일 | 라인 | 내용 |
|------|------|------|
| `archive/map-experiments-20260206/MapView.tsx` | 73 | `Date.now()`를 useMemo 내부에서 호출 |
| `archive/map-experiments-20260206/bundle-geofence-heatmap-eta/MapView.tsx` | 73 | 동일 |
| `archive/map-experiments-20260206/bundle-geofence-heatmap-eta/dashboard/HeaderBar.tsx` | 32 | 동일 |
| `archive/vis-timeline-gantt_20260203/components/ui/sidebar.tsx` | 663 | 비순수 함수 호출 |
| `tr_dash-main/archive/.../sidebar.tsx` | 663 | 동일 |

**조치 방향**: `archive/`는 참조용이면 `eslintignore`에 추가. 수정 시 `Date.now()`는 effect/이벤트 핸들러로 옮기거나 인자로 주입.

---

#### B. react-hooks/refs — 렌더 중 ref 접근

| 파일 | 라인 | 내용 |
|------|------|------|
| `components/gantt/VisTimelineGantt.tsx` | 105–115 | 렌더 단계에서 `*.Ref.current = ...` 할당 (다수 라인) |
| `tr_dash-main/components/gantt/VisTimelineGantt.tsx` | 59–61 | 동일 패턴 |

**조치 방향**: ref 할당을 `useEffect` 또는 콜백 ref로 옮겨, 렌더 중에는 ref에 쓰지 않기.

---

#### C. @typescript-eslint/ban-ts-comment

| 파일 | 라인 | 내용 |
|------|------|------|
| `files/map/PoiLocationsLayer.ts` | 3, 115 | `@ts-ignore` 사용 → `@ts-expect-error`로 교체 (밑줄에 실제 오류가 있을 때만) |

**조치 방향**: `@ts-ignore`를 `@ts-expect-error`로 바꾸고, 해당 라인에 타입 오류가 있는지 확인.

---

### 2.3 경고 (실패 아님, 개선 권장)

- **app/page.tsx**: set-state-in-effect(380), no-unused-vars(handleOpsCommand), no-explicit-any(559–560).
- **archive/** 다수: set-state-in-effect, no-unused-vars, preserve-manual-memoization, exhaustive-deps.
- **그 외**: `__tests__`/통합 테스트의 any, unused 변수 등.

lint를 통과시키려면 **에러만 제거**하면 되고, 경고는 단계적으로 줄이면 됨.

---

## 3. 권장 조치 순서

1. **Lint 에러 제거** (빠른 CI 통과)  
   - `archive/`를 `eslintignore`에 넣거나,  
   - `VisTimelineGantt.tsx` ref 할당을 effect로 이동,  
   - `files/map/PoiLocationsLayer.ts`의 `@ts-ignore` → `@ts-expect-error`.

2. **Typecheck**:  
   - 먼저 **모듈/경로** (A) 해결 → `files/map` 제외 또는 paths/모듈 생성.  
   - 이어서 **Reflow/SSOT** (B) 타입 정의와 라이브 코드 동기화.  
   - 테스트(C)는 픽스처/단언 정리.  
   - UI/API(D, E)는 null 체크·타입 수정.

3. **경고**는 no-unused-vars 제거, any 축소, effect 의존성 정리 순으로 정리하면 됨.

---

## 4. 적용 완료 내역 (2026-02-11)

다음 변경으로 typecheck/lint 0 errors 및 지정 테스트 전부 통과를 달성함.

### Lint 에러 차단·Ref/렌더

| 구분 | 파일 | 조치 |
|------|------|------|
| ESLint 범위 | `eslint.config.mjs` | 에러 차단 범위 설정 (archive 등) |
| Ref 렌더 접근 제거 | `components/dashboard/gantt-chart.tsx` | 렌더 중 ref 접근 제거 |
| Ref 렌더 접근 제거 | `components/gantt/VisTimelineGantt.tsx` | ref 할당을 effect 등으로 이동 |
| @ts 정리·map 타입 | `files/map/PoiLocationsLayer.ts` | @ts-ignore 제거, 타입 정리 |
| @ts 정리·map 타입 | `files/map/layers/createHeatmapLayer.ts` | 타입 정리 |

### 누락 타입/모듈 보강

| 파일 | 역할 |
|------|------|
| `types/logistics.ts` | `@/types/logistics` 타입 정의 |
| `types/deckgl-aggregation-layers.d.ts` | `@deck.gl/aggregation-layers` 타입 선언 |
| `lib/map/poiTypes.ts` | `@/lib/map/poiTypes` (poiTypes 모듈) |
| `lib/map/hvdcPoiLocations.ts` | `hvdcPoiLocations` 모듈 |

### 런타임 타입 수정

| 파일 | 내용 |
|------|------|
| `app/api/nl-command/route.ts` | 모듈 경로·파라미터 타입 |
| `components/ops/UnifiedCommandPalette.tsx` | string \| undefined → string 처리 |
| `lib/ops/event-sourcing/kpi-calculator.ts` | `Record<ReasonTag, number>` 초기값 |
| `src/lib/ssot-queries.ts` | SSOT 쿼리 타입 |
| `src/lib/reflow/forward-pass.ts` | ReflowPin/Constraint/Resource/null 처리 |
| `src/lib/reflow/backward-pass.ts` | number \| null 가드 |

### 테스트 타입/픽스처 정리

| 파일 |
|------|
| `components/ops/__tests__/UnifiedCommandPalette.phase2-p1.test.ts` |
| `lib/gantt/__tests__/visTimelineMapper.test.ts` |
| `lib/reports/__tests__/trip-report.test.ts` |
| `src/lib/__tests__/ssot-loader.test.ts` |
| `src/lib/__tests__/derived-calc.test.ts` |
| `src/lib/reflow/__tests__/forward-pass.test.ts` |
| `src/lib/reflow/__tests__/collision-detect.test.ts` |
| `src/lib/reflow/__tests__/reflow-manager.test.ts` |
| `src/lib/state-machine/__tests__/state-machine.test.ts` |

**변경 규모**: 24개 파일, +470 / -271 (라인).

---

**Refs**: `pnpm run typecheck`, `pnpm run lint` (2026-02-11 실행 결과). 해결 후 검증: `tsc --noEmit --incremental false`, `eslint . --quiet`, 위 9개 테스트 일괄 실행.
