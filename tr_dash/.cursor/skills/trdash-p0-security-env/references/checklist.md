# P0 Env Hygiene Checklist

- [ ] git ls-files 에서 .env*, env.vercel.* 가 추적 중인지 확인
- [ ] .gitignore 에 아래 패턴 추가:
  - .env
  - .env.*
  - env.vercel.*
  - .env.local
  - .env.production
- [ ] PR에서 env 파일 커밋을 막는 체크(훅/CI/리뷰 룰) 추가
- [ ] 노출 의심 시 키/토큰 로테이션(조직 절차 준수)
