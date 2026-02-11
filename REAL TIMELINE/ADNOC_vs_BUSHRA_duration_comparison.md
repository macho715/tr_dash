# ADNOC vs Bushra Duration 비교 자료

**기준:** adnoc.csv (ADNOC 타임라인)  
**비교 대상:** bushra.csv (Bushra 선박 일지)  
**목적:** 두 자료 간 Duration 비교

**작성일:** 2026-02-10

---

## 1. 자료 개요

| 항목 | adnoc.csv | bushra.csv |
|------|-----------|------------|
| 성격 | ADNOC 기준 마일스톤/이벤트 타임라인 | Bushra 선박 상세 일지 (START/END 기반) |
| 기간 | 2026-01-25 ~ 2026-02-08 | 2026-01-27 ~ 2026-02-04 |
| 행 수 | 14건 | 32건 |
| Duration | 행당 1개 (DURATION HRS / DURATION DAYS) | 행당 1개 (DURATION HRS / DURATION DAYS) |

- **adnoc:** 이벤트 발생 **Date** 1개 + 해당 이벤트의 **Duration** (Hrs/Days).
- **bushra:** **START DATE ~ END DATE** 구간 + 구간별 **Duration** (Hrs/Days). 동일 날짜에 여러 행 존재 가능.

---

## 2. 날짜별 Duration 비교

아래는 **adnoc 기준 날짜**에 대해, 해당 날짜가 포함된 bushra 행들의 DURATION HRS 합계를 구한 뒤 adnoc의 해당 날짜 행(들)과 비교한 요약이다.

| adnoc Date | adnoc 행 요약 | adnoc DURATION HRS | adnoc DURATION DAYS | bushra 해당일 행 수 | bushra DURATION HRS 합계 | bushra DURATION DAYS 합계 | Delta (HRS) | 비고 |
|------------|----------------|--------------------|----------------------|----------------------|---------------------------|-----------------------------|-------------|------|
| 2026-01-25 | Vessel released, sail to MZP anchorage | 25.5 | 1.06 | 0 | — | — | — | bushra 해당일 없음 |
| 2026-01-26 | Vessel at anchorage, Berth not secured | 35.63 | 1.48 | 0 | — | — | — | bushra 해당일 없음 |
| 2026-01-27 | Bushra Berthed at MZP RoRo Berth No. 5 | 23.37 | 0.97 | 1 | 33 | 1.38 | +9.63 | bushra: 27 0:00–28 9:00 (33h) |
| 2026-01-28 | Grillage, stools, welding onboard | 65.5 | 2.73 | 6 | 86.72 | ~3.61 | +21.22 | bushra: Deck prep 등 6건 |
| 2026-01-29 | — | — | — | 1 | 24 | 1 | — | adnoc 해당일 단독 행 없음 |
| 2026-01-30 | — | — | — | 1 | 24 | 1 | — | adnoc 해당일 단독 행 없음 |
| 2026-01-31 | Loading Permission; Loading TR1; Cast off MZP | 0.5+9.6+9.4=19.5 | 0.02+0.4+0.39=0.81 | 12 | 20.5+…(다수) | ~1.2* | - | 31일 adnoc 3행 합계 vs bushra 다수 행 |
| 2026-02-01 | Bushra at Al Ghallan Anchorage | 47 | 1.96 | 2 | 30+24=54 | 2.25 | +7 | 01일 bushra: 30h+24h |
| 2026-02-02 | — | — | — | 1 | 24 | 1 | — | adnoc 해당일 없음 |
| 2026-02-03 | MMT to AGI for TR1 offloading | 35.1 | 1.46 | 1 | 24 | 1 | -11.1 | bushra: 대기 24h |
| 2026-02-04 | Bushra Berthed AGI; J62 lifting clamps | 4.4+86.5=90.9 | 0.18+3.6=3.78 | 8 | 12.2+…+16.1 (등) | ~2.2* | - | 04일 adnoc 2행 vs bushra 8건 |
| 2026-02-08 | TR1 Offloaded; Sailed from AGI; anchor MZP | 3.63+8.07+(empty) | 0.15+0.34+— | 0 | — | — | — | bushra 02-04까지만 있음 |

\* 해당일 bushra 다수 행 합산은 아래 CSV 참고.

---

## 3. Phase별 매칭 (adnoc 기준)

| adnoc SN | Date | adnoc Activity (요약) | adnoc HRS | bushra에서 대응 가능한 구간/내용 | bushra HRS (참고) |
|----------|------|------------------------|-----------|-----------------------------------|-------------------|
| 1 | 2026-01-25 | Vessel released, sail to MZP | 25.5 | 해당일 없음 | — |
| 2 | 2026-01-26 | Anchorage, Berth not secured | 35.63 | 해당일 없음 | — |
| 3 | 2026-01-27 | Bushra Berthed MZP RoRo Berth 5 | 23.37 | NO 1: SECURED ALONGSIDE MZP RORO BERTH (27 0:00–28 9:00) | 33 |
| 4 | 2026-01-28 | Grillage, stools, welding | 65.5 | NO 2–7: Deck preparation 등 | 10.2+10.5+13+14.4+15+24 = 87.1 |
| 5 | 2026-01-31 | Loading Permission | 0.5 | NO 10–11 등 | 부분 |
| 6 | 2026-01-31 | Loading TR No. 1 Completed | 9.6 | NO 12–18 등 (COMMENCE LOADING ~ COMPLETED LASHING) | 부분 |
| 7 | 2026-01-31 | MWS Sail away, Bushra Cast off | 9.4 | NO 19–21 (CASTED OFF, MANOUVRE) | 부분 |
| 8 | 2026-02-01 | Dropped anchor Al Ghallan | 47 | NO 21–22 (CLEAR CHANNEL 30h, DROPPED ANCHOR 24h) | 30+24 |
| 9 | 2026-02-03 | MMT to AGI for TR1 offloading | 35.1 | NO 24: DROPPED ANCHOR WAITING (24h) | 24 |
| 10 | 2026-02-04 | Bushra Berthed AGI West RoRo 3 | 4.4 | NO 25–31, 32 (HEAVE UP ~ SECURED BERTH 3) | 합계 참고 |
| 11 | 2026-02-04 | J62 lifting clamps AGI | 86.5 | 동일일 다른 이벤트 | — |
| 12 | 2026-02-08 | Tr No. 1 Offloaded at AGI | 3.63 | bushra 자료 없음 (04일까지) | — |
| 13 | 2026-02-08 | Bushra Sailed from AGI | 8.07 | — | — |
| 14 | 2026-02-08 | Bushra anchor MZP | (empty) | — | — |

---

## 4. 해석 및 사용 시 유의사항

- **adnoc**는 이벤트 단위로 한 행에 **하나의 Duration**이 있음.
- **bushra**는 같은 날 여러 작업이 쪼개져 있어, **같은 날짜**로 묶어 합산해야 adnoc와 단순 비교 가능.
- **Delta (HRS):** bushra 합계 − adnoc. 양수면 해당 기간 bushra 기록이 adnoc보다 김.
- bushra는 **2026-02-04**까지만 있어, **02-08** 구간(TR1 Offload, Sail from AGI, anchor MZP)은 bushra와 직접 duration 비교 불가.
- Duration 단위: **DURATION HRS** 기준 비교 권장. **DURATION DAYS**는 소수 반올림 차이 있을 수 있음.

---

## 5. 상세 수치(CSV)

날짜·행 단위 상세 비교는 **`ADNOC_vs_BUSHRA_duration_comparison.csv`** 참고.
