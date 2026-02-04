---
doc_id: vis-timeline-gantt-upgrade-plan
refs: [AGENTS.md, patch.md, innovation-scout-vis-timeline-upgrade-20260204.md, components/gantt/VisTimelineGantt.tsx]
created: 2026-02-04
status: READY_FOR_REVIEW
priority: P1
---

# VisTimelineGantt 성능 + UX 업그레이드 실행 계획

> **목표**: TR 이동 대시보드 간트 차트의 성능을 100+ activities 환경에서 최적화하고, Collision/Evidence/Reflow 시각화를 개선하여 운영 효율성을 극대화한다.

---

## 1. Executive Summary

### 1.1 개선 목표
1. **성능 최적화**: 100+ activities 로딩 8초 → 2초 이하, 메모리 50% 감소
2. **UX 혁신**: Collision 식별 10초 → 3초, Evidence 누락 발견율 70% → 100%

### 1.2 예상 기간
- **Phase 1 (Quick Wins)**: 1주 (24시간)
- **Phase 2 (Core Features)**: 3주 (120시간)
- **Phase 3 (최적화)**: 2주 (80시간)
- **총 기간**: 6주 (224시간)

### 1.3 리스크 평가
| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|-----------|
| vis-timeline API 한계 | Medium | High | Hybrid 접근, 단계적 검증 |
| Canvas 렌더링 복잡도 | High | Medium | SVG 우선, POC로 검증 |
| SSOT 무결성 위반 | Low | Critical | validate_optionc.py 단계별 실행 |
| Breaking changes | Medium | High | Feature flag, 점진적 롤아웃 |

### 1.4 성공 지표 (측정 가능)
- **성능**: 100 activities 로딩 < 2초, FPS ≥ 50, 메모리 -50%
- **UX**: Collision 식별 < 5초, Ghost bars 정확도 100%, Evidence 발견율 100%
- **품질**: validate_optionc.py PASS, 테스트 커버리지 ≥ 80%, 린트 경고 0

---

## 2. 기술 설계

### 2.1 성능 최적화

#### 2.1.1 가상 스크롤링 (Virtualization)
**현재 문제**:
- vis-timeline은 모든 항목을 DOM에 렌더링 (100+ activities → 수천 개 DOM 노드)
- 초기 로딩 8초, 스크롤 시 lag 1초

**솔루션**:
```typescript
// lib/gantt/virtualization.ts (신규)
interface VirtualizationConfig {
  viewportHeight: number
  itemHeight: number
  buffer: number // 화면 밖 렌더링 개수
}

export function calculateVisibleRange(
  scrollTop: number,
  config: VirtualizationConfig,
  totalItems: number
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / config.itemHeight) - config.buffer)
  const endIndex = Math.min(
    totalItems,
    Math.ceil((scrollTop + config.viewportHeight) / config.itemHeight) + config.buffer
  )
  return { startIndex, endIndex }
}
```

**통합 전략**:
1. 시간 축 가상화: `setWindow()`는 시간 범위만 제어 (행 가상화 아님)
2. 행(그룹) 가상화: viewport 기반으로 groups/items 동적 필터링 + 스크롤 동기화
3. 리스크: vis-timeline은 행 가상화를 공식 지원하지 않음 → feature flag + fallback 계획 필요

**예상 효과**:
- 초기 렌더링: 전체 → viewport만 (10~20개)
- DOM 노드: 1000+ → 50 이하
- 로딩 시간: 8초 → 1.5초

#### 2.1.2 Canvas 렌더링 (선택적)
**현재**: SVG 기반 (vis-timeline 기본)
**문제**: 100+ bars → SVG path 계산 부하

**솔루션**:
```typescript
// lib/gantt/canvas-renderer.ts (신규)
export class CanvasBarRenderer {
  private ctx: CanvasRenderingContext2D
  
  renderBar(bar: GanttBar, viewport: Viewport) {
    // Canvas API로 rect/gradient 직접 렌더링
    this.ctx.fillStyle = bar.color
    this.ctx.fillRect(bar.x, bar.y, bar.width, bar.height)
    
    // 배지/텍스트는 DOM overlay 유지 (접근성)
  }
}
```

**Hybrid 접근** (권장):
- Bars: Canvas (성능)
- 배지/텍스트/컨트롤: DOM (접근성)
- Dependency arrows: SVG (정확도)

