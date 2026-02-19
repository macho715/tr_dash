---
name: agi-rca-pack
description: TR2/TR3 지연에 대해 5-Why(2개) + Fishbone(6M) 1개를 보고서 '3. 지연 원인 분석'에 삽입할 때 사용. (5-Why, Fishbone, 6M)
---

# agi-rca-pack

## When to Use
- "근본원인", "5-Why 넣어", "Fishbone 6M" 요청 시

## Inputs
- TR2 사건 요약(안개), TR3 사건 요약(강풍/파고 + berth 점유)
- Evidence 인용(WhatsApp/METAR/NCM 등)

## Steps
1) `assets/fivewhy_tr2.md`, `assets/fivewhy_tr3.md`를 사건 사실에 맞게 최소 편집(추정 금지).
2) `assets/fishbone_6m.mmd`에서 원인을 6M으로 분류(측정/방법/환경 분리).
3) 섹션 하단에 "단순화 위험(주의 문장)" 추가.

## Outputs
- 5-Why 2개 + Fishbone 1개 (Mermaid)

## Safety
- 5-Why는 단일 원인 확정 도구가 아님: 항상 "증거점수/대안원인" 병기.
