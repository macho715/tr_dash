# TDD Workflow Automation Guide

## 🎯 개요

TR Dashboard 프로젝트의 **Kent Beck TDD 원칙** 기반 자동화 워크플로우입니다.

### TDD 사이클
```
RED → GREEN → REFACTOR → COMMIT
 ↓      ↓        ↓          ↓
실패   통과     정리      커밋
```

---

## 🚀 빠른 시작

### 1. 설치

```bash
# Dependencies 설치
pnpm install

# Git hooks 설정 (husky)
pnpm prepare

# 권한 설정 (Unix/Mac)
chmod +x .husky/pre-commit
chmod +x scripts/tdd-workflow.ts
```

### 2. 기본 사용법

```bash
# Watch 모드 (파일 저장 시 자동 실행)
pnpm tdd:watch

# 전체 TDD 사이클 (red→green→refactor)
pnpm tdd:cycle

# 품질 게이트 검증 (CI/pre-commit)
pnpm tdd:verify
```

---

## 📚 TDD 단계별 가이드

### 🔴 Phase 1: RED (실패하는 테스트 작성)

**목표:** 구현 전에 테스트 먼저 작성 (의도 명확화)

```bash
# RED phase 실행
pnpm tdd:red

# 특정 테스트 파일만
pnpm tdd:red src/lib/__tests__/my-feature.test.ts
```

**예시:**

```typescript
// src/lib/__tests__/trip-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTripProgress } from '../trip-calculator';

describe('calculateTripProgress', () => {
  it('should calculate progress from activity states', () => {
    const activities = [
      { activity_id: 'A1', state: 'completed' },
      { activity_id: 'A2', state: 'in_progress' },
      { activity_id: 'A3', state: 'planned' },
    ];
    
    // ❌ 아직 구현 안 됨 → 실패 예상
    const progress = calculateTripProgress(activities);
    
    expect(progress).toBe(33.33); // 1/3 완료
  });
});
```

**RED Phase 출력:**

```
╔══════════════════════════════════════════╗
║  🔴 RED Phase: Write Failing Test       ║
╚══════════════════════════════════════════╝

[12:34:56] Expecting test to FAIL (this is good!)
[12:34:57] Running tests...

❌ Tests           FAIL   (0.52s)
   └─ calculateTripProgress is not defined

✅ RED Phase PASS: Test correctly fails
```

---

### 🟢 Phase 2: GREEN (최소 구현)

**목표:** 테스트를 통과시키는 **최소한의 코드**만 작성

```bash
# GREEN phase 실행
pnpm tdd:green
```

**예시:**

```typescript
// src/lib/trip-calculator.ts
export function calculateTripProgress(activities: Activity[]): number {
  // 최소 구현 (테스트 통과만 목표)
  const completed = activities.filter(a => a.state === 'completed').length;
  return Math.round((completed / activities.length) * 100 * 100) / 100;
}
```

**GREEN Phase 출력:**

```
╔══════════════════════════════════════════╗
║  🟢 GREEN Phase: Minimal Implementation  ║
╚══════════════════════════════════════════╝

[12:35:10] Running TypeScript type check...
[12:35:12] Running tests...
[12:35:14] Running SSOT validation...

📊 Quality Gate Results:
════════════════════════════════════════════════════════════════════════════════
✅ TypeCheck       PASS   (2.14s)
✅ Tests           PASS   (1.83s)
✅ SSOT            PASS   (0.67s)
════════════════════════════════════════════════════════════════════════════════

✅ ALL GATES PASSED (4.64s)

✅ GREEN Phase PASS: Tests passing!
```

---

### 🔧 Phase 3: REFACTOR (구조 개선)

**목표:** 중복 제거, 명확한 코드 (테스트는 계속 통과해야 함)

```bash
# REFACTOR phase 실행
pnpm tdd:refactor
```

**예시:**

