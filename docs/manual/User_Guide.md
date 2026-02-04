---
doc_id: user-guide
refs: [../README.md, ../LAYOUT.md, ../patch.md]
updated: 2026-02-03
---

# 사용자 매뉴얼 (User Guide)

**대상**: 최종 사용자(운영자·승인자).  
**참조**: [README 주요 기능](../README.md), [LAYOUT.md](../LAYOUT.md), [patch.md](../patch.md).

---

## 1. 빠른 시작

- **설치**: Node 20.x, `pnpm install` (또는 `npm install`).
- **실행**: `pnpm run dev` → 브라우저 [http://localhost:3000](http://localhost:3000).

---

## 2. 화면 구성 (2열)

- **좌측**: Map(위치) + Detail(활동 상세·상태·Plan vs Actual·Collision).
- **우측**: Timeline/Gantt(7개 항차 일정).  
상단: Global Control Bar(Trip/TR, View, Date Cursor, View Mode). StoryHeader: Location/Schedule/Verification.

---

## 3. 주요 작업

- **Trip/TR 선택**: Control Bar에서 Trip·TR 선택. 7개 TR 전부 표시(API 실패 시 voyages 기반 fallback).
- **날짜 변경**: Gantt 활동 바 호버 → "날짜 변경" → Calendar 또는 YYYY-MM-DD 입력(UTC 기준). Preview 확인 후 Apply.
- **View 버튼**: 클릭 시 "Detailed Voyage Schedule" 섹션으로 스크롤.
- **History/Evidence**: HistoryEvidencePanel에서 이벤트 추가, Evidence 링크 추가(localStorage).
- **Compare**: View Mode에서 Compare 선택 → Baseline vs Live delta, CompareDiffPanel에서 Baseline snapshot / Compare as-of 확인.
- **Trip Report**: Trip Closeout 탭에서 MD/JSON 내보내기. Readiness: Ready/Not Ready, 마일스톤·증빙·블로커 확인.

---

## 4. 트러블슈팅

- **날짜가 Gantt와 안 맞음**: Selected Date는 UTC(YYYY-MM-DD). DatePicker 라벨·tooltip 확인.
- **TR이 0개 보임**: API 실패 시 자동으로 voyages 기반 7개 fallback. 새로고침 또는 네트워크 확인.
- **View 버튼 무반응**: "Detailed Voyage Schedule" 섹션(id="schedule")이 있는지 확인.