**조건부 적용**:
- 50 activities 미만: SVG 유지
- 50~100: POC 검증 후 결정
- 100+: Canvas 전환

#### 2.1.3 Mapper Caching
**현재 문제**: `ganttRowsToVisData()` 매 렌더링마다 재계산

**솔루션**:
```typescript
// lib/gantt/visTimelineMapper.ts (수정)
const cache = new WeakMap<GanttRow[], Map<CompareResult | null, VisTimelineData>>()

export function ganttRowsToVisDataCached(
  rows: GanttRow[],
  compareDelta?: CompareResult | null
): VisTimelineData {
  const compareKey = compareDelta ?? null
  let compareMap = cache.get(rows)
  if (!compareMap) {
    compareMap = new Map()
    cache.set(rows, compareMap)
  }
  const cached = compareMap.get(compareKey)
  if (cached) return cached
  const result = ganttRowsToVisData(rows, compareDelta)
  compareMap.set(compareKey, result)
  return result
}
```

**주의 사항**:
- 캐시 키는 `rows`/`compareDelta` **참조 안정성**에 의존한다. 상위에서 `useMemo`로 `rows`/`compareDelta`를 안정화해야 한다.
- `JSON.stringify` 기반 캐시는 비용·순서·메모리 측면에서 비권장.

**예상 효과**: 재렌더링 30% 빨라짐 (참조 불변 시 즉시 반환)
**상태**: 구현 완료 (2026-02-04)

---

### 2.2 UX 혁신

#### 2.2.1 Collision Heatmap
**목표**: 시간/자원 충돌 영역을 색상으로 즉시 식별

**구현**:
```typescript
// components/gantt/CollisionHeatmap.tsx (신규)
interface HeatmapCell {
  timeRange: { start: Date; end: Date }
  resources: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  collisionIds: string[]
}

export function CollisionHeatmap({ activities, conflicts }: Props) {
  const heatmapData = useMemo(() => {
    // 시간 축을 그리드로 분할 (예: 1일 단위)
    // 각 cell에서 자원 충돌 탐지
    // severity 계산 (동시 사용 자원 수)
    return calculateHeatmapCells(activities, conflicts)
  }, [activities, conflicts])
  
  return (
    <svg className="heatmap-layer absolute inset-0 pointer-events-none">
      {heatmapData.map(cell => (
        <rect
          key={cell.id}
          x={cell.x} y={cell.y} width={cell.w} height={cell.h}
          fill={SEVERITY_COLORS[cell.severity]}
          opacity={0.3}
          className="pointer-events-auto cursor-help"
          onClick={() => onCellClick(cell)}
        />
      ))}
    </svg>
  )
}
```

**색상 규칙**:
- Low: 투명 (충돌 없음)
- Medium: 노란색 (경고)
- High: 주황색 (자원 초과 사용)
- Critical: 빨간색 (PTW/CERT 위반)

**상호작용**:
- Hover: 툴팁 (충돌 개수, 자원 목록)
- Click: WhyPanel 자동 열림 + 관련 activities 하이라이트

#### 2.2.2 Live 모드 Ghost Bars
**현재**: Compare 모드에서만 ghost bars (baseline과 비교)
**개선**: Live 모드에서 Reflow preview 시에도 ghost bars

**구현**:
```typescript
// lib/gantt/visTimelineMapper.ts (수정)
interface GanttVisOptions {
  reflowPreview?: ReflowChange[]
}

export function ganttRowsToVisData(
  rows: GanttRow[],
  compareDelta?: CompareResult | null,
  options?: GanttVisOptions
): VisTimelineData {
  // ...existing mapping
  if (options?.reflowPreview) {
    for (const change of options.reflowPreview) {
      if (change.path === "plan.start_ts" || change.path === "plan.end_ts") {
        items.push({
          id: `ghost_${change.activity_id}`,
          group: getGroupId(change.activity_id),
          start: change.from,
          end: change.to,
          className: "ghost-bar-reflow",
          title: `Reflow: ${change.from} → ${change.to}`,
        })
      }
    }
  }
  return { groups, items }
}
```
**원칙**: VisTimelineGantt는 렌더 전용 유지 (데이터 생성/변형 금지).

