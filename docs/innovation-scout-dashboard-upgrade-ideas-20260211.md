# TR 대시보드 업그레이드 아이디어 (2026-02-11)

**기준**: AGENTS.md · patch.md · CHANGELOG(2026-02-11)  
**목적**: Where → When/What → Evidence 3초 가독 + 2-click Why 유지하면서 업그레이드 후보 제안.

---

## 1. 기존 Innovation Scout 보고서 요약

`docs/innovation-scout-report-2026-02-10.md`에 **8개 아이디어**가 이미 정리되어 있음.

| 순위 | 아이디어 | 기대 효과 | 난이도 | 비고 |
|------|----------|-----------|--------|------|
| P0 | Natural Language Command Interface | 복잡한 작업 -40~60% | 중 | 이미 Phase 1 구현됨(AI Command) → 고도화 여지 |
| P1 | Carbon Emissions Tracker & ESG | ESG 리포트 자동화 | 낮 | Quick Win |
| P1 | AI-Powered Predictive Risk Engine | 지연 방지, On-time +30% | 높 | 데이터·ML 필요 |
| P1 | Offline-First Mobile Field App (PWA) | 현장 효율 +40% | 중 | PWA·동기화 |
| P1 | Real-Time Collaborative Decision Room | 협업 효율 +50% | 높 | WebSocket·CRDT |
| P2 | IoT Sensor Integration | 실시간 가시성 | 높 | 하드웨어 |
| P2 | Computer Vision Cargo Inspection | 적재 오류 조기 발견 | 높 | CV·학습 데이터 |
| P3 | Digital Twin Integration | Forecast +30%, Delay -50% | 매우 높 | Moonshot |

**상세**: 위 보고서 §3·§4·§10 참조.

---

## 2. UX/UI 개선 아이디어 (추가)

| # | 아이디어 | 설명 | 기대 효과 | 난이도 |
|---|----------|------|-----------|--------|
| U1 | **Story Header 3초 검증 대시** | 헤더 영역에 "3초 내 읽기" 체크리스트(Where/When/Evidence) 표시, 미충족 시 강조 | 가독성 목표 명시화, QA 용이 | 낮 |
| U2 | **2-click Why 경로 하이라이트** | Collision 배지 클릭 시 "1/2" → Why 패널 열릴 때 "2/2" 단계 표시, 키보드 포커스 이동 | 2-click 규칙 준수 확인·접근성 | 낮 |
| U3 | **Map↔Gantt 선택 상태 싱크 강화** | Gantt에서 activity 선택 시 Map flyTo + 지오펜스 하이라이트; Map 클릭 시 Gantt 해당 행 스크롤·포커스 | 시선 흐름 일치, 혼란 감소 | 중 |
| U4 | **Compare 모드 KPI + Tide risk delta** | Compare 시 Plan A/B에 Tide 위험(SAFE/DANGER/CLOSED) 차이 카드 추가 | What-if 시 물때 리스크 비교 | 중 |
| U5 | **즉시 조치 체크리스트 확장** | OperationalNotice 3항목을 설정 가능(JSON/설정)하거나, "완료 시 알림" 옵션 | 운영 팀 유연 대응 | 중 |
| U6 | **모바일·태블릿 반응형 2열** | 768px 이하에서 Map | Detail, Gantt는 드로어/풀스크린 토글 | 현장·회의실 활용 | 중 |
| U7 | **접근성: 키보드·스크린리더** | Collision 배지/Why 패널/Apply 버튼 포커스 순서, aria-label, reduced motion | 규제·포용적 UX | 중 |

---

## 3. 기능 확장 아이디어 (추가)

