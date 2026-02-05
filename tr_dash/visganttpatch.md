## `components/gantt/VisTimelineGantt.tsx` 위치/역할 기준 ✅

레포 README 기준으로, `components/gantt/VisTimelineGantt.tsx`는 **“대안 Gantt (vis-timeline 연동)”** 컴포넌트로 분리되어 있고, 데이터 변환/계약은 `lib/gantt/* (visTimelineMapper, contract)` 쪽에 존재하는 구조가 맞습니다. 즉, 이 컴포넌트는 **“렌더 전용”**(계산/매핑 최소화)로 두는 게 레포 원칙과도 일치합니다. ([GitHub][1])

또한 메인 Gantt는 `components/dashboard/gantt-chart.tsx`에 있고, **Selected Date의 UTC 정렬(toUtcNoon/dateToIsoUtc 등) 버그 픽스**가 이미 명시되어 있으니, VisTimelineGantt도 **동일한 날짜 기준(UTC day index)** 을 따라야 합니다. ([GitHub][1])

---

## 1) 가장 먼저 볼 “빌드/의존성” 포인트 (vis-timeline import 방식)

vis-timeline은 **Standalone build**와 **Peer build**가 성격이 다릅니다:

* **Standalone build**: 의존성을 번들로 포함(편하지만), 다른 vis 계열/외부 DataSet과 섞이면 **DataSet 불일치** 문제가 생길 수 있습니다. 공식 예제에서도 “Timeline이 자기 번들 DataSet을 기대한다”는 점을 명확히 경고합니다. ([Vis.js][2])

  * 예: `import { DataSet, Timeline } from "vis-timeline/standalone"` (예제에 그대로 존재) ([Vis.js][2])
* **Peer build**: `vis-data`/`moment` 등을 앱에서 직접 로드/관리해서 **같은 DataSet을 재사용**할 수 있고, 번들 사이즈 제어에도 유리합니다. ([Vis.js][3])

  * 예: `import { DataSet } from "vis-data/peer"; import { Timeline } from "vis-timeline/peer";` ([Vis.js][3])

✅ 결론(권장):
레포가 `lib/gantt`에 contract/mapper를 두고 “대안 Gantt”를 별도 운영하는 구조라면, **Peer build(= `vis-timeline/peer` + `vis-data/peer`)**가 보통 더 안전합니다(특히 DataSet을 별도로 다루는 경우). ([Vis.js][3])

---

## 2) CSS 로딩 (가장 흔한 “렌더는 되는데 안 보임” 원인)

공식 예제는 스타일을 이렇게 로드합니다:

* `import "vis-timeline/styles/vis-timeline-graph2d.css";` ([Vis.js][2])

Next.js(App Router)에서 **글로벌 CSS는 루트 레벨(`app/globals.css` 또는 layout)로 올리는 방식**이 안정적입니다.
즉, VisTimelineGantt 내부에서 “글로벌 CSS”를 직접 import하면 프로젝트 설정에 따라 제약이 걸릴 수 있으니, 가능한 한 `globals.css`에 한 번만 포함시키는 쪽을 추천합니다(중복 로딩/번들 부풀림 방지).

---

## 3) 라이프사이클 DoD: “한 번 생성 + 정확히 파괴”

VisTimelineGantt에서 최소로 보장해야 할 패턴:

* **Timeline 인스턴스는 1회 생성**
* 언마운트 시 `timeline.destroy()` 호출 (DOM/이벤트 정리) ([Vis.js][4])
* 리사이즈/레이아웃 변경 시 `autoResize`를 쓰거나 필요하면 `timeline.redraw()`로 강제 리드로우 ([Vis.js][4])
* 이벤트를 붙였으면 `timeline.off(...)`로 해제(클린업) ([Vis.js][4])

---

## 4) 데이터 업데이트 전략: “재생성 금지, DataSet 업데이트”

렌더마다 Timeline을 새로 만들면:

* 성능 저하 + 스크롤/줌 상태 리셋 + 메모리 누수 가능성이 커집니다.

권장 방식:

* items/groups를 **DataSet으로 유지**
* 변경 시 `DataSet.update(...)` / `remove(...)` / `clear(...)` 등을 활용 ([Vis.js][5])
* 대량 업데이트면 DataSet의 `queue` 옵션으로 배치 플러시(선택) ([Vis.js][5])
* Timeline에는 업데이트된 DataSet을 그대로 물리고, 필요하면 `timeline.setData({ items, groups })`로 한 번에 교체(또는 `setItems`, `setGroups`) ([Vis.js][4])

**핵심 전제:**
item id / group id는 **안정적인 SSOT 기반 식별자**(예: `A1002`, `Voyage 1` 등)여야 합니다. 그래야 `update`가 “추가/수정”을 정확히 구분합니다. ([Vis.js][4])

