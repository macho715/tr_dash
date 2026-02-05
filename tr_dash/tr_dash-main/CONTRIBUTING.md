# 기여 가이드 (Contributing) — TR Movement Dashboard

**참조**: [AGENTS.md](AGENTS.md) §2 개발 워크플로우, §3 Commands, §7 PR 체크리스트. [README.md](README.md) 개발 명령·아키텍처·커밋 규칙.

---

## 1. 개발 워크플로우 (AGENTS §2)

1. **먼저 읽기**: `option_c.json`(또는 SSOT API)과 스키마/enum 확인. 리플로우·충돌 탐지 코드 위치 파악.
2. **변경 계획**: 변경 목적, 영향 파일·컴포넌트, 테스트 계획을 PR 설명에 요약. 스키마/enum/상태머신 파괴적 변경은 "Ask first".
3. **구현**: 파생 값은 derived(calc)로만 계산, SSOT로 승격하지 않음.
4. **검증**: Reflow 결정론 테스트, Cycle 탐지 테스트, Evidence gate 테스트 최소 1개 이상 유지.

---

## 2. 명령어 (AGENTS §3)

- 스크립트는 `package.json`에서 확인 후 **존재하는 스크립트만** 실행.
- 패키지 매니저: `pnpm-lock.yaml` 있으면 pnpm, 없으면 npm.
- Install: `pnpm install` / `npm install`
- Dev: `pnpm dev` / `npm run dev`
- Typecheck: `pnpm typecheck` / `npm run typecheck`
- Lint: `pnpm lint` / `npm run lint`
- Test: `pnpm test` / `npm test`

---

## 3. PR 체크리스트 (AGENTS §7)

- [ ] SSOT 불변조건 위반 없음 (Activity=SSOT, Trip/TR=ref, 파생=derived)
- [ ] Reflow 결정론 테스트 추가/유지 (동일 입력→동일 출력)
- [ ] Cycle 탐지 실패 시 중단 동작 확인
- [ ] Evidence gate 전이 차단 확인
- [ ] Live/History/Approval 모드 권한 분리 유지
- [ ] Preview→Apply 분리 유지 (Approval에서는 Apply 불가)

---

## 4. 안전/권한

- **Allowed without prompt**: 파일 읽기/검색, 단일 테스트·린트·타입체크, Preview(reflow preview), 문서/주석 수정.
- **Ask first**: 패키지 추가/업그레이드, 대규모 리팩터링, 파일 삭제/이동, 스키마/enum 변경, Apply로 SSOT plan 실제 변경, auth/권한/배포 설정 변경.

---

**Refs**: [AGENTS.md](AGENTS.md), [README.md](README.md), [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)