| # | 아이디어 | 설명 | 기대 효과 | 난이도 |
|---|----------|------|-----------|--------|
| F1 | **Approval 모드 Export/Sign-off 강화** | 승인 스냅샷 + 필수 증빙 충족 여부 PDF/이미지 export, 간단 서명(이름·일시) 첨부 | 거버넌스·감사 대응 | 중 |
| F2 | **History as-of 타임라인 슬라이더** | History 모드에서 날짜/시간 슬라이더로 "그 시점" 스냅샷 재현 | 과거 의사결정 추적 | 중 |
| F3 | **알림 정책(경미)** | PTW 만료 N일 전, Evidence 누락, Collision CRITICAL 등 조건별 브라우저 알림/이메일(옵션) | 놓친 이벤트 감소 | 중 |
| F4 | **Voyage 카드 → Gantt 필터** | Voyage 카드 선택 시 Gantt가 해당 Voyage activity만 표시(또는 강조) | Voyage 중심 작업 흐름 | 낮 |
| F5 | **Reflow Preview 영향 요약 카드** | Preview 시 "이동 N개, 충돌 M개, Freeze 위반 K개" 한 줄 카드 + 상세 펼치기 | Apply 전 결정 속도 향상 | 낮 |
| F6 | **Tide 가이던스 → Compare KPI** | CHANGELOG 언급 "Compare KPI에 Tide risk delta" 구현 | What-if 시 물때 리스크 정량화 | 낮 |

---

## 4. 기술/성능 아이디어

| # | 아이디어 | 설명 | 기대 효과 | 난이도 |
|---|----------|------|-----------|--------|
| T1 | **Gantt/Map 지연 로딩·스켈레톤** | dynamic import + ErrorBoundary + skeleton(이미 권장됨). 미적용 구역 점검·통일 | 초기 로딩 체감 개선 | 낮 |
| T2 | **SSOT/스케줄 캐시 전략** | /api/ssot 응답 stale-while-revalidate, scheduleActivities 메모이제이션 | 중복 fetch·리렌더 감소 | 중 |
| T3 | **오프라인 읽기 캐시** | Service Worker로 최근 SSOT/option_c 스냅샷 캐시, 오프라인 시 "캐시된 데이터" 배너 | 네트워크 불안정 대응 | 중 |
| T4 | **에러 복구: Reflow 실패 시 폴백** | previewScheduleReflow 예외 시 toast + "이전 Preview 유지" 또는 "초기화" 버튼 | fail-soft 강화 | 낮 |

---

## 5. 운영/거버넌스 아이디어

| # | 아이디어 | 설명 | 기대 효과 | 난이도 |
|---|----------|------|-----------|--------|
| O1 | **Audit 로그 Export** | History + Evidence 변경 이력 시간순 export (CSV/JSON). Approval 모드에서만 다운로드 가능 옵션 | 감사·규제 대응 | 낮 |
| O2 | **View Mode 전환 시 확인** | Live→History 등 전환 시 "저장되지 않은 변경 있음" 경고(있을 경우) | 실수 방지 | 낮 |
| O3 | **필수 증빙 미충족 배지 집계** | Story Header 또는 KPI에 "Evidence gate 미충족 N건" 배지, 클릭 시 해당 Activity 목록 | Evidence gate 가시성 | 낮 |

---

## 6. 적용 우선순위 제안 (이번 문서 기준)

- **즉시 적용(Quick Win)**: U2(2-click 하이라이트), F4(Voyage→Gantt 필터), F5(Preview 요약 카드), F6(Tide Compare KPI), T1(스켈레톤 점검), T4(Reflow 폴백), O2(View 전환 확인), O3(Evidence 미충족 배지).
- **단기(2–4주)**: U3(Map↔Gantt 싱크), U4(Compare+Tide delta), U6(반응형 2열), F1(Approval Export), F2(History as-of 슬라이더), T2(캐시 전략).
- **중기(기존 보고서와 연계)**: Carbon Tracker(P1), NL Command 고도화(P0), Offline PWA(P1).

---

## 7. SSOT/불변조건 (요약)

§2–§5·§8 모든 아이디어는 다음을 준수: Activity=option_c.json SSOT, Trip/TR 참조만, Preview→Apply 분리, 모드 분리(Live/History/Approval/Compare), 2-click Why 유지. **전체 체크리스트는 §10 참조.**

---

## 8. 외부 리서치 기반 아이디어 (2026-02-11)

