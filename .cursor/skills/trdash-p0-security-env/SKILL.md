---
name: trdash-p0-security-env
description: TR_Dash 레포에서 env/secret 위생(P0)을 처리한다. .env.vercel.production 등 env 파일의 git 추적 여부를 탐지하고, 안전한 방식으로 추적 제거(dry-run) 및 .gitignore 강화, Vercel env 운영 표준화를 수행할 때 사용.
disable-model-invocation: true
---

# trdash-p0-security-env

## 원칙(필수)
- 기본은 "탐지/보고"만 한다.
- 파일 삭제/추적 제거는 반드시 dry-run → 명령만 출력 → 사람이 실행한다.
- 노출 의심 시: 키 로테이션(조직 절차) 우선.

## 절차
1) scripts/find-tracked-env.sh 실행 → 추적 중 env 파일 목록 확보
2) 필요 시 scripts/untrack-env-dryrun.sh 로 명령 생성
3) references/checklist.md에 따라 .gitignore 강화 및 재발 방지

## Done 정의
- [ ] env 파일이 git index에 남아있지 않다
- [ ] .gitignore 패턴이 포함됐다
- [ ] 재발 방지(리뷰/스캔/체크) 경로가 문서화됐다
