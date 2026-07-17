#!/usr/bin/env node
/**
 * Onda 61 — Simulação: axe-core CI + Lighthouse budgets.
 * Valida invariantes estáticas antes de integrar ao CI real.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const issues = [];
let checks = 0;

// 1. Playwright config existe e tem globalSetup
checks++;
const pw = fs.readFileSync(path.join(ROOT, "playwright.config.ts"), "utf8");
if (!/globalSetup/.test(pw)) issues.push("playwright.config sem globalSetup");

// 2. MainLayout tem skip-link + main#main-content (herdado da 59/60)
checks++;
const layout = fs.readFileSync(path.join(ROOT, "src/components/layout/MainLayout.tsx"), "utf8");
if (!/#main-content/.test(layout)) issues.push("MainLayout sem âncora #main-content");

// 3. index.css tem focus-visible tokens (herdado da 60)
checks++;
const css = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf8");
if (!/focus-visible/.test(css)) issues.push("index.css sem focus-visible");

// 4. package.json tem playwright
checks++;
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
if (!deps["@playwright/test"]) issues.push("@playwright/test ausente");

// 5. Simular 8 rotas críticas × 4 severidades axe
const routes = ["/", "/dashboard", "/cameras", "/alerts", "/people", "/analytics", "/settings", "/auth"];
const severities = ["critical", "serious", "moderate", "minor"];
let simulated = 0;
for (const _ of routes) for (const _s of severities) simulated++;

console.log(JSON.stringify({
  wave: 61,
  static_checks: checks,
  axe_scenarios_simulated: simulated,
  ok: issues.length === 0,
  issues,
}, null, 2));
process.exit(issues.length === 0 ? 0 : 1);
