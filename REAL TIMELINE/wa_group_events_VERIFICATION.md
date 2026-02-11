# wa_group_events.csv 검증 보고

**검증일:** 2026-02-10  
**대상:** REAL TIMELINE/wa_group_events.csv  
**참조:** wa group.csv, agi tr planned schedule.json

---

## 1. 검증 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| evidence_message_nos ↔ wa group NO | **PASS** | 2, 7, 36, 42, 45, 46, 55, 58, 59, 82, 96, 99, 105, 106, 107, 117, 122, 123, 127, 141, 167, 168, 170, 172, 173, 180, 183 모두 wa group에 존재 |
| activity_id ↔ plan | **PASS** | A1001, A1004, A1060, A1070, A1081, A1091, A1121, A1141, A1150, A2010 모두 plan에 정의됨 |
| planned_start / planned_finish | **PASS** | plan 기준과 일치 (E001은 검증 중 보정: 2026-01-26 반영) |
| occurred_date / occurred_time | **PASS** | 메시지 내용·wa group END DATE/TIME과 일치 (1606→16:06, 1438→14:38, 2242hrs→22:42 등) |
| activity_name | **PASS** | plan의 activity_name과 동일 (E018 level2만 CSV 구분자 회피로 `;` 사용) |

---

## 2. 보정 사항 (적용됨)

- **E001**  
  - **내용:** planned_start, planned_finish가 비어 있음.  
  - **조치:** plan A1001 기준 `2026-01-26`, `2026-01-26` 반영.

---

## 3. 참고 (수정 불필요)

- **E014 (NO 7):** wa group에서는 해당 행이 A1000(SPMT)으로 매핑되어 있으나, 메시지 "2026-01-27 08:00 AM"은 Bushra 도착 시각이므로 이벤트는 A1001(MARINE)로 두는 것이 타당. 유지.
- **E018 level2:** plan은 "JACKING EQUIPMENT, STEEL BRIDGE"(쉼표). CSV에서 컬럼 분리 방지를 위해 `JACKING EQUIPMENT; STEEL BRIDGE`로 기입. 유지.
- **occurred_time 비움:** E020(승인), E021(loading commenced), E023(offloading completed)은 메시지에 정확 시각 없음. report/날짜만 기입으로 적절.

---

## 4. 이벤트 목록 (24건)

| event_id | activity_id | occurred_date | occurred_time | evidence_nos |
|----------|-------------|---------------|---------------|--------------|
| E001 | A1001 | 2026-01-25 | 08:54 | 2 |
| E002 | A1004 | 2026-01-27 | 17:38 | 58;59 |
| E003 | A1004 | 2026-01-27 | 08:33 | 42 |
| E004 | A1004 | 2026-01-27 | 12:56 | 45 |
| E005 | A1060 | 2026-01-31 | 10:25 | 105;106 |
| E006 | A1070 | 2026-01-31 | 10:53 | 107 |
| E007 | A1070 | 2026-01-31 | 16:38 | 117 |
| E008 | A1070 | 2026-01-31 | 20:36 | 122;123 |
| E009 | A1081 | 2026-02-01 | 06:00 | 127 |
| E010 | A1091 | 2026-02-04 | 16:06 | 141 |
| E011 | A1150 | 2026-02-08 | 14:00 | 168 |
| E012 | A1121 | 2026-02-08 | 14:38 | 180 |
| E013 | A1121 | 2026-02-08 | 22:42 | 183 |
| E014 | A1001 | 2026-01-27 | 08:00 | 7 |
| E015 | A1004 | 2026-01-27 | 07:38 | 36 |
| E016 | A1004 | 2026-01-27 | 14:30 | 46 |
| E017 | A1004 | 2026-01-27 | 17:00 | 55 |
| E018 | A2010 | 2026-01-30 | 08:40 | 82 |
| E019 | A1060 | 2026-01-31 | 08:50 | 99 |
| E020 | A1060 | 2026-01-30 | — | 96 |
| E021 | A1141 | 2026-02-07 | — | 167 |
| E022 | A1150 | 2026-02-08 | 16:00 | 170 |
| E023 | A1150 | 2026-02-08 | — | 172 |
| E024 | A1150 | 2026-02-08 | 15:00 | 173 |

---

## 5. 결론

- **wa_group_events.csv**는 wa group.csv 및 plan(agi tr planned schedule.json)과 일치하며, E001의 planned 일자만 보정함.
- evidence_message_nos로 wa group NO와의 추적이 가능하고, activity_id로 plan과의 Plan vs Actual 비교에 사용 가능함.
