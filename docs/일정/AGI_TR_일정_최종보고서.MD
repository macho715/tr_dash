# AGI TR Units 1~7 일정 종합 보고서

**작성일**: 2026-02-17  
**판정**: 예 (재계산 완료, SSOT v1.1 배포)  
**다음 행동**: TR4~TR7 SSOT v1.1 배포, Port(berth/crew/fuel) 예약 각 berthing 03:00 기준 갱신

---

## Executive Summary

TR1~TR3 실적: TR1은 계획 대비 2~3일 조기, TR2·TR3은 2~3일 지연(TR2 안개, TR3 강풍·파고·berth 점유). TR4~TR7 예상 일정은 SSOT v1.1 기준으로 TR3 ETD 2026-02-19 03:00, Cycle 7.00d로 확정. TR7 Jacking Down 2026-03-30 03:00. Evidence: CSV·BUSHRA AIS·WhatsApp(Excel v2 03_Evidence 반영). Excel Delay Analysis v2(평균치 Forecast)와 SSOT v1.1(운영 기준) 차이: TR7 JD 03-29 vs 03-30, 산정 방식 상이.

---

## 1. SSOT 및 계산 규칙

### 고정 입력

* **TR3 ETD(MZP cast off)**: 2026-02-19 03:00 (LT, Asia/Dubai)
* **Cycle**: MZP ETD → 다음 MZP berthing, 평균 **7.00d** (실적 2구간 평균)
* TR4~TR7 "전체 일정"은 **Origin 일정의 TR별 상대오프셋(입항일 대비 +n일)**을 그대로 유지해 **새 berthing에 평행이동**
* Berthing 시간: **03:00** 기준
* ⚠️ Origin은 날짜만 있어 **시간=00:00**으로 간주 후, SSOT는 berthing=03:00 기준 생성

### Origin vs Re-baseline 방법론

* **Origin**: Option1 PDF(Rev01) Activity Planned Start/Finish
* **Re-baseline**: TR3 ETD 확정 + Cycle Avg 7.00d로 TR4~TR7 berthing 재산정, TR4 berthing 2026-02-26 03:00 앵커
* TR4~TR7 각 TR의 상대오프셋(Deck prep=Day0, Load-out=+2d, Sail=+4d, … JD=+16d 등)을 평행이동 적용

#### Critical Path / Float 고정 선언(운영 기준) — 파이프라인 산출 (agi-report-ssot-float)

- **Critical Path**: TR4 → TR5 → TR6 → TR7 은 직렬(Serial)로 연결된 경로로 간주하며, **Float = 0.00d** 로 정의한다.  
  → 변동 발생 시 후속 항차에 **연쇄(Propagation)** 된다. *(가정: TR4~TR7 자원/berth 제약으로 병렬화 불가)*

- **Schedule Variance(날짜) 정의 통일**  
  `SV_days = Actual_or_Forecast_finish - Planned_finish`  
  본 보고서의 기존 **Δ(d)** 와 동일 의미로 사용한다.

- **용어 주의**: EVM의 SV(=EV−PV)는 비용/진척 데이터가 필요하므로, 본 보고서에서는 **Schedule Variance(날짜)** 로만 사용한다.

---

## 2. 1·2·3호기 실적 (Plan vs Actual)

### 1·2·3호기 기준 시각 (운영 로그)

| 항차 | MZP berthing (All fast) | ETD (Sail-away) |
|------|-------------------------|-----------------|
| TR1  | 2026-01-27 17:38        | 2026-01-31 20:36 |
| TR2  | 2026-02-09 21:18        | 2026-02-12 15:00 |
| TR3  | 2026-02-17 14:24        | 2026-02-19 03:00 |

### 마일스톤 기준 (문서[1] Activity)

* MZP Deck prep (=LCT arrives to MZP)
* Load-out / Sail-away / AGI berthing / Load-in / LCT sails back to MZP / Jacking down (최종)

### 용어 정의 (분쟁 방지)