**투명도/색상**:
- Compare ghost: 호박색 점선 (baseline)
- Reflow ghost: 청록색 점선 (preview)

**트리거 조건**:
- Date cursor 드래그 중 (실시간 reflow preview)
- Collision "Apply" 클릭 후 Preview 단계
- Undo stack에서 이전 상태 비교

#### 2.2.3 Evidence 직접 링크
**목표**: Activity bar 우클릭 → 증빙 drawer, 누락 하이라이트

**구현**:
```typescript
// components/gantt/EvidenceContextMenu.tsx (신규)
export function EvidenceContextMenu({ activity, position, onClose }: Props) {
  const evidence = activity.evidence || []
  const required = activity.evidence_requirements || []
  const missing = required.filter(r => 
    !evidence.some(e => e.type === r.type && e.count >= r.min_count)
  )
  
  return (
    <div className="context-menu" style={{ left: position.x, top: position.y }}>
      <div className="font-bold mb-2">Evidence: {activity.title}</div>
      
      {/* 누락 증빙 (빨간색) */}
      {missing.length > 0 && (
        <div className="mb-2">
          <div className="text-red-400 font-semibold">⚠ Missing ({missing.length})</div>
          {missing.map(m => (
            <div key={m.type} className="text-xs text-red-300">
              - {m.type} ({m.min_count} required)
            </div>
          ))}
        </div>
      )}
      
      {/* 완료 증빙 (초록색) */}
      {evidence.length > 0 && (
        <div>
          <div className="text-emerald-400 font-semibold">✓ Attached ({evidence.length})</div>
          {evidence.map(e => (
            <button
              key={e.id}
              onClick={() => openEvidenceDrawer(e.id)}
              className="text-xs text-cyan-300 hover:underline"
            >
              - {e.type}: {e.filename}
            </button>
          ))}
        </div>
      )}
      
      <button onClick={() => openEvidenceDrawer(activity.activity_id)}>
        View All Evidence →
      </button>
    </div>
  )
}
```

**트리거**:
- Activity bar 우클릭 (onContextMenu)
- 키보드: 선택된 activity에서 `E` 키

**접근성**:
- Context menu는 키보드 포커스 가능
- Esc로 닫기
- 스크린 리더 호환 (aria-label)

**SSOT 주의**:
- Evidence는 Activity(SSOT)에서만 읽기 (Trip/TR에 저장 금지).
- 필요 시 `activity_id` → evidence 메타를 매핑하는 읽기 전용 lookup 추가.

---

## 3. 구현 단계 (Phased Approach)

### Phase 1: Quick Wins — 1주 (24시간)

| 태스크 | 시간 | 파일 | 산출물 |
|--------|------|------|--------|
| Mapper Caching 구현 (DONE 2026-02-04) | 4h | `lib/gantt/visTimelineMapper.ts` | 재렌더링 30% 개선 |
| Live Ghost Bars 기본 구현 | 8h | `lib/gantt/visTimelineMapper.ts`, `components/dashboard/gantt-chart.tsx` | Reflow preview 시각화 |
| Evidence Context Menu | 12h | `components/gantt/EvidenceContextMenu.tsx` (신규) | 우클릭 → 증빙 바로가기 |

**마일스톤 1**: 성능 30% 향상, Reflow UX 대폭 개선, Evidence 접근성 100%

**검증**:
- [ ] 재렌더링 시간 30% 감소 (React DevTools Profiler)
- [ ] Ghost bars 표시 정확도 100% (수동 테스트)
- [ ] Context menu 키보드 네비게이션 동작

---

### Phase 2: Core Features — 3주 (120시간)

| 태스크 | 시간 | 파일 | 산출물 |
|--------|------|------|--------|
| Collision Heatmap 레이어 | 32h | `components/gantt/CollisionHeatmap.tsx` (신규) | 충돌 영역 색상 코딩 |
| Heatmap 알고리즘 최적화 | 16h | `lib/gantt/heatmap-calculator.ts` (신규) | O(n²) → O(n log n) |
| 가상 스크롤링 구현 | 40h | `lib/gantt/virtualization.ts` (신규) | 50+ activities 지원 |
| Canvas 렌더링 POC | 24h | `lib/gantt/canvas-renderer.ts` (신규) | 성능 벤치마크 |
| 통합 테스트 | 8h | `components/gantt/__tests__/` | E2E 시나리오 |

