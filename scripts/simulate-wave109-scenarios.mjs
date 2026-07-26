#!/usr/bin/env node
/**
 * Onda 109 — Simulação de cenários para a TRIAGEM DA QUARENTENA.
 *
 * A Onda 108 drenou a partição DEFAULT, mas deixou lá, de propósito, as linhas
 * com timestamps implausíveis ("quarentena"): criar partições para elas geraria
 * `plate_detections_m1970_01` ou `..._m9999_12` — lixo permanente no catálogo.
 *
 * Esta simulação varre a matriz de combinações que a rotina de triagem pode
 * encontrar em produção e marca cada uma como segura/insegura, para que o
 * desenho da migração cubra TODOS os gaps antes de tocar no banco.
 *
 * Uso: node scripts/simulate-wave109-scenarios.mjs
 * Saída: reports/simulations/wave109.json + wave109.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Tabelas particionadas com partição DEFAULT ativa. */
const PARENTS = ['plate_detections', 'recognition_logs'];

/**
 * Classes de anomalia temporal observáveis em DVR/NVR de campo.
 * `shiftable` = existe hipótese determinística de correção (offset de relógio).
 */
const ANOMALIES = [
  { id: 'null_key', label: 'timestamp NULL', shiftable: false },
  { id: 'epoch_zero', label: 'epoch 0 (1970-01-01)', shiftable: true },
  { id: 'pre_2000', label: 'anterior a 2000 (RTC sem bateria)', shiftable: true },
  { id: 'far_past', label: 'passado além da janela (>24 meses)', shiftable: false },
  { id: 'near_past_edge', label: 'passado na borda da janela', shiftable: false },
  { id: 'near_future_edge', label: 'futuro na borda da janela', shiftable: false },
  { id: 'far_future', label: 'futuro além da janela (>12 meses)', shiftable: true },
  { id: 'year_9999', label: 'ano 9999 / sentinela de firmware', shiftable: false },
];

/** Origem provável da anomalia — define se há offset confiável para corrigir. */
const CAUSES = [
  { id: 'device_clock_reset', label: 'reset de relógio do dispositivo', hasOffset: true },
  { id: 'timezone_misconfig', label: 'fuso horário mal configurado', hasOffset: true },
  { id: 'firmware_sentinel', label: 'valor sentinela de firmware', hasOffset: false },
  { id: 'manual_backfill', label: 'backfill manual/importação', hasOffset: false },
  { id: 'unknown', label: 'causa desconhecida', hasOffset: false },
];

/** Volume de linhas em quarentena por tabela. */
const VOLUMES = [
  { id: 'empty', rows: 0 },
  { id: 'small', rows: 25 },
  { id: 'medium', rows: 5_000 },
  { id: 'large', rows: 250_000 },
];

/** Ação que a rotina de triagem pode tomar. */
const ACTIONS = [
  { id: 'classify_only', label: 'apenas classificar e reportar', mutates: false },
  { id: 'auto_shift', label: 'corrigir timestamp pelo offset inferido', mutates: true },
  { id: 'purge', label: 'descartar linhas irrecuperáveis', mutates: true },
];

/** Contexto de execução concorrente. */
const CONTEXTS = [
  { id: 'idle', label: 'janela ociosa', lockHeld: false },
  { id: 'drain_running', label: 'drenagem em andamento', lockHeld: true },
  { id: 'ensure_running', label: 'criação de partições em andamento', lockHeld: true },
];

/** Integridade da linha em relação ao RLS. */
const OWNERSHIP = [
  { id: 'owned', label: 'user_id válido', orphan: false },
  { id: 'orphan', label: 'user_id órfão/NULL', orphan: true },
];

const gaps = new Map();
/** @param {string} id @param {string} desc @param {string} mitigation */
function gap(id, desc, mitigation) {
  if (!gaps.has(id)) gaps.set(id, { id, desc, mitigation, hits: 0 });
  gaps.get(id).hits += 1;
  return id;
}

const scenarios = [];

