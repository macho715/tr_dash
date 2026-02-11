# ADNOC DURATION 기준 비교 (Phase 구간 + WA/Bushra overlap)

**기준:** ADNOC 1행 = 1 Phase. Phase = (Start_dt, End_dt). WA = 구간 포함, Bushra = overlap_hrs만 합산. 시간대 GST.

## ADNOC 행별 End_dt 해석 규칙 (Prepare)

| SN | DURATION TIMES 해석 | End_dt 결정 | 비고 |
|----|---------------------|-------------|------|
| 1, 2 | 경과(elapsed) | Start + DURATION HRS | Phase 1 Start = 2026-01-25 00:00 |
| 3, 4, 5, 6, 7, 8, 10 | 시각(time of event) | Date + HH:MM | WA·Bushra와 시각 대조 |
| 9 | 시각 05:00 (02-03) | 2026-02-03 05:00 | MMT travelled |
| 11 | 시각 20:30 (02-04) | J62 arrival | 86.5h는 구간 길이 아님 |
| 12 | 11:00 + 3.63hr | 2026-02-08 14:38 | Offload 완료 시각 |
| 13 | 14:38 + 8.07hr | 2026-02-08 22:42 | WA E013 drop anchor |
| 14 | 08:04 = 8.07hr 경과 | Start(22:42) + 8.07hr | plan §6.2-5 |

- **Bushra NO32:** END 빈칸 → end_dt = 2026-02-04 16:06 (Phase 10 종료와 동일).
- **WA occurred_time 빈칸:** 해당일 00:00(GST)로 wa_dt 산출.

## Phase별 비교

| phase_id | start_dt | end_dt | adnoc_hrs | wa_ids | bushra_nos | bushra_overlap_hrs | delta_hrs | note |
|----------|----------|--------|-----------|--------|------------|-------------------|-----------|------|
| 1 | 2026-01-25 00:00 | 2026-01-26 01:30 | 25.5 | E001 | — | — | — | bushra 해당일 없음 |
| 2 | 2026-01-26 01:30 | 2026-01-27 13:07 | 35.63 | E015;E014;E003;E004 | 1 | 13.13 | -22.5 | 정의차이 또는 overlap 구간 |
| 3 | 2026-01-27 13:07 | 2026-01-27 17:38 | 23.37 | E016;E017 | 1 | 4.5 | -18.87 | 정의차이 또는 overlap 구간 |
| 4 | 2026-01-27 17:38 | 2026-01-28 17:00 | 65.5 | E002;E027 | 1;2;3;4;5;6;7 | 95.47 | 29.97 | 정의차이 또는 overlap 구간 |
| 5 | 2026-01-28 17:00 | 2026-01-31 10:30 | 0.5 | E025;E018;E020;E019;E005 | 7;8;9;10;11;12;13;14;15;16;17;18;19;20;21 | 172.25 | 171.75 | 정의차이 또는 overlap 구간 |
| 6 | 2026-01-31 10:30 | 2026-01-31 11:00 | 9.6 | E006 | 12;13;14;15;16;17;18;19;20;21 | 4.75 | -4.85 | 정의차이 또는 overlap 구간 |
| 7 | 2026-01-31 11:00 | 2026-01-31 20:36 | 9.4 | E007 | 14;15;16;17;18;19;20;21 | 52.6 | 43.2 | 정의차이 또는 overlap 구간 |
| 8 | 2026-01-31 20:36 | 2026-02-01 06:00 | 47 | E008 | 20;21;22 | 15.8 | -31.2 | 정의차이 또는 overlap 구간 |
| 9 | 2026-02-01 06:00 | 2026-02-03 05:00 | 35.1 | E009 | 22;23;24 | 47 | 11.9 | 정의차이 또는 overlap 구간 |
| 10 | 2026-02-03 05:00 | 2026-02-04 16:06 | 4.4 | — | 24;25;26;27;28;29;30;31;32 | 134.75 | 130.35 | 정의차이 또는 overlap 구간 |
| 11 | 2026-02-04 16:06 | 2026-02-04 20:30 | 86.5 | E010 | — | — | — |  |
| 12 | 2026-02-04 20:30 | 2026-02-08 14:38 | 3.63 | E026;E021;E011;E023 | — | — | — | bushra 자료 02-04까지 |
| 13 | 2026-02-08 14:38 | 2026-02-08 22:42 | 8.07 | E012;E024;E022 | — | — | — | bushra 자료 02-04까지 |
| 14 | 2026-02-08 22:42 | 2026-02-09 06:46 | 8.07 | — | — | — | — | bushra 자료 02-04까지 |

## 비교 포인트

- **SN3:** ADNOC 23.37h vs Bushra overlap — 접안 구간 정의 차이.
- **SN4:** ADNOC 65.5h vs Bushra overlap — Deck prep 구간.
- **SN6·7:** WA 10:53 / 20:36 vs Bushra 시각 일치.
- **SN10:** WA·ADNOC·Bushra 16:06 일치.

## 데이터 모델 요약

- Phase: phase_id, start_dt, end_dt, adnoc_duration_hrs, activity_id_primary/secondary.
- WA: wa_dt in [start_dt, end_dt) → wa_ids_in_phase. (time 빈칸 = 00:00)
- Bushra: overlap_hrs = max(0, min(b_end, p_end) - max(b_start, p_start)); NO32 end_dt = 2026-02-04 16:06.
- activity_id: 스케줄(Option C) 외 이벤트는 키워드 매핑표 또는 빈칸. 근거 없는 분해 금지. SN7 Cast off~Sail-away → primary A1081, secondary A1070.

**관련:** [ADNOC_vs_BUSHRA_duration_comparison.md](ADNOC_vs_BUSHRA_duration_comparison.md)