**마일스톤 2**: Collision 식별 70% 단축, 100+ activities 2초 로딩

**검증**:
- [ ] Heatmap 정확도: 알려진 충돌 100% 탐지
- [ ] 100 activities 로딩 < 3초 (목표 2초)
- [ ] 스크롤 FPS ≥ 50
- [ ] Canvas POC 벤치마크 vs SVG (선택 결정)

---

### Phase 3: 최적화 & 폴리싱 — 2주 (80시간)

| 태스크 | 시간 | 파일 | 산출물 |
|--------|------|------|--------|
| 성능 벤치마크 자동화 | 16h | `scripts/benchmark-gantt.ts` (신규) | CI 통합 |
| 메모리 프로파일링 & 최적화 | 16h | 전체 | 메모리 -50% |
| 접근성 개선 (WCAG 2.1 AA) | 24h | 전체 | 키보드/스크린 리더 |
| 사용자 피드백 반영 | 16h | - | UX 폴리싱 |
| 문서화 | 8h | `docs/` | 사용자 가이드 |

**마일스톤 3**: Production ready, 모든 acceptance criteria PASS

**검증**:
- [ ] Lighthouse 접근성 점수 ≥ 95
- [ ] 키보드만으로 모든 기능 사용 가능
- [ ] NVDA/JAWS 스크린 리더 호환
- [ ] 사용자 만족도 조사 (≥ 4.5/5.0)

---

## 4. 파일 변경 계획

### 4.1 신규 파일
```
components/gantt/
├── CollisionHeatmap.tsx          # 히트맵 레이어
├── EvidenceContextMenu.tsx       # Context menu
└── __tests__/
    ├── CollisionHeatmap.test.tsx
    └── VisTimelineGantt.performance.test.ts

lib/gantt/
├── canvas-renderer.ts            # Canvas 렌더링 유틸
├── virtualization.ts             # 가상 스크롤링 로직
├── heatmap-calculator.ts         # 충돌 영역 계산
└── __tests__/
    ├── canvas-renderer.test.ts
    ├── virtualization.test.ts
    └── heatmap-calculator.test.ts

scripts/
└── benchmark-gantt.ts            # 성능 벤치마크
```

### 4.2 수정 파일
```
components/gantt/VisTimelineGantt.tsx
  - Context menu 이벤트 핸들러
  - Heatmap 레이어 통합

lib/gantt/visTimelineMapper.ts
  - ganttRowsToVisDataCached() 함수 추가
  - WeakMap 기반 캐시 (rows/compareDelta 참조)
  - reflow preview ghost bars 생성

components/dashboard/gantt-chart.tsx
  - reflowPreview 옵션 전달
  - Feature flag (NEXT_PUBLIC_GANTT_CANVAS)
```

### 4.3 설정 파일
```
.env.local (신규)
  NEXT_PUBLIC_GANTT_ENGINE=vis          # 기본값 (AGENTS.md §5.1)
  NEXT_PUBLIC_GANTT_CANVAS=false        # Canvas 렌더링 (POC 후 결정)
  NEXT_PUBLIC_GANTT_VIRTUALIZATION=true # 가상 스크롤링 활성화
```

---

## 5. SSOT 가드 체크리스트

### 5.1 SSOT 불변조건 (AGENTS.md §1.1)
- [ ] Activity가 단일 진실원: 성능 최적화는 "읽기만"
- [ ] option_c.json 무결성: Heatmap/Ghost bars는 파생 데이터
- [ ] Trip/TR 참조만: UI 레이어에서만 계산

### 5.2 Plan 변경 원칙 (AGENTS.md §1.2)
- [ ] Preview → Apply 분리: Ghost bars는 Preview 단계
- [ ] 승인 없이 Apply 금지: Live 모드에서도 준수
- [ ] Approval 모드: Read-only, Context menu "View" only

### 5.3 Freeze/Lock/Pin (AGENTS.md §1.3)
- [ ] actual.start/end 존재 시: Drag 불가 (vis-timeline editable 조건부)
- [ ] lock_level=HARD: Heatmap 경고 표시, Apply 차단

### 5.4 모드 분리 (AGENTS.md §1.4)
- [ ] Live: Context menu "Upload Evidence" 활성화
- [ ] History: Context menu "View" only
- [ ] Approval: Read-only, Export만
- [ ] Compare: Ghost bars (baseline), Heatmap (delta)

