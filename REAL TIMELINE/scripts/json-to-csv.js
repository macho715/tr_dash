/**
 * One-off: Extract level1, level2, activity_id, activity_name from
 * agi tr planned schedule.json and write to CSV (for ADNOC, BUSHHRA VODR, WA GROUP).
 * Run from repo root: node "REAL TIMELINE/scripts/json-to-csv.js"
 */

const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "agi tr planned schedule.json");
const raw = fs.readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);

function escapeCsv(val) {
  if (val == null || val === "") return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const header = "level1,level2,activity_id,activity_name";
const rows = data.activities.map((a) =>
  [
    escapeCsv(a.level1),
    escapeCsv(a.level2),
    escapeCsv(a.activity_id),
    escapeCsv(a.activity_name),
  ].join(",")
);
const csv = [header, ...rows].join("\n");

const outDir = path.join(__dirname, "..");
const files = ["ADNOC TIMELINE.csv", "BUSHHRA VODR.csv", "WA GROUP TIMELINE.csv"];
for (const f of files) {
  fs.writeFileSync(path.join(outDir, f), csv, "utf8");
  console.log("Wrote", f);
}
