import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function argument(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}

const inputPath = resolve(argument("--input"));
const applyPath = resolve(argument("--apply-report"));
const reviewer = argument("--reviewer").slice(0, 200);
const [document, applyReport] = await Promise.all([
  readFile(inputPath, "utf8").then(JSON.parse),
  readFile(applyPath, "utf8").then(JSON.parse),
]);
if (applyReport.databaseApply?.reconciledCandidates !== 25 || applyReport.databaseApply?.publicEligibleCandidates !== 0) {
  throw new Error("El reporte remoto no acredita 25 coordenadas privadas reconciliadas.");
}
const approvedAt = applyReport.metadata?.generatedAt || new Date().toISOString();
let approved = 0;
document.results = (document.results || []).map((item) => {
  if (item.status !== "strict_exact_pending_human_coordinate_review") return item;
  approved += 1;
  return {
    ...item,
    status: "strict_exact_approved",
    humanCoordinateReviewStatus: "approved",
    approvedBy: reviewer,
    approvedAt,
    automaticPublication: false,
  };
});
if (approved !== 25) throw new Error(`Se esperaban 25 resultados pendientes y se encontraron ${approved}.`);
document.metadata.humanCoordinateReviewRequired = false;
document.metadata.coordinateApproval = {
  approved,
  approvedBy: reviewer,
  approvedAt,
  privateOnly: true,
  automaticPublication: false,
};
document.summary.strictExactPendingHumanReview = 0;
document.summary.strictExactApproved = approved;
await writeFile(inputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ input: inputPath, approved, reviewer, automaticPublication: false }, null, 2));