```typescript
// src/lib/trip-calculator.ts (리팩터링 후)

// 상수 추출
const PROGRESS_PRECISION = 2;

// 함수 분리
function countCompletedActivities(activities: Activity[]): number {
  return activities.filter(a => a.state === 'completed').length;
}

function roundToDecimal(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

// 메인 함수 (명확한 의도)
export function calculateTripProgress(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  
  const completedCount = countCompletedActivities(activities);
  const rawProgress = (completedCount / activities.length) * 100;
  
  return roundToDecimal(rawProgress, PROGRESS_PRECISION);
}
```

**REFACTOR Phase 출력:**

```
╔══════════════════════════════════════════╗
║  🔧 REFACTOR Phase: Improve Structure    ║
╚══════════════════════════════════════════╝

[12:36:20] Running TypeScript type check...
[12:36:22] Running ESLint...
[12:36:24] Running tests...
[12:36:25] Running SSOT validation...

📊 Quality Gate Results:
════════════════════════════════════════════════════════════════════════════════
✅ TypeCheck       PASS   (2.01s)
✅ Lint            PASS   (1.45s)
✅ Tests           PASS   (1.72s)
✅ SSOT            PASS   (0.58s)
════════════════════════════════════════════════════════════════════════════════

✅ ALL GATES PASSED (5.76s)

✅ REFACTOR Phase PASS: Clean code!
💡 Ready to commit (separate structural/behavioral)
```

---

### 💾 Phase 4: COMMIT (커밋 분리)

**원칙:** 구조적 변경과 행위적 변경을 **별도 커밋**

```bash
# 1) 행위적 변경 커밋 (테스트 + 최소 구현)
git add src/lib/__tests__/trip-calculator.test.ts
git add src/lib/trip-calculator.ts
git commit -m "[BEHAVIORAL] Add trip progress calculation

- Add test for progress from activity states
- Implement calculateTripProgress function
- Coverage: 100% for trip-calculator.ts

Refs: docs/plan/tr-dashboard-plan.md#task-3"

# 2) 구조적 변경 커밋 (리팩터링)
git add src/lib/trip-calculator.ts
git commit -m "[STRUCTURAL] Refactor trip progress calculation

- Extract countCompletedActivities helper
- Extract roundToDecimal utility
- Extract PROGRESS_PRECISION constant
- No behavior change (all tests pass)

Refs: TDD workflow refactor phase"
```

---

## 🔄 자동화 모드

### Watch 모드 (권장)

파일 저장 시 자동으로 TDD 사이클 실행

```bash
pnpm tdd:watch
```

**동작:**
- `src/`, `lib/`, `components/` 디렉토리 감시
- TypeScript/TSX 파일 변경 감지
- 테스트 파일 변경 → 해당 테스트만 실행
- 소스 파일 변경 → 전체 테스트 실행

**출력 예시:**

```
👀 Watch mode activated (TDD cycle on save)
   Watching: src/, lib/, components/
   Press Ctrl+C to stop

[12:40:15] Running initial tests...
✅ Tests PASS (1.82s)

[12:41:22] 📝 File changed: src/lib/trip-calculator.ts
[12:41:23] Running GREEN phase...
✅ GREEN Phase PASS: Tests passing!
```

---

## 🛡️ 품질 게이트

### 자동 검증 시점

1. **Pre-commit Hook** (커밋 전 자동 실행)
2. **CI Pipeline** (PR/Push 시 GitHub Actions)
3. **수동 검증** (`pnpm tdd:verify`)

### 검증 항목

| Gate | 검증 내용 | 실패 시 |
|------|----------|---------|
| **TypeCheck** | 타입 오류 0개 | 커밋 차단 |
| **Lint** | ESLint 경고 0개 | 커밋 차단 |
| **Tests** | 모든 테스트 통과 | 커밋 차단 |
| **SSOT** | Contract v0.8.0 준수 | 커밋 차단 |
| **Build** | 프로덕션 빌드 성공 | CI 차단 |

### Pre-commit Hook 동작

