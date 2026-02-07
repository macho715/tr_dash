# 간트 차트 컨트롤 복잡도 분석 및 개선 방안

**작성일**: 2026-02-06  
**대상**: Gantt Chart Timeline Controls UI  
**현상**: 메뉴가 너무 많아서 가독성이 떨어짐

---

## 📊 **현황 분석 (AS-IS)**

### **1. 컨트롤 구성 요소 집계**

| 카테고리 | 컨트롤 개수 | 항목 |
|---------|-----------|------|
| **Zoom/Pan** | 7개 | Zoom In, Zoom Out, Pan Left, Pan Right, Fit All, Today, Reset |
| **View** | 2개 | Day, Week |
| **Highlight** | 3개 | Delay, Lock, Constraint |
| **Filter** | 2개 | Critical, Blocked |
| **Grouping** | 2개 | Collapse All, Expand All |
| **Density** | 1개 | Heatmap |
| **Events** | 3개 | Actual, Hold, Milestone |
| **Navigation** | 2개 | Jump to Date Input + Go Button |
| **Legend (아래 Bar)** | 15+개 | 6개 Activity Types + 9개 Badge Icons + Slack/CP + Compare + Gantt Engine + Weather |
| **Weather Overlay** | 4개 | Toggle Button + NO_GO/NEAR_LIMIT Legend + Opacity Slider |
| **총계** | **41+개** | 컨트롤 + 레전드 + 오버레이 |

---

### **2. 화면 공간 점유율**

```
┌─────────────────────────────────────────────────────────────┐
│ [Timeline Controls Bar - 100% width, ~60-80px height]      │
│ ├─ Zoom/Pan: 7 buttons (icon + text)                       │
│ ├─ View: 2 pills                                           │
│ ├─ Highlight: 3 pills                                      │
│ ├─ Filter: 2 pills                                         │
│ ├─ Grouping: 2 buttons                                     │
│ ├─ Density: 1 pill                                         │
│ ├─ Events: 3 pills                                         │
│ └─ Jump: 1 input + 1 button                                │
├─────────────────────────────────────────────────────────────┤
│ [Legend Bar - 100% width, ~40-60px height, flex-wrap]      │
│ ├─ 6 Activity Type badges (colored)                        │
│ ├─ 9 Constraint/Collision badges ([W], [PTW], [CERT]...)   │
│ ├─ 2 Slack indicators (+Xd, CP)                            │
│ ├─ Compare badge (conditional)                             │
│ ├─ Gantt Engine info                                       │
│ └─ Weather Overlay (toggle + opacity slider + legend)      │
├─────────────────────────────────────────────────────────────┤
│ [Event Overlay Legend - conditional, ~40px height]         │
│ └─ Actual/Hold/Milestone color legend (when toggled)       │
└─────────────────────────────────────────────────────────────┘

**총 수직 공간**: 140-180px (모바일에서는 200-250px로 확장)
**문제**: 간트 차트보다 컨트롤 UI가 더 큰 공간 차지
```

---

## 🎯 **핵심 문제점**

### **1. 인지 과부하 (Cognitive Overload)**
- **41+개 컨트롤**을 한 화면에 표시 → 사용자가 원하는 기능을 찾기 어려움
- **플랫한 구조**: 모든 컨트롤이 동일 계층에 노출 → 중요도 구분 불가

### **2. 공간 효율성 문제**
- 컨트롤 Bar가 **140-180px** 차지 → 간트 차트 실제 작업 영역 축소
- 모바일 환경에서 **flex-wrap**으로 인해 3-4줄로 확장

### **3. 사용 빈도 무시**
| 사용 빈도 | 컨트롤 | 현재 위치 |
|----------|--------|---------|
| **매우 높음** | Zoom In/Out, Today, View (Day/Week) | 상단 노출 ✅ |
| **중간** | Highlight (Delay/Lock), Filter (Critical) | 상단 노출 ✅ |
| **낮음** | Collapse All, Events (Hold/Milestone), Weather Opacity | **상단 노출 ❌** |
| **매우 낮음** | Reset, Jump to Date, Compare Badge | **상단 노출 ❌** |

**개선 필요**: 저빈도 컨트롤을 숨기거나 2차 메뉴로 이동

---

