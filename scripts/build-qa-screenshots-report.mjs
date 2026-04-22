#!/usr/bin/env node
/**
 * VISÃO - Gerador de relatório HTML de screenshots de QA.
 *
 * Lê `qa-screenshots/{desktop,mobile}/*.png` produzidos por
 * `tests/e2e/qa-visual-snapshots.spec.ts` e gera um arquivo único
 * `qa-screenshots/index.html` com:
 *
 *   - Grid de comparação lado-a-lado (desktop | mobile) por rota.
 *   - Screenshots em base64 (auto-contido — pode ser anexado ao QA manual,
 *     enviado por e-mail, hospedado em qualquer lugar).
 *   - Seção separada para cada categoria: autenticadas com chrome / drawer /
 *     standalone sem chrome.
 *   - Badge visual indicando estado (auth-ok / auth-redirect / standalone).
 *
 * **Uso:**
 *   ```bash
 *   npx playwright test qa-visual-snapshots --project=chromium
 *   npm run report:qa-screenshots
 *   open qa-screenshots/index.html
 *   ```
 */
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOTS_DIR = join(process.cwd(), 'qa-screenshots');
const OUT_PATH = join(SCREENSHOTS_DIR, 'index.html');

// Catalogação manual (espelho do spec) para classificação semântica
const ROUTES = [
  { name: 'dashboard', path: '/dashboard', type: 'auth', captureDrawer: true },
  { name: 'cameras', path: '/cameras', type: 'auth' },
  { name: 'alerts', path: '/alerts', type: 'auth' },
  { name: 'heatmap', path: '/heatmap', type: 'auth', captureDrawer: true },
  { name: 'analytics', path: '/analytics', type: 'auth', captureDrawer: true },
  { name: 'recordings', path: '/recordings', type: 'auth' },
  { name: 'people', path: '/people', type: 'auth' },
  { name: 'license-plate', path: '/license-plate', type: 'auth' },
  { name: 'settings', path: '/settings', type: 'auth' },
  { name: 'notification-settings', path: '/notification-settings', type: 'auth' },
  { name: 'zones', path: '/zones', type: 'auth' },
  { name: 'auth-page', path: '/auth', type: 'standalone' },
  { name: 'acesso-negado', path: '/acesso-negado', type: 'standalone' },
  { name: 'reset-password', path: '/reset-password', type: 'standalone' },
  { name: '404', path: '/rota-inexistente-qa', type: 'standalone' },
];

if (!existsSync(SCREENSHOTS_DIR)) {
  console.error(`❌ Diretório ${SCREENSHOTS_DIR} não existe.`);
  console.error('   Rode primeiro: npx playwright test qa-visual-snapshots');
  process.exit(1);
}

