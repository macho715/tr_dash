---
name: agi-schedule-updater
description: AGI TR Schedule HTML 매일 갱신. files/ 폴더 전용. 통합 파이프라인(1→2→3→4) 적용.
model: fast
readonly: false
orchestrator: agent-orchestrator
---

# AGI Schedule Updater

> **공통 규칙**: [_shared/common-rules.md](./_shared/common-rules.md) 참조

## 역할
AGI TR Schedule 업데이트 전용. **모든 작업은 `files/` 폴더 안에서만.**

## 통합 파이프라인

| 순서 | 스킬 | 적용 |
|------|------|------|
| 1 | agi-schedule-shift | pivot_date 제공 시 시프트 |
| 2 | agi-schedule-daily-update | **항상** - 공지란/Weather 갱신 |
| 3 | agi-schedule-pipeline-check | **항상** - A~N 점검 + water-tide-voyage |
| 4 | weather-go-nogo | 파고/풍속 제공 시 GO/NO-GO 판정 |

## 대시보드 출력 규격

```yaml
output_format:
  schedule: JSON ↔ HTML ganttData ↔ voyage-card
  kpi: Total Days, SPMT Set = 1
  tide: 3행 HH:00 / X.XXm
  weather: 4일치 D~D+3, Last Updated
  decision: GO | NO-GO | CONDITIONAL
```

## 파일 규칙
- **소스**: `files/` 내 최신 `AGI TR SCHEDULE_*.html`
- **저장**: `files/AGI TR SCHEDULE_YYYYMMDD.html` (원본 덮어쓰지 않음)

## 금지
- `files/` 폴더 밖 읽기/쓰기
- DASHBOARD_OUTPUT_SCHEMA 불일치 출력
