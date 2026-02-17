판정: **조건부(Go)** — Cursor **서브에이전트 3종 + Skills 6종**으로 “보고서 구조 유지 + 검증가능 결론(Forensic/Weather-Tie/MonteCarlo)”까지 자동 삽입 가능.
근거: 제공된 **AGI_TR_일정_최종보고서.MD**의 SSOT/실적/원인/근거 섹션에, 요청하신 A~F 항목을 **삽입 위치 고정**으로 스킬화하면 반복 실행이 가능함. 
다음행동: 아래 파일들을 **.cursor/**(프로젝트)로 체크인 → 보고서 작업 시 `/agi-delay-decomp` 등으로 호출.

---

## 1) 가정/전제 (필요 최소)

* 보고서 SSOT 파일: `docs/reports/AGI_TR_일정_최종보고서.MD` (또는 동등 MD) 
* “외부 근거”는 **웹 조회를 자동 실행하지 않고**, 사용자가 캡처/텍스트를 제공하면 매칭(증거점수)까지 수행하도록 설계(Injection/Hallucination 방지).

---

## 2) Discovery 질문 (최대 5개)

1. 설치 범위: **Project(.cursor/)** 로 고정? 아니면 **User(~/.cursor/)** 도 필요?
2. 입력 데이터 형태: 이벤트는 **CSV(EventKey/Actual_TS)** 고정? 아니면 Excel 시트도 파싱해야 함?
3. Weather 근거: NCM Al Bahar bulletin은 **PDF/스크린샷/텍스트** 중 무엇으로 주로 받나?
4. Monte Carlo는 보고서에 **P50/P80/P90 + Buffer**까지만 표기? 아니면 히스토그램/누적분포도 필요?
5. “증거점수 가중치(W=3/2/1)”는 요청안 그대로 고정? (공식기관/ AIS/ WhatsApp)

---

## 3) Skill Map (요구 → 단일책임 스킬 분해)

| No | skill name            | 1줄 목적                                               | 트리거 키워드                                        | 필요 리소스                   | 위험/권한           |
| -: | --------------------- | --------------------------------------------------- | ---------------------------------------------- | ------------------------ | --------------- |
|  1 | agi-report-ssot-float | SSOT에 Critical Path/Float/정의 고정 문단 삽입               | SSOT, Critical Path, Float=0, Cycle 7.00d      | assets 템플릿               | 낮음(문서편집)        |
|  2 | agi-delay-decomp      | TR1~TR3 지연을 S1~S5 Segment Δh 표로 분해                  | Delay Decomposition, Segment, Δh               | scripts/segment_delta.py | 중간(데이터 정합)      |
|  3 | agi-rca-pack          | TR2/TR3 5-Why 2개 + Fishbone(6M) 1개 생성               | 5-Why, Fishbone, 6M                            | assets/mermaid           | 낮음(문서생성)        |
|  4 | agi-forensic-schedule | Windows Analysis + Collapsed As-Built(But-For) 표 생성 | Windows Analysis, Collapsed As-Built, Forensic | assets 표 템플릿             | 중간(가정 표기 필요)    |
|  5 | agi-weather-evidence  | METAR/NCM 기반 Gate 판정표 + Evidence Scorecard 생성       | Weather Gate, METAR, NCM, Evidence Score       | scripts/weather_gate.py  | 중간(외부근거 필요)     |
|  6 | agi-montecarlo-buffer | Segment 분포로 TR4~TR7 완료일 P50/P80/P90 + Buffer 산출     | Monte Carlo, P80, Buffer                       | scripts/montecarlo.py    | 중간~높음(모수/분포 가정) |

---

## 4) Subagent Map (Cursor 서브에이전트 3종)

| subagent name      | 1줄 목적                                      | 트리거 문구                        | 권한/모델                           | 오버헤드 |
| ------------------ | ------------------------------------------ | ----------------------------- | ------------------------------- | ---- |
| report-weaver      | 보고서에 “삽입 위치 고정”으로 스킬 결과를 합성/반영             | “보고서에 삽입”, “최종본 반영”           | model: inherit, readonly: false | 중간   |
| evidence-judge     | Evidence Scorecard/근거 충돌/VERIFY 판정(회의적 검증) | “근거 점수”, “VERIFY”, “충돌”       | model: fast, readonly: true     | 낮음   |
| schedule-forensics | Windows/But-For 계산 로직 검토 + 가정/한계 강제 표기     | “Windows Analysis”, “But-For” | model: inherit, readonly: true  | 중간   |

Cursor Subagents 포맷/필드 근거는 Cursor 문서 내용 준수. 

---

## 5) 생성 파일 트리

```text
.cursor/
  agents/
    report-weaver.md
    evidence-judge.md
    schedule-forensics.md
  skills/
    agi-report-ssot-float/
      SKILL.md
      assets/
        ssot_append.md
    agi-delay-decomp/
      SKILL.md
      scripts/
        segment_delta.py
      assets/
        segment_table.md
      examples/
        events.example.csv
    agi-rca-pack/
      SKILL.md
      assets/
        fivewhy_tr2.md
        fivewhy_tr3.md
        fishbone_6m.mmd
    agi-forensic-schedule/
      SKILL.md
      assets/
        windows_table.md
        butfor_table.md
    agi-weather-evidence/
      SKILL.md
      scripts/
        weather_gate.py
      assets/
        evidence_scorecard.md
        metar_abbrev.md
      examples/
        metar.example.txt
        ncm.example.txt
    agi-montecarlo-buffer/
      SKILL.md
      scripts/
        montecarlo.py
      assets/
        mc_output_table.md
      examples/
        segment_stats.example.csv

.claude/
  skills/
    agi-report-ssot-float/SKILL.md
    agi-delay-decomp/SKILL.md
    agi-rca-pack/SKILL.md
    agi-forensic-schedule/SKILL.md
    agi-weather-evidence/SKILL.md
    agi-montecarlo-buffer/SKILL.md

.codex/
  skills/
    agi-report-ssot-float/SKILL.md
    agi-delay-decomp/SKILL.md
    agi-rca-pack/SKILL.md
    agi-forensic-schedule/SKILL.md
    agi-weather-evidence/SKILL.md
    agi-montecarlo-buffer/SKILL.md
```

> `.claude/skills` / `.codex/skills` 쪽 SKILL.md는 **동일 본문**을 복제해 호환만 확보합니다(스크립트 실행은 Cursor 경로 기준).

---

## 6) 파일별 내용 (복사/붙여넣기)

### `.cursor/agents/report-weaver.md`

```md
---
name: report-weaver
description: 보고서(AGI TR Units) 구조를 유지한 채, skills 산출물을 지정 삽입 위치에 합성/반영. “보고서에 삽입/최종본 반영” 요청 시 사용.
model: inherit
readonly: false
is_background: false
---

역할: Report Weaver (편집 오케스트레이터)

원칙
- 기존 보고서 헤더/섹션 번호/표는 유지. 새 내용은 “삽입 위치” 규칙대로만 추가.
- 데이터가 없으면 절대 추정 단정 금지. 해당 항목은 VERIFY로 남기고, 필요한 입력 1~3개만 요청.
- 삽입 시 항상: (1) 추가된 문단/표의 제목, (2) 근거 출처/날짜, (3) 가정/한계를 함께 기록.

작업 절차
1) 대상 파일(기본: docs/reports/AGI_TR_일정_최종보고서.MD)을 읽고, 섹션 존재 여부 확인.
2) 사용자가 요청한 모듈(A~F)을 skills 호출로 생성:
   - A: /agi-report-ssot-float
   - B: /agi-delay-decomp
   - C: /agi-rca-pack
   - D: /agi-forensic-schedule
   - E: /agi-weather-evidence
   - F: /agi-montecarlo-buffer
3) 결과를 “삽입 위치” 규칙에 따라 반영(덮어쓰기 금지: append-only).
4) 변경 요약(추가된 섹션/표 리스트) + VERIFY 항목 리스트 출력.

출력 형식
- “삽입된 내용(마크다운)” + “VERIFY(요청 데이터)” 2블록으로만 반환.
```

### `.cursor/agents/evidence-judge.md`

```md
---
name: evidence-judge
description: Evidence Scorecard(가중치 W=3/2/1), 출처 충돌, VERIFY 판정을 독립 검증. “근거 점수/충돌/VERIFY” 요청 시 사용.
model: fast
readonly: true
is_background: false
---

역할: Evidence Judge (회의적 검증자)

검증 규칙
1) Claim 단위로 분해: (무엇) (언제) (어디) (수치).
2) 출처를 분류하고 점수 부여:
   - W=3: 공식기관(예: METAR 원문, NCM bulletin 원문)
   - W=2: AIS 로그/공식 추적 소스
   - W=1: WhatsApp/현장 구두 보고
3) 충돌 시: 더 높은 W + 시간/장소 적합성으로 판정. 불충분하면 VERIFY.
4) 보고서 문구는 “수치/근거”가 없으면 ‘주장’으로 표기하고 완화(가정:).

출력
- Evidence Scorecard 표 1개
- 충돌/VERIFY 항목 리스트
```

### `.cursor/agents/schedule-forensics.md`

```md
---
name: schedule-forensics
description: Windows Analysis 및 Collapsed As-Built(But-For) 표를 생성/검토하고, 가정/한계/반례를 강제 표기. “Windows/But-For/Forensic” 요청 시 사용.
model: inherit
readonly: true
is_background: false
---

역할: Schedule Forensics (방법론/귀속 강화)

절차
1) As-Planned vs As-Built 비교 문구를 1줄로 고정(방법론 태그).
2) Windows(기간)별 Δh를 계산하고, Top2 원인 + 근거를 매칭.
3) Collapsed As-Built(But-For) 시나리오 2개:
   - TR2: 안개 없었다면 ETD/완료
   - TR3: berth 점유 없었다면 berthing/ETD
4) “가정:”과 “한계:”를 표 하단에 필수로 추가.

출력
- Windows Analysis 표
- But-For 표
- 가정/한계/반례 1개
```

---

### `.cursor/skills/agi-report-ssot-float/SKILL.md`

```md
---
name: agi-report-ssot-float
description: AGI TR 보고서의 '1. SSOT 및 계산 규칙' 끝에 Critical Path/Float=0 및 SV_days 정의를 고정 문단으로 삽입할 때 사용. (SSOT, Critical Path, Float, Cycle 7.00d)
---

# agi-report-ssot-float

## When to Use
- “SSOT 섹션 강화”, “Critical Path/Float 선언”, “Cycle 7.00d 위험 설명” 요청 시

## Inputs
- 보고서 MD(기본: `docs/reports/AGI_TR_일정_최종보고서.MD`)
- SSOT 문장(이미 존재하면 재사용)

## Steps
1) `1. SSOT 및 계산 규칙` 섹션의 마지막에 아래 템플릿을 삽입.
2) Float 정의와 SV_days 정의를 보고서 표기(Δ(d))와 동일 의미로 통일.
3) EVM SV(=EV−PV)는 본 보고서 범위 밖임을 명시(혼동 방지).

## Output
- `assets/ssot_append.md` 블록을 그대로 삽입한 MD 조각

## Safety
- 일정/비용 EVM 용어 혼용 금지.
- Float=0 근거는 “TR4→TR7 직렬” 가정임을 명시(가정:).
```

### `.cursor/skills/agi-report-ssot-float/assets/ssot_append.md`

```md
#### Critical Path / Float 고정 선언(운영 기준)

- **Critical Path**: TR4 → TR5 → TR6 → TR7 은 직렬(Serial)로 연결된 경로로 간주하며, **Float = 0.00d** 로 정의한다.  
  → 변동 발생 시 후속 항차에 **연쇄(Propagation)** 된다. *(가정: TR4~TR7 자원/berth 제약으로 병렬화 불가)*

- **Schedule Variance(날짜) 정의 통일**  
  `SV_days = Actual_or_Forecast_finish - Planned_finish`  
  본 보고서의 기존 **Δ(d)** 와 동일 의미로 사용한다.

- **용어 주의**: EVM의 SV(=EV−PV)는 비용/진척 데이터가 필요하므로, 본 보고서에서는 **Schedule Variance(날짜)** 로만 사용한다.
```

---

### `.cursor/skills/agi-delay-decomp/SKILL.md`

```md
---
name: agi-delay-decomp
description: TR1~TR3 실적을 S1~S5 Segment로 분해해 Plan vs Actual Δh 표(Delay Decomposition)를 생성할 때 사용. (Segment, Port Turn, Δh)
---

# agi-delay-decomp

## When to Use
- “지연을 구간별로 쪼개서 표로”, “TR2 안개가 어디 구간에 영향?” 요청 시

## Inputs
- 이벤트 CSV(권장 컬럼): `tr, event, ts_lt` (LT=Asia/Dubai)
- 최소 이벤트(각 TR): `MZP_ALL_FAST, MZP_ETD, AGI_ALL_FAST, LOADIN_DONE, AGI_CAST_OFF, NEXT_MZP_ALL_FAST`
- 없으면: 없는 이벤트는 공란 + VERIFY로 남김(추정 금지)

## Steps
1) Segment 정의(S1~S5) 고정:
   - S1: MZP ETA → All fast
   - S2: All fast → ETD (Port Turn)
   - S3: ETD → AGI berthing
   - S4: AGI berthing → Load-in complete
   - S5: AGI cast off → Next MZP All fast
2) `scripts/segment_delta.py`로 Δh 계산(가능한 구간만).
3) 표를 보고서 `2. 1·2·3호기 실적` 하단에 삽입.

## Outputs
- Segment Δh 표(MD)
- VERIFY 목록(누락 이벤트)

## Safety
- S4 “2.00d” 같은 값은 데이터 없으면 **가정:**으로만 표기.
```

### `.cursor/skills/agi-delay-decomp/scripts/segment_delta.py`

```python
#!/usr/bin/env python3
import argparse
import pandas as pd

SEGMENTS = [
    ("S1", "MZP_ETA", "MZP_ALL_FAST"),
    ("S2", "MZP_ALL_FAST", "MZP_ETD"),
    ("S3", "MZP_ETD", "AGI_ALL_FAST"),
    ("S4", "AGI_ALL_FAST", "LOADIN_DONE"),
    ("S5", "AGI_CAST_OFF", "NEXT_MZP_ALL_FAST"),
]

def main():
    ap = argparse.ArgumentParser(description="Compute segment delta hours per TR from event timestamps.")
    ap.add_argument("--in", dest="inp", required=True, help="Input CSV with columns: tr,event,ts_lt (ISO-like).")
    ap.add_argument("--out", dest="out", default="-", help="Output markdown to file, or '-' for stdout.")
    args = ap.parse_args()

    df = pd.read_csv(args.inp)
    for c in ["tr", "event", "ts_lt"]:
        if c not in df.columns:
            raise SystemExit(f"Missing column: {c}")

    df["ts_lt"] = pd.to_datetime(df["ts_lt"], errors="coerce")
    if df["ts_lt"].isna().any():
        bad = df[df["ts_lt"].isna()]
        raise SystemExit(f"Unparseable ts_lt rows: {len(bad)}")

    pivot = df.pivot_table(index="tr", columns="event", values="ts_lt", aggfunc="max")

    rows = []
    verify = []
    for tr in pivot.index:
        for seg, a, b in SEGMENTS:
            ta = pivot.loc[tr].get(a)
            tb = pivot.loc[tr].get(b)
            if pd.isna(ta) or pd.isna(tb):
                verify.append((tr, seg, a if pd.isna(ta) else "", b if pd.isna(tb) else ""))
                continue
            dh = (tb - ta).total_seconds() / 3600.0
            rows.append((tr, seg, a, b, dh))

    md = []
    md.append("| TR | Segment | From | To | Δh |")
    md.append("|---:|:--|:--|:--|---:|")
    for tr, seg, a, b, dh in rows:
        md.append(f"| {tr} | {seg} | {a} | {b} | {dh:.2f} |")

    if verify:
        md.append("\n**VERIFY(누락 이벤트)**")
        md.append("| TR | Segment | Missing |")
        md.append("|---:|:--|:--|")
        for tr, seg, ma, mb in verify:
            miss = ",".join([x for x in [ma, mb] if x])
            md.append(f"| {tr} | {seg} | {miss} |")

    out_text = "\n".join(md) + "\n"
    if args.out == "-":
        print(out_text)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out_text)

if __name__ == "__main__":
    main()
```

### `.cursor/skills/agi-delay-decomp/assets/segment_table.md`

```md
#### Delay Decomposition (Segment Plan vs Actual Δh)

| TR | Segment | Plan(h) | Actual(h) | Δh | Note/Evidence |
|---:|:--|---:|---:|---:|:--|
| TR2 | S2 (Port Turn) |  |  |  | Fog/Mist Gate |
| TR3 | S2 (Port Turn) |  |  |  | Berth occupied + Wind/Wave |
```

### `.cursor/skills/agi-delay-decomp/examples/events.example.csv`

```csv
tr,event,ts_lt
TR2,MZP_ALL_FAST,2026-02-09 21:18
TR2,MZP_ETD,2026-02-12 15:00
TR3,MZP_ALL_FAST,2026-02-17 14:20
TR3,MZP_ETD,2026-02-19 03:00
```

---

### `.cursor/skills/agi-rca-pack/SKILL.md`

```md
---
name: agi-rca-pack
description: TR2/TR3 지연에 대해 5-Why(2개) + Fishbone(6M) 1개를 보고서 '3. 지연 원인 분석'에 삽입할 때 사용. (5-Why, Fishbone, 6M)
---

# agi-rca-pack

## When to Use
- “근본원인”, “5-Why 넣어”, “Fishbone 6M” 요청 시

## Inputs
- TR2 사건 요약(안개), TR3 사건 요약(강풍/파고 + berth 점유)
- Evidence 인용(WhatsApp/METAR/NCM 등)

## Steps
1) `assets/fivewhy_tr2.md`, `assets/fivewhy_tr3.md`를 사건 사실에 맞게 최소 편집(추정 금지).
2) `assets/fishbone_6m.mmd`에서 원인을 6M으로 분류(측정/방법/환경 분리).
3) 섹션 하단에 “단순화 위험(주의 문장)” 추가.

## Outputs
- 5-Why 2개 + Fishbone 1개 (Mermaid)

## Safety
- 5-Why는 단일 원인 확정 도구가 아님: 항상 “증거점수/대안원인” 병기.
```

### `.cursor/skills/agi-rca-pack/assets/fivewhy_tr2.md`

```md
##### 5-Why (TR2 — Fog/Mist)

1) 왜 지연됐나? → 작업/출항이 Fog/Mist로 중단/지연.  
2) 왜 중단됐나? → 시정 기준 미달로 항만 작업 제한.  
3) 왜 시정이 악화됐나? → (사실 기반 입력 필요: METAR/현장 보고)  
4) 왜 그 시간대에 취약했나? → (가정/데이터 필요: 계절성, 새벽 습도)  
5) 왜 완화가 어려웠나? → (대응책: 작업창 재설정/대체창/게이트 자동화)

**Evidence**: (링크/캡처/로그를 여기에 삽입)  
**VERIFY**: OMAA METAR 원문/시간대, MZP 작업중지 공지 캡처
```

### `.cursor/skills/agi-rca-pack/assets/fivewhy_tr3.md`

```md
##### 5-Why (TR3 — Wind/Wave + Berth Occupancy)

1) 왜 지연됐나? → 강풍/고파고 + berth 점유로 접안/작업 불가.  
2) 왜 작업 불가였나? → 안전 기준(풍속/파고) 및 berth 사용 불가.  
3) 왜 berth를 못 썼나? → 제3자 선박 점유(포트 로그 필요).  
4) 왜 대체 berth/창을 못 썼나? → (VERIFY: 사전 예약/대체창 부재)  
5) 왜 재발 가능하나? → (개선: berth 예약 룰/Weather Gate/대체 시나리오)

**Evidence**: (WhatsApp + METAR + NCM bulletin)  
**VERIFY**: Maqta/Port allocation 또는 동등 기록
```

### `.cursor/skills/agi-rca-pack/assets/fishbone_6m.mmd`

````md
```mermaid
mindmap
  root((TR2/TR3 Delay - Fishbone(6M)))
    Man
      Crew readiness
      Shift handover
    Machine
      Tug availability
      Crane/HIAB constraints
    Method
      PTW / Permit window
      Berth allocation process
      Weather gate criteria
    Material
      Cargo readiness
      Lashing / deck prep
    Measurement
      AIS time stamps gaps
      METAR station mismatch(OMAA vs MZP)
      Missing port log
    Environment
      Fog/Mist
      Wind/Gust
      Wave/Sea state
````

````

---

### `.cursor/skills/agi-forensic-schedule/SKILL.md`
```md
---
name: agi-forensic-schedule
description: 보고서에 Forensic Schedule(As-Planned vs As-Built) 표기 + Windows Analysis + Collapsed As-Built(But-For) 2개를 삽입할 때 사용. (Windows, But-For, Forensic)
---

# agi-forensic-schedule

## When to Use
- “귀속(Attribution) 강화”, “Windows Analysis 넣어”, “But-For 시나리오” 요청 시

## Inputs
- TR2 윈도우: 2026-02-11~2026-02-12 (LT)
- TR3 윈도우: 2026-02-15~2026-02-17 (LT)
- 각 윈도우 이벤트 로그/증거

## Steps
1) 방법론 1줄: As-Planned vs As-Built 기반(Forensic) 문구 삽입.
2) `assets/windows_table.md`를 채움(Δh + Top2 원인 + 근거 W).
3) `assets/butfor_table.md`에 “But-For” 2개 작성(가정: 명시).

## Outputs
- Windows Analysis 표
- Collapsed As-Built(But-For) 표

## Safety
- But-For는 반사실 시나리오이므로 “가정:” 및 “불확실성”을 반드시 표기.
````

### `.cursor/skills/agi-forensic-schedule/assets/windows_table.md`

```md
#### Windows Analysis (Δh by window)

| Window | TR | Δh | Top Cause #1 | Evidence(W) | Top Cause #2 | Evidence(W) |
|:--|:--:|---:|:--|:--:|:--|:--:|
| 2026-02-11~2026-02-12 | TR2 |  | Fog/Mist |  |  |  |
| 2026-02-15~2026-02-17 | TR3 |  | Wind/Wave |  | Berth occupied |  |
```

### `.cursor/skills/agi-forensic-schedule/assets/butfor_table.md`

```md
#### Collapsed As-Built (But-For)

| Scenario | But-For Assumption | Predicted Change | Result Date/Time | Confidence |
|:--|:--|:--|:--|:--|
| TR2: No Fog | Fog/Mist가 없었고, Port Turn이 계획치로 수렴 | ETD 앞당김 |  | Medium |
| TR3: No Berth Occupancy | berth 점유가 없었고, 접안 대기가 제거 | Berthing/ETD 앞당김 |  | Medium |
```

---

### `.cursor/skills/agi-weather-evidence/SKILL.md`

```md
---
name: agi-weather-evidence
description: METAR(OMAA) 및 NCM Al Bahar 근거로 Weather Gate 판정표(PASS/FAIL)와 Evidence Scorecard를 생성할 때 사용. (Weather Gate, METAR, NCM, Evidence)
---

# agi-weather-evidence

## When to Use
- “날씨 지연을 수치로 판정”, “Weather Gate 표”, “Evidence Scorecard” 요청 시

## Inputs
- METAR 원문 텍스트(예: OMAA)
- NCM Al Bahar bulletin(텍스트/요약)
- 이벤트 시각(윈도우)

## Steps
1) Gate 기준(프로젝트 내부 기준) 값을 입력받아 설정(없으면 VERIFY):
   - Wind/Gust threshold (kt)
   - Visibility threshold (m)
   - Wave height threshold (m)
2) `scripts/weather_gate.py`로 이벤트별 PASS/FAIL 생성.
3) `assets/evidence_scorecard.md` 규칙으로 출처 점수화.

## Outputs
- Weather Gate Eval 표
- Evidence Scorecard 표

## Safety
- METAR는 관측소 위치가 항만/해상과 다를 수 있음 → “적합성(Spatial fit)”을 점수에 반영하거나 VERIFY.
```

### `.cursor/skills/agi-weather-evidence/scripts/weather_gate.py`

```python
#!/usr/bin/env python3
import argparse
import re

def parse_metar_lines(text: str):
    # 매우 단순 파서(필요 최소): 풍속/가스트/시정 키워드만 추출
    # 예: 29017G27KT, 2500m BR, FG
    wind = re.search(r"\b(\d{3})(\d{2})(G(\d{2}))?KT\b", text)
    vis_m = re.search(r"\b(\d{4})\b", text)  # 4자리 시정(m) 단순 추정
    wx = []
    for code in ["FG", "BR", "HZ", "DU", "TS", "RA"]:
        if re.search(rf"\b{code}\b", text):
            wx.append(code)
    out = {
        "wind_kt": int(wind.group(2)) if wind else None,
        "gust_kt": int(wind.group(4)) if wind and wind.group(4) else None,
        "vis_m": int(vis_m.group(1)) if vis_m else None,
        "wx": ",".join(wx) if wx else None
    }
    return out

def gate_eval(metar, wind_thr, gust_thr, vis_thr):
    fail = []
    if metar["wind_kt"] is not None and metar["wind_kt"] > wind_thr:
        fail.append("WIND")
    if metar["gust_kt"] is not None and metar["gust_kt"] > gust_thr:
        fail.append("GUST")
    if metar["vis_m"] is not None and metar["vis_m"] < vis_thr:
        fail.append("VIS")
    return ("FAIL" if fail else "PASS", ",".join(fail) if fail else "")

def main():
    ap = argparse.ArgumentParser(description="Weather Gate evaluation from METAR text (minimal parser).")
    ap.add_argument("--metar", required=True, help="Path to METAR text file.")
    ap.add_argument("--wind_thr", type=int, default=20, help="Wind threshold (kt).")
    ap.add_argument("--gust_thr", type=int, default=25, help="Gust threshold (kt).")
    ap.add_argument("--vis_thr", type=int, default=3000, help="Visibility threshold (m).")
    args = ap.parse_args()

    text = open(args.metar, "r", encoding="utf-8").read()
    metar = parse_metar_lines(text)
    verdict, reasons = gate_eval(metar, args.wind_thr, args.gust_thr, args.vis_thr)

    print("| Item | Value |")
    print("|:--|:--|")
    print(f"| wind_kt | {metar['wind_kt']} |")
    print(f"| gust_kt | {metar['gust_kt']} |")
    print(f"| vis_m | {metar['vis_m']} |")
    print(f"| wx | {metar['wx']} |")
    print("")
    print("| Gate | Verdict | Reasons |")
    print("|:--|:--:|:--|")
    print(f"| WeatherGate | {verdict} | {reasons} |")

if __name__ == "__main__":
    main()
```

### `.cursor/skills/agi-weather-evidence/assets/evidence_scorecard.md`

```md
#### Evidence Scorecard (W=3/2/1)

| Claim | Source | Weight(W) | Date/Time | Pass/Fail/Verify | Note |
|:--|:--|---:|:--|:--|:--|
| Fog stopped operations | METAR 원문 | 3 |  |  |  |
| ETD timestamp | AIS log | 2 |  |  |  |
| Berth occupied | WhatsApp | 1 |  |  |  |
```

### `.cursor/skills/agi-weather-evidence/assets/metar_abbrev.md`

```md
#### METAR 약어(요약)

- FG: Fog (안개)
- BR: Mist (박무)
- HZ: Haze
- DU: Dust
- TS: Thunderstorm
- RA: Rain
- KT: knots (풍속 단위)
- GxxKT: Gust (돌풍)
```

### `.cursor/skills/agi-weather-evidence/examples/metar.example.txt`

```txt
OMAA 160900Z 29017G27KT 7000 DU SCT020
```

### `.cursor/skills/agi-weather-evidence/examples/ncm.example.txt`

```txt
NCM Al Bahar: Arabian Gulf - rough to very rough, gust up to 50 km/h (example)
```

---

### `.cursor/skills/agi-montecarlo-buffer/SKILL.md`

```md
---
name: agi-montecarlo-buffer
description: TR1~TR3 Segment 분포를 기반으로 TR4~TR7 완료일(P50/P80/P90)과 P80 달성 Buffer(일)를 산출해 보고서 'Contingency' 섹션에 삽입할 때 사용. (Monte Carlo, P50/P80/P90, Buffer)
---

# agi-montecarlo-buffer

## When to Use
- “Cycle 7.00d 고정 대신 분포”, “P80 Buffer 제시” 요청 시

## Inputs
- `segment_stats.csv` (예: Segment, mean_h, std_h) 또는 과거 샘플(행 단위)
- TR4~TR7 기준 일정(SSOT v1.1)

## Steps
1) 입력 통계(또는 샘플)로 segment별 난수 샘플링(N=10,000 기본).
2) TR4~TR7 사이클/완료일 분포 생성.
3) P50/P80/P90 및 P80 달성을 위한 Buffer(일) 계산.
4) 데이터 부족 시: 분포 가정(정규/로그정규)을 “가정:”으로 명시.

## Outputs
- P50/P80/P90 표 + Buffer 권고표

## Safety
- 분포 가정은 반드시 표기. 근거 데이터가 없으면 VERIFY로 중단하지 않고 “가정:” 처리(단, 숫자 단정은 금지).
```

### `.cursor/skills/agi-montecarlo-buffer/scripts/montecarlo.py`

```python
#!/usr/bin/env python3
import argparse
import numpy as np
import pandas as pd

def main():
    ap = argparse.ArgumentParser(description="Monte Carlo: compute P50/P80/P90 and buffer days from segment stats.")
    ap.add_argument("--in", dest="inp", required=True, help="CSV: segment,mean_h,std_h")
    ap.add_argument("--n", type=int, default=10000, help="Simulations")
    ap.add_argument("--out", default="-", help="Output markdown file or '-'")
    args = ap.parse_args()

    df = pd.read_csv(args.inp)
    for c in ["segment","mean_h","std_h"]:
        if c not in df.columns:
            raise SystemExit(f"Missing column: {c}")

    means = df["mean_h"].to_numpy(dtype=float)
    stds = df["std_h"].to_numpy(dtype=float)

    # 단순 정규 가정(가정:). 필요 시 로그정규로 교체 가능.
    samples = np.random.normal(loc=means, scale=stds, size=(args.n, len(means)))
    samples = np.clip(samples, 0, None)  # 음수 시간 방지
    total_h = samples.sum(axis=1)

    p50 = np.percentile(total_h, 50)
    p80 = np.percentile(total_h, 80)
    p90 = np.percentile(total_h, 90)

    buffer_h = max(0.0, p80 - p50)
    buffer_d = buffer_h / 24.0

    md = []
    md.append("#### Monte Carlo Result (가정: segment 시간 정규분포)")
    md.append("")
    md.append("| Metric | Hours | Days |")
    md.append("|:--|---:|---:|")
    md.append(f"| P50 | {p50:.2f} | {p50/24.0:.2f} |")
    md.append(f"| P80 | {p80:.2f} | {p80/24.0:.2f} |")
    md.append(f"| P90 | {p90:.2f} | {p90/24.0:.2f} |")
    md.append(f"| Buffer to reach P80 (P80-P50) | {buffer_h:.2f} | {buffer_d:.2f} |")

    out_text = "\n".join(md) + "\n"
    if args.out == "-":
        print(out_text)
    else:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out_text)

if __name__ == "__main__":
    main()
```

### `.cursor/skills/agi-montecarlo-buffer/assets/mc_output_table.md`

```md
#### TR4~TR7 Completion Distribution

| TR | P50 Finish | P80 Finish | P90 Finish | Buffer(d) |
|---:|:--|:--|:--|---:|
| TR4 |  |  |  |  |
| TR5 |  |  |  |  |
| TR6 |  |  |  |  |
| TR7 |  |  |  |  |
```

### `.cursor/skills/agi-montecarlo-buffer/examples/segment_stats.example.csv`

```csv
segment,mean_h,std_h
S2,67.20,12.00
S3,24.00,6.00
```

---

## 7) `.claude/skills/*` 및 `.codex/skills/*` (호환용 SKILL.md)

아래 6개 파일은 **동일 내용**을 복제해 넣으세요(경로만 다름).

* `.claude/skills/<skill>/SKILL.md`
* `.codex/skills/<skill>/SKILL.md`

> 본문은 위 `.cursor/skills/<skill>/SKILL.md`와 동일로 복사.

---

## 8) 플랫폼별 설치 안내 (Project/User)

* **Cursor (Project)**: `$REPO/.cursor/skills/<skill-name>/SKILL.md` , Subagent: `$REPO/.cursor/agents/*.md` 
* **Cursor (User)**: `~/.cursor/skills/<skill-name>/SKILL.md` , Subagent: `~/.cursor/agents/*.md` 
* **Claude Code (Project)**: `$REPO/.claude/skills/<skill-name>/SKILL.md`
* **Codex (Repo)**: `$REPO/.codex/skills/<skill-name>/SKILL.md` 
* **Antigravity**: `/.agent/skills/<skill-name>/SKILL.md` (옵션) 

---

## 9) 검증 체크리스트 (90.00% 게이트용)

* [ ] Skill name 규칙(소문자/하이픈, 폴더명 일치) 충족
* [ ] 각 스킬이 **단일책임**인지(SSOT/Segment/RCA/Forensic/Weather/MC 분리)
* [ ] 데이터 누락 시 **VERIFY**로 남기고 단정/추정 금지
* [ ] 스크립트 실행 예시 재현 가능:

  * `python .cursor/skills/agi-delay-decomp/scripts/segment_delta.py --in events.csv`
  * `python .cursor/skills/agi-weather-evidence/scripts/weather_gate.py --metar metar.txt`
  * `python .cursor/skills/agi-montecarlo-buffer/scripts/montecarlo.py --in segment_stats.csv`
* [ ] 보고서 반영은 “삽입 위치 고정 + append-only” 준수
* [ ] Evidence Scorecard에 출처/날짜/Weight(W) 기입

---

## 10) 근거/참고 (확인된 SSOT 문서)

* AGI TR 보고서 구조/삽입 대상 근거: **AGI_TR_일정_최종보고서.MD (2026-02-17)** 
* Cursor Subagents 포맷/필드: Cursor Subagents 문서 발췌 
* Agent Skills(표준/경로): Cursor Skills / Antigravity Skills / Codex Skills 문서

---

원하시면, 위 스킬을 **AGI_TR_일정_최종보고서.MD에 “실제 삽입된 최종본”**까지 만들어서(섹션/표 자동 반영) 바로 배포 가능한 형태로 내겠습니다.
