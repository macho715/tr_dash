# NL Command Interface Status (Current)

**Updated:** 2026-02-12  
**State:** Active, confirm-first execution, Ollama(EXAONE/Llama) primary

---

## What is completed

1. Natural language parsing endpoint
- Route: `app/api/nl-command/route.ts`
- Intents:
  - `shift_activities`
  - `prepare_bulk`
  - `explain_conflict`
  - `set_mode`
  - `apply_preview`
  - `unclear`

2. Provider strategy
- Primary: Ollama (local)
- Fallback: OpenAI (if valid key exists)
- Key behavior:
  - invalid/missing OpenAI key does not block Ollama path
  - provider failure returns clear 503/401/429/500 mappings

3. Review-first UX in command palette
- File: `components/ops/UnifiedCommandPalette.tsx`
- Behavior:
  - AI result opens `AIExplainDialog` first
  - no direct execution from parser response
  - only `Confirm & Continue` executes intent

4. Policy/safety guard integration
- Apply blocked outside live mode
- `apply_preview` only allowed for `preview_ref="current"` with existing preview
- Invalid `set_mode` rejected
- unclear/informational intents remain non-executable

5. Ambiguity handling upgraded
- File: `components/ops/dialogs/AIExplainDialog.tsx`
- Ambiguity options are clickable
- Selected option triggers clarification re-query to `/api/nl-command`

6. Smoke coverage expanded
- File: `scripts/smoke-nl-intent.ts`
- 12 cases total:
  - 10 KO/EN base intent cases
  - 2 ambiguity + clarification re-query cases

---

## Latest verification snapshot

- `pnpm test:run components/ops/__tests__/AIExplainDialog.test.tsx components/ops/__tests__/UnifiedCommandPalette.ai-mode.test.tsx` -> PASS
- `pnpm test:run app/api/nl-command/__tests__/route.test.ts` -> PASS
- `pnpm smoke:nl-intent` -> `passed=12 failed=0 total=12`

---

## Runtime defaults (recommended local)

```bash
AI_PROVIDER=ollama
OLLAMA_MODEL=exaone3.5:7.8b
# 또는 Llama 3.1 한국어: OLLAMA_MODEL=kwangsuklee/SEOKDONG-llama3.1_korean_Q5_K_M
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

---

## Open follow-up items

1. Palette provider text currently shows GPT-4 label; update to dynamic provider label.
2. Add persistent telemetry for:
- intent success/fail counts
- confirm/cancel ratio
- policy block frequency

