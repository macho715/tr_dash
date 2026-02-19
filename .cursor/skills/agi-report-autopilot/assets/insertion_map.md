# Insertion Map (Multi-Anchor + Fallback, Locked)
#
# Anchor Resolution Order (strict):
# 1) Exact match (case-sensitive, full line)
# 2) Normalized match (trim, collapse spaces, normalize dot "·" and unicode)
# 3) Regex match (heading patterns)
# 4) Fallback insertion (end of doc) WITH VERIFY banner
#
# NOTE: headings may vary: numbering, dot symbols, KR/EN variants.

## ANCHOR_A (SSOT end)
# Primary insertion: end of SSOT section.
ANCHOR_A:
  exact:
    - "## 1. SSOT 및 계산 규칙"
    - "# 1. SSOT 및 계산 규칙"
  normalized:
    - "## 1. SSOT 및 계산 규칙"
    - "## 1 SSOT 및 계산 규칙"
  regex:
    - "^##\\s*1\\.?\\s*SSOT\\s*및\\s*계산\\s*규칙\\s*$"
    - "^#+\\s*1\\.?\\s*SSOT\\s*및\\s*계산\\s*규칙\\s*$"
  insert_rule: "append_to_section_end"

## ANCHOR_B (TR1~TR3 actuals end)
ANCHOR_B:
  exact:
    - "## 2. 1·2·3호기 실적"
    - "## 2. 1·2·3 호기 실적"
    - "## 2. TR1~TR3 실적"
  normalized:
    - "## 2. 1·2·3호기 실적"
    - "## 2 TR1~TR3 실적"
  regex:
    - "^##\\s*2\\.?\\s*(1·2·3\\s*호기\\s*실적|1·2·3호기\\s*실적|TR1\\s*~\\s*TR3\\s*실적)\\s*$"
  insert_rule: "append_to_section_end"

## ANCHOR_C (RCA section start or end)
ANCHOR_C:
  exact:
    - "## 3. 지연 원인 분석"
    - "## 3. 지연 원인"
  normalized:
    - "## 3. 지연 원인 분석"
  regex:
    - "^##\\s*3\\.?\\s*지연\\s*원인(\\s*분석)?\\s*$"
  insert_rule: "append_to_section_end"

## ANCHOR_D (Forensic schedule section)
ANCHOR_D:
  exact:
    - "## 5. Original vs Re-baseline"
    - "## 5. Original vs Rebaseline"
    - "## 5. Original vs Re-baseline(변경)"
  normalized:
    - "## 5. Original vs Re-baseline"
  regex:
    - "^##\\s*5\\.?\\s*Original\\s*vs\\s*Re-?baseline.*$"
  insert_rule: "append_to_section_end"

## ANCHOR_E (Evidence/References section)
ANCHOR_E:
  exact:
    - "## 6. Evidence·참고"
    - "## 6. Evidence/참고"
    - "## 6. Evidence / 참고"
    - "## 6. Evidence"
    - "## 6. 근거·참고"
  normalized:
    - "## 6. Evidence·참고"
    - "## 6 Evidence 참고"
  regex:
    - "^##\\s*6\\.?\\s*(Evidence(\\s*/\\s*참고|\\s*·\\s*참고)?|근거\\s*·\\s*참고|근거\\s*/\\s*참고)\\s*$"
  insert_rule: "append_to_section_end"

## ANCHOR_F (Contingency section; may be under 6.*)
ANCHOR_F:
  exact:
    - "## 6. Contingency 산정"
    - "### 6. Contingency 산정"
    - "### Contingency 산정"
    - "## Contingency 산정"
  normalized:
    - "## 6. Contingency 산정"
  regex:
    - "^#{2,3}\\s*(6\\.?\\s*)?Contingency\\s*산정\\s*$"
    - "^#{2,3}\\s*(6\\.?\\s*)?컨틴전시\\s*산정\\s*$"
  insert_rule: "append_to_section_end"

## Fallback (only if ALL anchors fail)
FALLBACK:
  banner_title: "VERIFY: 삽입 앵커 미검출"
  banner_level: "##"
  insert_rule: "append_to_document_end"