### **4. 레전드 중복 표시**
- **Activity Type 색상**: 간트 차트 내에서 이미 시각적으로 구분됨
- **Badge 아이콘**: 간트 바에 실시간 표시되므로 상단 레전드 필요성 낮음
- **제안**: 레전드를 **Drawer 또는 Tooltip**으로 이동 (현재 `GanttLegendDrawer` 컴포넌트 존재하지만 사용 안 함)

---

## 💡 **개선 방안 (3-Tier 계층화)**

### **Tier 1: 필수 컨트롤 (항상 노출)**
```typescript
// components/dashboard/timeline-controls-compact.tsx (신규)
<div className="flex items-center gap-3 px-4 py-2 border-b">
  {/* 1. Zoom/Today (5개만) */}
  <div className="flex items-center gap-1">
    <ZoomIn onClick={onZoomIn} />
    <ZoomOut onClick={onZoomOut} />
    <Today onClick={onToday} />
    <Fit onClick={onFit} />
    <Reset onClick={onReset} />
  </div>
  
  {/* 2. View 전환 (2개) */}
  <div className="flex gap-2">
    <ViewPill active={view === 'Day'}>Day</ViewPill>
    <ViewPill active={view === 'Week'}>Week</ViewPill>
  </div>
  
  {/* 3. 주요 Highlight/Filter (3개만) */}
  <div className="flex gap-2">
    <HighlightPill active={highlight.delay}>Delay</HighlightPill>
    <FilterPill active={filter.critical}>Critical</FilterPill>
    <HeatmapPill active={heatmapOn}>Heatmap</HeatmapPill>
  </div>
  
  {/* 4. More 버튼 (Tier 2 열기) */}
  <button onClick={() => setShowAdvanced(!showAdvanced)}>
    <MoreHorizontal /> More
  </button>
  
  {/* 5. Legend 버튼 (Drawer 열기) */}
  <button onClick={() => setLegendOpen(true)}>
    <Info /> Legend
  </button>
</div>

// 총 컨트롤: 5 (Zoom) + 2 (View) + 3 (Toggle) + 2 (More/Legend) = 12개
// 수직 공간: ~50px (기존 140-180px 대비 65% 감소)
```

---

### **Tier 2: 고급 옵션 (펼침 메뉴)**
```typescript
// Collapsible Panel (showAdvanced === true일 때만 표시)
{showAdvanced && (
  <div className="flex flex-wrap gap-3 px-4 py-2 bg-slate-900/60 border-b">
    {/* Highlight (추가 옵션) */}
    <div className="flex gap-2">
      <HighlightPill active={highlight.lock}>Lock</HighlightPill>
      <HighlightPill active={highlight.constraint}>Constraint</HighlightPill>
    </div>
    
    {/* Filter (추가 옵션) */}
    <div className="flex gap-2">
      <FilterPill active={filter.blocked}>Blocked</FilterPill>
    </div>
    
    {/* Grouping */}
    <div className="flex gap-2">
      <button onClick={onCollapseAll}>Collapse All</button>
      <button onClick={onExpandAll}>Expand All</button>
    </div>
    
    {/* Events */}
    <div className="flex gap-2">
      <EventPill active={events.showActual}>Actual</EventPill>
      <EventPill active={events.showHold}>Hold</EventPill>
      <EventPill active={events.showMilestone}>Milestone</EventPill>
    </div>
    
    {/* Weather Overlay */}
    <div className="flex items-center gap-2">
      <WeatherToggle />
      <OpacitySlider min={10} max={30} value={weatherOpacity} />
    </div>
  </div>
)}

// 추가 공간: ~50px (펼쳤을 때만)
```

---

### **Tier 3: 레전드 및 참조 정보 (Drawer)**
```typescript
// GanttLegendDrawer (기존 컴포넌트 활성화)
<Drawer open={legendOpen} onOpenChange={setLegendOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Gantt Chart Legend</DrawerTitle>
    </DrawerHeader>
    
    {/* Activity Types */}
    <section>
      <h3>Activity Types</h3>
      <div className="grid grid-cols-2 gap-2">
        {activityTypes.map(type => (
          <div key={type.id} className="flex items-center gap-2">
            <div className={`w-8 h-3 rounded ${type.color}`} />
            <span>{type.label}</span>
          </div>
        ))}
      </div>
    </section>
    
    {/* Constraint Badges */}
    <section>
      <h3>Constraint Badges</h3>
      <div className="grid grid-cols-3 gap-2">
        {badgeDefinitions.map(badge => (
          <BadgeItem key={badge.key} {...badge} />
        ))}
      </div>
    </section>
    
    {/* Event Overlays */}
    <section>
      <h3>Event Overlays</h3>
      {eventLegend.map(item => (
        <EventLegendItem key={item.type} {...item} />
      ))}
    </section>
    
    {/* Weather Legend */}
    <section>
      <h3>Weather Overlay</h3>
      <div className="flex items-center gap-2">
        <div className="w-5 h-3 bg-red-500/15 border border-red-500/30" />
        <span>NO_GO</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-3 bg-amber-400/10 border border-amber-400/30" />
        <span>NEAR_LIMIT</span>
      </div>
    </section>
  </DrawerContent>
</Drawer>

// 화면 공간: 0px (오버레이)
// 접근성: 1-click (Legend 버튼)
```