for (const parent of PARENTS) {
  for (const anomaly of ANOMALIES) {
    for (const cause of CAUSES) {
      for (const volume of VOLUMES) {
        for (const action of ACTIONS) {
          for (const ctx of CONTEXTS) {
            for (const own of OWNERSHIP) {
              /** @type {string[]} */
              const found = [];

              // G1 — mutação sem trava colide com a drenagem/criação de partição.
              if (action.mutates && ctx.lockHeld) {
                found.push(
                  gap(
                    'G1_lock_contention',
                    'Triagem mutante executando junto da drenagem/criação de partições disputa o mesmo conjunto de linhas da DEFAULT.',
                    'Triagem adquire a MESMA advisory lock (partition_maintenance_lock_key) e registra locked_out=true ao invés de prosseguir.',
                  ),
                );
              }

              // G2 — correção automática sem offset confiável inventa dados.
              if (action.id === 'auto_shift' && (!cause.hasOffset || !anomaly.shiftable)) {
                found.push(
                  gap(
                    'G2_unsafe_shift',
                    'Correção automática aplicada a anomalia sem hipótese determinística de offset fabricaria um timestamp falso.',
                    'auto_shift só é permitido quando a anomalia é shiftable E a causa possui offset inferido; caso contrário cai em classify_only.',
                  ),
                );
              }

              // G3 — purge é destrutivo e irreversível para dado de vigilância (LGPD/evidência).
              if (action.id === 'purge') {
                found.push(
                  gap(
                    'G3_destructive_purge',
                    'Descarte automático de detecções elimina evidência potencialmente probatória sem trilha de auditoria.',
                    'A rotina NUNCA apaga: purge não é implementado. Linhas irrecuperáveis permanecem na DEFAULT, apenas rotuladas.',
                  ),
                );
              }

              // G4 — varredura completa da DEFAULT em volume alto trava a ingestão.
              if (volume.rows >= 250_000 && !action.mutates === false) {
                // (mantido explícito abaixo)
              }
              if (volume.rows >= 250_000) {
                found.push(
                  gap(
                    'G4_full_scan_cost',
                    'Classificar 250k+ linhas linha a linha faz seq scan longo sobre a DEFAULT e concorre com INSERTs de câmera.',
                    'Classificação é feita por AGREGAÇÃO (count/min/max por bucket) em uma única passada, com STATEMENT timeout e amostragem de exemplos limitada.',
                  ),
                );
              }

              // G5 — linha órfã reinserida quebraria o isolamento por RLS.
              if (action.mutates && own.orphan) {
                found.push(
                  gap(
                    'G5_orphan_rls',
                    'Mover/corrigir linha com user_id nulo ou órfão cria registro inalcançável pelas policies e invisível ao dono.',
                    'Linhas órfãs são classificadas no bucket `orphan_owner` e jamais corrigidas automaticamente.',
                  ),
                );
              }

              // G6 — timestamp NULL não tem bucket e escaparia da contagem.
              if (anomaly.id === 'null_key') {
                found.push(
                  gap(
                    'G6_null_key_blindspot',
                    'Linha com chave de partição NULL não entra em nenhum range e some das agregações com WHERE por intervalo.',
                    'Bucket dedicado `null_key`, contabilizado com IS NULL explícito antes dos buckets por range.',
                  ),
                );
              }

              // G7 — bordas da janela: risco de reclassificar como quarentena algo drenável.
              if (anomaly.id === 'near_past_edge' || anomaly.id === 'near_future_edge') {
                found.push(
                  gap(
                    'G7_window_drift',
                    'A janela plausível é relativa a now(); uma linha na borda alterna entre drenável e quarentenada conforme o dia da execução.',
                    'Triagem usa EXATAMENTE os mesmos months_back/months_ahead da drenagem e marca o bucket `drainable_pending` (não é quarentena real, só ainda não drenado).',
                  ),
                );
              }

              // G8 — sem telemetria, a quarentena vira dívida invisível.
              if (volume.rows > 0 && !action.mutates) {
                found.push(
                  gap(
                    'G8_invisible_debt',
                    'Classificação sem persistência não gera histórico: ninguém percebe a quarentena crescendo mês a mês.',
                    'Cada execução grava em `partition_quarantine_runs` (totais + buckets em jsonb) e o gate de CI avisa quando o total cresce.',
                  ),
                );
              }

              // G9 — ano 9999 estoura make_interval/partição se algum código tentar criar range.
              if (anomaly.id === 'year_9999' && action.mutates) {
                found.push(
                  gap(
                    'G9_sentinel_overflow',
                    'Tentar derivar uma partição a partir de um sentinela (9999-12-31) cria range absurdo e polui o catálogo para sempre.',
                    'Sentinelas caem em `sentinel_far_future` e são explicitamente excluídos de qualquer caminho que crie partição.',
                  ),
                );
              }

              const safe = found.length === 0;
              scenarios.push({
                parent,
                anomaly: anomaly.id,
                cause: cause.id,
                volume: volume.id,
                rows: volume.rows,
                action: action.id,
                context: ctx.id,
                ownership: own.id,
                safe,
                gaps: found,
              });
            }
          }
        }
      }
    }
  }
}

const unsafe = scenarios.filter((s) => !s.safe);
const gapList = [...gaps.values()].sort((a, b) => b.hits - a.hits);

const summary = {
  wave: 109,
  title: 'Triagem automática da quarentena da partição DEFAULT',
  generatedAt: new Date().toISOString(),
  totalScenarios: scenarios.length,
  safeScenarios: scenarios.length - unsafe.length,
  unsafeScenarios: unsafe.length,
  gaps: gapList,
};

const outJson = resolve('reports/simulations/wave109.json');
mkdirSync(dirname(outJson), { recursive: true });
writeFileSync(outJson, JSON.stringify({ summary, scenarios }, null, 2));

const md = [
  `# Onda 109 — ${summary.title}`,
  '',
  `- Gerado em: ${summary.generatedAt}`,
  `- Cenários simulados: **${summary.totalScenarios}**`,
  `- Seguros: **${summary.safeScenarios}**`,
  `- Inseguros (exigem mitigação): **${summary.unsafeScenarios}**`,
  '',
  '## Gaps identificados',
  '',
  '| ID | Ocorrências | Risco | Mitigação adotada |',
  '| --- | ---: | --- | --- |',
  ...gapList.map((g) => `| \`${g.id}\` | ${g.hits} | ${g.desc} | ${g.mitigation} |`),
  '',
].join('\n');
writeFileSync(resolve('reports/simulations/wave109.md'), md);

console.log(`Onda 109 — ${summary.totalScenarios} cenários simulados`);
console.log(`  seguros ......... ${summary.safeScenarios}`);
console.log(`  inseguros ....... ${summary.unsafeScenarios}`);
console.log(`  gaps distintos .. ${gapList.length}`);
for (const g of gapList) console.log(`   - ${g.id} (${g.hits}x)`);
console.log(`\nRelatórios: reports/simulations/wave109.{json,md}`);
