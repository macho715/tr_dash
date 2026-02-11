# REAL TIMELINE CSV – level1, level2, activity_id, activity_name

**Date:** 2026-02-10  
**Source:** `agi tr planned schedule.json` (AGI TR 1–6 Transportation Master Gantt – Option C)

## 작업 요약 (tr-planner delegation 완료)

- **소스:** `REAL TIMELINE/agi tr planned schedule.json`  
  - `activities[]`에서 `level1`, `level2`, `activity_id`, `activity_name` 추출
- **대상 파일 (각각 동일 내용):**
  1. `ADNOC TIMELINE.csv`
  2. `BUSHHRA VODR.csv`
  3. `WA GROUP TIMELINE.csv`

## CSV 구조

| 컬럼         | 설명                          |
|-------------|-------------------------------|
| level1      | MOBILIZATION / DEMOBILIZATION / OPERATIONAL |
| level2      | SPMT, MARINE, AGI TR Unit 1~7 등 (null 가능) |
| activity_id | A1000, A1010, … (null이면 요약 행) |
| activity_name | 활동명 (요약 행은 level2 또는 level1과 동일) |

- **행 수:** 헤더 1행 + 139행 (JSON `activities`와 동일)
- **인코딩:** UTF-8
- **null:** 빈 셀로 저장

## 재생성 방법

```bash
node "REAL TIMELINE/scripts/json-to-csv.js"
```

(프로젝트 루트에서 실행)

## 참고

- 기존 3개 CSV는 NASCA DRM 등 비텍스트 형식으로 판단되어, 동일 이름의 **평문 CSV**로 교체됨.
- SSOT는 `option_c.json`/`option_c_v0.8.0.json`; 본 CSV는 REAL TIMELINE 폴더 내 참조용 스냅샷.

---

## adnoc.csv / bushra.csv / wa group.csv (4컬럼 보강)

- **소스:** 동일 `agi tr planned schedule.json`
- **작업:** 각 행의 날짜(Date 또는 START DATE/END DATE)로 planned 구간 매칭 후 **level1, level2, activity_id, activity_name** 4컬럼 추가
- **스크립트:** `REAL TIMELINE/scripts/enrich-csv-with-plan.js`  
  - 이미 4컬럼이 있는 파일에 다시 실행하면 컬럼이 중복되므로, 한 번만 실행할 것.
- **adnoc.csv:** 15행 (SN 1–14), **bushra.csv:** 33행, **wa group.csv:** 185행
