#!/usr/bin/env node
/**
 * Onda 63 — Simulação de payloads CSP Violation Report.
 */
const legacy = { "csp-report": { "document-uri": "https://vis-o.app/",
  "violated-directive": "script-src", "blocked-uri": "https://evil.example/x.js" } };
const reportingApi = [{ type: "csp-violation", body: {
  documentURL: "https://vis-o.app/", effectiveDirective: "img-src",
  blockedURL: "https://tracker.example/pixel.gif" } }];
const invalid = { foo: "bar" };
const empty = [];

const cases = [
  ["legacy", legacy, 1],
  ["reporting-api", reportingApi, 1],
  ["unknown-object", invalid, 1],
  ["empty-array", empty, 0],
];

function normalize(raw) {
  if (raw && typeof raw === "object" && "csp-report" in raw) return [raw["csp-report"]];
  if (Array.isArray(raw)) return raw.filter((r) => r?.type === "csp-violation" && r.body).map((r) => r.body);
  if (raw && typeof raw === "object") return [raw];
  return [];
}

let pass = 0, fail = 0;
for (const [name, payload, expected] of cases) {
  const got = normalize(payload).length;
  if (got === expected) pass++; else { fail++; console.error(`FAIL ${name}: expected ${expected} got ${got}`); }
}

// Fuzz: 200 payloads aleatórios não devem crashar
for (let i = 0; i < 200; i++) {
  try { normalize(Math.random() > 0.5 ? { random: i } : [i, null, "x"]); pass++; }
  catch (e) { fail++; console.error("FUZZ crash:", e.message); }
}

console.log(JSON.stringify({ wave: 63, cases: cases.length, fuzzed: 200, pass, fail, ok: fail === 0 }, null, 2));
process.exit(fail === 0 ? 0 : 1);