아래는 **외부 인터넷 검색**(대시보드 UX, Gantt, 물류 운영, 맵·타임라인, 증빙·감사, 예측 ETA) 결과를 TR 대시보드 맥락에 맞게 정리한 추가 아이디어. 출처는 §9 참조.

### 8.1 Decision-First · 실시간 대시보드 UX

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R1 | **Decision-First 헤더** | "지금 결정해야 할 것" 우선 표시(우선 지표·알림·컨텍스트). Story Header를 **능동적 결정 보조**로 설계해 인지 부하 감소 | 의사결정 시간 단축, 실수 감소 | 중 | Smashing Magazine, ThoughtSpot |
| R2 | **역할 기반 동적 레이아웃** | Live 모드에서 역할(Planner/Ops/Manager)에 따라 콘텐츠·레이아웃 자동 맞춤(예: Ops는 즉시 조치·Evidence 강조) | 노이즈 감소, 관련 정보만 노출 | 높 | Grafana 12, Smashing Magazine |
| R3 | **KPI 설명 오버레이** | AI/규칙 기반으로 "이 KPI가 이렇게 나온 이유" 요약(드라이버, 전일 대비). 클릭 시 상세 | 신뢰·이해도 상승, 분석 시간 단축 | 중 | ThoughtSpot, AufaitUX |

### 8.2 Gantt · 일정 시각화 모범 사례

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R4 | **Critical path + Swimlane** | 의존성·크리티컬 패스 시각 강조(화살표·색). Voyage/Phase별 Swimlane·롤업으로 그룹화 | 일정 리스크 가시화, 클utter 감소 | 중 | Domo, Slack, Officetimeline, Visor |
| R5 | **다중 시간축·줌** | 개요(주/월) ↔ 태스크 상세(일/시간) 줌 레벨 전환. 현재 날짜선·Plan vs Actual 병기 | 스테이크홀더별 해상도 제공 | 중 | Officetimeline, Microsoft 365 |
| R6 | **Baseline vs Actual 오버레이** | Plan(베이스라인)과 Actual을 같은 바 위에 겹쳐 표시, variance 한눈에 | 일정 성과 추적, 지연 원인 파악 | 중 | Visor, Officetimeline |

### 8.3 물류 · 공급망 운영 대시보드

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R7 | **이벤트 기반 알림·워크플로** | 지연·용량 제약·Evidence 만료 등 이벤트 발생 시 자동 알림 + "할 일" 워크플로 연결(Go→voyages/schedule/gantt 확장) | 결정 속도 향상 | 중 | Appverticals, Trinetix, Beacon |
| R8 | **OTIF·Transit KPI 카드** | On-Time-In-Full, 구간별 소요시간, 리소스(SPMT/Barge) 활용률 등 물류 KPI 카드. Trip/Voyage 단위 집계 | 운영 성과 가시화 | 중 | GoodData, Dataland |
| R9 | **시나리오 시뮬레이션 UI** | What-if에 더해 "2일 앞당기면 Linkspan 용량 95%" 등 시나리오 결과를 카드로 요약. Compare와 연동 | 계획 대안 비교 용이 | 중 | Trinetix, Graphed AI |

### 8.4 맵 · 타임라인 통합 (When & Where)

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R10 | **타임라인 슬라이더 + 맵 필터** | History/재현 모드에서 **시간 슬라이더**로 시점 선택 → 맵·Gantt·리스트가 해당 시점으로 동기 필터. Play/Pause·속도 조절 | 시간축에 따른 위치·진행 재현, 사후 분석 | 중 | Palantir Foundry, Honeycomb Maps, Mapbox |
| R11 | **이벤트 트랙·Breadcrumb** | 선택 Activity의 시간순 위치를 맵에 트랙(breadcrumb)으로 표시. 타임라인 스크럽 시 트랙 갱신 | 이동 경로·이벤트 순서 가독성 | 중 | ArcGIS Timeline, Folium Timeline |
| R12 | **시간 필터 표시 유지** | 타임라인 필터 적용 시 맵·테이블에 "현재 적용된 시간 범위" 배너 표시. 사용자 인지 유지 | 필터 오해 방지 | 낮 | Honeycomb, Palantir |

