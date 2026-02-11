## ADNOC_TIMELINE.CSV vs Chat Summary vs agi tr final schedule.json

### 1. 일치·계획 대비 실제 (TR Unit 1 구간)

| 이벤트 | 계획 (JSON) | ADNOC / 실제 | Chat Summary | Plan vs Actual |
|--------|-------------|--------------|--------------|----------------|
| MZP Berth 5 접안 | (Deck Prep 27–28 Jan) | 27-Jan-26 **17:38** | 26/1/27 roro jetty **17:38** | 계획과 일치 |
| Grillage·스툴·용접 | A1004/A1005 27–28 Jan | 28-Jan-26 17:00 | 26/1/28 Deck Prep, linkspan | 일치 |
| **TR1 Load-out (A1060)** | **2026-01-30** | 31-Jan-26 **11:00** | 26/1/31 Load out started | **1일 지연** |
| Seafastening (A1070) | 30–31 Jan | 31-Jan (same day) | 26/1/31 Sea fastening done | 1일 지연 |
| **Sail-away MZP→AGI (A1081)** | **2026-02-01** | 31-Jan-26 **20:36** | 31/01/2026 2036 cast off | **1일 앞당김** |
| Al Ghallan anchorage | (A1091 전) | 01-Feb-26 06:00 | 01/02/2026 0600 | 계획 02-Feb 도착 전 01-Feb 도착 |
| **LCT Arrival AGI (A1091)** | **2026-02-02** | 04-Feb-26 **16:06** | 04.02.2026 1606 Berth 3 | **2일 지연** |
| Load-in TR1 (A1110) | 2026-02-03 | (04-Feb 맥락) | 26/2/4–5 Berth 3 | 1일 지연 |
| **LCT Sails back MZP (A1121)** | **2026-02-04** | 08-Feb-26 **14:38** | 08.02.2026 1438 cast off | **4일 지연** |
| TR1 Offload AGI | (A1140 등 04–08 Feb) | 08-Feb-26 11:00 | 26/2/8 offloading completed | 계획 구간 내 |
| Bushra MZP 재도착 | (A2029 등 05–06 Feb) | **08-Feb-26 22:42** | ETA 09.02 0100 | 실제 8일 밤(22:42), ETA 9일 01:00 |

---

### 2. 차이·보완 (이전과 동일 + JSON 반영)

| 구분 | 계획 (JSON) | ADNOC | Chat Summary | 해석 |
|------|-------------|--------|--------------|------|
| 25 Jan | (MOB 26 Jan) | 04:30 MZP 행 | 08:54 Musaffah | ADNOC=출항·MZP 행, 채팅=Musaffah 정박 → 경유 순서로 보완 |
| 26 Jan | 26 Jan MOB 시작 | 06:00 anchorage | 27 Jan 08:00 요청 | 계획은 26일 MOB; 실제 26일은 베르스 미확보로 anchorage |
| 31 Jan HM 허가 | — | **10:30** Permission | HM 승인만 | ADNOC가 10:30 시각 보강 |
| 03 Feb MMT AGI | — | **05:00** MMT 이동 | 3.Feb AM | ADNOC가 05:00 보강 |
| 04 Feb J62 | — | **20:30** J62 AGI | (없음) | ADNOC만 20:30 기록 |
| MZP 재도착 | 05–06 Feb (A2029) | **08-Feb 22:42** | ETA 09-Feb 01:00 | 실제 8일 22:42, ETA는 9일 01:00 |

---

### 3. JSON activity_id별 Plan vs Actual 요약

| activity_id | 활동 | 계획 (planned_start) | 실제 (ADNOC/채팅) | 차이 |
|-------------|------|------------------------|--------------------|------|
| A1060 | Load-out TR1 | 2026-01-30 | 2026-01-31 11:00 | +1일 |
| A1081 | Sail-away MZP→AGI | 2026-02-01 | 2026-01-31 20:36 | **-1일** (앞당김) |
| A1091 | LCT Arrival AGI | 2026-02-02 | 2026-02-04 16:06 | +2일 |
| A1110 | Load-in TR1 | 2026-02-03 | 2026-02-04 | +1일 |
| A1121 | LCT Sails back MZP | 2026-02-04 | 2026-02-08 14:38 | +4일 |

---

**결론**: ADNOC와 채팅 요약은 서로 잘 맞고, **agi tr final schedule.json**과 비교하면 TR1 구간에서 Load-out 1일 지연, Sail-away 1일 앞당김, AGI 도착·Load-in 1~2일 지연, LCT MZP 복귀 4일 지연으로 정리할 수 있습니다.