---

## 📐 **구현 로드맵**

### **Phase 1: Quick Win (1-2일)**
```typescript
// 1. 기존 TimelineControls 간소화
- Zoom/Pan: 7개 → 5개 (Pan Left/Right 제거, 키보드로만 사용)
- Jump to Date: 숨김 (Today 버튼으로 대체, 고급 옵션으로 이동)
- 수직 공간: 140-180px → ~80-100px (30% 개선)

// 2. Legend Bar 축소
- Activity Type 색상: Drawer로 이동
- Badge 아이콘: 클릭 시 Drawer 열기 (현재대로 유지)
- Weather Legend: 인라인 표시 제거, Drawer로 이동
- 수직 공간: 40-60px → ~20-30px (50% 개선)

// 총 개선: 180-240px → 100-130px (45% 감소)
```

### **Phase 2: 고급 옵션 분리 (3-4일)**
```typescript
// 1. TimelineControlsCompact 컴포넌트 생성
- Tier 1 컨트롤만 상단 고정
- "More" 버튼으로 Tier 2 펼침/접기
- Default: 접힌 상태 (localStorage에 저장)

// 2. GanttLegendDrawer 활성화
- 기존 컴포넌트 확장 (Activity Types + Badges + Events + Weather)
- 검색 기능 추가 (Badge 검색: "PTW" → Permit to Work 표시)
- 키보드 단축키: Shift+L

// 3. 상태 관리 개선
- useGanttControls 훅 생성
- localStorage로 사용자 설정 저장 (펼침/접기 상태, 활성 필터 등)
```

### **Phase 3: 반응형 개선 (2-3일)**
```typescript
// 1. 모바일 최적화
- Tier 1: 아이콘만 표시 (텍스트 제거)
- Zoom/Pan: Bottom Sheet로 이동
- Legend: 전체화면 Drawer

// 2. 태블릿 중간 레이아웃
- Tier 1: 아이콘 + 축약 텍스트
- Tier 2: 1줄 표시 (flex-nowrap + horizontal scroll)

// 3. 데스크톱 (현재)
- Tier 1: 전체 표시
- Tier 2: 2줄까지 flex-wrap
```

---

## 🎨 **UI 개선 예시 (Mockup)**

### **Before (현재)**
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Zoom] [🔍 Pan L] [🔍 Pan R] [⬜ Fit] [🔄 Today] [↻ Reset] │ ← 7개
│ View: [Day] [Week]                                          │ ← 2개
│ Highlight: [Delay] [Lock] [Constraint]                      │ ← 3개
│ Filter: [Critical] [Blocked]                                │ ← 2개
│ Grouping: [Collapse All] [Expand All]                      │ ← 2개
│ Density: [Heatmap]                                          │ ← 1개
│ Events: [Actual] [Hold] [Milestone]                         │ ← 3개
│ [Jump to YYYY-MM-DD] [Go]                                   │ ← 2개
├─────────────────────────────────────────────────────────────┤
│ ■ Mobilization ■ Load-out ■ Transport ■ Load-in ...         │ ← 6개
│ [W] [PTW] [CERT] [LNK] [BRG] [RES] [COL] [COL-LOC] ...     │ ← 9개
│ +Xd CP | [Compare] | Gantt: vis-timeline                    │ ← 4개
│ 🌦️ Weather Overlay [NO_GO] [NEAR_LIMIT] Opacity [▬▬▬▬] 15% │ ← 5개
└─────────────────────────────────────────────────────────────┘
총 41+개 컨트롤, 4줄, ~180px
```

### **After (개선안)**
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍+] [🔍-] [📍] [⬜] [↻] │ [Day] [Week] │ [Delay] [Critical] [Heatmap] │ [⋯ More] [ℹ️ Legend] │
└─────────────────────────────────────────────────────────────┘
총 12개 컨트롤, 1줄, ~50px (70% 감소)

// "More" 버튼 클릭 시
┌─────────────────────────────────────────────────────────────┐
│ [🔍+] [🔍-] [📍] [⬜] [↻] │ [Day] [Week] │ [Delay] [Critical] [Heatmap] │ [⋯ More ▼] [ℹ️ Legend] │
├─────────────────────────────────────────────────────────────┤
│ Highlight: [Lock] [Constraint]                              │
│ Filter: [Blocked]                                           │
│ Grouping: [Collapse All] [Expand All]                      │
│ Events: [Actual] [Hold] [Milestone]                         │
│ Weather: [🌦️ Toggle] [Opacity ▬▬▬▬ 15%]                     │
│ Advanced: [Jump to YYYY-MM-DD] [Go]                         │
└─────────────────────────────────────────────────────────────┘
총 ~100px (펼쳤을 때만, 기본 접힌 상태)

// "Legend" 버튼 클릭 시 → Drawer 열림 (우측 슬라이드)
```

