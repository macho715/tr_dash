import { readFileSync, writeFileSync } from "fs"
import { runPR1Pipeline } from "@/lib/ops/event-sourcing/pipeline-pr1"
import type { OptionC } from "@/src/types/ssot"

async function main() {
  const optionC = JSON.parse(
    readFileSync("data/schedule/option_c_v0.8.0.json", "utf-8")
  ) as OptionC

  const eventsCsv = readFileSync("data/event-logs/sample_events.csv", "utf-8")

  console.log("🔧 Running PR#1 Pipeline...\\n")
  const report = await runPR1Pipeline(eventsCsv, optionC)

  console.log(`✅ Total Events: ${report.total_events}`)
  console.log(
    `✅ Linked: ${report.linked_count} (${(report.matching_rate * 100).toFixed(2)}%)`
  )
  console.log(`⚠️  Unlinked: ${report.unlinked_count}`)

  console.log("\\n📊 Validation Results:")
  for (const result of report.validation_results) {
    const status = result.valid ? "✅" : "❌"
    console.log(`${status} ${result.gate}: ${result.errors.length} errors`)
  }

  const reportPath = "reports/event-sourcing/pr1-test-report.json"
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\\n📝 Report saved: ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
