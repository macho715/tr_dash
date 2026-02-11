/**
 * Enrich adnoc.csv, bushra.csv, wa group.csv with level1, level2, activity_id, activity_name
 * from agi tr planned schedule.json. Match by date (planned_start..planned_finish).
 * Run from repo root: node "REAL TIMELINE/scripts/enrich-csv-with-plan.js"
 */

const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..");
const jsonPath = path.join(base, "agi tr planned schedule.json");
const raw = fs.readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);

// Activities with planned dates; prefer rows with activity_id for matching
const activities = data.activities.filter(
  (a) => a.planned_start && a.planned_finish
);

function parseDate(s) {
  if (!s || typeof s !== "string") return null;
  const d = s.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function inRange(dateStr, start, end) {
  if (!dateStr || !start || !end) return false;
  return dateStr >= start && dateStr <= end;
}

// Find best-matching activity for a row: by date, then by keyword in activityText
function findActivity(dateStr, activityText) {
  if (!dateStr) return null;
  const candidates = activities.filter((a) =>
    inRange(dateStr, a.planned_start, a.planned_finish)
  );
  if (candidates.length === 0) return null;
  // Prefer detail row (has activity_id)
  const withId = candidates.filter((a) => a.activity_id);
  const pool = withId.length > 0 ? withId : candidates;
  const text = (activityText || "").toLowerCase();
  // Simple keyword hints for TR1 phase
  if (text.includes("load") && text.includes("tr") && text.includes("1"))
    return pool.find((a) => a.activity_id === "A1060" || a.activity_id === "A1070") || pool[0];
  if (text.includes("sail") || text.includes("cast off"))
    return pool.find((a) => a.activity_id === "A1081" || (a.activity_name && a.activity_name.toLowerCase().includes("sail"))) || pool[0];
  if (text.includes("berth") || text.includes("berthed"))
    return pool.find((a) => a.activity_id === "A1091" || (a.activity_name && a.activity_name.toLowerCase().includes("berth"))) || pool[0];
  if (text.includes("offload") || text.includes("load-in"))
    return pool.find((a) => a.activity_id === "A1110") || pool[0];
  return pool[0];
}

function escapeTsv(val) {
  if (val == null || val === "") return "";
  const s = String(val);
  if (s.includes("\t") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function processCsv(fileName, dateColIndex, endDateColIndex) {
  const p = path.join(base, fileName);
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return;
  const header = lines[0];
  const newHeader = header + "\tlevel1\tlevel2\tactivity_id\tactivity_name";
  const activityColIndex = header.split("\t").indexOf("Activity");
  if (activityColIndex === -1) return;
  const out = [newHeader];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const cols = row.split("\t");
    const dateStr = parseDate(
      cols[dateColIndex] || (endDateColIndex != null ? cols[endDateColIndex] : null)
    );
    const activityText = cols[activityColIndex];
    const act = findActivity(dateStr, activityText);
    const l1 = act ? escapeTsv(act.level1) : "";
    const l2 = act ? escapeTsv(act.level2) : "";
    const aid = act ? escapeTsv(act.activity_id) : "";
    const aname = act ? escapeTsv(act.activity_name) : "";
    out.push(row + "\t" + l1 + "\t" + l2 + "\t" + aid + "\t" + aname);
  }
  fs.writeFileSync(p, out.join("\n"), "utf8");
  console.log("Updated", fileName);
}

// adnoc: SN, Date, ... Activity -> date at 1
processCsv("adnoc.csv", 1, null);
processCsv("bushra.csv", 1, 3);
processCsv("wa group.csv", 1, 3);