---

## 5) Selected Date(UTC day index) 커서: vis-timeline에서는 `customTime`이 정답

레포 메인 Gantt는 Selected Date를 **UTC 기준으로 정렬**(toUtcNoon/dateToIsoUtc 등)하고, 축과 커서가 일치하도록 버그 픽스를 넣어둔 상태입니다. ([GitHub][1])

VisTimelineGantt에서도 동일한 UX를 내려면:

* 커서는 `addCustomTime`로 생성하고 ([Vis.js][4])
* Selected Date 변경 시 `setCustomTime(time, id)`로 위치만 갱신 ([Vis.js][4])

시간대(UTC 표시)까지 일관되게 맞추려면, vis-timeline은 **moment 생성자를 커스터마이즈**해서 local/UTC/offset 표시를 제어하는 예제를 제공합니다. (UTC 표시 필요하면 이 패턴을 참고) ([Vis.js][6])

---

## 6) 인터랙션 계약: “편집(드래그) 기본 OFF”가 현재 레포 UX와 합치

vis-timeline은 `editable` 옵션으로 드래그/삭제/그룹 이동 등을 쉽게 켤 수 있지만, 레포의 스케줄 변경 UX는 **Dialog → reflow → Preview → Apply** 흐름(검증/가드 포함) 중심입니다. ([GitHub][1])

따라서 VisTimelineGantt에서도 기본은:

* `editable: false` 유지 ([Vis.js][4])
* `select`(또는 클릭) 이벤트로 **상세 패널/날짜 변경 다이얼로그**를 트리거
* “직접 드래그로 날짜 변경”을 허용하려면, 반드시 **Preview/Undo/승인 플로우를 우회하지 않도록** 중간 레이어(ops/preview)로 연결해야 합니다(아니면 현재 설계 원칙과 충돌).

---

## 7) 보안: template/content 사용 시 XSS & React 템플릿 주의

* Timeline은 기본적으로 XSS protection 옵션이 있고, 이를 끌 수도 있습니다. 끄는 건 추천하지 않습니다. ([Vis.js][4])
* item `content`에 HTML을 넣거나 `template`로 커스텀 렌더링할 때는, **ReactDOM 렌더 템플릿 사용 시 언마운트 누수 이슈**가 보고된 바가 있으니(특히 destroy 시) “템플릿 기반 React 렌더”는 신중히 운영하세요. ([GitHub][7])

---

## 8) 최소 검증 게이트 (레포 명시 커맨드)

아래는 README에 적힌 “기본 게이트”입니다. 이 3개가 통과해야 `VisTimelineGantt.tsx ✅`가 의미가 생깁니다. ([GitHub][1])

* `pnpm run typecheck`
* `pnpm run lint`
* `pnpm run build`

---

## 9) 현재 배포 UI와 연결 관점 (참고)

현재 Vercel 배포 화면에는 메인 Gantt(자체 렌더)와 Day/Week, Highlights(Delay/Lock/Constraint) 토글이 이미 노출되어 있습니다. VisTimelineGantt를 “대안 엔진”으로 붙일 때는 이 토글 상태를 그대로 입력으로 받아 **동일 의미로 매핑**하는 게 UX 일관성 측면에서 좋습니다. ([TR Dash][8])

---

## 10) 내가 지금 할 수 없는 것 / 바로 가능한 것

이 환경에서는 GitHub 파일(blob) 페이지 접근이 차단되어(`You can’t perform that action at this time`), `VisTimelineGantt.tsx` 본문을 **직접 열어 라인 단위 리뷰**를 할 수는 없습니다.

대신, 아래 중 하나를 주면 바로 “정밀 리뷰(SSR/메모리/의존성/UTC 커서/상태 동기화)”로 체크해줄 수 있습니다:

* 파일 내용 붙여넣기(또는 diff)
* 또는 `VisTimelineGantt.tsx`의 핵심 부분(초기화 useEffect / DataSet 업데이트 / customTime 처리)만 발췌

---

### 내부 기준 문서(참조)

*
*



[1]: https://github.com/macho715/tr_dash "GitHub - macho715/tr_dash"
[2]: https://visjs.github.io/vis-timeline/examples/timeline/standalone-build.html "Timeline | Standalone Build"
[3]: https://visjs.github.io/vis-timeline/examples/timeline/peer-build.html "Timeline | Peer Build"
[4]: https://visjs.github.io/vis-timeline/docs/timeline/ "
      timeline - vis.js - A dynamic, browser based visualization library.
    "
[5]: https://visjs.github.io/vis-data/data/dataset.html "
      DataSet - vis.js - A dynamic, browser based visualization library.
    "
