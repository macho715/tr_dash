# Anchor Resolver Spec (Locked)

## Normalization Rules
1) Trim: 좌/우 공백 제거
2) Collapse spaces: 연속 공백 → 단일 공백
3) Dot normalization:
   - "·" / "∙" / "." 혼용은 비교 시 동일 취급(단, 원문은 보존)
4) Unicode normalization: NFKC로 비교 문자열 정규화(비교 전용)
5) Heading normalization:
   - "#", "##", "###" 레벨 차이는 regex 단계에서 허용

## Match Levels (record in changelog)
- L1: exact
- L2: normalized
- L3: regex
- L4: fallback

## Fallback Behavior (non-negotiable)
- 문서 본문 재구성/재번호화/섹션 삭제 금지
- 문서 끝에 아래 배너 추가:
  - "## VERIFY: 삽입 앵커 미검출"
  - 누락 앵커 목록(ANCHOR_A~F)
  - 요청 데이터 ≤3 (가장 영향 큰 입력만)
