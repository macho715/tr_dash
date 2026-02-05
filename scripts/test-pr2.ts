import { readFileSync, writeFileSync } from "fs"
import { runPR1Pipeline, parseEventLogCsv } from "@/lib/ops/event-sourcing/pipeline-pr1"
import { runPR2Pipeline, applyPatches } from "@/lib/ops/event-sourcing/pipeline-pr2"
import type { OptionC } from "@/src/types/ssot"

async function main() {
  console.log("🚀 PR#2 Pipeline Test\n")

  const optionC = JSON.parse(
    readFileSync("data/schedule/option_c_v0.8.0.json", "utf-8")
  ) as OptionC
  const eventsCsv = readFileSync("data/event-logs/sample_events.csv", "utf-8")

  console.log("📊 Running PR#1 (prerequisite)...")
  const pr1Report = await runPR1Pipeline(eventsCsv, optionC)
  console.log(`✅ PR#1: ${(pr1Report.matching_rate * 100).toFixed(2)}% match rate\n`)

  const events = parseEventLogCsv(eventsCsv)

  console.log("🔧 Running PR#2...")
  const pr2Report = await runPR2Pipeline(pr1Report, events, optionC)

  console.log("\n✅ PR#2 Results:")
  console.log(`  - Total Operations: ${pr2Report.total_operations}`)
  console.log(`  - Affected Activities: ${pr2Report.affected_activities}`)
  console.log(
    `  - Validation: ${pr2Report.validation_result.valid ? "✅ PASS" : "❌ FAIL"}`
  )

  console.log("\n📊 Operations by Type:")
  for (const [op, count] of Object.entries(pr2Report.operations_by_type)) {
    console.log(`  - ${op}: ${count}`)
  }

  console.log("\n🔨 Applying patches...")
  const result = applyPatches(optionC, pr2Report.patch_file.operations)

  if (result.success) {
    console.log("✅ Patches applied successfully")
    const outputPath = "data/schedule/option_c_v0.8.0_patched.json"
    writeFileSync(outputPath, JSON.stringify(result.document, null, 2))
    console.log(`📝 Patched document saved: ${outputPath}`)
  } else {
    console.error("❌ Patch application failed:", result.errors)
  }

  const reportPath = "reports/event-sourcing/pr2-test-report.json"
  writeFileSync(reportPath, JSON.stringify(pr2Report, null, 2))
  console.log(`\n📝 PR#2 report saved: ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