function imgToBase64(path) {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function renderRow(route) {
  const desktop = imgToBase64(join(SCREENSHOTS_DIR, 'desktop', `${route.name}.png`));
  const mobile = imgToBase64(join(SCREENSHOTS_DIR, 'mobile', `${route.name}.png`));
  const drawer = route.captureDrawer
    ? imgToBase64(join(SCREENSHOTS_DIR, 'mobile', `${route.name}-drawer.png`))
    : null;

  const badge = route.type === 'standalone'
    ? '<span class="badge standalone">STANDALONE — sem chrome</span>'
    : '<span class="badge auth">AUTH — com chrome</span>';

  const cells = [
    desktop
      ? `<div class="shot"><h4>Desktop 1280×720</h4><img loading="lazy" src="${desktop}" alt="${route.name} desktop"/></div>`
      : `<div class="shot empty"><h4>Desktop</h4><p>⚠️ não capturado</p></div>`,
    mobile
      ? `<div class="shot"><h4>Mobile 390×844</h4><img loading="lazy" src="${mobile}" alt="${route.name} mobile"/></div>`
      : `<div class="shot empty"><h4>Mobile</h4><p>⚠️ não capturado</p></div>`,
  ];
  if (drawer) {
    cells.push(`<div class="shot"><h4>Mobile + Drawer aberto</h4><img loading="lazy" src="${drawer}" alt="${route.name} drawer"/></div>`);
  }

  return `
    <section class="route" id="${route.name}">
      <header>
        <h3><code>${route.path}</code> ${badge}</h3>
        <a href="#top">↑ topo</a>
      </header>
      <div class="grid">${cells.join('')}</div>
    </section>`;
}

const authRoutes = ROUTES.filter(r => r.type === 'auth');
const standaloneRoutes = ROUTES.filter(r => r.type === 'standalone');
const totalShots = ROUTES.length * 2 + authRoutes.filter(r => r.captureDrawer).length;
const captured = ROUTES.reduce((acc, r) => {
  if (existsSync(join(SCREENSHOTS_DIR, 'desktop', `${r.name}.png`))) acc++;
  if (existsSync(join(SCREENSHOTS_DIR, 'mobile', `${r.name}.png`))) acc++;
  if (r.captureDrawer && existsSync(join(SCREENSHOTS_DIR, 'mobile', `${r.name}-drawer.png`))) acc++;
  return acc;
}, 0);

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>VISÃO — QA Visual Snapshots</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#0f172a;color:#e2e8f0;line-height:1.5}
  header.top{position:sticky;top:0;background:#1e293b;border-bottom:1px solid #334155;padding:1rem 2rem;z-index:10;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
  header.top h1{margin:0;font-size:1.25rem}
  .stats{display:flex;gap:1.5rem;font-size:0.875rem;color:#94a3b8}
  .stats strong{color:#e2e8f0}
  nav.toc{padding:1rem 2rem;background:#1e293b;border-bottom:1px solid #334155;font-size:0.875rem}
  nav.toc h2{margin:0 0 0.5rem;font-size:0.875rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em}
  nav.toc ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:0.5rem 1rem}
  nav.toc a{color:#60a5fa;text-decoration:none}
  nav.toc a:hover{text-decoration:underline}
  main{padding:2rem;max-width:1600px;margin:0 auto}
  h2.section-title{margin-top:3rem;padding-bottom:0.5rem;border-bottom:2px solid #334155;font-size:1.5rem}
  section.route{margin-bottom:3rem;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1rem}
  section.route header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid #334155}
  section.route h3{margin:0;font-size:1rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap}
  section.route h3 code{background:#0f172a;padding:0.25rem 0.5rem;border-radius:4px;font-size:0.875rem}
  section.route header a{color:#60a5fa;text-decoration:none;font-size:0.75rem}
  .badge{font-size:0.6875rem;padding:0.25rem 0.5rem;border-radius:4px;font-weight:600;letter-spacing:0.025em;text-transform:uppercase}
  .badge.auth{background:#1e3a5f;color:#93c5fd}
  .badge.standalone{background:#3a1e5f;color:#c4b5fd}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}
  .shot{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:0.75rem;display:flex;flex-direction:column}
  .shot h4{margin:0 0 0.5rem;font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em}
  .shot img{width:100%;height:auto;border-radius:4px;border:1px solid #334155;display:block}
  .shot.empty{justify-content:center;align-items:center;min-height:200px;color:#f87171}
  footer{padding:2rem;text-align:center;color:#64748b;font-size:0.75rem;border-top:1px solid #334155;margin-top:3rem}
</style>
</head>
<body>
<header class="top" id="top">
  <h1>📸 VISÃO — QA Visual Snapshots</h1>
  <div class="stats">
    <span><strong>${captured}</strong>/${totalShots} screenshots</span>
    <span><strong>${authRoutes.length}</strong> rotas auth</span>
    <span><strong>${standaloneRoutes.length}</strong> rotas standalone</span>
    <span>Gerado: <strong>${new Date().toLocaleString('pt-BR')}</strong></span>
  </div>
</header>

<nav class="toc">
  <h2>Sumário</h2>
  <ul>
    ${ROUTES.map(r => `<li><a href="#${r.name}">${r.name}</a></li>`).join('')}
  </ul>
</nav>

<main>
  <h2 class="section-title">🔐 Rotas autenticadas (chrome esperado: Sidebar desktop + BottomNav mobile)</h2>
  ${authRoutes.map(renderRow).join('')}

  <h2 class="section-title">🌐 Rotas standalone (sem chrome — Sidebar/BottomNav AUSENTES)</h2>
  ${standaloneRoutes.map(renderRow).join('')}
</main>

<footer>
  Relatório gerado por <code>scripts/build-qa-screenshots-report.mjs</code> a partir de
  <code>tests/e2e/qa-visual-snapshots.spec.ts</code>. Anexar a
  <code>docs/QA-MANUAL-RESPONSIVIDADE.md</code> §7.2 quando QA visual for executado.
</footer>
</body>
</html>`;

writeFileSync(OUT_PATH, html);
console.log(`✅ Relatório gerado: ${OUT_PATH}`);
console.log(`   ${captured}/${totalShots} screenshots incluídos`);
console.log(`   Abra com: open ${OUT_PATH}`);
