# Release Split Operations (General vs Mobile)

Last updated: 2026-02-11

## Goal

Use one development repository, but always upload/deploy general and mobile separately.

## Fixed Mapping

- General: `origin/main` -> Vercel `trdash`
- Mobile: `mobile-origin/main` -> Vercel `trdash-mobile`

## Branch Policy

- Development branch: `develop`
- Release branches:
  - `release/general`
  - `release/mobile`

Direct pushes to any `*/main` from `develop` are blocked.

## One-time Setup

1. Ensure remotes:

```powershell
git remote -v
```

Expected:
- `origin=https://github.com/macho715/tr_dash.git`
- `mobile-origin=https://github.com/macho715/tr_dash_mobile.git`

2. Branch protection on both repositories (`main`):
- Require PR or required checks
- Disable force push
- Disable deletion

3. Vercel mapping:
- `trdash` uses `tr_dash/main`
- `trdash-mobile` uses `tr_dash_mobile/main`
- Keep `NEXT_PUBLIC_GANTT_ENGINE=vis` in production/preview/development for mobile project

## Daily Workflow

1. Develop from `develop`:

```powershell
git switch develop
```

2. General release:

```powershell
pnpm release:general
```

3. Mobile release:

```powershell
pnpm release:mobile
```

## Guardrails

- `.husky/pre-push` executes `scripts/release/pre-push-guard.ps1`.
- Allowed `main` pushes only:
  - `release/general -> origin/main`
  - `release/mobile -> mobile-origin/main`
- Secret-like env files are blocked if tracked in git (except `.example`/`.sample`/`.template`).

## Dry-run Validation

```powershell
pnpm release:general -- --dry-run
pnpm release:mobile -- --dry-run
```

## Rollback

1. Emergency bypass (temporary): disable `.husky/pre-push`.
2. If wrong deployment happened:
- reset target repo `main` to previous commit and push
- use Vercel rollback/promote previous deployment
3. Rebuild release branches from `develop` if needed:

```powershell
git branch -D release/general release/mobile
```

## Notes

- `backups/` remains untracked.
- This flow does not change SSOT schema/state machine.

## Full Execution Record

- [release-history-20260211.md](release-history-20260211.md) — T1~T4 수행 타임라인, 검증 결과, 핵심 사실값 고정 레코드.

## GitHub Required Checks

Set the following required status checks on `main` for both repositories (`tr_dash`, `tr_dash_mobile`):

1. `quality-gate / typecheck`
2. `quality-gate / lint`
3. `quality-gate / test`
4. `quality-gate / build`
5. `release-policy / enforce-release-source`
6. `secret-guard / tracked-env-check`
7. `secret-guard / gitleaks`

Additional branch protection:

1. Require pull request before merge
2. Disallow force pushes
3. Disallow branch deletion
