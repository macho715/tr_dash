# WORK LOG - 2026-02-10 (AI Upgrade)

## Scope

- Unified Command Palette AI 기능 고도화
- 로컬 Ollama(EXAONE) 우선 정책 반영
- ambiguity 재질의 흐름 확장
- intent 스모크 점검 범위 확장

## Implemented

1. API 확장 (`app/api/nl-command/route.ts`)
- `clarification` 입력 지원
- intent 응답 표준화 유지:
  - `intent`, `explanation`, `parameters`, `ambiguity`
  - `confidence`, `risk_level`, `requires_confirmation`
- provider order:
  - `AI_PROVIDER=ollama` 시 Ollama 우선, OpenAI fallback
- 정책 가드:
  - `apply_preview`는 `preview_ref="current"`만 허용
  - `set_mode` 허용값 강제

2. UI 실행 흐름 개선 (`components/ops/UnifiedCommandPalette.tsx`)
- `runAiCommand(query, clarification?)` 공통 함수 도입
- AI 결과는 즉시 실행하지 않고 리뷰 다이얼로그로 전달
- ambiguity 옵션 선택 시 재질의 실행

3. 설명 다이얼로그 개선 (`components/ops/dialogs/AIExplainDialog.tsx`)
- ambiguity options 버튼 렌더링
- `onSelectAmbiguity` 콜백 추가

4. 테스트 보강
- `components/ops/__tests__/AIExplainDialog.test.tsx`
  - ambiguity 옵션 클릭 콜백 검증 추가
- `components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx`
  - ambiguity -> clarification 재호출 검증 추가
- `app/api/nl-command/__tests__/route.test.ts`
  - 기존 정책/파싱/폴백 검증 유지

5. 스모크 스크립트 확장 (`scripts/smoke-nl-intent.ts`)
- KO/EN 10개 기본 케이스 유지
- ambiguity + clarification 케이스 2개 추가 (총 12개)
- clarification 케이스는 2차 호출까지 검증

## Validation

- `pnpm test:run components/ops/__tests__/AIExplainDialog.test.tsx components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx` 통과
- `pnpm test:run app/api/nl-command/__tests__/route.test.ts` 통과
- `pnpm smoke:nl-intent` 결과:
  - `passed=12 failed=0 total=12`
  - provider/model: `ollama / exaone3.5:7.8b`

## Notes

- 모든 AI 실행은 Confirm 이후에만 진행되며 자동 Apply는 없음.
- Approval/History 등 read-only 모드 제한을 우회하지 않음.