```bash
# 커밋 시도
git commit -m "feat: add new feature"

# 자동 실행
🛡️  Running TDD quality gates...

╔═══════════════════════════════════════════════════════════════╗
║  🛡️  TDD Quality Gate Verification                          ║
╚═══════════════════════════════════════════════════════════════╝

✅ TypeCheck       PASS   (2.14s)
✅ Lint            PASS   (1.45s)
✅ Tests           PASS   (1.83s)
✅ SSOT            PASS   (0.67s)

✅ ALL GATES PASSED (6.09s)

# 커밋 허용
[main abc1234] feat: add new feature
```

---

## 🎨 VSCode/Cursor 통합

### Tasks 실행

**Command Palette** (Ctrl+Shift+P / Cmd+Shift+P) → "Tasks: Run Task"

- `TDD: Red Phase`
- `TDD: Green Phase`
- `TDD: Refactor Phase`
- `TDD: Full Cycle` ⭐ (기본)
- `TDD: Watch Mode` ⭐
- `TDD: Verify All`

### 키보드 단축키 설정 (선택)

`.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask",
    "args": "TDD: Full Cycle"
  },
  {
    "key": "ctrl+shift+w",
    "command": "workbench.action.tasks.runTask",
    "args": "TDD: Watch Mode"
  }
]
```

---

## 📊 CI Pipeline 통합

### GitHub Actions (자동)

`.github/workflows/ci.yml`에 통합됨:

```yaml
jobs:
  tdd-quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      
      - name: TDD Quality Gate
        run: pnpm tdd:verify
```

---

## 🔧 고급 사용법

### 특정 테스트만 TDD 사이클

```bash
# 단일 테스트 파일로 전체 사이클
pnpm tdd:cycle src/lib/__tests__/reflow-manager.test.ts

# 특정 phase만
pnpm tdd:green lib/gantt/__tests__/density.test.ts
```

### SSOT 검증 단독 실행

```bash
# option_c_v0.8.0.json 검증
python scripts/validate_optionc.py data/schedule/option_c_v0.8.0.json

# npm script로
pnpm validate:ssot
```

### 커버리지 확인

```bash
# 테스트 + 커버리지 리포트
pnpm test:run --coverage

# HTML 리포트 (coverage/index.html)
open coverage/index.html
```

---

## 🐛 문제 해결

### Q1: Pre-commit hook이 실행되지 않음

```bash
# Husky 재설정
pnpm prepare

# 권한 확인 (Unix/Mac)
chmod +x .husky/pre-commit
```

### Q2: Watch 모드가 파일 변경을 감지하지 못함

```bash
# Node.js 파일 감시 리밋 증가 (Linux/Mac)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Q3: SSOT 검증 실패 (Python 오류)

```bash
# Python 의존성 설치
pip install openpyxl pandas jsonschema

# Python 버전 확인 (3.11+ 권장)
python --version
```

### Q4: TypeScript 오류 (tsx 명령어 없음)

```bash
# tsx 설치
pnpm add -D tsx

# 또는 package.json 스크립트 수정
"tdd:cycle": "node --loader tsx scripts/tdd-workflow.ts cycle"
```

---

## 📖 참고 문서

- [AGENTS.md](../AGENTS.md) - 프로젝트 불변조건
- [Kent Beck TDD Guide](../.cursor/rules/*.mdc) - TDD 원칙
- [Contract v0.8.0](../docs/ssot-api-contract.md) - SSOT 계약
- [Reflow Runbook](../docs/runbook-state-reflow-collision.md) - 상태머신

---

## 🎯 체크리스트

### TDD 사이클 완료 체크

- [ ] RED: 실패하는 테스트 작성 완료
- [ ] GREEN: 테스트 통과 (최소 구현)
- [ ] REFACTOR: 코드 정리 (테스트 여전히 통과)
- [ ] COMMIT: 구조/행위 분리 커밋
- [ ] SSOT: option_c.json 무결성 검증
- [ ] Coverage: 80% 이상 유지

### PR 생성 전 체크

- [ ] `pnpm tdd:verify` 전체 통과
- [ ] 새 기능에 테스트 3개 이상 추가
- [ ] 모든 커밋이 [STRUCTURAL] or [BEHAVIORAL] 포함
- [ ] SSOT 위반 없음 (Trip/TR에 state 저장 X)

---

**Happy TDD! 🚀**
