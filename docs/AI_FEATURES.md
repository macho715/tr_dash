# AI 기능 상세 문서

**문서 목적**: TR Dashboard의 AI 기능만 별도로 정리한 운영/개발 기준 문서  
**기준일**: 2026-02-10  
**적용 범위**: Unified Command Palette + `/api/nl-command` + AI 리뷰/실행 흐름

---

## 1. 기능 개요

현재 AI 기능은 자연어 명령을 스케줄 작업 의도(intent)로 해석하고, **사용자 확인 후에만 실행**하도록 설계되어 있습니다.

- 진입 UI: `components/ops/UnifiedCommandPalette.tsx`
- 파싱 API: `app/api/nl-command/route.ts`
- 확인 다이얼로그: `components/ops/dialogs/AIExplainDialog.tsx`
- 타입 SSOT: `lib/ops/ai-intent.ts`

핵심 원칙:

1. AI는 실행 엔진이 아니라 **의도 파서 + 제안자** 역할만 수행
2. 결과는 반드시 **Review(확인)** 단계를 거친 뒤 실행
3. 모드/권한/정책 위반은 API + UI에서 이중 차단

---

## 2. 지원 Intent

지원 Intent 목록:

- `shift_activities`
- `prepare_bulk`
- `explain_conflict`
- `set_mode`
- `apply_preview`
- `unclear`

공통 응답 필드:

- `intent`
- `explanation`
- `parameters`
- `ambiguity`
- `affected_activities`
- `affected_count`
- `confidence` (0~1)
- `risk_level` (`low|medium|high`)
- `requires_confirmation` (항상 `true`)

---

## 3. Provider 전략

기본 정책은 **로컬 Ollama 우선**입니다.

- `AI_PROVIDER=ollama`일 때: `ollama -> openai(유효 키가 있을 때만)`
- 그 외: `openai(유효 키일 때만) -> ollama`

관련 환경 변수:

