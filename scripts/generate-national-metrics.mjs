import fs from "node:fs";
import path from "node:path";
import { buildNationalMetrics, metricsCsv, metricsMarkdown } from "./lib/national-metrics.mjs";

function argument(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}
function optionalArgument(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}
function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

const date = argument("--date");
const outputDir = argument("--output-dir");
const exclusion = readJson(argument("--exclusion"));
const closurePaths = (optionalArgument("--closures") || argument("--closure"))
  .split(",")
  .map((filename) => filename.trim())
  .filter(Boolean);
const closures = closurePaths.map(readJson);
const paysandu = readJson(argument("--paysandu-step9"));
const artigas = readJson(argument("--artigas-step9"));
const referenceFiles = argument("--reference-files").split(",").map((filename) => readJson(filename.trim()));
const referenceTotals = Object.fromEntries(referenceFiles.map((input) => [input.department, input.historical_coverage_reference?.reference_total_elepem ?? null]));
const report = buildNationalMetrics({
  exclusion,
  referenceTotals,
  closures,
  step9Reports: [{ department: "Paysandú", report: paysandu }, { department: "Artigas", report: artigas }],
  generatedAt: `${date}T00:00:00.000-03:00`,
});

fs.mkdirSync(outputDir, { recursive: true });
const outputs = {
  json: path.join(outputDir, `national_metrics_${date}.json`),
  csv: path.join(outputDir, `national_metrics_${date}.csv`),
  markdown: path.join(outputDir, `national_metrics_${date}.md`),
};
fs.writeFileSync(outputs.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(outputs.csv, metricsCsv(report), "utf8");
fs.writeFileSync(outputs.markdown, metricsMarkdown(report), "utf8");
console.log(JSON.stringify({ outputs, metadata: report.metadata, baseline: report.baseline, processedTotals: report.processed_totals }, null, 2));
