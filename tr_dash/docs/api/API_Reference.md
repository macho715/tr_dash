---
doc_id: api-reference
refs: [../../app/api/ssot/route.ts]
updated: 2026-02-03
---

# API Reference

**SSOT API** (마스터 스케줄 제공).  
구현: [app/api/ssot/route.ts](../../app/api/ssot/route.ts).

---

## GET /api/ssot

option_c.json을 클라이언트(MapPanel 등)에 제공한다.

**동작**: 다음 경로를 순서대로 확인하여 첫 번째 존재하는 파일을 JSON으로 반환한다.

1. `tests/fixtures/option_c_baseline.json`
2. 루트 `option_c.json`
3. `data/schedule/option_c.json`

**응답**

- **200**: JSON body — option_c 구조 (타입은 `lib/ssot/schedule.ts`, option_c 타입 참조).
- **404**: `{ "error": "SSOT file not found" }`.

**참조**: [docs/SYSTEM_ARCHITECTURE.md](../SYSTEM_ARCHITECTURE.md) 데이터 레이어.
