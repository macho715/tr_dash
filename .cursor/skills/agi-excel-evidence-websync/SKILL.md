---
name: agi-excel-evidence-websync
description: METAR/NCM/표준문서 링크를 Evidence Bundle로 수집해 엑셀 10_EVIDENCE_LOG/12_GATE_EVAL에 연결. (web evidence, METAR, NCM, source)
---

# agi-excel-evidence-websync

## When to Use
- "web evidence", "METAR", "NCM", "source" — 웹근거를 Evidence Bundle로 수집해 엑셀 시트에 연동할 때

## Inputs
- xlsx: 대상 엑셀 파일(10_EVIDENCE_LOG 시트 필수)
- bundle_dir (기본): evidence_bundle
- 조회 기간: TR2/TR3 윈도우

## Steps
1) Web Search(공식/원문 우선)로 METAR/NCM/AACE/SCL 등 수집.
2) evidence_bundle/에 링크·PDF·캡처 저장.
3) 10_EVIDENCE_LOG에 EvidenceID 행 추가, 12_GATE_EVAL에 연결.

## Execution
```bash
python .cursor/skills/agi-excel-report-v3/scripts/websync.py --xlsx <path> [--bundle_dir evidence_bundle]
```
- Agent 런타임에서는 web_search 도구로 실제 수집 후 스크립트로 엑셀 갱신.

## Outputs
- evidence_bundle/ (00_index.md + 수집 파일)
- 10_EVIDENCE_LOG 시트 갱신
