#!/usr/bin/env tsx
/**
 * TDD Workflow Automation - Red → Green → Refactor
 * 
 * Usage:
 *   pnpm tdd:watch              # Watch mode for continuous TDD
 *   pnpm tdd:cycle [test-file]  # Single TDD cycle
 *   pnpm tdd:verify             # Verify all gates (TypeCheck + Lint + Test + SSOT)
 * 
 * TDD Cycle:
 *   1. RED: Write failing test
 *   2. GREEN: Minimal implementation to pass
 *   3. REFACTOR: Improve structure (tests still pass)
 *   4. COMMIT: Separate structural/behavioral commits
 */

import { execSync, spawn } from 'child_process';
import { watch } from 'fs';
import { resolve, relative } from 'path';
import { existsSync } from 'fs';

// ANSI Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface TDDGateResult {
  gate: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration_ms: number;
  output?: string;
  error?: string;
}

interface TDDCycleResult {
  phase: 'RED' | 'GREEN' | 'REFACTOR';
  gates: TDDGateResult[];
  overall: 'PASS' | 'FAIL';
  timestamp: string;
}

class TDDWorkflowAutomation {
  private workspaceRoot: string;
  private packageManager: 'pnpm' | 'npm';
  private watchMode: boolean = false;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.packageManager = existsSync(resolve(this.workspaceRoot, 'pnpm-lock.yaml')) 
      ? 'pnpm' 
      : 'npm';
  }

  /**
   * Print formatted message
   */
  private log(message: string, color: keyof typeof colors = 'reset') {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Print TDD phase banner
   */
  private printPhaseBanner(phase: 'RED' | 'GREEN' | 'REFACTOR') {
    const banners = {
      RED: `
╔══════════════════════════════════════════╗
║  🔴 RED Phase: Write Failing Test       ║
╚══════════════════════════════════════════╝`,
      GREEN: `
╔══════════════════════════════════════════╗
║  🟢 GREEN Phase: Minimal Implementation  ║
╚══════════════════════════════════════════╝`,
      REFACTOR: `
╔══════════════════════════════════════════╗
║  🔧 REFACTOR Phase: Improve Structure    ║
╚══════════════════════════════════════════╝`,
    };

    console.log(colors.bold + banners[phase] + colors.reset);
  }

  /**
   * Execute command with timeout
   */
  private execCommand(
    command: string,
    timeoutMs: number = 60000
  ): { stdout: string; stderr: string; success: boolean; duration: number } {
    const startTime = Date.now();
    
    try {
      const result = execSync(command, {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
        timeout: timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      return {
        stdout: result.toString(),
        stderr: '',
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        success: false,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Gate 1: TypeCheck
   */
  private async runTypeCheck(): Promise<TDDGateResult> {
    this.log('Running TypeScript type check...', 'cyan');
    const startTime = Date.now();

    const result = this.execCommand(`${this.packageManager} run typecheck`, 30000);
    
    return {
      gate: 'TypeCheck',
      status: result.success ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - startTime,
      output: result.stdout,
      error: result.stderr,
    };
  }

  /**
   * Gate 2: Lint
   */
  private async runLint(): Promise<TDDGateResult> {
    this.log('Running ESLint...', 'cyan');
    const startTime = Date.now();

    const result = this.execCommand(`${this.packageManager} run lint`, 30000);
    
    return {
      gate: 'Lint',
      status: result.success ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - startTime,
      output: result.stdout,
      error: result.stderr,
    };
  }

  /**
   * Gate 3: Tests
   */
  private async runTests(testFile?: string): Promise<TDDGateResult> {
    const testCmd = testFile
      ? `${this.packageManager} run test:run ${testFile}`
      : `${this.packageManager} run test:run`;

    this.log(`Running tests${testFile ? ` (${testFile})` : ''}...`, 'cyan');
    const startTime = Date.now();

    const result = this.execCommand(testCmd, 60000);
    
    return {
      gate: 'Tests',
      status: result.success ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - startTime,
      output: result.stdout,
      error: result.stderr,
    };
  }

  /**
   * Gate 4: SSOT Validation
   */
  private async runSSOTValidation(): Promise<TDDGateResult> {
    this.log('Running SSOT validation (Contract v0.8.0)...', 'cyan');
    const startTime = Date.now();

    const ssotFile = resolve(this.workspaceRoot, 'data/schedule/option_c_v0.8.0.json');
    
    if (!existsSync(ssotFile)) {
      return {
        gate: 'SSOT',
        status: 'SKIP',
        duration_ms: Date.now() - startTime,
        output: 'SSOT file not found (skipped)',
      };
    }

    const result = this.execCommand(
      `python scripts/validate_optionc.py ${ssotFile}`,
      30000
    );
    
    return {
      gate: 'SSOT',
      status: result.success ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - startTime,
      output: result.stdout,
      error: result.stderr,
    };
  }

  /**
   * Gate 5: Build (optional)
   */
  private async runBuild(): Promise<TDDGateResult> {
    this.log('Running build...', 'cyan');
    const startTime = Date.now();

    const result = this.execCommand(`${this.packageManager} run build`, 120000);
    
    return {
      gate: 'Build',
      status: result.success ? 'PASS' : 'FAIL',
      duration_ms: Date.now() - startTime,
      output: result.stdout,
      error: result.stderr,
    };
  }

  /**
   * Run all quality gates
   */
  async runAllGates(options: {
    typecheck?: boolean;
    lint?: boolean;
    tests?: boolean;
    ssot?: boolean;
    build?: boolean;
    testFile?: string;
  } = {}): Promise<TDDGateResult[]> {
    const {
      typecheck = true,
      lint = true,
      tests = true,
      ssot = true,
      build = false,
      testFile,
    } = options;

    const gates: TDDGateResult[] = [];

    if (typecheck) gates.push(await this.runTypeCheck());
    if (lint) gates.push(await this.runLint());
    if (tests) gates.push(await this.runTests(testFile));
    if (ssot) gates.push(await this.runSSOTValidation());
    if (build) gates.push(await this.runBuild());

    return gates;
  }

  /**
   * Print gate results
   */
  private printGateResults(gates: TDDGateResult[]) {
    console.log('\n' + colors.bold + '📊 Quality Gate Results:' + colors.reset);
    console.log('═'.repeat(80));

    for (const gate of gates) {
      const statusIcon = gate.status === 'PASS' ? '✅' : gate.status === 'FAIL' ? '❌' : '⊘';
      const statusColor = gate.status === 'PASS' ? 'green' : gate.status === 'FAIL' ? 'red' : 'yellow';
      const duration = (gate.duration_ms / 1000).toFixed(2);

      console.log(
        `${statusIcon} ${colors[statusColor]}${gate.gate.padEnd(15)}${colors.reset} ` +
        `${gate.status.padEnd(6)} (${duration}s)`
      );

      if (gate.status === 'FAIL' && gate.error) {
        console.log(colors.red + '   └─ ' + gate.error.split('\n')[0] + colors.reset);
      }
    }

    console.log('═'.repeat(80));

    const allPassed = gates.every(g => g.status === 'PASS' || g.status === 'SKIP');
    const totalDuration = gates.reduce((sum, g) => sum + g.duration_ms, 0) / 1000;

    if (allPassed) {
      console.log(colors.green + colors.bold + `\n✅ ALL GATES PASSED (${totalDuration.toFixed(2)}s)\n` + colors.reset);
    } else {
      console.log(colors.red + colors.bold + `\n❌ SOME GATES FAILED (${totalDuration.toFixed(2)}s)\n` + colors.reset);
    }

    return allPassed;
  }

  /**
   * RED Phase: Verify test fails
   */
  async runRedPhase(testFile?: string): Promise<boolean> {
    this.printPhaseBanner('RED');
    
    this.log('Expecting test to FAIL (this is good!)', 'yellow');
    this.log('Write a failing test that describes desired behavior', 'cyan');

    const gates = await this.runAllGates({
      typecheck: true,
      lint: false, // Skip lint in RED (test might have warnings)
      tests: true,
      ssot: false,
      testFile,
    });

    const testGate = gates.find(g => g.gate === 'Tests');
    
    if (testGate?.status === 'FAIL') {
      this.log('✅ RED Phase PASS: Test correctly fails', 'green');
      return true;
    } else {
      this.log('❌ RED Phase FAIL: Test should fail but passed', 'red');
      this.log('   Write a test that fails before implementation', 'yellow');
      return false;
    }
  }

  /**
   * GREEN Phase: Minimal implementation to pass tests
   */
  async runGreenPhase(testFile?: string): Promise<boolean> {
    this.printPhaseBanner('GREEN');
    
    this.log('Implement MINIMAL code to pass the test', 'cyan');

    const gates = await this.runAllGates({
      typecheck: true,
      lint: false, // Skip lint (focus on passing test)
      tests: true,
      ssot: true,
      testFile,
    });

    const allPassed = this.printGateResults(gates);

    if (allPassed) {
      this.log('✅ GREEN Phase PASS: Tests passing!', 'green');
      return true;
    } else {
      this.log('❌ GREEN Phase FAIL: Tests not passing yet', 'red');
      return false;
    }
  }

  /**
   * REFACTOR Phase: Improve code structure
   */
  async runRefactorPhase(testFile?: string): Promise<boolean> {
    this.printPhaseBanner('REFACTOR');
    
    this.log('Improve code structure (tests must still pass)', 'cyan');

    const gates = await this.runAllGates({
      typecheck: true,
      lint: true, // Now enforce lint
      tests: true,
      ssot: true,
      build: false, // Optional
      testFile,
    });

    const allPassed = this.printGateResults(gates);

    if (allPassed) {
      this.log('✅ REFACTOR Phase PASS: Clean code!', 'green');
      this.log('💡 Ready to commit (separate structural/behavioral)', 'magenta');
      return true;
    } else {
      this.log('❌ REFACTOR Phase FAIL: Quality gates not met', 'red');
      return false;
    }
  }

  /**
   * Full TDD cycle
   */
  async runFullCycle(testFile?: string): Promise<TDDCycleResult> {
    const timestamp = new Date().toISOString();
    
    console.log(colors.bold + colors.cyan);
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔄 TDD Workflow Automation: Red → Green → Refactor         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    // Phase 1: RED
    const redSuccess = await this.runRedPhase(testFile);
    if (!redSuccess) {
      return {
        phase: 'RED',
        gates: [],
        overall: 'FAIL',
        timestamp,
      };
    }

    console.log('\n' + '─'.repeat(80) + '\n');

    // Phase 2: GREEN
    const greenSuccess = await this.runGreenPhase(testFile);
    if (!greenSuccess) {
      return {
        phase: 'GREEN',
        gates: [],
        overall: 'FAIL',
        timestamp,
      };
    }

    console.log('\n' + '─'.repeat(80) + '\n');

    // Phase 3: REFACTOR
    const refactorSuccess = await this.runRefactorPhase(testFile);

    return {
      phase: 'REFACTOR',
      gates: [],
      overall: refactorSuccess ? 'PASS' : 'FAIL',
      timestamp,
    };
  }

  /**
   * Verify all gates (for CI/pre-commit)
   */
  async verify(): Promise<boolean> {
    console.log(colors.bold + colors.cyan);
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🛡️  TDD Quality Gate Verification                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    const gates = await this.runAllGates({
      typecheck: true,
      lint: true,
      tests: true,
      ssot: true,
      build: false, // Skip build for speed (CI will do full build)
    });

    return this.printGateResults(gates);
  }

  /**
   * Watch mode: Run tests on file changes
   */
  startWatchMode(testPattern?: string) {
    this.watchMode = true;
    this.log('👀 Watch mode activated (TDD cycle on save)', 'magenta');
    this.log(`   Watching: src/, lib/, components/`, 'cyan');
    this.log(`   Press Ctrl+C to stop\n`, 'yellow');

    // Run initial tests
    this.log('Running initial tests...', 'cyan');
    this.runTests(testPattern);

    // Watch directories
    const watchDirs = ['src', 'lib', 'components'];
    
    watchDirs.forEach(dir => {
      const dirPath = resolve(this.workspaceRoot, dir);
      if (!existsSync(dirPath)) return;

      watch(dirPath, { recursive: true }, async (eventType, filename) => {
        if (!filename) return;
        
        // Only watch TypeScript/TSX files
        if (!filename.match(/\.(ts|tsx)$/)) return;
        
        // Skip node_modules
        if (filename.includes('node_modules')) return;

        const relativePath = relative(this.workspaceRoot, resolve(dirPath, filename));
        this.log(`\n📝 File changed: ${relativePath}`, 'yellow');

        // Debounce: Wait a bit for editor to finish saving
        setTimeout(async () => {
          const isTestFile = filename.includes('.test.');
          
          if (isTestFile) {
            // Test file changed: Run that test only
            await this.runGreenPhase(resolve(dirPath, filename));
          } else {
            // Source file changed: Run all tests
            await this.runGreenPhase();
          }
        }, 300);
      });
    });

    // Keep process alive
    process.stdin.resume();
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const testFile = args[1];

  const tdd = new TDDWorkflowAutomation();

  switch (command) {
    case 'red':
      await tdd.runRedPhase(testFile);
      break;

    case 'green':
      await tdd.runGreenPhase(testFile);
      break;

    case 'refactor':
      await tdd.runRefactorPhase(testFile);
      break;

    case 'cycle':
      await tdd.runFullCycle(testFile);
      break;

    case 'verify':
      const success = await tdd.verify();
      process.exit(success ? 0 : 1);
      break;

    case 'watch':
      tdd.startWatchMode(testFile);
      break;

    default:
      console.log(`
TDD Workflow Automation

Usage:
  tsx scripts/tdd-workflow.ts <command> [test-file]

Commands:
  red              Run RED phase (expect test to fail)
  green            Run GREEN phase (minimal implementation)
  refactor         Run REFACTOR phase (improve structure)
  cycle            Run full TDD cycle (red→green→refactor)
  verify           Verify all quality gates (CI/pre-commit)
  watch            Watch mode (auto-run on file changes)

Examples:
  tsx scripts/tdd-workflow.ts cycle
  tsx scripts/tdd-workflow.ts watch
  tsx scripts/tdd-workflow.ts green src/lib/__tests__/derived-calc.test.ts
  tsx scripts/tdd-workflow.ts verify
      `);
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(colors.red + '❌ Error:', error.message + colors.reset);
    process.exit(1);
  });
}

export { TDDWorkflowAutomation };