### 5.5 검증 (매 단계)
```bash
# SSOT 무결성 검증
python scripts/validate_optionc.py option_c.json

# 타입 체크
pnpm typecheck

# 테스트
pnpm test
```

---

## 6. 테스트 계획

### 6.1 성능 테스트
```typescript
// components/gantt/__tests__/VisTimelineGantt.performance.test.ts
describe('VisTimelineGantt Performance', () => {
  it('should load 10 activities in <500ms', async () => {
    const start = performance.now()
    render(<VisTimelineGantt groups={groups10} items={items10} />)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
  })
  
  it('should load 100 activities in <2000ms', async () => {
    const start = performance.now()
    render(<VisTimelineGantt groups={groups100} items={items100} />)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
  })
  
  it('should maintain 50+ FPS during scroll', async () => {
    // FPS 측정 로직
  })
})
```

### 6.2 기능 테스트
```typescript
// components/gantt/__tests__/CollisionHeatmap.test.tsx
describe('CollisionHeatmap', () => {
  it('should detect resource collision', () => {
    const conflicts = [/* SPMT 동시 사용 */]
    const heatmap = render(<CollisionHeatmap conflicts={conflicts} />)
    expect(heatmap.getByTitle(/SPMT conflict/i)).toBeInTheDocument()
  })
  
  it('should show correct severity color', () => {
    const criticalCell = heatmap.getByTestId('cell-critical')
    expect(criticalCell).toHaveStyle({ fill: 'rgb(239, 68, 68)' }) // red-500
  })
})

// components/gantt/__tests__/EvidenceContextMenu.test.tsx
describe('EvidenceContextMenu', () => {
  it('should highlight missing evidence', () => {
    const activity = { evidence_requirements: [{ type: 'PTW', min_count: 1 }], evidence: [] }
    const menu = render(<EvidenceContextMenu activity={activity} />)
    expect(menu.getByText(/PTW.*required/i)).toHaveClass('text-red-400')
  })
  
  it('should open drawer on evidence click', () => {
    const onOpen = jest.fn()
    const menu = render(<EvidenceContextMenu onOpenDrawer={onOpen} />)
    fireEvent.click(menu.getByText(/View All Evidence/i))
    expect(onOpen).toHaveBeenCalledWith(activity.activity_id)
  })
})
```

### 6.3 회귀 테스트
```typescript
// components/gantt/__tests__/VisTimelineGantt.regression.test.tsx
describe('VisTimelineGantt Regression', () => {
  it('should preserve existing zoom/pan controls', () => {
    const ref = createRef<VisTimelineGanttHandle>()
    render(<VisTimelineGantt ref={ref} />)
    
    expect(ref.current?.zoomIn).toBeDefined()
    expect(ref.current?.zoomOut).toBeDefined()
    expect(ref.current?.fit).toBeDefined()
  })
  
  it('should maintain Day/Week view toggle', () => {
    const { rerender } = render(<VisTimelineGantt view="Day" />)
    expect(getVisibleDays()).toBe(14)
    
    rerender(<VisTimelineGantt view="Week" />)
    expect(getVisibleDays()).toBe(56)
  })
  
  it('should not break SSOT integrity', async () => {
    // validate_optionc.py 호출
    const result = await execAsync('python scripts/validate_optionc.py option_c.json')
    expect(result.exitCode).toBe(0)
  })
})
```

### 6.4 접근성 테스트
```typescript
// components/gantt/__tests__/VisTimelineGantt.a11y.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('VisTimelineGantt Accessibility', () => {
  it('should have no WCAG 2.1 AA violations', async () => {
    const { container } = render(<VisTimelineGantt />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
  
  it('should support keyboard navigation', () => {
    const { getByRole } = render(<VisTimelineGantt />)
    const gantt = getByRole('region', { name: /gantt/i })
    
    // Tab으로 이동
    fireEvent.keyDown(gantt, { key: 'Tab' })
    expect(document.activeElement).toBe(firstActivity)
    
    // Arrow keys로 네비게이션
    fireEvent.keyDown(firstActivity, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(nextActivity)
  })
})
```

---

## 7. 리스크 및 완화 전략

### 7.1 기술 리스크

