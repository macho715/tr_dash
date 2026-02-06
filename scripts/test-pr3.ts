import { readFileSync, writeFileSync } from "fs"
import { runPR1Pipeline, parseEventLogCsv } from "@/lib/ops/event-sourcing/pipeline-pr1"
import { runPR2Pipeline, applyPatches } from "@/lib/ops/event-sourcing/pipeline-pr2"
import { runPR3Pipeline } from "@/lib/ops/event-sourcing/pipeline-pr3"
import type { OptionC } from "@/src/types/ssot"

async function main() {
  console.log("🚀 PR#3 Pipeline Test (Full E2E)\n")

  const optionC = JSON.parse(
    readFileSync("data/schedule/option_c_v0.8.0.json", "utf-8")
  ) as OptionC
  const eventsCsv = readFileSync("data/event-logs/sample_events.csv", "utf-8")
  const events = parseEventLogCsv(eventsCsv)

  console.log("📊 PR#1: Activity ID Resolution...")
  const pr1Report = await runPR1Pipeline(eventsCsv, optionC)
  console.log(`✅ Match rate: ${(pr1Report.matching_rate * 100).toFixed(2)}%\n`)

  console.log("🔧 PR#2: JSON Patch Generation...")
  const pr2Report = await runPR2Pipeline(pr1Report, events, optionC)
  const patchResult = applyPatches(optionC, pr2Report.patch_file.operations)
  console.log(`✅ ${pr2Report.total_operations} patches applied\n`)

  console.log("📊 PR#3: Derived KPI Calculation...")
  const pr3Report = await runPR3Pipeline(patchResult.document, events)

  console.log("\n✅ PR#3 Results:")
  console.log(`  - Activities with KPI: ${pr3Report.total_activities_with_kpi}`)
  console.log(`  - Avg Variance: ${pr3Report.summary.avg_variance_hr.toFixed(2)}hr`)
  console.log(`  - Total Delay: ${pr3Report.summary.total_delay_hr.toFixed(2)}hr`)
  console.log(`  - High Variance Alerts: ${pr3Report.high_variance_alerts.length}`)

  console.log("\n📊 Delay Breakdown:")
  for (const [tag, hours] of Object.entries(pr3Report.summary.delay_breakdown_total)) {
    console.log(`  - ${tag}: ${hours.toFixed(2)}hr`)
  }

  const finalResult = applyPatches(patchResult.document, pr3Report.kpi_patches)
  if (finalResult.success) {
    const outputPath = "data/schedule/option_c_v0.8.0_final.json"
    writeFileSync(outputPath, JSON.stringify(finalResult.document, null, 2))
    console.log(`\n✅ Final document saved: ${outputPath}`)
  }

  const reportPath = "reports/event-sourcing/pr3-test-report.json"
  writeFileSync(reportPath, JSON.stringify(pr3Report, null, 2))
  console.log(`📝 PR#3 report saved: ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
