# NL Command Interface Implementation Report (Updated)

**Date:** 2026-02-10  
**Scope:** Unified Command Palette AI upgrade (Phase 1)  
**Status:** Implemented and verified

---

## 1) Summary

Natural language command flow is now standardized around:

- Provider-first policy: `ollama` (local EXAONE) as primary, OpenAI as fallback
- Intent contract expansion to 6 intents:
  - `shift_activities`
  - `prepare_bulk`
  - `explain_conflict`
  - `set_mode`
  - `apply_preview`
  - `unclear`
- Confirm-first execution: every AI result is reviewed in `AIExplainDialog` before action
- Policy guard enforcement in both API and UI (Preview->Apply separation, mode restrictions)
- Ambiguity re-query path (`clarification`) added and wired end-to-end

---

## 2) Implemented Components

### API

File: `app/api/nl-command/route.ts`

- Accepts request body:
  - `query`
  - `activities`
  - `clarification` (optional)
- Normalizes and returns:
  - `intent`, `explanation`, `parameters`, `ambiguity`
  - `affected_activities`, `affected_count`
  - `confidence`, `risk_level`
  - `requires_confirmation` (forced `true`)
- Provider order:
  - If `AI_PROVIDER=ollama`: `ollama -> openai(if valid key)`
  - Otherwise: `openai(if valid key) -> ollama`
- Added robust JSON extraction from fenced/partial model responses.
- Added policy-level 422 guards:
  - `apply_preview` requires `parameters.preview_ref === "current"`
  - `set_mode` must be one of `live|history|approval|compare`

### UI: Unified Command Palette

File: `components/ops/UnifiedCommandPalette.tsx`

- AI result is never auto-executed.
- Flow:
  1. Query submit (`runAiCommand`)
  2. `pendingAiAction` set
  3. `AIExplainDialog` opens
  4. User must click `Confirm & Continue`
  5. `executeAiIntent` dispatches to target dialog/action
- Intent routing:
  - `shift_activities` -> compute anchors -> open `BulkEditDialog`
  - `prepare_bulk` -> validate anchors -> open `BulkEditDialog`
  - `explain_conflict` -> open `ConflictsDialog`
  - `set_mode` -> mode switch with read-only notice
  - `apply_preview` -> live mode + preview existence required
- Ambiguity handling:
  - Option button click triggers re-query with `clarification`

### UI: AI Explain Dialog

File: `components/ops/dialogs/AIExplainDialog.tsx`

- Shows:
  - intent badge
  - confidence
  - risk level
  - action summary
  - policy block reason
- Ambiguity options rendered as actionable buttons
- Added callback:
  - `onSelectAmbiguity(option: string)`

### Smoke Validation Script

File: `scripts/smoke-nl-intent.ts`

- 12-case smoke run:
  - 10 base KO/EN intent checks
  - 2 ambiguity + clarification re-query checks
- Uses local `POST` route invocation via `NextRequest`
- Defaults:
  - `AI_PROVIDER=ollama`
  - `OLLAMA_MODEL=exaone3.5:7.8b`

---

## 3) Tests and Verification

### Automated Tests

- `app/api/nl-command/__tests__/route.test.ts`
  - JSON parsing, policy guard, fallback behavior
- `components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx`
  - review-first flow
  - policy block display
  - ambiguity option -> clarification re-query
- `components/ops/__tests__/AIExplainDialog.test.tsx`
  - confidence/risk rendering
  - block/disabled confirm
  - ambiguity option callback

### Smoke Run (Local)

Command:

```bash
pnpm smoke:nl-intent
```

Latest result:

- `passed=12 failed=0 total=12`
- Provider/model:
  - `provider=ollama`
  - `model=exaone3.5:7.8b`

---

## 4) Current Behavior Contract

- All AI actions require explicit user confirmation.
- `Approval` / non-live restrictions are enforced before execution.
- `apply_preview` is blocked unless:
  - live mode
  - preview exists
  - `preview_ref="current"` policy satisfied
- Ambiguous requests can be resolved without leaving the dialog via option-based re-query.

---

## 5) Known Gaps

- UI label in palette still says `Powered by GPT-4`; provider label should be aligned with runtime provider (`ollama/openai`).
- Full production telemetry (intent success ratio, confirm/cancel ratio, block frequency) is not yet persisted server-side.

---

## 6) Updated Files (Core)

- `app/api/nl-command/route.ts`
- `app/api/nl-command/__tests__/route.test.ts`
- `components/ops/UnifiedCommandPalette.tsx`
- `components/ops/dialogs/AIExplainDialog.tsx`
- `components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx`
- `components/ops/__tests__/AIExplainDialog.test.tsx`
- `scripts/smoke-nl-intent.ts`

---

## 7) Operational Notes

- Recommended local env for current setup:
  - `AI_PROVIDER=ollama`
  - `OLLAMA_MODEL=exaone3.5:7.8b`
  - `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- OpenAI remains fallback-only path when valid key is present.

