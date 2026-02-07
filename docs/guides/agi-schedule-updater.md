# AGI Schedule Updater (TR Dashboard)

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

## Unified Command Palette Quick Start
- Open: `Ctrl/⌘+K`
- Search: activity ID/이름/anchor/tr/voyage를 fuzzy 검색
- Help: 빈 입력 상태에서 `?` 입력 또는 `/help`
- Autocomplete: slash command 입력 중 `Tab`

## Slash Command Examples
- `/shift pivot=2026-02-01 delta=+3 includeLocked=false previewOnly=true`
- `/shift pivot=2026-02-01 new=2026-02-05`
- `/bulk includeLocked=false previewOnly=true` 후 Bulk Dialog 입력
- `/conflicts`
- `/export mode=patch`
- `/undo`, `/redo`, `/reset`

## Natural Language Examples
- `move loadout forward 3 days`
- `delay voyage 2 by 2`
- `advance all TR-3 by 2 days`

## Bulk Anchor Input Format
```text
ACT-001 2026-02-15
ACT-002=2026-02-18
# comment
```

## Accessibility Notes
- 모든 주요 dialog는 `role="dialog"` 및 `aria-modal="true"`를 사용
- dialog는 `aria-labelledby`/`aria-describedby`로 제목/설명을 연결
- Shift/Bulk 입력 오류는 `role="alert"`와 `aria-invalid`로 노출

## Safety And Mode Rules
- 기본 흐름은 `Preview -> Apply`
- Apply/Undo/Redo는 live mode에서만 허용
- Approval/History/Compare는 읽기 중심 모드로 적용 동작을 제한
- Patch export는 변경 activity만 포함
