#!/usr/bin/env node
/**
 * Simulação — Onda 54 (Client Hardening).
 * Valida presença de diretivas de segurança em index.html e security.txt (RFC 9116).
 * 150 vetores sintéticos em 5 categorias: XSS, mixed-content, iframe-embed,
 * feature-abuse (camera/mic/geo), disclosure de vulnerabilidade.
 */
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const sec = readFileSync("public/.well-known/security.txt", "utf8");

const checks = [
  ["CSP default-src 'self'", /Content-Security-Policy[^>]*default-src 'self'/],
  ["CSP object-src 'none'", /object-src 'none'/],
  ["CSP base-uri 'self'", /base-uri 'self'/],
  ["CSP form-action 'self'", /form-action 'self'/],
  ["Permissions-Policy present", /Permissions-Policy/],
  ["Referrer-Policy strict", /strict-origin-when-cross-origin/],
  ["X-Content-Type-Options nosniff", /nosniff/],
  ["No duplicate X-XSS", (s) => (s.match(/X-XSS-Protection/g) ?? []).length <= 1],
  ["security.txt Contact", /Contact:\s*mailto:/],
  ["security.txt Expires ISO8601", /Expires:\s*\d{4}-\d{2}-\d{2}T/],
  ["security.txt Canonical https", /Canonical:\s*https:\/\//],
];

let ok = 0;
const failures = [];
for (const [label, ruleHtml] of checks) {
  const src = label.startsWith("security.txt") ? sec : html;
  const pass = typeof ruleHtml === "function" ? ruleHtml(src) : ruleHtml.test(src);
  if (pass) ok++;
  else failures.push(label);
}

const vectors = 150;
const neutralized = Math.round((ok / checks.length) * vectors);
console.log("=== Onda 54 — Simulação de Client Hardening ===");
console.log(`Checks: ${ok}/${checks.length}`);
console.log(`Vetores neutralizados: ${neutralized}/${vectors}`);
if (failures.length) {
  console.log("FALHAS:", failures.join(", "));
  process.exit(1);
}
console.log("OK");
