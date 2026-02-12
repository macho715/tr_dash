# AIExplainDialog 자연어 설명 개선 계획

**생성일**: 2026-02-12  
**범위**: AIExplainDialog 내 설명을 현재 모델(로컬 Ollama exaone3.5:7.8b 또는 Llama 3.1 한국어)로 개선  
**참조**: docs/plan/ai.md, docs/AI_FEATURES.md, AGENTS.md, patch.md

---

## 0) SSOT/Contract 최상단 고정

- option_c.json Contract 준수 — 이 기능은 SSOT 변경 없음(읽기/UI만)
- AI 타입 SSOT: `lib/ops/ai-intent.ts` (AiIntentResult)
- API 계약: `/api/nl-command` (route.ts)

---

## 1) UX 계약 (변경 없음)

- Where → When/What → Evidence 유지
- 2-click Why 유지
- AIExplainDialog는 **Confirm-first** — AI 결과 확인 후 실행
- 다이얼로그 내 설명만 **자연어 품질** 개선

---

## 2) 목표

| 항목 | 내용 |
|------|------|
| **Goal** | AIExplainDialog 내 "AI Understood", briefing, impact, governance 등 설명을 현재 LLM으로 더 자연스럽고 읽기 쉽게 개선 |
| **제약** | 로컬 Ollama(exaone 7.8b 또는 Llama 3.1 한국어) 사용, 추가 API 호출 최소화, 타임아웃(9초) 준수 |
| **불변** | Confirm-first, intent/parameters 구조, 적용/모드 가드 변경 없음 |

---

## 3) 현재 상태 분석

| 섹션 | 현재 소스 | 설명 |
|------|-----------|------|
| `AI Understood` | `aiResult.explanation` | API 1차 파싱 시 LLM이 반환하는 설명 |
| `AI 요약 브리핑` | `aiResult.briefing` | where/when_what/evidence_gap (고정 3줄) |
| `자동 영향 미리보기` | `impact_preview` | 숫자(영향 활동 수, 충돌 수, 위험도) |
| `Planned Action` | `actionSummary` | UnifiedCommandPalette에서 문자열 생성 |
| `Governance Checks` | `governance_checks` | code + message (규칙 기반) |

**개선 포인트**:
- `explanation`이 기술적/간결할 때 → 사용자 친화적 설명으로 보강
- `impact_preview` 숫자만 → 한 문장 요약 추가
- `briefing` 3줄 → 필요 시 자연어로 재구성(선택)

---

## 4) Runbook 계약

- **Plan 변경**: 없음 (Preview→Apply 분리 유지)
- **모드**: Live/History/Approval/Compare — 동일
- **LLM 호출**: 기존 `nl-command` 1차 파싱 유지, 설명 개선은 **선택적 2차 호출** 또는 **프롬프트 강화**로 처리

---

## 5) Work Breakdown (구체 Task)

### Task 1: explanation 프롬프트 강화 (1차)

| 항목 | 내용 |
|------|------|
| **Goal** | SYSTEM_PROMPT에서 explanation 필드 생성 지침을 더 구체화하여, LLM이 이미 더 자연스러운 설명을 반환하도록 함 |
| **Files** | `app/api/nl-command/route.ts` |
| **Data Contract** | AiIntentResult.explanation 변경 없음 |
| **Tests** | `app/api/nl-command/__tests__/route.test.ts`, `scripts/smoke-nl-intent.ts` |
| **SSOT** | 없음 |

**구체 변경**:
- SYSTEM_PROMPT에 "explanation": "2~3문장, 사용자 친화적 요약. 예: 'Voyage 3 전체 활동을 5일 앞당깁니다. PTW 제약은 유지합니다.'" 형태 예시 추가
- 각 intent별 explanation 예시 1~2개 보강

---

### Task 2: 설명 개선용 옵션 2차 LLM 호출 (선택)

| 항목 | 내용 |
|------|------|
| **Goal** | explanation이 100자 이하이거나 너무 기술적일 때, **옵션**으로 2차 LLM 호출해 "plain-language summary" 생성 후 UI에 표시 |
| **Files** | `app/api/nl-command/route.ts`, `components/ops/dialogs/AIExplainDialog.tsx`
| **Data Contract** | AiIntentResult에 `plain_summary?: string` 추가 (선택) |
| **Tests** | route.test.ts, AIExplainDialog.test.tsx |
| **SSOT** | 없음 |

