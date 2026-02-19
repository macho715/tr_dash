---
name: agi-delay-decomp
description: TR1~TR3 실적을 S1~S5 Segment로 분해해 Plan vs Actual Δh 표(Delay Decomposition)를 생성할 때 사용. (Segment, Port Turn, Δh)
---

# agi-delay-decomp

## When to Use
- "지연을 구간별로 쪼개서 표로", "TR2 안개가 어디 구간에 영향?" 요청 시

## Inputs
- 이벤트 CSV(권장 컬럼): `tr, event, ts_lt` (LT=Asia/Dubai)
- 최소 이벤트(각 TR): `MZP_ALL_FAST, MZP_ETD, AGI_ALL_FAST, LOADIN_DONE, AGI_CAST_OFF, NEXT_MZP_ALL_FAST`
- 없으면: 없는 이벤트는 공란 + VERIFY로 남김(추정 금지)

## Steps
1) Segment 정의(S1~S5) 고정:
   - S1: MZP ETA → All fast
   - S2: All fast → ETD (Port Turn)
   - S3: ETD → AGI berthing
   - S4: AGI berthing → Load-in complete
   - S5: AGI cast off → Next MZP All fast
2) `scripts/segment_delta.py`로 Δh 계산(가능한 구간만).
3) 표를 보고서 `2. 1·2·3호기 실적` 하단에 삽입.

## Outputs
- Segment Δh 표(MD)
- VERIFY 목록(누락 이벤트)

## Safety
- S4 "2.00d" 같은 값은 데이터 없으면 **가정:**으로만 표기.
