import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { repairMojibakeDeep } from "./lib/text-encoding.mjs";

const flag = process.argv.indexOf("--input");
if (flag < 0 || !process.argv[flag + 1]) throw new Error("Falta --input.");
const root = process.cwd();
const inputPath = resolve(process.argv[flag + 1]);
const relativePath = relative(root, inputPath);
if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || !inputPath.endsWith(".json")) {
  throw new Error("El JSON debe estar dentro del workspace.");
}
const raw = await readFile(inputPath, "utf8");
const repaired = repairMojibakeDeep(JSON.parse(raw));
await writeFile(inputPath, `${JSON.stringify(repaired, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ input: relativePath.replaceAll("\\", "/"), repaired: true }, null, 2));
