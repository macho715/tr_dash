const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..");
const file = path.join(base, "adnoc.csv");
let content = fs.readFileSync(file, "utf8");
const lines = content.split(/\r?\n/);
const out = lines.map((line) => {
  const cols = line.split("\t");
  if (cols.length > 10) return cols.slice(0, 10).join("\t");
  return line;
});
fs.writeFileSync(file, out.join("\n"), "utf8");
console.log("Trimmed adnoc.csv to 10 columns");
