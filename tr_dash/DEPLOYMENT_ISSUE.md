# Deployment Version Mismatch Issue

## Problem
로컬 프로덕션 빌드와 Vercel 프로덕션 배포의 HTML 크기가 다릅니다:
- **로컬 (pnpm start)**: 66KB
- **Vercel**: 164KB

## Root Cause
두 환경의 빌드가 **다른 시점**에 생성되었습니다:
1. **로컬**: 방금 빌드됨 (최신 코드)
2. **Vercel**: 18분 전 배포됨 (커밋 17ad073)

## 차이점
- Vercel은 더 많은 pre-rendered 데이터를 포함
- Vercel은 전체 static 페이지 generation 완료
- 로컬은 최소 빌드 (환경 변수 차이 가능)

## Solution
Vercel에서 최신 빌드를 다시 배포해야 합니다:

```bash
# 1. 로컬 변경사항 커밋
git add .
git commit -m "sync: latest changes"
git push origin main

# 2. Vercel 재배포
vercel --prod --force
```

## Verification
배포 후:
1. 브라우저 캐시 클리어 (Ctrl+Shift+R)
2. 두 URL 비교:
   - Local: http://localhost:3001
   - Vercel: https://trdash.vercel.app
