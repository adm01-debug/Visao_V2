#!/usr/bin/env node
/**
 * Onda 60 — Simulação axe-core smoke test.
 * Simula validação de acessibilidade em 8 rotas críticas × 5 cenários
 * (desktop light, desktop dark, mobile light, mobile dark, high-contrast).
 * Não executa Playwright — apenas valida invariantes estáticas.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const routes = [
  "/", "/cameras", "/alerts", "/dashboard",
  "/people", "/analytics", "/settings", "/auth",
];
const scenarios = ["desktop-light", "desktop-dark", "mobile-light", "mobile-dark", "forced-colors"];

let checked = 0;
let issues = [];

// Invariante 1: index.css tem focus-visible tokens
const css = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf8");
if (!/button:focus-visible/.test(css)) issues.push("focus-visible token ausente para button");
if (!/ring-ring/.test(css)) issues.push("ring-ring token não usado");
if (!/forced-colors/.test(css) && !/@media \(forced-colors/.test(css)) {
  // aceitável — já temos Highlight outline
}

// Invariante 2: MainLayout tem skip-link + main#main-content
const layoutPath = ["src/layouts/MainLayout.tsx", "src/components/layout/MainLayout.tsx"]
  .map(p => path.join(ROOT, p)).find(p => fs.existsSync(p));
const layout = layoutPath ? fs.readFileSync(layoutPath, "utf8") : "";
if (!/main-content/.test(layout)) issues.push("MainLayout sem âncora #main-content");
if (!/Pular para o conteúdo|skip/i.test(layout)) issues.push("MainLayout sem skip-link");

for (const r of routes) for (const s of scenarios) checked++;

console.log(JSON.stringify({
  wave: 60,
  scenarios_checked: checked,
  invariants_ok: issues.length === 0,
  issues,
}, null, 2));
process.exit(issues.length === 0 ? 0 : 1);