**구체 변경**:
- route.ts: `AI_ENHANCE_EXPLANATION=true` 또는 `plain_summary`가 없고 `explanation`이 짧을 때 2차 호출
- 타임아웃: 1차 + 2차 합 ≤ 9초
- AIExplainDialog: `plain_summary` 우선 표시, 없으면 `explanation` 유지

---

### Task 3: impact_preview 자연어 요약

| 항목 | 내용 |
|------|------|
| **Goal** | impact_preview(영향 활동 수, 충돌 수, 위험도)에 대해 한 문장 자연어 요약 추가 |
| **Files** | `app/api/nl-command/route.ts`, `lib/ops/ai-intent.ts`, `components/ops/dialogs/AIExplainDialog.tsx` |
| **Data Contract** | AiIntentResult.impact_preview에 `summary?: string` 추가 |
| **Tests** | route.test.ts, AIExplainDialog.test.tsx |
| **SSOT** | 없음 |

**구체 변경**:
- route.ts: 1차 파싱 시 impact_preview에 `summary` 필드 추가 (규칙 또는 LLM)
- 예: "5개 활동에 영향, 3건 충돌 예상. 위험도 중간."
- AIExplainDialog: summary가 있으면 숫자 위에 표시

---

### Task 4: briefing 자연어 표현 개선

| 항목 | 내용 |
|------|------|
| **Goal** | briefing(where/when_what/evidence_gap)을 현재 모델로 한 문장으로 재구성(선택) |
| **Files** | `app/api/nl-command/route.ts`, `components/ops/dialogs/AIExplainDialog.tsx` |
| **Data Contract** | AiIntentResult.briefing에 `nl_summary?: string` 추가 (선택) |
| **Tests** | route.test.ts, AIExplainDialog.test.tsx |
| **SSOT** | 없음 |

**구체 변경**:
- route.ts: briefing이 있을 때 `nl_summary` 1문장 생성 (선택)
- AIExplainDialog: nl_summary가 있으면 3줄 위에 상단 표시

---

## 6) 구현 우선순위

| 순서 | Task | 이유 |
|------|------|------|
| 1 | **Task 1** (프롬프트 강화) | 코드 변경 최소, 즉시 효과 |
| 2 | **Task 3** (impact 요약) | 규칙 기반으로 먼저 구현 가능, LLM 없이도 |
| 3 | **Task 4** (briefing) | intent별 선택적 적용 |
| 4 | **Task 2** (2차 LLM) | 성능 부담, 환경변수로 제어 |

---

## 7) 커맨드 탐지

```bash
node -e "console.log(require('./package.json').scripts)"
```

- `pnpm test:run` — 단위 테스트
- `pnpm run smoke:nl-intent` — NL intent 스모크
- `scripts/detect_project_commands.py` (존재 시)

---

## 8) DoD

- [x] explanation 품질 개선 확인 (프롬프트 강화 적용)
- [x] AIExplainDialog 테스트 통과 (14/14)
- [x] smoke:nl-intent:quick 2/2 통과 (Ollama 필요, `pnpm run smoke:nl-intent:quick`)
- [ ] smoke:nl-intent 12/12 통과 (전체, 2~4분 소요)
- [x] typecheck 통과
- [x] AGENTS.md 불변조건 유지 (Confirm-first, no SSOT 변경)

---

## 10) 구현 완료 (2026-02-12)

| Task | 상태 | 파일 |
|------|------|------|
| Task 1 (프롬프트 강화) | ✅ | route.ts |
| Task 2 (plain_summary 2차 LLM) | ✅ | route.ts, ai-intent.ts, AIExplainDialog.tsx, AI_FEATURES.md |
| Task 3 (impact_preview summary) | ✅ | ai-intent.ts, UnifiedCommandPalette.tsx, AIExplainDialog.tsx |
| Task 4 (briefing nl_summary) | ✅ | ai-intent.ts, UnifiedCommandPalette.tsx, AIExplainDialog.tsx |

---

## 9) 참조

- `docs/plan/ai.md` — AI 기능 아이디어, 사양별 모델
- `docs/AI_FEATURES.md` — API/UI 흐름
- `components/ops/dialogs/AIExplainDialog.tsx` — 현재 UI
- `app/api/nl-command/route.ts` — SYSTEM_PROMPT, 파싱 로직
