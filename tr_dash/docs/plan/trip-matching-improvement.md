---
doc_id: trip-matching-improvement
status: ✅ 완료
created: 2026-02-04
updated: 2026-02-04
---

# Trip Matching Improvement for ReadinessPanel

## 목표

ReadinessPanel의 Trip 선택 정확도를 높이기 위해, Voyage 기반 Trip 매칭 로직을 추가하여 더 나은 폴백 메커니즘을 제공합니다.

## 구현 내용

### 1. normalizeTripMatchValue()

**파일**: `app/page.tsx`

```typescript
function normalizeTripMatchValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}
```

**역할**:
- Trip 이름을 정규화하여 일관된 비교를 가능하게 함
- 소문자 변환 + 영숫자만 추출 (공백, 특수문자 제거)

**예시**:
- `"Voyage 1"` → `"voyage1"`
- `"TR-Unit-1"` → `"trunit1"`
- `"Trip #1"` → `"trip1"`

### 2. matchTripIdForVoyage()

**파일**: `app/page.tsx`

```typescript
function matchTripIdForVoyage(
  voyage: (typeof voyages)[number] | null,
  tripList: { trip_id: string; name: string }[]
): string | null {
  if (!voyage || tripList.length === 0) return null
  const voyageNumber = String(voyage.voyage)
  const tokens = [
    normalizeTripMatchValue(`voyage ${voyageNumber}`),
    normalizeTripMatchValue(`voy ${voyageNumber}`),
    normalizeTripMatchValue(`trip ${voyageNumber}`),
    normalizeTripMatchValue(`tr ${voyageNumber}`),
    normalizeTripMatchValue(`tr unit ${voyageNumber}`),
    normalizeTripMatchValue(voyage.trUnit),
  ]
  const matched = tripList.find((trip) => {
    const normalizedName = normalizeTripMatchValue(trip.name)
    return tokens.some((token) => token && normalizedName.includes(token))
  })
  return matched?.trip_id ?? null
}
```

**역할**:
- Voyage 정보로부터 Trip ID를 매칭
- 여러 네이밍 패턴 지원 (voyage, voy, trip, tr, tr unit, trUnit)
- 유연한 매칭: 토큰이 Trip 이름에 포함되어 있으면 매칭 성공

**매칭 토큰 예시 (Voyage 1)**:
1. `"voyage1"`
2. `"voy1"`
3. `"trip1"`
4. `"tr1"`
5. `"trunit1"`
6. `voyage.trUnit` (예: `"TR1"` → `"tr1"`)

### 3. readinessTripId 파생 로직

**파일**: `app/page.tsx`

```typescript
const selectedTripId = viewMode?.state.selectedTripId ?? null
const tripIdFromVoyage = useMemo(
  () => matchTripIdForVoyage(selectedVoyage, trips),
  [selectedVoyage, trips]
)
const readinessTripId = selectedTripId ?? tripIdFromVoyage ?? null
```

**폴백 우선순위**:
1. **selectedTripId** (ViewMode에서 명시적 선택)
2. **tripIdFromVoyage** (선택된 Voyage로부터 매칭)
3. **null** (매칭 실패)

**ReadinessPanel 연동**:
```typescript
<ReadinessPanel tripId={readinessTripId} />
```

## 장점

### 1. 유연한 매칭
- 여러 네이밍 컨벤션 지원 (Voyage/Voy/Trip/TR/TR Unit)
- 대소문자, 특수문자 무시

### 2. 정확한 Trip 선택
- ViewMode 선택이 없어도 Voyage 기반으로 자동 매칭
- ReadinessPanel이 항상 올바른 Trip을 표시

### 3. 유지보수성
- `normalizeTripMatchValue`로 정규화 로직 재사용
- `matchTripIdForVoyage`로 매칭 로직 분리
- `useMemo`로 불필요한 재계산 방지

## 테스트 시나리오

### 시나리오 1: ViewMode에서 Trip 명시적 선택
```typescript
selectedTripId = "TRIP_001"
tripIdFromVoyage = "TRIP_002"
readinessTripId = "TRIP_001" // ✅ ViewMode 우선
```

### 시나리오 2: ViewMode 선택 없음, Voyage 선택
```typescript
selectedTripId = null
selectedVoyage = { voyage: 1, trUnit: "TR1", ... }
trips = [
  { trip_id: "TRIP_001", name: "Voyage 1" },
  { trip_id: "TRIP_002", name: "Voyage 2" }
]
tripIdFromVoyage = "TRIP_001" // ✅ 매칭 성공
readinessTripId = "TRIP_001"
```

### 시나리오 3: 매칭 실패
```typescript
selectedTripId = null
selectedVoyage = { voyage: 99, trUnit: "TR99", ... }
trips = [
  { trip_id: "TRIP_001", name: "Voyage 1" },
  { trip_id: "TRIP_002", name: "Voyage 2" }
]
tripIdFromVoyage = null // ❌ 매칭 실패
readinessTripId = null
```

## 영향 범위

### 변경 파일
- ✅ `app/page.tsx`
  - `normalizeTripMatchValue()` 추가
  - `matchTripIdForVoyage()` 추가
  - `tripIdFromVoyage` 파생
  - `readinessTripId` 파생 및 ReadinessPanel 연동

### 타입 안정성
- ✅ TypeScript 타입 에러 없음
- ✅ `useMemo`로 최적화

## 향후 개선 방향

### 옵션 1: Fuzzy Matching
- Levenshtein distance 기반 유사도 매칭
- "Voyage 01" ↔ "Voyage 1" 등 더 유연한 매칭

### 옵션 2: 매칭 신뢰도 점수
```typescript
type MatchResult = {
  trip_id: string
  confidence: number // 0.0 ~ 1.0
}
```

### 옵션 3: 매칭 로그
- 매칭 과정 디버그 로그 추가
- 매칭 실패 시 가능한 후보 표시

## 참고 문서

- [AGENTS.md](../AGENTS.md) - SSOT 원칙 준수
- [LAYOUT.md](../LAYOUT.md) - ReadinessPanel 위치 및 역할
- [patch.md](../../patch.md) - UI/UX 개선 방향

## 완료 체크리스트

- [x] `normalizeTripMatchValue()` 구현
- [x] `matchTripIdForVoyage()` 구현
- [x] `tripIdFromVoyage` 파생 로직 추가
- [x] `readinessTripId` 계산 및 ReadinessPanel 연동
- [x] TypeScript 타입 체크 통과
- [x] Git 커밋 완료
- [x] 문서 작성 완료

---

**Status**: ✅ **완료** (2026-02-04)  
**Commit**: `feat: Improve Trip matching for ReadinessPanel`
