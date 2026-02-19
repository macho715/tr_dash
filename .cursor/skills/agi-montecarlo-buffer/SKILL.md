---
name: agi-montecarlo-buffer
description: TR1~TR3 Segment 분포를 기반으로 TR4~TR7 완료일(P50/P80/P90)과 P80 달성 Buffer(일)를 산출해 보고서 'Contingency' 섹션에 삽입할 때 사용. (Monte Carlo, P50/P80/P90, Buffer)
---

# agi-montecarlo-buffer

## When to Use
- "Cycle 7.00d 고정 대신 분포", "P80 Buffer 제시" 요청 시

## Inputs
- `segment_stats.csv` (예: Segment, mean_h, std_h) 또는 과거 샘플(행 단위)
- TR4~TR7 기준 일정(SSOT v1.1)

## Steps
1) 입력 통계(또는 샘플)로 segment별 난수 샘플링(N=10,000 기본).
2) TR4~TR7 사이클/완료일 분포 생성.
3) P50/P80/P90 및 P80 달성을 위한 Buffer(일) 계산.
4) 데이터 부족 시: 분포 가정(정규/로그정규)을 "가정:"으로 명시.

## Outputs
- P50/P80/P90 표 + Buffer 권고표

## Safety
- 분포 가정은 반드시 표기. 근거 데이터가 없으면 VERIFY로 중단하지 않고 "가정:" 처리(단, 숫자 단정은 금지).