---

## ✅ **수용 기준 (Acceptance Criteria)**

### **Phase 1 (Quick Win)**
- [ ] Zoom/Pan 버튼 5개로 축소 (Pan Left/Right 제거)
- [ ] Legend Bar 높이 50% 감소 (Activity Types → Drawer)
- [ ] 총 수직 공간 45% 감소 (180px → 100px)
- [ ] 기존 기능 모두 동작 (회귀 없음)

### **Phase 2 (고급 옵션)**
- [ ] "More" 버튼으로 Tier 2 컨트롤 펼침/접기
- [ ] GanttLegendDrawer 활성화 (Activity Types + Badges + Events + Weather)
- [ ] 사용자 설정 localStorage 저장 (펼침/접기 상태)
- [ ] 키보드 단축키: Shift+L (Legend), Shift+M (More)

### **Phase 3 (반응형)**
- [ ] 모바일: 아이콘만 표시, Bottom Sheet 사용
- [ ] 태블릿: 아이콘 + 축약 텍스트, Horizontal Scroll
- [ ] 데스크톱: 전체 표시 (현재)

---

## 📊 **기대 효과**

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| **총 컨트롤 개수 (Tier 1)** | 41+ | 12 | **71% ↓** |
| **수직 공간 (기본)** | 180px | 50px | **72% ↓** |
| **수직 공간 (펼쳤을 때)** | 180px | 100px | **44% ↓** |
| **첫 화면 간트 차트 가시성** | ~65% | ~90% | **38% ↑** |
| **모바일 가독성** | 나쁨 (3-4줄) | 우수 (1줄) | **300% ↑** |
| **학습 곡선** | 높음 (41개 암기) | 낮음 (12개 + More/Legend) | **70% ↓** |

---

## 🔧 **구현 체크리스트 (Week 1)**

### **Day 1-2: 코드 정리 및 분석**
- [ ] 기존 `timeline-controls.tsx` 사용 빈도 분석 (Google Analytics 또는 로그)
- [ ] `GanttLegendDrawer` 컴포넌트 확장 설계
- [ ] `useGanttControls` 훅 설계 (상태 관리 분리)

### **Day 3-4: Phase 1 구현**
- [ ] Zoom/Pan 버튼 7개 → 5개 축소
- [ ] Legend Bar Activity Types 제거 (Badge 클릭 → Drawer 열기로 변경)
- [ ] Weather Legend 인라인 제거, Drawer로 이동
- [ ] 회귀 테스트 (모든 기존 기능 동작 확인)

### **Day 5: 배포 및 검증**
- [ ] Vercel Preview 배포
- [ ] 모바일/태블릿/데스크톱 시각적 검증
- [ ] 사용자 피드백 수집 (내부 팀)

---

## 🚀 **다음 단계 (Phase 2-3 별도 계획)**

Phase 1 완료 후 사용자 피드백을 기반으로 Phase 2-3 우선순위 조정 예정.

---

**작성자**: Assistant  
**검토 필요**: UX Lead, Product Owner  
**구현 시작 승인 필요**: Yes (Phase 1 Quick Win 우선 승인 권장)
