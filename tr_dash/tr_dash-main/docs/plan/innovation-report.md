# Innovation Scout Report

**생성일**: 2026-02-03  
**프로젝트**: TR 이동 대시보드 (HVDC Transformer Transport)  
**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

---

## 1. 프로젝트 현황 요약

### 완료된 기능 ✅

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 4 | Weather Go/No-Go 시스템 (3-Gate 평가) | ✅ 완료 |
| Phase 5 | Real-Time Weather Integration 계획 수립 | ✅ 계획 완료 |
| Phase 6 | Bugfix (#1~5, #7) - UTC 정렬, Trip fallback, Compare Diff | ✅ 완료 |
| Phase 7 | Detail Panel, Collision Tray, Why Panel, Reflow Preview | ✅ 완료 |
| Phase 8 T8.2 | Evidence checklist + Upload modal | ✅ 완료 |
| Phase 10 | Compare Mode (baseline vs delta overlay, ghost bars) | ✅ 완료 |
| Phase 11 | Cycle detection, Evidence gate, E2E workflow 테스트 | ✅ 완료 |
| Gantt 통합 | vis-timeline 통합 (Task 1-11) | ✅ 완료 |

### 진행 중 / 대기 📋

| 항목 | 상태 | 블로커 |
|------|------|--------|
| Phase 5 실행 (PDF parser, OCR) | 대기 | 이해관계자 승인 필요 |
| Task 12: JSON Schema → TS + Ajv | 계획됨 | - |
| Evidence API 연동 (persist) | 미착수 | API 설계 필요 |
| validate_optionc.py 보강 | 미착수 | - |

### 기술 스택

```
Frontend: Next.js 16 + React 19 + TypeScript (package.json 기준)
Styling: Tailwind CSS (Deep Ocean Theme)
Gantt: vis-timeline (Feature Flag로 legacy/vis 전환)
State: React useState/useMemo + Context (ViewMode)
Data: option_c.json (SSOT)
```

### 개선 기회 영역

1. **성능**: Gantt 렌더링 (대규모 Activity), 실시간 업데이트
2. **UX**: 모바일 반응형, 오프라인 지원 (현장 사용)
3. **데이터**: 실시간 GPS/센서 통합, Weather API 자동화
4. **알고리즘**: Collision 탐지 최적화, Reflow 성능

---

## 2. 외부 리서치 결과

### 2.1 물류 대시보드 UX 트렌드

| 트렌드 | 설명 | 출처 |
|--------|------|------|
| **Progressive Disclosure** | 고수준 KPI 먼저 → 드릴다운 상세 | Smashing Magazine |
| **WebSocket 실시간 업데이트** | REST 폴링 대비 50-70% 지연 감소 | johal.in |
| **역할 기반 뷰** | Executive/Ops/Field별 맞춤 화면 | zigpoll.com |
| **가상화 렌더링** | 대규모 데이터 목록 성능 최적화 | Syncfusion |
| **인터랙티브 맵 통합** | Mapbox/Google Maps 실시간 추적 | elevenspace.co |

### 2.2 Gantt 차트 성능 최적화

| 솔루션 | 특징 | 적합성 |
|--------|------|--------|
| **Bryntum Gantt** | 가장 빠름, 가상 스크롤, Redux 지원 | 상용 라이센스 필요 |
| **Syncfusion Gantt** | 가상 스크롤, 제약/의존성 지원 | 상용 라이센스 필요 |
| **DHTMLX Gantt** | React 래퍼, 풀 API 접근 | 상용/커뮤니티 |
| **vis-timeline (현재)** | 오픈소스, 기본 타임라인 | 이미 통합됨 |

**핵심 최적화 기법**:
- 가상 스크롤 (visible viewport만 렌더)
- 비동기 스케줄링 엔진 (DOM 독립)
- 효율적 상태 관리

### 2.3 중량화물 모니터링

| 솔루션 | 기능 | 적합성 |
|--------|------|--------|
| **Cargolog® Impact Recorder** | 충격/진동/온도/GPS 실시간 모니터링 | 센서 통합 시 유용 |
| **HIVE Cargo Gateway** | 태양광 전원, 엣지 프로세싱 | 장기 운송용 |

### 2.4 PWA/오프라인 지원

| 기술 | 설명 | 적합성 |
|------|------|--------|
| **Service Worker** | 오프라인 캐싱, 백그라운드 동기화 | 현장 Field Mode 필수 |
| **IndexedDB + Dexie.js** | 로컬 데이터 저장 + 동기화 큐 | Evidence 업로드 큐 |
| **Workbox** | Service Worker 라이브러리 | Next.js 통합 용이 |

---

## 3. 아이디어 제안

### 3.1 WebSocket 실시간 업데이트

**카테고리**: 성능 / 기능 확장  
**출처**: [johal.in - Next.js WebSocket Dashboard](https://johal.in/real-time-dashboards-with-next-js-python-websockets-for-live-data-updates-2025/)

**현재 상태**: 
- 폴링 기반 또는 수동 새로고침
- 실시간 GPS/상태 업데이트 없음

**제안 내용**:
```typescript
// lib/websocket/activity-stream.ts
import { io } from "socket.io-client";

export function subscribeToActivityUpdates(tripId: string, onUpdate: (activity: Activity) => void) {
  const socket = io("/api/ws/activities");
  socket.emit("subscribe", { tripId });
  socket.on("activity:updated", onUpdate);
  return () => socket.disconnect();
}
```

**기대 효과**:
- 지연 50-70% 감소
- 실시간 GPS 위치 업데이트
- 운영 효율 20-30% 향상 (Gartner 보고)

**적용 가능성**: ✅ **APPLICABLE**  
**예상 공수**: Medium (1-2주)  
**우선순위**: P1

---

### 3.2 Gantt 가상 스크롤 (Virtual Scrolling)

**카테고리**: 성능 최적화  
**출처**: [Syncfusion - React Gantt Virtualization](https://www.syncfusion.com/react-components/react-gantt-chart)

**현재 상태**: 
- vis-timeline 전체 Activity 렌더링
- 7 Trip × 다수 Activity = 잠재적 성능 병목

**제안 내용**:
```typescript
// VisTimelineGantt options 확장
const options = {
  ...existingOptions,
  // 가상 스크롤 활성화 (vis-timeline 네이티브 지원 제한)
  // 대안: react-virtualized 또는 @tanstack/react-virtual 조합
  verticalScroll: true,
  stack: false, // 성능 개선
  maxHeight: 600,
};
```

**대안 접근**:
- `react-window` / `@tanstack/react-virtual`로 그룹 목록 가상화
- vis-timeline은 visible window만 렌더하도록 items 필터링

**기대 효과**:
- 대규모 Activity (100+) 시 렌더링 시간 80% 감소
- 스크롤 성능 개선

**적용 가능성**: ⚠️ **CONDITIONAL** (vis-timeline 한계로 custom 구현 필요)  
**예상 공수**: Medium (1주)  
**우선순위**: P2

---

### 3.3 PWA + 오프라인 Field Mode

**카테고리**: UX / 기능 확장  
**출처**: [Google - PWA Going Offline](https://developers.google.com/codelabs/pwa-training/pwa03--going-offline)

**현재 상태**: 
- 웹 전용, 오프라인 미지원
- 현장(Field) 네트워크 불안정 시 사용 불가

**제안 내용**:
```typescript
// next.config.js - PWA 설정
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: "NetworkFirst",
      options: { cacheName: "api-cache" },
    },
  ],
});

// Service Worker - Evidence 업로드 큐
self.addEventListener("sync", (event) => {
  if (event.tag === "evidence-upload") {
    event.waitUntil(uploadPendingEvidence());
  }
});
```

**기대 효과**:
- 오프라인 시 핵심 데이터 조회 가능
- Evidence 업로드 큐잉 (네트워크 복구 시 자동 동기화)
- 앱 설치 가능 (홈 화면 추가)

**적용 가능성**: ✅ **APPLICABLE**  
**예상 공수**: Medium (1-2주)  
**우선순위**: P1 (현장 운영 필수)

---

### 3.4 Collision 탐지 알고리즘 최적화

**카테고리**: 성능 최적화  
**출처**: [JSForGames - Optimizing Collision Detection](https://jsforgames.com/optimizing-collision-detection/)

**현재 상태**: 
- `detectResourceConflicts(activities)` - O(n²) 비교
- 대규모 Activity 시 성능 저하 가능

**제안 내용**:
```typescript
// lib/utils/collision-detection-optimized.ts
import IntervalTree from "@flatten-js/interval-tree";

export function detectCollisionsFast(activities: Activity[]): Collision[] {
  // 1. 시간 구간 기반 Interval Tree 구축
  const tree = new IntervalTree<Activity>();
  activities.forEach(act => {
    const start = new Date(act.plan.start_ts).getTime();
    const end = new Date(act.plan.end_ts).getTime();
    tree.insert([start, end], act);
  });

  // 2. 각 Activity에 대해 겹치는 구간만 검색 (O(n log n))
  const collisions: Collision[] = [];
  activities.forEach(act => {
    const overlapping = tree.search([act.start, act.end]);
    // 동일 리소스 충돌만 필터링
    // ...
  });

  return collisions;
}
```

**기대 효과**:
- O(n²) → O(n log n) 복잡도 감소
- 100+ Activity에서 10-100x 성능 향상

**적용 가능성**: ✅ **APPLICABLE**  
**예상 공수**: Low (3-5일)  
**우선순위**: P2

---

### 3.5 실시간 GPS/센서 통합 (Cargolog 방식)

**카테고리**: 기능 확장  
**출처**: [Mobitron - Impact Recorder for Transformer](https://mobitron.com/applications/transformer/)

**현재 상태**: 
- GPS 위치 수동 업데이트 또는 미구현
- 충격/진동/온도 모니터링 없음

**제안 내용**:
```typescript
// lib/sensors/cargolog-integration.ts
interface SensorReading {
  timestamp: string;
  gps: { lat: number; lon: number };
  shock_g: number;
  temperature_c: number;
  humidity_pct: number;
  tilt_deg: { x: number; y: number };
}

// WebSocket으로 실시간 수신
function subscribeSensorData(trId: string, onReading: (r: SensorReading) => void) {
  // Cargolog API 또는 MQTT 브로커 연결
}
```

**기대 효과**:
- 실시간 TR 위치 추적 (Map 자동 업데이트)
- 충격 발생 시 자동 Alert + Evidence 기록
- 운송 중 이상 징후 조기 감지

**적용 가능성**: 🔄 **FUTURE** (센서 장비 + API 연동 필요)  
**예상 공수**: High (4주+)  
**우선순위**: P2

---

### 3.6 역할 기반 대시보드 뷰

**카테고리**: UX 개선  
**출처**: [zigpoll.com - Tracking Dashboard UI](https://www.zigpoll.com/content/how-can-i-optimize-the-user-interface-of-our-tracking-dashboard-to-better-display-realtime-logistics-data-for-the-owner-of-a-growing-transportation-company)

**현재 상태**: 
- 단일 뷰 (모든 사용자 동일)
- View Mode (Live/History/Approval/Compare)는 있으나 역할 분리 없음

**제안 내용**:
```typescript
// lib/store/role-view-store.ts
type UserRole = "executive" | "operations" | "field" | "engineer";

const ROLE_VIEWS: Record<UserRole, ViewConfig> = {
  executive: {
    showKPI: true,
    showGantt: false,
    showMap: true,
    defaultSection: "overview",
  },
  operations: {
    showKPI: true,
    showGantt: true,
    showMap: true,
    defaultSection: "schedule",
  },
  field: {
    showKPI: false,
    showGantt: false,
    showMap: true,
    showEvidenceUpload: true,
    defaultSection: "current-activity",
  },
  // ...
};
```

**기대 효과**:
- 사용자별 최적화된 정보 제공
- 인지 부하 감소
- 의사결정 시간 단축

**적용 가능성**: ✅ **APPLICABLE**  
**예상 공수**: Low-Medium (1주)  
**우선순위**: P2

---

### 3.7 Skeleton UI + Data Freshness 표시

**카테고리**: UX 개선  
**출처**: [Smashing Magazine - UX Strategies for Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)

**현재 상태**: 
- 로딩 상태 표시 제한적
- 데이터 신선도(freshness) 미표시

**제안 내용**:
```tsx
// components/ui/data-freshness-indicator.tsx
export function DataFreshnessIndicator({ lastUpdated }: { lastUpdated: Date }) {
  const ageMs = Date.now() - lastUpdated.getTime();
  const isStale = ageMs > 60_000; // 1분 이상 경과
  
  return (
    <div className={cn("flex items-center gap-1", isStale && "text-amber-500")}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isStale ? "bg-amber-500" : "bg-green-500 animate-pulse"
      )} />
      <span className="text-xs">
        {isStale ? `${Math.floor(ageMs / 60000)}m ago` : "Live"}
      </span>
    </div>
  );
}
```

**기대 효과**:
- 데이터 신뢰도 향상
- 사용자 혼란 감소
- 실시간 vs 캐시 데이터 명확 구분

**적용 가능성**: ✅ **APPLICABLE**  
**예상 공수**: Low (2-3일)  
**우선순위**: P1

---

## 4. 적용 권장 순서

| 순위 | 아이디어 | 적용성 | 공수 | 효과 | 비고 |
|------|----------|--------|------|------|------|
| 1 | **3.7 Skeleton UI + Data Freshness** | ✅ | Low | High | 즉시 적용 가능, UX 신뢰도↑ |
| 2 | **3.4 Collision 탐지 최적화** | ✅ | Low | High | Interval Tree로 O(n log n) |
| 3 | **3.3 PWA + 오프라인 Field Mode** | ✅ | Medium | High | 현장 운영 필수 |
| 4 | **3.1 WebSocket 실시간 업데이트** | ✅ | Medium | High | 실시간 GPS/상태 |
| 5 | **3.6 역할 기반 대시보드 뷰** | ✅ | Medium | Medium | 사용자 경험↑ |
| 6 | **3.2 Gantt 가상 스크롤** | ⚠️ | Medium | Medium | vis-timeline 한계 |
| 7 | **3.5 GPS/센서 통합** | 🔄 | High | High | 장비 연동 필요 |

---

## 5. 적용 가능성 검증

### 5.1 기술 스택 호환성

| 아이디어 | React/TS | Tailwind | SSOT | Contract |
|----------|----------|----------|------|----------|
| 3.1 WebSocket | ✅ | N/A | ✅ | ✅ |
| 3.2 Virtual Scroll | ✅ | ✅ | ✅ | ✅ |
| 3.3 PWA | ✅ | ✅ | ✅ | ✅ |
| 3.4 Collision Opt | ✅ | N/A | ✅ | ✅ |
| 3.5 Sensor | ✅ | N/A | ⚠️ 스키마 확장 필요 | ⚠️ |
| 3.6 Role Views | ✅ | ✅ | ✅ | ✅ |
| 3.7 Freshness | ✅ | ✅ | ✅ | ✅ |

### 5.2 SSOT/Contract 준수 검증

모든 APPLICABLE 아이디어는:
- ✅ option_c.json SSOT 원칙 유지
- ✅ Preview→Apply 분리 유지
- ✅ 2-click collision UX 준수
- ✅ Live/History/Approval 모드 분리 유지

### 5.3 모드 분리 영향

| 아이디어 | Live | History | Approval | Compare |
|----------|------|---------|----------|---------|
| WebSocket | ✅ 실시간 | 해당 없음 | 해당 없음 | 해당 없음 |
| PWA | ✅ 오프라인 큐 | ✅ 캐시 조회 | ✅ 캐시 조회 | ✅ |
| Role Views | ✅ 역할별 | ✅ 역할별 | ✅ 역할별 | ✅ |

---

## 6. 다음 단계 제안

### 즉시 적용 (P1)

1. **3.7 Data Freshness Indicator**
   - 파일: `components/ui/data-freshness-indicator.tsx`
   - 적용 위치: StoryHeader, GlobalControlBar
   - 공수: 2-3일

2. **3.4 Collision 탐지 최적화**
   - 파일: `lib/utils/detect-resource-conflicts.ts` 리팩터링
   - 테스트: 기존 충돌 탐지 결과 동일성 검증
   - 공수: 3-5일

### 단기 (2-4주)

3. **3.3 PWA + 오프라인**
   - 패키지: `next-pwa`, `workbox`
   - Service Worker 등록 + 캐싱 전략
   - Evidence 업로드 큐 (IndexedDB)

4. **3.1 WebSocket 실시간**
   - 패키지: `socket.io-client`
   - API: `/api/ws/activities`
   - 활동 상태 + GPS 위치 스트림

### 추가 검토 필요

5. **3.5 GPS/센서 통합**
   - Cargolog API 문서 확보
   - 센서 장비 현황 파악
   - option_c.json 스키마 확장 계획

---

## Refs

- [AGENTS.md](../../AGENTS.md) — 프로젝트 규칙
- [patch.md](../../patch.md) — UI/UX 스펙
- [WORK_LOG_20260202.md](../WORK_LOG_20260202.md) — 최신 작업 이력
- [tr-dashboard-plan.md](./tr-dashboard-plan.md) — 구현 계획

### 외부 출처

- [Smashing Magazine - UX Strategies for Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [johal.in - Next.js WebSocket Dashboard](https://johal.in/real-time-dashboards-with-next-js-python-websockets-for-live-data-updates-2025/)
- [Syncfusion - React Gantt Chart](https://www.syncfusion.com/react-components/react-gantt-chart)
- [Google - PWA Going Offline](https://developers.google.com/codelabs/pwa-training/pwa03--going-offline)
- [Mobitron - Impact Recorder for Transformer](https://mobitron.com/applications/transformer/)
