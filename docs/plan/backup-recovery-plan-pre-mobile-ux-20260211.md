# 실패 대비 백업/복구 계획 (모바일 UX 작업 전)

**작성일**: 2026-02-11  
**목적**: 작업 실패 시 **5분 내 원복**  
**전제**: 백업은 Git 스냅샷 + 패치 파일 + 외부 압축본 **3중** 준비

---

## 요약

- **목표**: 실패 시 5분 내 원복
- **백업 3중**: (1) Git 스냅샷 브랜치·태그 (2) 패치 파일 (3) 외부 압축본(레포 밖)

---

## 현재 기준 상태

- **현재 워크트리**: `mobile-ux-implementation-plan-20260211.md` 1개 untracked (작성 시점 기준)

---

## 실행 절차 (작업 시작 전)

### 1. 백업 폴더 생성

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
```

### 2. 기준점 기록

```powershell
git rev-parse --short HEAD | Out-File backups\pre_mobileux_head.txt
git status --short | Out-File backups\pre_mobileux_status.txt
```

### 3. Git 스냅샷 브랜치 + 태그

```powershell
git switch -c backup/mobile-ux-preflight-20260211
git add -A
git commit -m "backup: pre mobile ux implementation snapshot"
git tag backup/mobile-ux-preflight-20260211
```

### 4. 패치 파일 백업

```powershell
git format-patch -1 HEAD -o backups
git show --stat HEAD > backups\pre_mobileux_commit_stat.txt
```

### 5. 외부 압축 백업 (권장, 레포 밖)

- **우선**: `Compress-Archive` 사용. 실패 시(예: `.next/dev/lock` 등 실행 중 프로세스 잠금) **`git archive`** 로 대체.
- `git archive`는 커밋 기준 트리만 압축하므로 워크트리 미커밋 파일은 포함되지 않음. 필요 시 먼저 커밋 후 실행.

```powershell
# 방법 A: 워크트리 전체 압축 (lock 파일 있으면 실패 가능)
Compress-Archive -Path .\* -DestinationPath ..\tr_dashboard-main_pre_mobileux_20260211.zip -Force

# 방법 B: lock 등으로 실패 시 — 커밋 기준만 압축 (권장 대체)
git archive --format=zip --output=..\tr_dashboard-main_pre_mobileux_20260211.zip HEAD
```

---

## 복구 절차

- **주의**: 브랜치명과 태그명이 동일하면 `backup/mobile-ux-preflight-20260211` 참조 시 Git이 ambiguous ref 경고를 냅니다. 복구 시 **명시적 ref** 사용을 권장합니다.

### 코드 전체 즉시 원복

```bash
# 명시적 ref (ambiguous 경고 회피)
git switch refs/heads/backup/mobile-ux-preflight-20260211
```

### 현재 브랜치 유지 + 스냅샷 상태로 강제 복구

```bash
git reset --hard refs/heads/backup/mobile-ux-preflight-20260211
```

### 태그 기준 스냅샷 확인

```bash
git show --name-only refs/tags/backup/mobile-ux-preflight-20260211
```

### 패치 기반 복구

```bash
git apply backups\0001-backup-pre-mobile-ux-implementation-snapshot.patch
```

---

## 검증 (백업 직후)

- `git show --name-only refs/tags/backup/mobile-ux-preflight-20260211` 로 스냅샷 내용 확인
- zip 파일 생성 여부 확인
- **테스트 복구 드릴**: 임시 파일 생성 후 `refs/heads/backup/mobile-ux-preflight-20260211` 전환으로 원복 확인

---

## 보안/가드레일

- **`.env*`**, **env.vercel.*** 등 비밀 파일은 백업/커밋 **제외**
- 백업 커밋 메시지는 기능 커밋과 분리 유지 → **`backup:`** prefix 사용

---

## 주의사항 (실행 결과 반영)

| 항목 | 내용 |
|------|------|
| **Ambiguous ref** | 브랜치와 태그 이름이 같으면 `backup/mobile-ux-preflight-20260211`만 쓰면 경고. 복구/검증 시 `refs/heads/...`(브랜치), `refs/tags/...`(태그) 명시. |
| **ZIP 생성** | `Compress-Archive`는 `.next/dev/lock` 등 실행 중 잠금 파일 때문에 실패할 수 있음. 이때 `git archive --format=zip --output=... HEAD` 로 대체. (커밋 기준만 포함) |

---

## Refs

- [mobile-ux-implementation-plan.md](mobile-ux-implementation-plan.md)
- [AGENTS.md](../../AGENTS.md) — 보안/배포 위생 (.env 레포 커밋 금지)
