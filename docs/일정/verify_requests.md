# VERIFY 요청 (≤3)

다음 입력이 제공되면 해당 섹션을 숫자/표로 채울 수 있습니다.

| # | 요청 데이터 | 용도 | 제공 시 동작 |
|---|-------------|------|--------------|
| 1 | **events_csv** (컬럼: tr, event, ts_lt) | Segment Δh (S1~S5) 구간별 Δh 산출 | `/agi-delay-decomp`로 표 갱신 |
| 2 | **segment_stats.csv** (또는 TR1~3 실적 기반 통계) | TR4~TR7 P50/P80/P90 및 P80 Buffer 산출 | `/agi-montecarlo-buffer`로 Contingency 표 갱신 |
| 3 | **METAR/NCM 원문** (이미 보고서 내 참조 있음, 선택) | Weather Gate Evidence Weight 강화 | evidence-judge·agi-weather-evidence 재실행 시 Scorecard 보강 |

* 현재 실행에서는 1·2 미제공으로 해당 표는 VERIFY/공란 유지. 3은 본문 Evidence로 부분 충족.*