- `AI_PROVIDER=ollama`
- `OLLAMA_MODEL=exaone3.5:7.8b` (1차 파싱)
- `OLLAMA_REVIEW_MODEL` (2차 리뷰, Dual-pass 시)
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OPENAI_API_KEY` (fallback용)
- `OPENAI_MODEL` (선택)

참고:

- OpenAI 키가 없거나 짧은 플레이스홀더 값이면 OpenAI 경로는 자동 제외
- OpenAI가 실패해도 Ollama 경로가 살아 있으면 전체 기능은 계속 동작

---

## 3.1 Dual-pass Intent Guard (2026-02-11)

2모델 기반 검증:

1. **1차 파싱**: `OLLAMA_MODEL`로 intent 파싱
2. **2차 리뷰**: `OLLAMA_REVIEW_MODEL`로 검증. 엄격 intent(apply_preview, set_mode, high-risk)에서 모호 판정 시 `unclear` 전환
3. **일반 intent** (shift/prepare): 실행 의도 유지, `SECONDARY_REVIEW_NOTE` 경고만 추가 (fail-soft)

---

## 3.2 What-if 추천 · Governance 체크

- **What-if**: `shift_activities` 결과에 `recommendations.what_if_shift_days` 자동 생성
- **Governance 체크리스트**: `governance_checks` 필드 — CONFIRM_REQUIRED, APPLY_PREVIEW_REF, MODE_ALLOWED, HIGH_RISK_CONFIRM 등
- **AIExplainDialog**: 모델 trace, what-if 제안, governance 체크 UI 표시

---

## 4. API 계약 (`/api/nl-command`)

파일: `app/api/nl-command/route.ts`

요청 본문:

```json
{
  "query": "Move Voyage 3 by 2 days",
  "activities": [],
  "clarification": "Voyage 3"
}
```

- `clarification`은 선택이며 ambiguity 재질의 시 사용

응답/오류 정책:

- `200`: 정상 intent 파싱
- `400`: 필수 입력 누락 (`query`/`activities`)
- `422`: 정책 위반 (`apply_preview.preview_ref`, `set_mode` 값)
- `429`: provider rate limit
- `503`: provider 전체 실패
- `500`: JSON 파싱 실패/응답 구조 오류

정책 강제:

1. `apply_preview`는 `parameters.preview_ref === "current"`만 허용
2. `set_mode`는 `live|history|approval|compare`만 허용
3. `requires_confirmation`은 서버에서 강제 `true`

---

## 5. UI 실행 흐름 (Confirm-First)

파일: `components/ops/UnifiedCommandPalette.tsx`

실행 단계:

1. 사용자가 AI 모드에서 자연어 입력 후 Enter
2. `runAiCommand(query, clarification?)` 호출
3. `/api/nl-command` 응답을 `pendingAiAction`에 저장
4. `AIExplainDialog` 열림 (즉시 실행 안 함)
5. 사용자가 `Confirm & Continue` 클릭 시 `executeAiIntent()` 실행

Intent별 실행 매핑:

- `shift_activities`: filter/action 기반 anchor 생성 -> `BulkEditDialog`
- `prepare_bulk`: anchors 검증 -> `BulkEditDialog`
- `explain_conflict`: `ConflictsDialog` 열기
- `set_mode`: 모드 전환 + read-only 안내 메시지
- `apply_preview`: live 모드 + preview 존재 시에만 적용
- `unclear`: 직접 실행 없음

---

## 6. Ambiguity 재질의 흐름

파일:

- `components/ops/dialogs/AIExplainDialog.tsx`
- `components/ops/UnifiedCommandPalette.tsx`
- `app/api/nl-command/route.ts`

동작:

1. AI가 `intent="unclear"` + `ambiguity.question/options` 반환
2. 다이얼로그에서 옵션 버튼 노출
3. 옵션 클릭 시 `onSelectAmbiguity(option)` 호출
4. `runAiCommand(query, option)`으로 동일 질의 + `clarification` 재호출
5. 재파싱 결과를 다시 리뷰 후 Confirm 실행

---

## 7. 권한/모드 가드

UI 가드 (`getAiExecutionGuard`, `executeAiIntent`)에서 차단:

1. live 모드가 아니면 `apply_preview` 차단
2. preview가 없으면 `apply_preview` 차단
3. 불완전한 `set_mode` 파라미터 차단
4. `unclear`/정보성 결과는 실행 비활성화

의미:

- AI가 공격적/모호한 제안을 해도 바로 반영되지 않음
- 사용자 승인 + 정책 검증을 모두 통과해야 실제 변경

---

## 8. 테스트 현황

핵심 테스트 파일:

- `app/api/nl-command/__tests__/route.test.ts`
- `components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx`
- `components/ops/__tests__/AIExplainDialog.test.tsx`
- `scripts/smoke-nl-intent.ts`

검증 항목:

1. API JSON 파싱/구조 정규화
2. provider fallback 경로
3. 정책 위반 422 반환
4. 리뷰 후 실행(Confirm 전 상태 변화 없음)
5. ambiguity 옵션 클릭 -> clarification 재호출
6. 한/영 명령 스모크 + ambiguity 케이스

---

## 9. 스모크 테스트 실행

명령:

```bash
pnpm run smoke:nl-intent
```

현재 시나리오:

- KO/EN 기본 10케이스 intent 확인
- ambiguity + clarification 2케이스 확인
- 총 12케이스

---

## 10. 알려진 후속 작업

1. Palette 우측 텍스트 `Powered by GPT-4`를 런타임 provider 표시로 교체 필요
2. intent 성공률/Confirm 비율/정책 차단률 서버 영속 로깅 미구현
3. multi-turn 대화형 질의(연속 컨텍스트 유지)는 미구현

---

## 11. 관련 문서

- `docs/WORK_LOG_20260211.md` (2모델 AI, FilterDrawer 포함)
- `docs/WORK_LOG_20260210_AI_UPGRADE.md`
- `docs/NL_COMMAND_INTERFACE_IMPLEMENTATION_REPORT.md`
- `docs/NL_COMMAND_INTERFACE_COMPLETE.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/LAYOUT.md`
