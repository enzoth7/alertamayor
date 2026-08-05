import assert from "node:assert/strict";
import test from "node:test";
import { repairMojibake, repairMojibakeDeep } from "../lib/text-encoding.mjs";

test("repara mojibake comun sin alterar texto correcto", () => {
  assert.equal(repairMojibake("Paysand\u00c3\u00ba"), "Paysand\u00fa");
  assert.equal(repairMojibake("revision correcta"), "revision correcta");
  assert.deepEqual(
    repairMojibakeDeep({ values: ["direcci\u00c3\u00b3n", "publica"] }),
    { values: ["direcci\u00f3n", "publica"] },
  );
});