[6]: https://visjs.github.io/vis-timeline/examples/timeline/other/timezone.html "Timeline | other | Time zone"
[7]: https://github.com/almende/vis/issues/4257?utm_source=chatgpt.com "timeline.destroy does not unmount react templates #4257"
[8]: https://trdash.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"
## `components/gantt/VisTimelineGantt.tsx` 빠른 리뷰 (repo 기준)

이 컴포넌트는 **vis-timeline**을 React(Client Component)로 감싸고, `forwardRef + useImperativeHandle`로 **외부에서 Gantt 조작(zoom/fit/pan/scrollToActivity/moveToToday)** 할 수 있게 만든 구조입니다. 또한 `DataSet`을 메모이즈해서 Timeline 인스턴스는 1회 생성하고, 이후 `items/groups`만 갱신하는 패턴을 쓰고 있습니다. ([GitHub][1])

아래는 **우선순위 높은 수정 포인트(실제로 깨질 수 있는 부분)**부터 정리합니다.

---

## P0 (즉시 수정 권장) — `DataSet` import mismatch

현재 코드:

* `DataSet`은 `vis-data`에서 import
* `Timeline`은 `vis-timeline/standalone`에서 import ([GitHub][1])

그런데 **Standalone build**는 “의존성을 번들링”하고, 문서에서도 **Standalone ESM 사용 시 `DataSet, Timeline`을 둘 다 `vis-timeline/standalone`에서 가져오라**고 명시합니다. ([Vis.js][2])
또한 Standalone은 **Timeline이 “자기 번들 DataSet”을 기대**하기 때문에, 외부 `vis-data` DataSet을 쓰면 호환 문제가 날 수 있다고 경고합니다. ([Vis.js][2])

### 권장 해결 (가장 최소 변경)

Standalone을 유지하려면 import를 이렇게 맞추는 게 정석입니다:

```ts
import { DataSet, Timeline } from "vis-timeline/standalone"
```

(그리고 CSS도 필요: 아래 P1 참고)

> 참고: peer build로 바꾸는 것도 대안인데(다른 vis 패키지들과 같이 쓸 때 유리), 그 경우 문서대로 `vis-data/peer` + `vis-timeline/peer` 조합을 쓰는 게 맞습니다. ([Vis.js][3])

---

## P0 — `tripId`가 “초기값”으로 고정될 가능성 (stale closure)

`timeline.on("select", ...)` 이벤트 핸들러 내부에서 `tripId`를 사용하지만, Timeline 인스턴스를 만드는 `useEffect`의 deps에 `tripId`가 없어서 **tripId가 바뀌어도 핸들러는 이전 tripId를 계속 사용할 수 있습니다.** ([GitHub][1])

### 권장 해결

콜백 ref 패턴(`onEventRef`)을 이미 쓰고 있으니, tripId도 동일하게 ref로 관리하세요:

* `const tripIdRef = useRef(tripId)`
* `useEffect(() => { tripIdRef.current = tripId }, [tripId])`
* 이벤트 핸들러에서는 `tripIdRef.current` 사용

---

## P1 — vis-timeline CSS 로딩 보장

Standalone ESM 예제에서도 CSS import를 포함합니다. ([Vis.js][2])
CSS가 누락되면 **축/아이템/그리드 렌더링이 깨져 보이거나 레이아웃이 이상**해질 수 있습니다.

* (권장) Next(App Router)라면 전역 CSS는 보통 `app/layout.tsx` 혹은 `globals.css`에서 처리
* 또는 빌드 규칙이 허용한다면 해당 client component에서 직접 import

문서 예시:

````ts
import "vis-timeline/styles/vis-timeline-graph2d.css"
``` :contentReference[oaicite:7]{index=7}

---

## P1 — Day/Week “가시 기간(14d/56d)”이 경계에서 줄어드는 로직

현재 view-sync effect는:

- `start = max(PROJECT_START, center - halfMs)`
- `end = min(PROJECT_END+1d, center + halfMs)` :contentReference[oaicite:8]{index=8}

이 방식은 프로젝트 시작/끝 근처에서 **윈도우 길이가 절반으로 줄어듭니다**(예: 시작일이면 14d가 아니라 7d만 보임).  
주석의 의도(“Day=14d visible, Week=56d visible”)와 다를 가능성이 큽니다. :contentReference[oaicite:9]{index=9}

### 권장 해결
윈도우 길이를 유지하려면:
- 먼저 center 기준으로 `[center - duration/2, center + duration/2]`를 만든 뒤
- min/max를 넘으면 “반대쪽을 밀어서” 길이를 유지하는 방식으로 clamp

---

## P1 — Selected Date 커스텀 타임 title 갱신 누락

초기 mount에서만 `setCustomTimeTitle(...)`을 호출하고, `selectedDate` 변경 시에는 시간만 갱신합니다. :contentReference[oaicite:10]{index=10}  
selectedDate가 바뀌면 title도 같이 갱신하는 게 정합적입니다.

---

## P2 — `editable: true`를 쓸 경우 “수정 사항 반영” 전략 필요

현재 `editable: true` + `itemsAlwaysDraggable`로 **드래그 변경이 가능**하게 해놨는데, 변경 결과를 상위 상태로 확정하는 로직이 없습니다. :contentReference[oaicite:11]{index=11}

이 상태에서 흔히 생기는 문제:
- 사용자가 드래그로 바꿔도, 상위에서 `items`를 다시 내려주면 `itemsDS.clear(); add(items)`에 의해 **변경이 덮어씌워짐**
- 또는 내부 DataSet만 변경되어 **SSOT/백엔드/다른 UI와 불일치**

해결 선택지(둘 중 하나를 명확히):
1) **읽기 전용**이면: `editable: false`로 고정  
2) **편집 지원**이면: onMove/onUpdate 등 이벤트로 변경사항을 `onEvent`로 올리고, 상위에서 items를 업데이트해 controlled로 만들기 (vis-timeline에는 manipulation/편집 콜백 패턴이 있습니다. 예제 인덱스에 “Manipulation callbacks”가 존재) :contentReference[oaicite:12]{index=12}

---

## 제안 패치 (핵심만)

아래는 “Standalone 유지” 기준 최소 패치 방향입니다.

```diff
- import { DataSet } from "vis-data"
- import { Timeline } from "vis-timeline/standalone"
+ import { DataSet, Timeline } from "vis-timeline/standalone"
+ // NOTE: Next에서 전역 CSS import 제한이 있으면 app/layout.tsx 또는 globals.css로 이동
+ import "vis-timeline/styles/vis-timeline-graph2d.css"
````

```diff
  export const VisTimelineGantt = forwardRef(
    function VisTimelineGantt(
      { ..., tripId = 1 },
      ref
    ) {
+     const tripIdRef = useRef(tripId)
+     useEffect(() => {
+       tripIdRef.current = tripId
+     }, [tripId])

      ...
      useEffect(() => {
        ...
        timeline.on("select", (ev) => {
          const id = ev.items?.[0]
          if (id != null) {
            const itemId = String(id)
            onItemClickRef.current?.(itemId)
-           onEventRef.current?.(createItemSelectedEvent(itemId, tripId, itemId))
+           onEventRef.current?.(createItemSelectedEvent(itemId, tripIdRef.current, itemId))
          } else {
            onDeselectRef.current?.()
          }
        })
-       onEventRef.current?.(createGanttReadyEvent(tripId))
+       onEventRef.current?.(createGanttReadyEvent(tripIdRef.current))
```

그리고 `selectedDate` effect에서 title도 같이 업데이트:

```diff
  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline || !selectedDate) return
    const noon = toUtcNoon(selectedDate)
    try {
      timeline.setCustomTime(noon, "selected-date")
    } catch {
      timeline.addCustomTime(noon, "selected-date")
    }
+   timeline.setCustomTimeTitle(
+     `Selected Date (${noon.toISOString().split("T")[0]} UTC)`,
+     "selected-date"
+   )
  }, [selectedDate])
```

(가시 window clamp는 좀 더 큰 수정이라 별도 함수로 정리하는 편이 좋습니다.)

---

## 로컬 시뮬레이션 체크리스트 (빠르게 회귀 확인)

`package.json` 기준 스크립트/버전 참고: Next 16.0.10, React 19.2.0, vis-timeline ^8.5.0, vis-data ^8.0.3 ([GitHub][4])

1. 타입/린트

* `pnpm typecheck`
* `pnpm lint`

2. 렌더/상호작용

* Gantt 화면 진입 → 아이템 렌더/축/그리드 스타일 정상(CSS 적용 여부)
* 아이템 클릭 → `onItemClick`, `onEvent(ITEM_SELECTED)` 발생
* 배경 클릭 → `onDeselect` 발생
* `ref` 핸들: `zoomIn/zoomOut/fit/moveToToday/panLeft/panRight/scrollToActivity` 정상 동작

3. 컨텍스트 전환

* trip 변경 시(가능하다면) selection 이벤트 payload의 tripId가 최신으로 반영되는지

---

## 참고 자료 (프로젝트 가이드/베스트프랙티스)



[1]: https://raw.githubusercontent.com/macho715/tr_dash/main/components/gantt/VisTimelineGantt.tsx "raw.githubusercontent.com"
[2]: https://visjs.github.io/vis-timeline/examples/timeline/standalone-build.html "Timeline | Standalone Build"
[3]: https://visjs.github.io/vis-timeline/examples/timeline/peer-build.html "Timeline | Peer Build"
[4]: https://raw.githubusercontent.com/macho715/tr_dash/main/package.json "raw.githubusercontent.com"