### 8.5 증빙·감사·디지털 서명

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R13 | **증빙 상태 대시(Ready/Approved/갱신 필요)** | Evidence를 상태별(Ready, Approved, Needs Renewal, Rejected)로 필터·집계. 자동 vs 수동·갱신 주기 표시 | 갱신·모니터링 우선순위 | 낮 | Openlane Evidence Dashboard, Moxo |
| R14 | **감사 추적·완료 증명** | Sign-off 시 서명자·인증·타임스탬프·IP/기기·문서 해시 기록. 다운로드 가능한 감사 패키지(증명서) | 거버넌스·감사 대응, 변조 방지 | 중 | Nitro Sign, Formiq, Sprinto |
| R15 | **증빙 자동 매핑·검증** | PTW/Cert 만료일·필수 유형을 제어에 매핑, AI/규칙으로 완전성·만료 전 검증 후 리뷰 | 수동 재작업 감소 | 중 | Moxo, Sprinto |

### 8.6 예측 ETA · 선제 알림

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| R16 | **At Risk / On Time / Late 상태 뱃지** | Voyage/Activity별 ETA를 On Time / At Risk / Late로 한눈에 표시. 기존 ETA Drift와 통합 | 선제 대응, 커뮤니케이션 개선 | 낮 | CO3, Shipwell, Portcast |
| R17 | **지연 원인 요약** | "지연 예상: 기상 2일, Linkspan 대기 1일" 등 이유 요약(규칙 또는 LLM). Why 패널·배지에 노출 | 근본 원인 파악 가속 | 중 | Portcast, Beacon |
| R18 | **알림 라우팅·소음 제어** | 역할별 알림 라우팅(Planner/Ops/Manager). 실시간 vs 일/주 요약 등 빈도 설정으로 알림 피로 감소 | 적시 대응 + 과알림 방지 | 중 | Beacon, Flybuy ETAi |

---

## 9. 외부 참고 자료 (웹 검색)

- **대시보드 UX·실시간**: Smashing Magazine (UX strategies real-time dashboards), ThoughtSpot (real-time dashboard use cases), AufaitUX (AI design patterns enterprise dashboards 2026), Grafana 12 (dynamic dashboards).
- **Gantt·일정**: Domo, Slack (Gantt 101), Officetimeline (timelines and Gantt), Visor, Microsoft 365 (Gantt guide).
- **물류·공급망**: Appverticals (logistics dashboards 2025), Trinetix (smarter supply chains), GoodData (supply chain dashboard examples), Graphed (logistics dashboard with AI), Dataland (eCommerce logistics data guide).
- **맵·타임라인**: Palantir Foundry (map timeline), Honeycomb Maps (timeline filter), Mapbox (timeline animation), ArcGIS Experience Builder (timeline widget), Folium (timeline plugin).
- **증빙·감사**: Openlane (evidence dashboard), Nitro Sign (esignature audit trails), Moxo (compliance reporting), Sprinto (audit management), Formiq (compliance audit trails).
- **예측 ETA**: CO3 (predictive ETA), Flybuy ETAi, Beacon (exception management), Portcast (ocean predictive ETA), Shipwell (responsive ETAs).

---

## 10. SSOT/불변조건 체크 (§2–§8 공통)

- **SSOT**: 모든 아이디어는 Activity=option_c.json 권위 유지, Trip/TR은 참조만.
- **Preview→Apply**: Reflow 관련은 기존 previewScheduleReflow/applySchedulePreview 경로만 사용.
- **모드 분리**: Approval에서 Apply/계획 변경 불가 유지.
- **2-click Why**: Collision→Why 패널 경로 훼손하지 않음.
- **§8 외부 리서치 아이디어(R1–R18)**: 위 불변조건과 충돌하지 않는 범위에서 적용.
- **§12 모바일 가독성(M1–M14)**: 동일 불변조건; 모바일에서도 2-click Why·3초 가독 유지.

---

## 11. 적용 우선순위 (§6 + §8 반영)

