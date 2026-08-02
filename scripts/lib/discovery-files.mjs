import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const DISCOVERY_DIRECTORY = resolve(PROJECT_ROOT, "data", "discovery");

export function uruguayDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function discoveryPath(value, defaultName) {
  const target = value
    ? resolve(PROJECT_ROOT, String(value))
    : resolve(DISCOVERY_DIRECTORY, defaultName);
  const relativeTarget = relative(DISCOVERY_DIRECTORY, target);
  if (
    !relativeTarget ||
    relativeTarget.startsWith("..") ||
    isAbsolute(relativeTarget) ||
    !target.toLowerCase().endsWith(".json")
  ) {
    throw new Error("El archivo debe ser JSON dentro de data/discovery/.");
  }
  return target;
}

export async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonAtomically(target, value, { overwrite = false } = {}) {
  if (!overwrite && (await pathExists(target))) {
    throw new Error(`El archivo ya existe: ${target}`);
  }
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    if (overwrite) await rm(target, { force: true });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) {
      args[argument.slice(2, equals)] = argument.slice(equals + 1);
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      args[argument.slice(2)] = true;
    }
  }
  return args;
}
