# Pipeline Contract (Locked)

## Insert Rules

- **Insert-only (append-only)**: 기존 섹션 삭제/수정 금지

- **Insertion points (고정)**:
  - A) SSOT: "1. SSOT 및 계산 규칙" 끝
  - B) Segment Δh: "2. 1·2·3호기 실적" 하단
  - C) RCA: "3. 지연 원인 분석" 하위
  - D) Forensic: "5. Original vs Re-baseline" 및 "6. Evidence/참고" 하위
  - E) Weather-Tie: "6. Evidence·참고" 하단
  - F) Monte Carlo: "6. Contingency 산정" 하위

- **VERIFY rule**:
  - 핵심 이벤트/근거 누락 시: 표는 공란 유지 + VERIFY 요청(≤3)

## 실패/중단 규칙 (Failure Rules, Locked)

1. **핵심 이벤트 누락** (berthing, load-in, cast off 등)
   - 숫자 단정 금지 → 표는 공란 + VERIFY 유지

2. **외부 근거 미확보** (METAR, NCM 원문)
   - Weather 섹션은 VERIFY 상태로만 산출 (추정 금지)

3. **기존 섹션 보호**
   - 어떤 경우에도 기존 섹션 삭제/덮어쓰기 금지 (append-only)

4. **앵커 전부 미검출**
   - FALLBACK: 문서 끝 append + VERIFY 배너 + verify_requests(≤3) 생성

## Anchor Resolver (Locked)
- 앵커 탐색은 `.cursor/skills/agi-report-autopilot/assets/insertion_map.md`의 규칙을 따른다.
- 탐색 순서(엄격):
  1) exact(라인 전체 일치)
  2) normalized(공백/중점/유니코드 정규화)
  3) regex(heading pattern)
  4) fallback(문서 끝 append) + VERIFY 배너 자동 추가
- fallback 발생 시:
  - 기존 본문은 변경 금지
  - 최종본에 `VERIFY: 삽입 앵커 미검출` 배너를 추가하고,
  - 누락된 섹션명(ANCHOR_A~F)을 changelog/verify에 기록한다.
