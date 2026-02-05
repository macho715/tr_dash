/**
 * P1-4: Gantt 범례/태그 설명 — 클릭 시 Drawer에 표시할 정의 + 의사결정 영향
 */

export type LegendItemKind = "stage" | "constraint" | "collision" | "meta"

export interface LegendDefinition {
  id: string
  kind: LegendItemKind
  label: string
  shortLabel: string
  /** 한글 정의 (120자 이하) */
  definition: string
  /** 의사결정 영향 (운영자 액션 중심) */
  impact: string
}

const STAGE_DEFS: LegendDefinition[] = [
  {
    id: "mobilization",
    kind: "stage",
    label: "Mobilization / Demobilization",
    shortLabel: "Mobilization/Demob",
    definition: "SPMT·장비 현장 반입/반출 구간. MOB 일정은 항차 시작 전 리소스 확보와 직결됩니다.",
    impact: "MOB 지연 시 로드아웃 전 구간 전체 지연. 자원·PTW 확정 후 일정 확정.",
  },
  {
    id: "loadout",
    kind: "stage",
    label: "Load-out (MZP)",
    shortLabel: "Load-out (MZP)",
    definition: "미나 자예드 항(MZP)에서 TR 유닛을 LCT에 적재하는 구간.",
    impact: "로드아웃 완료일이 세일어웨이·해상 이송 시작을 결정. 날씨·LNK/BRG 가용성 확인.",
  },
  {
    id: "transport",
    kind: "stage",
    label: "Sea Transport (LCT)",
    shortLabel: "Sea Transport (LCT)",
    definition: "LCT로 TR 유닛을 해상 이송하는 구간. Go/No-Go 결정과 직결.",
    impact: "기상·해상 조건에 따라 출항일 변경. Go/No-Go 카드·ETA 갱신 확인.",
  },
  {
    id: "loadin",
    kind: "stage",
    label: "Load-in (AGI)",
    shortLabel: "Load-in (AGI)",
    definition: "AGI 사이트 저트리에서 LCT에서 TR을 하역하는 구간.",
    impact: "로드인 완료 시점이 터닝·잭다운 시작 가능일을 결정.",
  },
  {
    id: "turning",
    kind: "stage",
    label: "Turning (180°)",
    shortLabel: "Turning (180°)",
    definition: "TR 유닛 180° 회전 작업. 설비·공간 제약이 있습니다.",
    impact: "터닝 구간 연장 시 잭다운·마일스톤 지연. 리소스 충돌 시 재배치 검토.",
  },
  {
    id: "jackdown",
    kind: "stage",
    label: "Jack-down",
    shortLabel: "Jack-down",
    definition: "TR을 기초부에 내려 설치 완료하는 구간. 항차 종료 마일스톤.",
    impact: "잭다운 완료일 = 해당 항차 완료. 증빙(완료 보고) 필수.",
  },
]

const BADGE_DEFS: LegendDefinition[] = [
  { id: "W", kind: "constraint", label: "Weather", shortLabel: "[W]", definition: "기상(날씨) 제약. 해상 이송·작업 가능 창과 연동.", impact: "기상 창 이탈 시 일정 이동. WeatherTie·Go/No-Go 확인." },
  { id: "PTW", kind: "constraint", label: "Permit to Work", shortLabel: "[PTW]", definition: "작업 허가(PTW). 현장 작업 전 허가 필요.", impact: "PTW 미취득 시 작업 불가. 허가 일정과 일정 정합." },
  { id: "CERT", kind: "constraint", label: "Certificate", shortLabel: "[CERT]", definition: "인·허가·인증 요건(FANR 등).", impact: "증빙 누락 시 READY→IN_PROGRESS 차단. CertChk 확인." },
  { id: "LNK", kind: "constraint", label: "Linkspan", shortLabel: "[LNK]", definition: "연락교(linkspan) 가용성. 하역 구간 제약.", impact: "LNK 점유 시 로드아웃/로드인 일정 조정." },
  { id: "BRG", kind: "constraint", label: "Barge", shortLabel: "[BRG]", definition: "바지선(및 해상 자원) 가용성.", impact: "BRG 일정과 LCT 접안·작업 창 정합." },
  { id: "RES", kind: "constraint", label: "Resource", shortLabel: "[RES]", definition: "일반 자원(인력·장비) 태그. 리소스 충돌 탐지 대상.", impact: "동일 자원 중복 배정 시 충돌. 우선순위·스왑 검토." },
  { id: "COL", kind: "collision", label: "Collision", shortLabel: "[COL]", definition: "일정·자원·제약 충돌. Why 패널에서 원인 확인.", impact: "해결 전 Apply 금지 권장. suggested_actions 확인." },
  { id: "COL-LOC", kind: "collision", label: "Collision (Location)", shortLabel: "[COL-LOC]", definition: "장소(Location) 충돌. 동일 지오펜스/장소 이중 배정.", impact: "장소·시간 재배치 또는 순서 조정." },
  { id: "COL-DEP", kind: "collision", label: "Collision (Dependency)", shortLabel: "[COL-DEP]", definition: "선행 관계 충돌. 선행 활동 미완료 등.", impact: "선행 완료일 이동 또는 의존 관계 수정." },
  { id: "slack", kind: "meta", label: "Slack", shortLabel: "+Xd", definition: "여유(slack) 일수. 일정이 N일만큼 지연되어도 후속에 영향 없음.", impact: "슬랙이 작을수록 크리티컬. 우선 모니터링." },
  { id: "CP", kind: "meta", label: "Critical Path", shortLabel: "CP", definition: "크리티컬 패스. 이 구간 지연이 프로젝트 종료일을 직접 지연시킴.", impact: "CP 활동은 우선 리소스·증빙 확보." },
  { id: "Compare", kind: "meta", label: "Compare (shifted)", shortLabel: "[Compare]", definition: "비교 모드에서 기준 대비 이동(shift)된 활동.", impact: "변경 영향 검토 후 Apply 여부 결정." },
]

export const GANTT_LEGEND_DEFINITIONS: LegendDefinition[] = [...STAGE_DEFS, ...BADGE_DEFS]

const byId = new Map<string, LegendDefinition>()
GANTT_LEGEND_DEFINITIONS.forEach((d) => byId.set(d.id, d))

export function getLegendDefinition(id: string): LegendDefinition | undefined {
  return byId.get(id)
}
