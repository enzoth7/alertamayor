import {
  DEFAULT_OVERPASS_ENDPOINT,
  buildCacheDocument,
  buildOverpassQuery,
  buildProjectUserAgent,
  normalizeOverpassPayload,
  requestOverpass,
} from "./lib/osm-candidate-discovery.mjs";
import {
  discoveryPath,
  parseArgs,
  uruguayDateStamp,
  writeJsonAtomically,
} from "./lib/discovery-files.mjs";

function integerOption(value, fallback, minimum, maximum, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} debe estar entre ${minimum} y ${maximum}.`);
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const live = args.live === true;
  if (live && args["dry-run"] === true) {
    throw new Error("--live y --dry-run son mutuamente excluyentes.");
  }

  const endpoint = String(args.endpoint || DEFAULT_OVERPASS_ENDPOINT);
  const timeoutMs = integerOption(
    args["timeout-ms"],
    120_000,
    5_000,
    300_000,
    "--timeout-ms",
  );
  const retries = integerOption(args.retries, 2, 0, 4, "--retries");
  const backoffMs = integerOption(
    args["backoff-ms"],
    1_500,
    100,
    30_000,
    "--backoff-ms",
  );
  const queryTimeoutSeconds = integerOption(
    args["query-timeout-seconds"],
    90,
    10,
    300,
    "--query-timeout-seconds",
  );
  const query = buildOverpassQuery({ timeoutSeconds: queryTimeoutSeconds });
  const userAgent = buildProjectUserAgent(args.contact);
  const outputPath = discoveryPath(
    args.output,
    `osm-elepem-candidates-${uruguayDateStamp()}.json`,
  );

  if (!live) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          networkRequestMade: false,
          endpoint,
          method: "POST",
          timeoutMs,
          retries,
          backoffMs,
          userAgent,
          outputPath,
          query,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args["acknowledge-overpass"] !== true) {
    throw new Error(
      "La ejecución en vivo exige --acknowledge-overpass. Use --dry-run primero.",
    );
  }

  const payload = await requestOverpass({
    endpoint,
    query,
    userAgent,
    timeoutMs,
    retries,
    backoffMs,
  });
  const retrievedAt = new Date().toISOString();
  const candidates = normalizeOverpassPayload(payload, retrievedAt);
  const cache = buildCacheDocument({
    endpoint,
    query,
    userAgent,
    retrievedAt,
    candidates,
  });
  await writeJsonAtomically(outputPath, cache, {
    overwrite: args.overwrite === true,
  });

  console.log(
    JSON.stringify(
      {
        outputPath,
        candidateCount: candidates.length,
        retrievedAt,
        attribution: cache.metadata.attribution,
        candidateOnly: true,
        databaseWrites: 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