| 리스크 | 확률 | 영향 | 완화 전략 | 담당 |
|--------|------|------|-----------|------|
| **vis-timeline API 한계** | Medium | High | - Hybrid 접근 (SVG+Canvas)<br>- 단계적 검증<br>- 대체 라이브러리 사전 조사 (Bryntum) | Tech Lead |
| **Canvas 렌더링 복잡도** | High | Medium | - POC로 조기 검증<br>- SVG 우선 유지<br>- 50+ activities 조건부 적용 | Frontend Dev |
| **가상 스크롤링 버그** | Medium | Medium | - 소규모 데이터셋(10개)부터 시작<br>- 점진적 확대 (50, 100)<br>- E2E 테스트 강화 | QA |
| **메모리 누수** | Low | High | - 컴포넌트 언마운트 시 cleanup<br>- React DevTools Profiler 모니터링<br>- 브라우저 메모리 스냅샷 | Frontend Dev |

### 7.2 프로젝트 리스크

| 리스크 | 확률 | 영향 | 완화 전략 | 담당 |
|--------|------|------|-----------|------|
| **일정 지연** | Medium | Medium | - Phase 1 우선 배포 (Quick Wins)<br>- Phase 2/3 선택적 롤백 | PM |
| **SSOT 무결성 위반** | Low | Critical | - 단계별 validate_optionc.py 실행<br>- Git pre-commit hook<br>- CI 자동 검증 | DevOps |
| **사용자 혼란** | Medium | Low | - 점진적 롤아웃 (Feature flag)<br>- 사용자 가이드 문서<br>- 피드백 수집 | UX Designer |
| **Breaking changes** | Medium | High | - 기존 기능 회귀 테스트<br>- A/B 테스트 (vis vs custom)<br>- 롤백 플랜 | Tech Lead |

### 7.3 롤백 플랜
```bash
# Feature flag로 즉시 비활성화
NEXT_PUBLIC_GANTT_CANVAS=false
NEXT_PUBLIC_GANTT_VIRTUALIZATION=false

# Git revert
git revert <commit-hash> --no-commit

# 이전 버전 배포
vercel deploy --prod <previous-deployment-url>
```

---

## 8. 커맨드 (package.json 기반)

### 8.1 개발
```bash
# 개발 서버 시작
pnpm dev

# 타입 체크
pnpm typecheck

# 린트
pnpm lint
```

### 8.2 테스트
```bash
# 전체 테스트
pnpm test

# 특정 파일 테스트
pnpm test VisTimelineGantt

# 커버리지
pnpm test --coverage

# Watch 모드
pnpm test --watch
```

### 8.3 성능 벤치마크
```bash
# Gantt 성능 테스트 (신규)
node scripts/benchmark-gantt.ts

# 메모리 프로파일링
node --inspect scripts/profile-memory.js
```

### 8.4 SSOT 검증
```bash
# option_c.json 검증
python scripts/validate_optionc.py option_c.json

# 스키마 smoke 테스트
pnpm schema:smoke
```

---

## 9. Acceptance Criteria (검증 기준)

### 9.1 성능 (측정 도구: Chrome DevTools, Lighthouse)
- [ ] **로딩 시간**:
  - 10 activities: < 500ms
  - 50 activities: < 1000ms
  - 100 activities: < 2000ms
  - 500 activities: < 5000ms (Canvas 모드)
- [ ] **FPS**: 스크롤 시 ≥ 50 fps (목표 60 fps)
- [ ] **메모리**: Baseline 대비 50% 감소 (100 activities 기준)
- [ ] **번들 크기**: +50KB 이하 (Canvas 렌더러 포함)

### 9.2 UX (측정 도구: 사용자 태스크 타이머)
- [ ] **Collision 식별**: 평균 < 5초 (현재 10초)
- [ ] **Ghost bars 정확도**: Reflow preview 100% 표시
- [ ] **Evidence 발견**: Context menu → drawer < 1초
- [ ] **Evidence 누락 발견율**: 100% (현재 70%)

### 9.3 SSOT (측정 도구: validate_optionc.py, 회귀 테스트)
- [ ] **무결성**: validate_optionc.py PASS
- [ ] **Reflow 결정론**: 동일 입력 → 동일 출력 (10회 반복 테스트)
- [ ] **Freeze/Lock**: actual 있는 activity 드래그 불가
- [ ] **View Mode 권한**: Approval 모드에서 Apply 차단

