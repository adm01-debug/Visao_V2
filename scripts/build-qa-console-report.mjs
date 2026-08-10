#!/usr/bin/env node
/**
 * VISÃO — Gerador de relatório de erros de console do QA sweep.
 *
 * Lê `qa-console-report/raw-events.json` produzido por
 * `tests/e2e/qa-console-sweep.spec.ts`, filtra ruído conhecido e gera:
 *
 *   - `qa-console-report/report.md` — relatório principal (Markdown)
 *   - `qa-console-report/report.json` — versão estruturada para CI
 *
 * O Markdown contém:
 *   1. Resumo executivo (totais, veredito PASS/FAIL)
 *   2. Erros legítimos agrupados por rota+viewport, com:
 *      - Contagem
 *      - Mensagem normalizada
 *      - Stack trace (se pageerror)
 *      - Passos de reprodução pré-formatados
 *      - Severidade sugerida (alta/média/baixa)
 *   3. Apêndice: ruído filtrado (para auditoria)
 *
 * Uso:
 *   npm run qa:console-sweep        # gera raw-events.json
 *   npm run report:qa-console        # gera report.md
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'qa-console-report');
const RAW_PATH = join(OUT_DIR, 'raw-events.json');
const MD_PATH = join(OUT_DIR, 'report.md');
const JSON_PATH = join(OUT_DIR, 'report.json');

if (!existsSync(RAW_PATH)) {
  console.error(`✗ ${RAW_PATH} não encontrado. Rode: npm run qa:console-sweep`);
  process.exit(1);
}

const rawEvents = JSON.parse(readFileSync(RAW_PATH, 'utf8'));

// --------------------------------------------------------------------------
// Filtros de ruído conhecido — sincronizado com smoke-pages.spec.ts
// --------------------------------------------------------------------------
const NOISE_PATTERNS = [
  { pattern: /\[vite\]/i, reason: 'Vite HMR/connection' },
  { pattern: /Download the React DevTools/i, reason: 'React DevTools hint' },
  { pattern: /Lovable/i, reason: 'Lovable badge/preview' },
  { pattern: /favicon\.ico/i, reason: '404 favicon (dev)' },
  { pattern: /ResizeObserver loop/i, reason: 'ResizeObserver benign loop' },
  { pattern: /Non-Error promise rejection captured/i, reason: 'Sentry noise' },
  { pattern: /chrome-extension:/i, reason: 'Browser extension' },
  { pattern: /Failed to fetch.*\/_lovable/i, reason: 'Lovable preview ping' },
  { pattern: /websocket.*1006/i, reason: 'HMR websocket close' },
  { pattern: /HTTP 401.*\/auth\/v1/i, reason: 'Auth probe (esperado durante login)' },
];

// HTTP 4xx menos críticos que 5xx
const HTTP_LOW_PRIORITY = [401, 403, 404];

function classifyNoise(text) {
  for (const { pattern, reason } of NOISE_PATTERNS) {
    if (pattern.test(text)) return reason;
  }
  return null;
}

function severity(event) {
  if (event.kind === 'pageerror') return 'alta';
  if (event.kind === 'http') {
    if (event.status >= 500) return 'alta';
    if (HTTP_LOW_PRIORITY.includes(event.status)) return 'média';
    return 'média';
  }
  // console.error: alta se menciona stack/uncaught/throw, média caso contrário
  if (/uncaught|throw|exception|cannot read|undefined is not/i.test(event.text)) {
    return 'alta';
  }
  return 'média';
}

// --------------------------------------------------------------------------
// Classificação
// --------------------------------------------------------------------------
const real = [];
const noise = [];

for (const ev of rawEvents) {
  const noiseReason = classifyNoise(ev.text);
  if (noiseReason) {
    noise.push({ ...ev, noiseReason });
  } else {
    real.push({ ...ev, severity: severity(ev) });
  }
}

// Agrupar erros reais por rota+viewport
const grouped = new Map();
for (const ev of real) {
  const key = `${ev.viewport}::${ev.route}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(ev);
}

// Deduplicar dentro do grupo (mesma mensagem)
function dedup(events) {
  const map = new Map();
  for (const ev of events) {
    const sig = `${ev.kind}::${ev.text}`;
    if (!map.has(sig)) {
      map.set(sig, { ...ev, count: 1 });
    } else {
      map.get(sig).count++;
    }
  }
  return Array.from(map.values());
}

// --------------------------------------------------------------------------
// Geração do Markdown
// --------------------------------------------------------------------------
const totalReal = real.length;
const totalNoise = noise.length;
const highSev = real.filter((e) => e.severity === 'alta').length;
const verdict = totalReal === 0 ? '✅ PASS' : highSev > 0 ? '🔴 FAIL' : '🟡 PASS COM RESSALVAS';

const lines = [];
lines.push('# 🛡️ QA Console Errors Report');
lines.push('');
lines.push(`**Gerado em:** ${new Date().toISOString()}`);
lines.push(`**Veredito:** ${verdict}`);
lines.push('');
lines.push('## 📊 Resumo Executivo');
lines.push('');
lines.push('| Métrica | Valor |');
lines.push('|---|---|');
lines.push(`| Eventos capturados (total) | ${rawEvents.length} |`);
lines.push(`| Erros legítimos | **${totalReal}** |`);
lines.push(`| ↳ Severidade alta | ${highSev} |`);
lines.push(`| ↳ Severidade média | ${real.filter((e) => e.severity === 'média').length} |`);
lines.push(`| Ruído filtrado | ${totalNoise} |`);
lines.push(`| Rotas afetadas | ${grouped.size} |`);
lines.push('');

if (totalReal === 0) {
  lines.push('## ✅ Nenhum erro legítimo detectado');
  lines.push('');
  lines.push('Todas as 12 rotas (desktop + mobile) carregaram sem console errors significativos.');
} else {
  lines.push('## 🚨 Issues a Documentar');
  lines.push('');

  const sortedGroups = Array.from(grouped.entries()).sort();
  let issueNum = 1;

  for (const [key, events] of sortedGroups) {
    const [viewport, route] = key.split('::');
    const deduped = dedup(events);
    deduped.sort((a, b) => (a.severity === 'alta' ? -1 : 1));

    lines.push(`### Issue #${issueNum}: \`${route}\` (${viewport})`);
    lines.push('');
    lines.push(`**Erros únicos:** ${deduped.length} | **Total ocorrências:** ${events.length}`);
    lines.push('');

    for (const ev of deduped) {
      const sevBadge = ev.severity === 'alta' ? '🔴 ALTA' : '🟡 MÉDIA';
      lines.push(`#### ${sevBadge} — ${ev.kind}${ev.count > 1 ? ` (×${ev.count})` : ''}`);
      lines.push('');
      lines.push('```');
      lines.push(ev.text.slice(0, 800));
      lines.push('```');
      if (ev.stack) {
        lines.push('');
        lines.push('<details><summary>Stack trace</summary>');
        lines.push('');
        lines.push('```');
        lines.push(ev.stack.slice(0, 1500));
        lines.push('```');
        lines.push('');
        lines.push('</details>');
      }
      if (ev.url) {
        lines.push('');
        lines.push(`**URL:** \`${ev.url}\``);
      }
      lines.push('');
    }

    lines.push('**📋 Passos para reproduzir:**');
    lines.push('');
    lines.push('```');
    lines.push(`1. npm run preview:reset            # ambiente limpo com lockfile`);
    if (viewport === 'mobile') {
      lines.push(`2. Abrir DevTools → Toggle device toolbar → iPhone 12 (390×844)`);
    } else {
      lines.push(`2. Abrir DevTools com viewport 1280×720`);
    }
    lines.push(`3. Fazer login no preview`);
    lines.push(`4. Navegar para: ${route}`);
    lines.push(`5. Aba Console: filtrar por "Errors only"`);
    lines.push(`6. Confirmar mensagem(s) acima`);
    lines.push('```');
    lines.push('');
    lines.push('**🛠️ Sugestão de triagem:**');
    lines.push('');
    if (deduped.some((e) => e.kind === 'pageerror')) {
      lines.push(
        '- `pageerror` indica exception não capturada — adicionar try/catch ou ErrorBoundary local.'
      );
    }
    if (deduped.some((e) => e.kind === 'http' && e.status >= 500)) {
      lines.push('- HTTP 5xx no servidor — verificar logs da edge function correspondente.');
    }
    if (deduped.some((e) => e.kind === 'http' && e.status === 404)) {
      lines.push('- HTTP 404 — recurso ausente. Validar rota da API/asset.');
    }
    if (deduped.some((e) => /undefined|null|cannot read/i.test(e.text))) {
      lines.push('- Acesso a propriedade de undefined/null — adicionar guard com `?.` ou default.');
    }
    if (deduped.some((e) => /supabase|rls|policy/i.test(e.text))) {
      lines.push('- Possível violação de RLS — revisar política da tabela.');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    issueNum++;
  }
}

// Apêndice de ruído
lines.push('');
lines.push('## 📎 Apêndice: Ruído Filtrado');
lines.push('');
lines.push(
  `${totalNoise} eventos foram classificados como ruído conhecido e omitidos do relatório principal.`
);
lines.push('');
if (totalNoise > 0) {
  const noiseByReason = new Map();
  for (const ev of noise) {
    noiseByReason.set(ev.noiseReason, (noiseByReason.get(ev.noiseReason) || 0) + 1);
  }
  lines.push('| Categoria | Ocorrências |');
  lines.push('|---|---|');
  for (const [reason, count] of Array.from(noiseByReason.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${reason} | ${count} |`);
  }
}
lines.push('');
lines.push('---');
lines.push('');
lines.push(
  '*Gerado por `scripts/build-qa-console-report.mjs`. Para atualizar filtros de ruído, editar `NOISE_PATTERNS` no script.*'
);

writeFileSync(MD_PATH, lines.join('\n'));
writeFileSync(
  JSON_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      verdict,
      totals: {
        raw: rawEvents.length,
        real: totalReal,
        noise: totalNoise,
        highSeverity: highSev,
      },
      issues: Array.from(grouped.entries()).map(([key, events]) => {
        const [viewport, route] = key.split('::');
        return { viewport, route, events: dedup(events) };
      }),
    },
    null,
    2
  )
);

console.log(`✓ Relatório gerado:`);
console.log(`  - Markdown: ${MD_PATH}`);
console.log(`  - JSON:     ${JSON_PATH}`);
console.log(`  Veredito: ${verdict} (${totalReal} erros reais, ${totalNoise} ruídos)`);

process.exit(highSev > 0 ? 1 : 0);