- **Quick Win(기존 + 리서치)**: U2, F4, F5, F6, T1, T4, O2, O3, **R12**(시간 필터 표시), **R13**(증빙 상태 대시), **R16**(On Time/At Risk/Late 뱃지).
- **단기**: U3, U4, U6, F1, F2, T2, **R1**(Decision-First 헤더), **R5**(다중 시간축), **R7**(이벤트 알림), **R10**(타임라인 슬라이더+맵), **R14**(감사 추적).
- **중기**: R2(역할 기반 레이아웃), R4(Critical path+Swimlane), R6(Baseline vs Actual), R8(OTIF KPI), R15(증빙 자동 검증), R17(지연 원인 요약), R18(알림 라우팅).

---

## 12. 모바일 환경 가독성 아이디어 (2026-02-11)

**목표**: 모바일·태블릿에서도 "Where → When/What → Evidence" 3초 가독과 2-click Why를 유지. 현장·이동 중 빠른 확인·최소 입력에 최적화.

아래는 **외부 리서치**(모바일 대시보드 UX, 현장 운영 대시보드, WCAG 터치 타겟)를 반영한 **모바일 전용** 아이디어. 기존 U6(반응형 2열)을 보완.

### 12.1 정보 구조·시각 계층

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| M1 | **모바일 Story Header 1화면** | 768px 이하에서 Story Header를 **한 화면**에: Where(위치 1줄) + When/What(다음 액티비티 1줄) + Evidence(미충족 N건). 세로 스택, 스크롤 없이 3초 내 파악 | 3초 가독 유지, 인지 부하 감소 | 중 | Spaceberry, Infor Birst |
| M2 | **카드당 1 KPI·1 스파크라인** | 모바일 KPI/배지는 **카드 1장 = 핵심 1개**(예: "다음: Load-out 2/12 14:00"). 필요 시 미니 스파크라인만. 나머지는 탭/드로어로 | 스캔 용이, 클utter 감소 | 낮 | Spaceberry, Uitop |
| M3 | **우선순위·알림 상단 고정** | "지금 결정할 것"(즉시 조치 N건, At Risk Voyage, Evidence 미충족)을 상단 고정 배너 또는 첫 카드로. 색/아이콘으로 상태 구분 | 결정 보조, 실시간 대응 | 중 | Smashing Magazine, ArcGIS |

### 12.2 터치·타이포·대비

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| M4 | **터치 타겟 최소 44×44px** | 배지·버튼·탭·Collision 클릭 영역을 **44×44 CSS px**(≈9mm) 이상. 패딩/보이지 않는 히트 영역으로 확장 가능. WCAG 2.5.8(24×24 최소) 상회 | 오조작·포기 감소, 접근성 | 낮 | web.dev, W3C Mobile A11y, GetWCAG |
| M5 | **타이포·대비 일관** | 모바일 전용 type scale(제목/본문/캡션), 줄간격·자간, **대비 4.5:1 이상**. 과도한 대형 폰트 지양, 공간 효율 | 가독성·일관성, 햇빛/저조도 대응 | 낮 | Spaceberry, Infor Birst |
| M6 | **장갑·저조도 대응** | 현장(장갑·햇빛·먼지) 가정: 주요 액션은 큰 버튼·아이콘+텍스트, 색만이 아닌 형태/패턴으로 상태 구분, 스크린리더 라벨 | 포용적 UX, 현장 사용률 향상 | 중 | Spaceberry, ArcGIS |

### 12.3 레이아웃·네비게이션

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| M7 | **세로 스택 + 탭/드로어** | 모바일: Map | Detail | History/Evidence 순 세로 스택. Gantt·필터·Compare는 **탭 또는 하단/측면 드로어**로 열기. 첫 로드 시 핵심만 노출 | 한 손 조작, 정보 우선순위 명확 | 중 | ArcGIS Dashboards, U6 확장 |
| M8 | **모바일 전용 뷰 옵션** | 데스크톱과 **별도 모바일 뷰** 구성(요소 복제 후 재배치). "현재 위치·다음 일정·즉시 조치" 위주, Gantt는 간단 리스트/타임라인으로 대체 가능 | 로드 속도·가독성 동시 확보 | 높 | ArcGIS, Retool |
| M9 | **필터·옵션은 드로어** | Trip/TR/Date/View 모드 등은 상단 드롭다운 대신 **드로어**로 열어 화면 점유 최소화. "적용된 필터" 칩만 상단 노출 | 터치 친화, 공간 확보 | 낮 | Infor Birst, ArcGIS |