### 9.4 품질 (측정 도구: Jest, ESLint, axe)
- [ ] **테스트 커버리지**: ≥ 80% (신규 코드)
- [ ] **린트 경고**: 0개
- [ ] **타입 에러**: 0개
- [ ] **접근성**: Lighthouse 접근성 점수 ≥ 95, WCAG 2.1 AA 준수

### 9.5 사용자 만족도 (측정 도구: 설문 조사)
- [ ] **사용 편의성**: 4.5/5.0 이상
- [ ] **성능 만족도**: 4.5/5.0 이상
- [ ] **버그 보고**: < 3건/월 (Phase 3 완료 후)

---

## 10. 참고 문서

### 10.1 내부 문서
- **AGENTS.md**: 불변조건 (SSOT, Preview→Apply, Freeze/Lock, View Modes)
- **patch.md**: UI/UX 규칙 (Where/When/What/Evidence, 2-click, 배지)
- **docs/plan/innovation-scout-vis-timeline-upgrade-20260204.md**: 아이디어 출처, 외부 트렌드 조사
- **lib/gantt/gantt-contract.ts**: 이벤트 시스템 (ITEM_SELECTED, GANTT_READY)
- **option_c.json**: SSOT 스키마, Activity/Trip/TR 구조

### 10.2 코드베이스
- **components/gantt/VisTimelineGantt.tsx**: 현재 구현 (vis-timeline v8.5.0)
- **lib/gantt/visTimelineMapper.ts**: GanttRow[] → vis-timeline format 변환
- **components/dashboard/gantt-chart.tsx**: 래퍼 컴포넌트, 동적 import
- **lib/ssot/schedule.ts**: 날짜 파싱, UTC 유틸
- **lib/utils/detect-resource-conflicts.ts**: Collision 탐지 로직

### 10.3 외부 참조
- **vis-timeline 문서**: https://visjs.github.io/vis-timeline/docs/timeline/
- **React 19 최적화**: https://react.dev/blog/2024/04/25/react-19
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

## 11. 다음 단계

### 11.1 즉시 조치 (이번 주)
1. ✅ **Phase 1 착수**: Mapper Caching (4h) → 즉시 성능 개선
2. ⏳ **POC 준비**: Canvas 렌더링 벤치마크 환경 구축
3. ⏳ **테스트 템플릿**: 성능/기능/접근성 테스트 boilerplate

### 11.2 검토 사항 (2주 내)
1. ⚠️ **Canvas vs SVG 결정**: POC 결과 기반, 50+ activities 기준
2. ⚠️ **가상 스크롤링 범위**: vis-timeline API 제약 확인, 대체 라이브러리 검토
3. ⚠️ **Feature flag 전략**: 점진적 롤아웃 vs 전체 활성화

### 11.3 장기 검토 (Phase 3 이후)
1. 🔍 **WCAG 2.2 준수**: 2025년 EU 법규 대비 (현재 2.1 AA → 2.2 AAA)
2. 🔍 **모바일 최적화**: 터치 제스처, 반응형 레이아웃
3. 🔍 **AI 기반 bottleneck 탐지**: 실시간 충돌 예측 (Innovation Scout 보고서 §C.5)

---

## 12. 승인 및 리뷰

### 12.1 리뷰어
- [ ] **Tech Lead**: 기술 설계, 아키텍처 승인
- [ ] **Frontend Lead**: React/TypeScript 코드 리뷰
- [ ] **UX Designer**: Heatmap/Context menu UX 검증
- [ ] **QA Lead**: 테스트 계획 승인
- [ ] **Product Owner**: 우선순위, 일정 승인

### 12.2 체크리스트
- [ ] AGENTS.md 불변조건 준수 확인
- [ ] patch.md UI/UX 규칙 준수 확인
- [ ] SSOT 무결성 유지 확인
- [ ] 리스크 완화 전략 적절성 확인
- [ ] 테스트 커버리지 계획 충분성 확인
- [ ] 일정 실현 가능성 확인

### 12.3 승인 상태
- **작성일**: 2026-02-04
- **상태**: READY_FOR_REVIEW
- **다음 마일스톤**: Phase 1 착수 승인 (금주 내)

---

**END OF DOCUMENT**