* **All Fast**는 선박이 **완전히 계류되고(gangway down & secured 포함)** 작업 가능한 상태가 된 시점을 의미한다. ([amsty.com](https://amsty.com/images/pdf/AmSty-Marine-Terminal-Berthing-Requirements.pdf))
* **Cast off**는 계류줄을 풀고 출항하는 시점(Departure)으로 정의한다. ([American Sailing](https://americansailing.com/articles/40-sailing-phrases-to-know/))

### TR1 (1호기) — Original vs Actual

| Milestone       | Original 날짜 | Actual 날짜            | Δ(d) | Evidence / 비고           |
| --------------- | ------------- | ---------------------- | ---- | ------------------------- |
| MZP Deck prep   | 2026-01-30*   | **2026-01-27 17:38**   | -3.1 | MZP_BERTH5_ALL_FAST (CSV) |
| Load-out        | 2026-02-02    | **2026-01-31**         | -2.0 | HM_LOAD_PERMISSION, Cast off 20:36 |
| Sail-away       | 2026-02-03    | **2026-01-31 20:36**   | -2.1 | MZP_CAST_OFF (CSV)        |
| AGI berthing    | 2026-02-04*   | **2026-02-04 16:06**   | 0.0  | AGI_BERTH3_ALL_FAST (CSV) |
| Load-in         | 2026-02-05    | **2026-02-04~08**      | ~0   | J62_ARRIVAL_AGI 02-04 20:30 |
| LCT back to MZP | 2026-02-06*   | **2026-02-08 22:42**   | +2.1 | MZP_ANCHORAGE_ARRIVAL     |
| Jacking down    | 2026-02-10    | (미기록)               | —    | —                         |

### TR2 (2호기) — Original vs Actual

| Milestone       | Original 날짜 | Actual 날짜            | Δ(d) | Evidence / 비고 |
| --------------- | ------------- | ---------------------- | ---- | --------------- |
| MZP Deck prep   | 2026-02-06*   | **2026-02-09 21:18**   | +3.1 | 일정.MD, WhatsApp (2/11 안개) |
| Load-out        | 2026-02-08    | **2026-02-11** (추정)  | +3.0 | ETD 전일        |
| Sail-away       | 2026-02-10    | **2026-02-12 15:00**   | +2.1 | 일정.MD, BUSHRA AIS, WhatsApp |
| AGI berthing    | 2026-02-11*   | (미기록)               | —    | —               |
| Load-in         | 2026-02-12    | (미기록)               | —    | —               |
| LCT back to MZP | 2026-02-14*   | (미기록)               | —    | —               |
| Jacking down    | 2026-02-17    | (미기록)               | —    | —               |

### TR3 (3호기) — Original vs Actual

| Milestone       | Original 날짜 | Actual 날짜            | Δ(d) | Evidence / 비고 |
| --------------- | ------------- | ---------------------- | ---- | --------------- |
| MZP Deck prep   | 2026-02-14*   | **2026-02-17 14:24**   | +3.1 | 일정.MD, WhatsApp (2/16 강풍), 2/15 berth 점유 |
| Load-out        | 2026-02-15    | **2026-02-18** (추정)  | +3.0 | ETD 전일        |
| Sail-away       | 2026-02-17    | **2026-02-19 03:00**   | +2.1 | 일정.MD 확정 ETD, METAR 2/16 G27KT |
| AGI berthing    | 2026-02-19    | (미착 AGI)             | —    | TR3 ETD 2/19 이후 |
| Load-in         | 2026-02-19    | (예정)                 | —    | —               |
| LCT back to MZP | —             | (예정)                 | —    | TR3~TR4 묶음    |
| Jacking down    | 2026-02-24    | (예정)                 | —    | —               |

### 요약

| 항차   | MZP Berthing | ETD (Sail-away) | 종합 |
| ------ | ------------ | ----------------- | ---- |
| **TR1** | 01-30 → 01-27 (**-3d**) | 02-03 → 01-31 (**-2d**) | MZP 구간 2~3일 조기, LCT 복귀 +2일 지연 (Linkspan 인증·PTW 등 비기상 요인) |
| **TR2** | 02-06 → 02-09 (**+3d**) | 02-10 → 02-12 (**+2d**) | 2/11 안개·시정 지연 |
| **TR3** | 02-14 → 02-17 (**+3d**) | 02-17 → 02-19 (**+2d**) | 2/16 강풍·악천후 지연 |

### Evidence Table (Claim | Source | Date | Excerpt)

| Claim | Source | Date | Excerpt |
| ----- | ------ | ---- | ------- |
| TR1 MZP berthing | CSV (EventKey) | 2026-01-27 17:38 | MZP_BERTH5_ALL_FAST |
| TR1 Deck prep/weld | CSV (EventKey) | 2026-01-28 17:00 | DECK_PREP_WELD |
| TR1 MZP cast off | CSV (EventKey) | 2026-01-31 20:36 | MZP_CAST_OFF |
| TR1 AGI berthing | CSV (EventKey) | 2026-02-04 16:06 | AGI_BERTH3_ALL_FAST |
| TR1 AGI cast off | CSV (EventKey) | 2026-02-08 14:38 | AGI_CAST_OFF |
| TR1 MZP anchorage | CSV (EventKey) | 2026-02-08 22:42 | MZP_ANCHORAGE_ARRIVAL |
| TR2 안개로 작업 중단 | WhatsApp (Excel v2) | 2026-02-11 07:09 | "Port Supervisor stoped all operations due to dense fog" (Yulia MAMMOET) |
| TR2 heavy fog | WhatsApp (Excel v2) | 2026-02-11 07:18 | "Due to heavy fog all mina activities have stopped" (Mammoet) |
| TR2 ETD | 일정.MD, BUSHRA AIS | 2026-02-12 15:00 | Cast off 15:00 |
| TR3 2/15 berth 점유 | WhatsApp (Excel v2) | 2026-02-15 12:09 | "berth still occupied by comarco Palma" (LCT Bushra) |
| TR3 강풍·파고 | WhatsApp (Excel v2) | 2026-02-16 06:38 | "Vessels pitching moderately with 25-28 knots wind and 5-6 wave high" (LCT Bushra) |
| TR3 MZP berthing | WhatsApp (Excel v2) | 2026-02-17 14:24 | "Bushra. secured berth" (상욱). MZP ETA 12:30 → All fast 14:24 (1h54m 소요) |
| TR3 ETD | 일정.MD | 2026-02-19 03:00 | 확정 ETD |
| TR3 2/16 강풍 | OMAA METAR | 2026-02-16 | 29017G27KT (ogimet) |

### Segment Δh (Delay Decomposition) — 파이프라인 산출 (agi-report-autopilot)

* **산출**: events_from_report.csv 기반 `/agi-delay-decomp` 실행. TR2/TR3 S3~S5는 AGI 이벤트 미기록으로 VERIFY.

#### Segment 경계(필수 Event) 정의

| Segment | Start Event | End Event | 정의 요약 |
|---------|-------------|-----------|-----------|
| **S1** | MZP_ETA_PBP | MZP_ALL_FAST | Pilot boarding place ETA → RoRo berth all fast |
| **S2** | MZP_ALL_FAST | MZP_ETD_CAST_OFF | all fast → cast off(출항) |
| **S3** | MZP_ETD_CAST_OFF | AGI_ALL_FAST | 출항 → AGI all fast |
| **S4** | AGI_ALL_FAST | AGI_LOADIN_COMPLETE | all fast → load-in(offloading) 완료 |
| **S5** | AGI_ETD_CAST_OFF | NEXT_MZP_ALL_FAST | AGI cast off → 다음 항차 MZP all fast |

#### Δh 표

| Segment | 정의 | TR1 Δh | TR2 Δh | TR3 Δh |
|---------|------|--------|--------|--------|
| S1 | MZP ETA(PBP)→All fast | 0.00 | 0.00 | 1.90 |
| S2 | All fast→ETD (Cast off) | 98.97 | 65.70 | 36.60 |
| S3 | ETD→AGI all fast | 91.50 | VERIFY | VERIFY |
| S4 | AGI all fast→Load-in complete | 94.53 | VERIFY | VERIFY |
| S5 | AGI cast off→Next MZP all fast | 30.67 | VERIFY | VERIFY |

#### 최소 타임스탬프 체크리스트 (VERIFY 제거 조건)

**TR1** (필수 7개): ✅ MZP_ALL_FAST, ✅ MZP_ETD_CAST_OFF, ✅ AGI_ALL_FAST, ✅ AGI_LOADIN_COMPLETE, ✅ AGI_ETD_CAST_OFF | ❌ MZP_ETA_PBP, ❌ AGI_ETA_PBP

**TR2**: ✅ MZP_ALL_FAST, ✅ MZP_ETD_CAST_OFF, ✅ NEXT_MZP_ALL_FAST | ❌ MZP_ETA_PBP, ❌ **AGI_ALL_FAST**(가장 큰 구멍), ❌ AGI_ETA_PBP

**TR3**: ✅ MZP_ETA_PBP(12:30), ✅ MZP_ALL_FAST(14:24), ✅ MZP_ETD_CAST_OFF(02-19 03:00) | ❌ **AGI_ALL_FAST**, ❌ AGI_LOADIN_COMPLETE, ❌ **AGI_ETD_CAST_OFF** (최소 이 2개만 있어도 S3~S5 신뢰도 상승)

**증거 우선순위**: 1) Port/Terminal log 2) AIS Port Call (ATA/ATD) 3) WhatsApp 운영 로그

**VERIFY(누락 이벤트)**: TR2/TR3 — AGI_ALL_FAST, AGI_LOADIN_COMPLETE, AGI_ETD_CAST_OFF 미기록.

---

## 3. 지연 원인 분석

### TR2 지연 (계획 02-06~02-10 → 실제 02-09~02-12)

| 구분 | 내용 |
| ---- | ---- |
| **직접 원인** | 2/11 Fog/Fog Patches 지속, 2/12 Mist (OMAA METAR) |
| **영향** | 시정 악화로 MZP 출입항·작업 지연 |
| **Evidence** | WhatsApp: "Port Supervisor stoped all operations due to dense fog" (2/11 07:09), "heavy fog all mina activities have stopped" (2/11 07:18) — Excel v2 03_Evidence |
| **판정** | "안개 지연"으로 **매칭** |

### TR3 지연 (계획 02-14~02-17 → 실제 02-17~02-19)

| 구분 | 내용 |
| ---- | ---- |
| **직접 원인** | 2/16 강풍 (METAR 29017G27KT), 파고 5~6 ft (≈1.5~1.8m), 2/15 Comarco Palma berth 점유 |
| **영향** | 선적·해상 작업 불가, ETD 2일 지연 |
| **Evidence** | WhatsApp: "berth still occupied by comarco Palma" (2/15), "Vessels pitching moderately with 25-28 knots wind and 5-6 wave high" (2/16 06:38), "Bushra. secured berth" (2/17 14:20) — Excel v2 03_Evidence |
| **판정** | "악천후 지연"으로 **매칭** |
| **참고** | OMAA는 공항 관측이라 MZP/해상과 완전 동일하지는 않음 |

### 다각도 요약

* **기상**: TR2 Fog/Mist, TR3 강풍·고파고
* **항만**: 2/15 Comarco Palma berth 점유 → TR3 berthing 지연
* **계획 가정**: "정상 기상" 가정 vs 실제 악천후

### 5-Why / Fishbone(6M) 요약 — 파이프라인 산출 (agi-report-autopilot)

*(가정: Excel v2·WhatsApp·METAR 기반 단순화. 증거점수/대안원인은 evidence-judge 산출물 참조)*

- **TR2 5-Why 요약**: 왜 지연? → 안개(시정 악화) → 왜? MZP 연안 2/11 Fog/Fog Patches → 왜? 습도·calm wind(역대 특성) → 왜? 겨울 시즌 → 왜? UAE 기후. *(단일 원인 확정 아님)*
- **TR3 5-Why 요약**: 왜 지연? → 강풍·berth 점유 → 왜? 2/16 METAR G27KT, 2/15 Comarco Palma → 왜? 해상 악천후·제3자 선박 → 왜? 계획 가정 "정상 기상" → 왜? 리스크 반영 미적용. *(가정:)*
- **Fishbone(6M)**: Method(계획 가정 정상 기상), Environment(안개·강풍·파고), Man/Machine(berth 점유), Material/Measurement(WhatsApp·METAR·NCM 출처).

---

## 4. 4·5·6·7호기 예상 일정 (SSOT v1.1)

### 기준

* TR3 ETD = 2026-02-19 03:00
* Cycle = MZP ETD → 다음 MZP berthing **7.00일**
* 시간: **03:00 (LT, Asia/Dubai)** 기준

### TR4~TR7 예상 마일스톤 일정

| TR | MZP Berthing     | MZP Load-out     | MZP ETD (Sail-away) | AGI Berthing     | AGI Load-in      | LCT Return (MZP) | AGI JD/Transport | AGI Jacking Down |
| -: | ---------------- | ---------------- | ------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| 4  | 2026-02-26 03:00 | 2026-02-27 03:00 | 2026-03-01 03:00    | 2026-03-02 03:00 | 2026-03-03 03:00 | 2026-03-04 03:00 | 2026-03-04 03:00 | 2026-03-08 03:00 |
| 5  | 2026-03-05 03:00 | 2026-03-06 03:00 | 2026-03-08 03:00    | 2026-03-09 03:00 | 2026-03-10 03:00 | 2026-03-11 03:00 | 2026-03-11 03:00 | 2026-03-15 03:00 |
| 6  | 2026-03-12 03:00 | 2026-03-13 03:00 | 2026-03-15 03:00    | 2026-03-16 03:00 | 2026-03-17 03:00 | 2026-03-18 03:00 | 2026-03-18 03:00 | 2026-03-22 03:00 |
| 7  | 2026-03-19 03:00 | 2026-03-20 03:00 | 2026-03-22 03:00    | 2026-03-23 03:00 | 2026-03-24 03:00 | (N/A)            | 2026-03-25 03:00 | 2026-03-30 03:00 |

TR7은 마지막 항차로 LCT 복귀 이벤트 없음 → LCT Return N/A.

### 항차별 요약

| 항차   | MZP Berthing     | ETD              | Jacking Down     | 비고         |
| ------ | ---------------- | ---------------- | ---------------- | ------------ |
| **TR4** | 2026-02-26 03:00 | 2026-03-01 03:00 | 2026-03-08 03:00 | Port Turn 3d, Sea Leg 1d |
| **TR5** | 2026-03-05 03:00 | 2026-03-08 03:00 | 2026-03-15 03:00 | 동일         |
| **TR6** | 2026-03-12 03:00 | 2026-03-15 03:00 | 2026-03-22 03:00 | 동일         |
| **TR7** | 2026-03-19 03:00 | 2026-03-22 03:00 | 2026-03-30 03:00 | LCT Return N/A |

### MZP Berthing 간격

* TR4 → TR5: **7일**
* TR5 → TR6: **7일**
* TR6 → TR7: **7일**
→ Cycle 7.00d로 균등 배치.

---

## 5. Original vs Re-baseline (TR4~7 상세)

### 항차 그룹 요약

> Re-baseline 기준: **TR4 MZP berthing=2026-02-26 03:00**부터 7.00d 간격

| 항차(TR Units)     | Original 예정 Start | Original 예정 Finish | Re-baseline 예정 Start | Re-baseline 예정 Finish | ΔStart(d) | ΔFinish(d) |
| ------------------ | ------------------- | -------------------- | ---------------------- | ----------------------- | --------- | ---------- |
| TR Units **1-2**   | 2026-01-29          | 2026-02-13           | (변경 없음)            | (변경 없음)             | 0.00      | 0.00       |
| TR Units **3-4**   | 2026-02-06          | 2026-02-22           | 2026-02-26 03:00       | 2026-03-14 03:00        | +20.13    | +20.13     |
| TR Units **5-6**   | 2026-02-15          | 2026-03-03           | 2026-03-05 03:00       | 2026-03-21 03:00        | +18.13    | +18.13     |
| TR Unit **7**      | 2026-02-24          | 2026-03-07           | 2026-03-19 03:00       | 2026-03-30 03:00        | +23.13    | +23.13     |

### TR4~TR7 마일스톤별 Δ(d)

| TR  | MZP Deck prep | Load-out | Sail-away | AGI berthing | Load-in | Jacking down |
| --- | ------------- | -------- | --------- | ------------ | ------- | ------------ |
| TR4 | +20.13        | +20.13   | +20.13    | +20.13       | +20.13  | +20.13       |
| TR5 | +18.13        | +18.13   | +18.13    | +18.13       | +18.13  | +18.13       |
| TR6 | +26.13        | +26.13   | +26.13    | +26.13       | +26.13  | +21.13       |
| TR7 | +23.13        | +23.13   | +23.13    | +23.13       | +23.13  | +23.13       |

### 차이(Δ) 상세 이유

| 구분 | 내용 |
|------|------|
| **근본 원인** | TR2·TR3 지연(안개, 강풍·berth 점유) → TR3 ETD 계획 02-17 → 실제 02-19 확정. Re-baseline은 TR3 실제 ETD를 앵커로 사용. |
| **Re-baseline 앵커** | TR3 ETD 02-19 03:00 + Cycle 7.00d → TR4 MZP berthing 02-26 03:00. 이후 TR5~7은 7d 간격으로 평행 배치. |
| **Original 기준** | 문서[1] Option1 PDF의 Planned Start/Finish. 그룹 경계: TR3-4 Start 02-06, TR5-6 Start 02-15, TR7 Start 02-24. |
| **Δ 산출** | Original 그룹 Start → Re-baseline 그룹 Start 일수 차. 02-06→02-26 (+20.13d), 02-15→03-05 (+18.13d), 02-24→03-19 (+23.13d). 소수 0.13은 Origin 00:00 vs Re-baseline 03:00에 의한 3h = 0.125일 반영. |
| **TR6 Δ 상이(26.13 / 21.13)** | Original에서 TR5-6 묶음 구조. TR6 LCT 복귀는 TR7 수거(A1620)로 연결되어 별도 회차 없음. Jacking down만 Origin 상대오프셋이 달라 +21.13d, 그 외 마일스톤은 +26.13d. |

* TR6: Original에서 TR5-6 묶음으로 LCT 복귀가 TR7 수거로 연결되는 구조. TR6 전용 LCT back 마일스톤은 1:1 매칭 제한적.

### Windows Analysis / But-For — 파이프라인 산출 (agi-report-autopilot)

| Window | Plan Start~End | As-Built Start~End | Δh | Top2 원인 | 근거 W |
|--------|----------------|---------------------|-----|-----------|--------|
| TR2 | 2026-02-06~02-10 | 2026-02-09~02-12 | +2~3d | Fog/Mist, 시정 | W2 WhatsApp, W3 METAR |
| TR3 | 2026-02-14~02-17 | 2026-02-17~02-19 | +2~3d | 강풍·파고, berth 점유 | W2 WhatsApp, W3 METAR |

**But-For (가정:)**  
- But-For TR2: "정상 시정이었으면" → ETD 02-10 근접 가정. *불확실성: 실제 시정 데이터 없음.*  
- But-For TR3: "berth 가용+정상 기상이었으면" → berthing 02-15~16 가정. *불확실성: Comarco Palma 이탈 시각·기상 복합.*

---

## 6. Evidence·참고

### 데이터 출처

| 출처 | 용도 |
| ---- | ---- |
| **EventKey,EventName,Actual_TS(GST),Plan_T.csv** | TR1 EventKey↔Actual 시각 매핑 |
| **Bushra_260217_192647.txt** | LCT BUSHRA AIS 로그 (입출항·정박) |
| **AGI.TR Operation님과의 WhatsApp 대화.txt** | 지연 사유·현장 보고 |
| **AGI_TR_TR1-TR7_Delay_Analysis_v2_calculated.xlsx** | WhatsApp Evidence 집계, TR1~3 이벤트·Assumptions, TR4~7 평균치 기반 Forecast |

### Excel(v2) vs SSOT v1.1 비교

| 구분 | Excel (Delay Analysis v2) | 최종보고서 (SSOT v1.1) |
| ---- | ------------------------- | ----------------------- |
| **산정 방식** | TR1~TR3 실적 평균 (MZP Turn 2.80d, Return 2.61d) | Cycle 7.00d 고정 + Origin 상대오프셋 |
| **TR4 MZP Secured** | 2026-02-24 03:23 | 2026-02-26 03:00 |
| **TR7 Jacking Down** | 2026-03-29 | 2026-03-30 03:00 |
| **Project Float** | -5 days (Origin 대비 지연) | ΔFinish TR7 +23.13d |
| **용도** | Forecast/참고, 평균치 기반 | **운영 기준** (배포·예약용) |

### 범위

* 본 보고서는 **MZP ↔ Al Ghallan(AGI)** 운항/하역 사이클 기준. **DAS Island** 일정 재산정은 범위 외.

### BUSHRA AIS 이동 이력 요약 (Bushra_260217_192647.txt)

| 기간 | 주요 이동 |
|------|----------|
| 1/25 | Musaffah Anchorage 출항 |
| 1/27 | Mina Zayed Port 도착·정박 |
| 1/31 | MZP 출항 (16:57 UTC) |
| 2/1~4 | Al Ghallan/Zakum 해상 정박·대기 |
| 2/9  | MZP 재입항 (16:53 UTC) |
| 2/13 | Zakum→Abu Dhabi Anchorage (MZP 접안 대기) |
| 2/17 | Abu Dhabi Anchorage 정박 (ETA MZP, 접안 전) |

### TR1~TR7 Original 일정표 (Day-level, 문서[1] 기준)

| TR | Orig_LoadOut_MZP | Orig_ETD_MZP | Orig_LoadIn_AGI | Orig_JD |
|----|------------------|--------------|-----------------|---------|
| 1  | 2026-02-02       | 2026-02-03   | 2026-02-05      | 2026-02-10 |
| 2  | 2026-02-08       | 2026-02-10   | 2026-02-12      | 2026-02-17 |
| 3  | 2026-02-15       | 2026-02-17   | 2026-02-19      | 2026-02-24 |
| 4  | 2026-02-22       | 2026-02-24   | 2026-02-26      | 2026-03-03 |
| 5  | 2026-03-01       | 2026-03-03   | 2026-03-05      | 2026-03-10 |
| 6  | 2026-03-08       | 2026-03-10   | 2026-03-12      | 2026-03-17 |
| 7  | 2026-03-15       | 2026-03-17   | 2026-03-19      | 2026-03-24 |

### 데이터 한계

* **METAR**: OMAA(공항) 기준 → MZP/해상과 1:1 대응 아님. 참조: tutiempo.net, ogimet.com
* **파고**: METAR로 직접 검증 불가, 현장·예보(AvMet 등) 보조 필요
* **포트 로그**: Mina Zayed 과거 입출항 기록은 공개·무료 데이터에서 확인 어려움
* **AIS**: BUSHRA 위치·입출항은 확인 가능, 작업 일정·사유는 별도 문서 필요

### 권장 후속 조치 (구현)

#### 1. MZP/해상 직접 관측 데이터 확보

| 데이터 소스 | 확보 경로 (확인됨) | 기대 효과 |
|-------------|-------------------|----------|
| **tide-forecast Mina Zayed** | https://tide-forecast.com/locations/Mina-Zayed/metars/latest | METAR(OMAA 28km 등), 조위, Sea conditions(wave height, swell) |
| **NCM Al Bahar** | https://albahar.ncm.gov.ae (UAE NCM 해상 서비스) | Marine forecast, 파고·풍속 |
| **NCM API** | https://api.ncm.gov.ae (인증 필요) | 기상 데이터 API 연동 |
| **METAR 실시간** | https://tgftp.nws.noaa.gov/weather/current/OMAA.html, ogimet.com | OMAA(24.44°N, 54.65°E) 풍속·시정·Gust |
| **NDBC** | https://ndbc.noaa.gov — Arabian Gulf 인근 buoy **없음** (NDBC는 주로 미국 수역) | — |
| **Port log / Vessel API** | Maqta(maqta.ae), VesselFinder/Data Docked/VesselAPI (유료) | 입출항(ATA/ATD)·berth 점유 |

* METAR(OMAA)는 공항 기준이라 MZP·해상과 ±오차 존재. tide-forecast는 OMAA·Bateen·Dubai 등 14~226km 내 공항 METAR + 해상 조건 제공.

**인터넷 조회 출처** (2026-02 직접 확인):

| 분류 | URL | 확인 내용 |
|------|-----|-----------|
| **조위/해상** | https://tide-forecast.com/locations/Mina-Zayed | Mina Zayed 조위·METAR·Sea conditions |
| | https://tides.today/.../mina-zayid-new-free-port | 대체 조위 사이트 |
| | sea-seek.com Mina Zayed | Spring 2m, neap 0.1m, fairway 4.5kt |
| **NCM UAE** | https://albahar.ncm.gov.ae/?lang=en | Al Bahar 해상 예보 (Arabian Gulf·Oman Sea) |
| | https://api.ncm.gov.ae/documentation/ | NCM API v2.0 (인증) |
| **항만/AIS** | https://www.vesselfinder.com/ports/AEMZD001 | Mina Zayed 입출항·대기 선박 |
| | maqta.ae (Port Community System) | PCS·통합; 공개 API 없음, support@maqta.com |
| | VesselAPI, MarineTraffic, Data Docked | AIS/port call API (유료) |
| **안개 통계** | AMS J.Appl.Meteor.Climatol. JAMC-D-20-0168.1 | Abu Dhabi 공항 안개 클라이말로지 |
| | The National (thenational.ae) | UAE 연평균 ~132일 안개, 12월~3월 시즌 |

#### 2. 계획에 기상 리스크 반영 (Contingency 산정)

* **참고(인터넷 조회)**: UAE 연평균 약 132일 안개(2006년 이후). 안개 시즌 12월 중~3월 말. 2월 초 아부다비·연안 새벽~오전 안개 빈발(습도·맑은 하늘·calm wind). (AMS J.Appl.Meteor.Climatol., The National, UAE NCM)

| 리스크 요인 | 계절·역대 특성 (UAE/Abu Dhabi) | 제안 비예비 일수 | 적용 구간 |
|-------------|-------------------------------|------------------|-----------|
| **안개(Fog/Mist)** | 2~3월 새벽·아침 시정 악화 빈발 (TR2 2/11). 3월은 겨울比 안개 감소 (온도↑) | +0.5~1.0d per MZP Turn | TR4~TR7 MZP Load-out 창 |
| **강풍·파고** | 2월 해상 gust 15~25kt, swell 2~4ft. 3월 연평균 최대풍 24 km/h, 기온 26~28°C | +0.5~1.0d per Sea Leg | TR4~TR7 ETD~AGI 구간 |
| **Berth 점유** | Comarco Palma 등 제3자 선박 대기 (TR3 2/15 사례) | +0.5d (경험적) | MZP berthing 전 |

* **합산 예시**: TR4~TR7 Cycle당 +1~2d contingency → 기상·항만 변동 대응. 실제 적용은 프로젝트 리스크 정책에 따름.

#### P50/P80/P90 및 Buffer — 파이프라인 산출 (agi-report-autopilot)

* **VERIFY**: segment_stats 미제공. TR1~TR3 실적 기반 분포 미산출. 아래는 가정(정규 분포) 예시이며, **숫자 단정 금지** — 데이터 확보 후 `/agi-montecarlo-buffer` 갱신.

| TR | P50 (일) | P80 (일) | P90 (일) | P80 Buffer 권고 |
|----|----------|----------|----------|-----------------|
| TR4~TR7 | (가정 산출 보류) | — | — | +1~2d (Contingency 섹션 제안과 동일) |

#### 3. TR2·TR3 Delay 이벤트 ↔ METAR/예보 타임라인 매칭 표

| 일시 (LT) | Delay 이벤트 (WhatsApp/현장) | METAR/예보 (OMAA·AvMet) | 매칭 |
|-----------|------------------------------|--------------------------|------|
| **TR2** | | | |
| 2/11 02:30~09:30 | Port Supervisor "stoped all operations due to dense fog" | Fog/Fog Patches 지속 (tutiempo.net) | **매칭** |
| 2/11 07:18 | "heavy fog all mina activities have stopped" (Mammoet) | 동일 | **매칭** |
| 2/12 04:30~07:30 | Load-out 시도, tide window 06~08 | Mist 지속, Wind 4→13 km/h (tutiempo.net) | **매칭** |
| **TR3** | | | |
| 2/15 12:09 | "berth still occupied by comarco Palma" (LCT Bushra) | (항만 이슈). NCM: slight→rough→very rough | — |
| 2/16 06:38 | "Vessels pitching with 25-28 knots wind and 5-6 wave high" | METAR 29017G27KT (ogimet.com). NCM: very rough→rough, gust 50 km/h | **매칭** |
| 2/16 08:06 | Bushra drop anchor MZ anchorage, strong wind | 동일 | **매칭** |
| 2/17 03:00Z | 저시정·대기 | METAR 2500m BR, TEMPO 1500m (ogimet.com). NCM: moderate→slight | **부분 매칭** |
| 2/17 14:20 | Bushra secured berth | NCM: moderate→slight | — |
| 2/19 03:00 | TR3 ETD | AvMet: NE 5–7kt→NW 10–15kt, Sea 2–4ft/6–8ft. NCM Al Bahar: slight, 10–20 km/h (albahar.ncm.gov.ae) | **ETD 창 가능** |

* **NCM Al Bahar 예보** (인터넷 조회 2026-02): 2/15–16 Arabian Gulf rough~very rough (15–30 km/h, gust 50 km/h), 2/17–19 moderate→slight (10–20 km/h). TR3 지연·ETD 창과 일치.

#### 4. TR4~TR7 구간 기상 특성 (인터넷 조회 2026-02)

| 항목 | 특성 |
|------|------|
| **3월 Abu Dhabi** | 평균 기온 26~28°C, 강수 3일/월, 습도 48%, 최대풍 24 km/h (easeweather, AccuWeather) |
| **3월 안개** | 12~3월 시즌 말미로 2월比 빈도 감소. 일별 예보는 NCM·tide-forecast 갱신 시 확인 |
| **Mina Zayed 조위** | tide-forecast.com 30일 전망 (wave 0.1~0.7m, swell N/NE). TR4~TR7 창은 해당 일자 근접 시 재조회 |

#### 5. 최근 Evidence 조회 결과 (2026-02, agi-schedule-evidence-lookup)

| 항목 | 조회 결과 |
|------|----------|
| **tide-forecast Mina Zayed** | 6일·30일 전망. wave 0.1~0.7m, swell direction·period 포함. https://tide-forecast.com/locations/Mina-Zayed |
| **VesselFinder AEMZD001** | 24h 입항 27척, 재항 50척, 30일 내 9척 예정. Mina Zayed 운영 정상. |
| **OMAA METAR 2/16** | 04:30Z 시정 7000m, dust(DU), tempo 4000m (ogimet). 2/16 강풍·악천후와 정합. |
| **NCM Al Bahar** | Feb 15–19 예보 위 표 반영. albahar.ncm.gov.ae 정상. Mar 2026 세부 예보는 해당 시점 7~10일 전 방출. |

### 부록: UnifiedJSON v1.2 (TR4~TR7 SSOT v1.1)

```json
{
  "ssot_version": "TR4-TR7_v1.1",
  "tz": "Asia/Dubai",
  "inputs": {
    "tr3_etd_lt": "2026-02-19 03:00",
    "avg_cycle_days": 7.00,
    "method": "CycleAvg(ETD->NextBerthing) + OriginRelativeOffsets"
  },
  "tr4_tr7": [
    {"tr":"TR4","mzp_berthing":"2026-02-26 03:00","mzp_loadout":"2026-02-27 03:00","mzp_etd":"2026-03-01 03:00","agi_berthing":"2026-03-02 03:00","agi_loadin":"2026-03-03 03:00","lct_return_mzp":"2026-03-04 03:00","agi_jd_transport":"2026-03-04 03:00","agi_jacking_down":"2026-03-08 03:00"},
    {"tr":"TR5","mzp_berthing":"2026-03-05 03:00","mzp_loadout":"2026-03-06 03:00","mzp_etd":"2026-03-08 03:00","agi_berthing":"2026-03-09 03:00","agi_loadin":"2026-03-10 03:00","lct_return_mzp":"2026-03-11 03:00","agi_jd_transport":"2026-03-11 03:00","agi_jacking_down":"2026-03-15 03:00"},
    {"tr":"TR6","mzp_berthing":"2026-03-12 03:00","mzp_loadout":"2026-03-13 03:00","mzp_etd":"2026-03-15 03:00","agi_berthing":"2026-03-16 03:00","agi_loadin":"2026-03-17 03:00","lct_return_mzp":"2026-03-18 03:00","agi_jd_transport":"2026-03-18 03:00","agi_jacking_down":"2026-03-22 03:00"},
    {"tr":"TR7","mzp_berthing":"2026-03-19 03:00","mzp_loadout":"2026-03-20 03:00","mzp_etd":"2026-03-22 03:00","agi_berthing":"2026-03-23 03:00","agi_loadin":"2026-03-24 03:00","lct_return_mzp":null,"agi_jd_transport":"2026-03-25 03:00","agi_jacking_down":"2026-03-30 03:00"}
  ]
}
```

### Weather Gate / Evidence Scorecard — 파이프라인 산출 (agi-report-autopilot)

| 일시/윈도우 | Gate 기준 (Wind/Vis/Wave) | 판정 | Evidence W |
|-------------|---------------------------|------|------------|
| TR2 2/11 | Fog, Vis &lt;1000m | FAIL (작업 중단) | W2 WhatsApp, W3 tutiempo |
| TR2 2/12 | Mist, Vis 개선 | PASS (Load-out 창) | W2/W3 |
| TR3 2/16 | Gust 27kt, 파고 5~6ft | FAIL | W3 METAR, W2 WhatsApp |
| TR3 2/19 03:00 | NE 5–7kt, Sea 2–4ft | PASS (ETD) | NCM Al Bahar |

* Evidence Weight: W3=공식/원문, W2=AIS/공식 추적, W1=WhatsApp/구두. METAR(OMAA)는 MZP/해상과 공간적 차이 있음 → 적합성 VERIFY.

---

*본 보고서는 docs/일정/ 일정.MD, AGI_TR_TR1-TR7_Delay_Analysis_v2_calculated.xlsx 등을 통합·정리한 최종 산출물입니다. Evidence 일부는 Excel v2 03_TR1-3_Evidence 시트(WhatsApp 기반)를 반영함. 기상·조위·항만 데이터는 agi-schedule-evidence-lookup(WebSearch)로 2026-02 조회·보강.*