### 12.4 콘텐츠·차트·성능

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| M10 | **차트 단순화·지연 로딩** | 모바일에서 Gantt/맵은 **요약만**(예: Voyage별 막대 1개, 맵은 마커만). 상세는 "상세 보기"로 풀스크린. 차트는 필터 적용 후 렌더 | 체감 속도·배터리 | 중 | Infor Birst, Spaceberry |
| M11 | **텍스트 최소·라벨 생략** | 헤더/범례는 필요 시만. 카드 제목·숫자·상태 뱃지 위주. "More"로 펼치기 | 스크롤 감소, 3초 내 핵심 도달 | 낮 | ArcGIS, Mobile App Daily |
| M12 | **2-click Why 모바일 유지** | Collision 배지 터치 → Why 패널(전체 화면 또는 하단 시트). "1/2 → 2/2" 단계 표시·큰 터치 영역 유지 | 패치 규칙 준수, 현장에서 원인 파악 | 낮 | 문서 기존 U2·R12 정합 |

### 12.5 현장·오프라인

| # | 아이디어 | 설명 | 기대 효과 | 난이도 | 출처 |
|---|----------|------|-----------|--------|------|
| M13 | **오프라인 읽기 캐시** | 최근 SSOT/현재 Trip 요약을 로컬 캐시. 오프라인 시 "캐시된 데이터 (HH:MM 기준)" 배너 + 읽기 전용. T3와 동일 방향 | 네트워크 불안정 대응, 현장 신뢰도 | 중 | Retool, 기존 T3 |
| M14 | **푸시·알림 요약** | "즉시 조치 1건", "Voyage 2 At Risk" 등 푸시 또는 브라우저 알림. 탭 시 해당 섹션으로 딥링크 | 놓친 이벤트 감소 | 중 | Retool, Beacon |

---

### §12 요약: 모바일 가독성 Quick Win

| 우선순위 | 아이디어 | 비고 |
|----------|----------|------|
| **Quick Win** | M2(카드 1 KPI), M4(터치 44px), M5(타이포·대비), M9(필터 드로어), M11(텍스트 최소), M12(2-click 유지) | 기존 U6·U7과 병행 |
| **단기** | M1(Story Header 1화면), M3(우선순위 상단), M7(세로 스택+드로어), M10(차트 단순화) | 2–4주 |
| **중기** | M6(장갑·저조도), M8(모바일 전용 뷰), M13(오프라인 캐시), M14(푸시 알림) | 현장 PWA와 연계 |

---

## 13. 외부 참고 자료 보강 (§12 모바일)

- **모바일 대시보드 UX**: Spaceberry Studio (mobile dashboard clarity, touch, IA), Uitop (mobile dashboard UI components), Infor Birst (mobile guidelines, layout, performance), Mobile App Daily (dashboard design 2026).
- **현장·운영**: ArcGIS (dashboards on smartphone, operations dashboard), Retool (mobile field workforce, offline, notifications).
- **접근성·터치**: web.dev (accessible tap targets 48px/9mm), W3C Mobile Accessibility, GetWCAG (target size 2.5.8).

---

## 14. 적용 우선순위 (§11 + §12 모바일 반영)

- **Quick Win**: 기존 §11 + **M2, M4, M5, M9, M11, M12**.
- **단기**: 기존 §11 + **M1, M3, M7, M10**.
- **중기**: 기존 §11 + **M6, M8, M13, M14**.

---

**참조**: `docs/innovation-scout-report-2026-02-10.md`, `AGENTS.md`, `patch.md`, `CHANGELOG.md`
