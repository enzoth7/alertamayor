const REPLACEMENTS = new Map([
  ["\u00c3\u00a1", "\u00e1"], ["\u00c3\u00a9", "\u00e9"], ["\u00c3\u00ad", "\u00ed"],
  ["\u00c3\u00b3", "\u00f3"], ["\u00c3\u00ba", "\u00fa"], ["\u00c3\u00b1", "\u00f1"],
  ["\u00c3\u0081", "\u00c1"], ["\u00c3\u0089", "\u00c9"], ["\u00c3\u008d", "\u00cd"],
  ["\u00c3\u0093", "\u00d3"], ["\u00c3\u009a", "\u00da"], ["\u00c3\u0091", "\u00d1"],
  ["\u00c3\u00bc", "\u00fc"], ["\u00c3\u009c", "\u00dc"],
  ["\u00c2\u00bf", "\u00bf"], ["\u00c2\u00a1", "\u00a1"], ["\u00c2\u00b7", "\u00b7"],
  ["\u00e2\u20ac\u201d", "\u2014"], ["\u00e2\u20ac\u201c", "\u2013"],
  ["\u00e2\u20ac\u0153", "\u201c"], ["\u00e2\u20ac\u009d", "\u201d"],
  ["\u00e2\u2020\u2019", "\u2192"], ["\u00e2\u2020\u201c", "\u2190"],
]);

export function repairMojibake(value) {
  let result = String(value ?? "");
  for (const [broken, repaired] of REPLACEMENTS) result = result.replaceAll(broken, repaired);
  return result;
}

export function repairMojibakeDeep(value) {
  if (typeof value === "string") return repairMojibake(value);
  if (Array.isArray(value)) return value.map(repairMojibakeDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairMojibakeDeep(item)]));
  }
  return value;
}
