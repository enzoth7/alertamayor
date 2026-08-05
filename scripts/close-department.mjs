import fs from "node:fs";
import path from "node:path";
import { buildDepartmentClosure, closureInputHash, coverageMarkdown, toCsv } from "./lib/department-closure.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}

const inputs = {
  source: value("--source"),
  matching: value("--matching"),
  review: value("--review"),
  imported: value("--imported"),
};
const outputDir = value("--output-dir");
const date = value("--date");
const slug = value("--department-slug");
const raw = Object.fromEntries(Object.entries(inputs).map(([key, filename]) => [key, fs.readFileSync(filename, "utf8")]));
const parsed = Object.fromEntries(Object.entries(raw).map(([key, contents]) => [key, JSON.parse(contents)]));
const closedAt = `${date}T00:00:00.000-03:00`;
const { report, unresolved } = buildDepartmentClosure({
  ...parsed,
  inputHashes: Object.fromEntries(Object.entries(raw).map(([key, contents]) => [key, closureInputHash(contents)])),
  closedAt,
});

fs.mkdirSync(outputDir, { recursive: true });
const outputs = {
  coverage: path.join(outputDir, `${slug}_coverage_${date}.md`),
  matchReport: path.join(outputDir, `${slug}_match_report_${date}.json`),
  unresolved: path.join(outputDir, `${slug}_unresolved_${date}.csv`),
};
fs.writeFileSync(outputs.coverage, coverageMarkdown(report), "utf8");
fs.writeFileSync(outputs.matchReport, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(outputs.unresolved, toCsv(unresolved), "utf8");
console.log(JSON.stringify({ outputs, counts: report.counts, provenance: report.provenance, safety: report.safety }, null, 2));
