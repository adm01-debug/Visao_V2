#!/usr/bin/env node
/**
 * Onda 107 — Ciclo de vida das partições: cobertura futura, autodescoberta de
 * novos pais particionados e automação por pg_cron.
 *
 * Contexto (gaps herdados da Onda 106):
 *  1. `ensure_future_partitions()` tem a lista de pais HARDCODED
 *     (`ARRAY['recognition_logs','plate_detections']`). Qualquer tabela
 *     particionada nova nasce sem partições futuras e sem blindagem.
 *  2. A função só roda por execução MANUAL. Sem agendamento, a cobertura
 *     futura decai mês a mês até o INSERT falhar com 23514
 *     ("no partition of relation ... found for row").
 *  3. Não existe partição DEFAULT: linhas fora de qualquer range são perdidas
 *     como erro de escrita em vez de caírem num balde auditável.
 *  4. Não há telemetria: ninguém sabe que a cobertura acabou até o incidente.
 *
 * Este script modela a matriz completa ANTES da migração, classifica cada
 * cenário em safe/unsafe e grava reports/simulations/wave107.{json,md}.
 *
 * Uso: node scripts/simulate-wave107-scenarios.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'reports', 'simulations');

/* ------------------------------------------------------------------ */
/* Dimensões da matriz                                                 */
/* ------------------------------------------------------------------ */

/** Como o pai particionado é conhecido pela rotina de manutenção. */
const DISCOVERY = /** @type {const} */ ([
  { id: 'hardcoded_conhecido', discovered: true, note: 'está no ARRAY fixo' },
  { id: 'hardcoded_tabela_nova', discovered: false, note: 'particionada criada depois, fora do ARRAY' },
  { id: 'autodescoberto_pg_class', discovered: true, note: 'varredura relkind=p em runtime' },
  { id: 'autodescoberto_sem_user_id', discovered: true, note: 'particionada sem coluna user_id' },
]);

/** Cadência de execução da rotina. */
const SCHEDULES = /** @type {const} */ ([
  { id: 'manual_nunca', runsPerMonth: 0 },
  { id: 'manual_esporadico', runsPerMonth: 0.25 },
  { id: 'cron_mensal', runsPerMonth: 1 },
  { id: 'cron_diario', runsPerMonth: 30 },
]);

/** Horizonte pedido em `months_ahead`. */
const HORIZONS = /** @type {const} */ ([0, 1, 3, 6, 12]);

/** Quantos meses se passaram desde a última execução bem-sucedida. */
const DRIFT_MONTHS = /** @type {const} */ ([0, 1, 2, 4, 7, 13]);

/** Destino temporal da linha sendo gravada. */
const WRITE_TARGETS = /** @type {const} */ ([
  'mes_corrente',
  'mes_seguinte',
  'daqui_6_meses',
  'retroativo_2_anos',
  'timestamp_futuro_absurdo',
]);

/** Existe partição DEFAULT no pai? */
const DEFAULT_PARTITION = /** @type {const} */ ([false, true]);

/* ------------------------------------------------------------------ */
/* Modelo de decisão                                                   */
/* ------------------------------------------------------------------ */

/**
 * Cobertura efetiva, em meses à frente do mês corrente, no instante da escrita.
 * A última execução criou [0..horizon]; passaram-se `drift` meses desde então.
 * @param {number} horizon
 * @param {number} drift
 * @param {number} runsPerMonth
 * @returns {number} meses de cobertura restantes (pode ser negativo)
 */
function effectiveCoverage(horizon, drift, runsPerMonth) {
  // Com cron frequente o drift real é ~0: a rotina reexecuta antes da virada.
  const realDrift = runsPerMonth >= 1 ? 0 : drift;
  return horizon - realDrift;
}

/** Distância em meses do alvo de escrita em relação ao mês corrente. */
const TARGET_OFFSET = {
  mes_corrente: 0,
  mes_seguinte: 1,
  daqui_6_meses: 6,
  retroativo_2_anos: -24,
  timestamp_futuro_absurdo: 120,
};

/**
 * Avalia um cenário completo.
 * @returns {{outcome: string, safe: boolean, gap: string|null}}
 */
function evaluate({ discovery, schedule, horizon, drift, target, hasDefault }) {
  const offset = TARGET_OFFSET[target];

  // Pai não descoberto → nenhuma partição futura, nenhuma blindagem.
  if (!discovery.discovered) {
    if (hasDefault) {
      return {
        outcome: 'linha_cai_na_default_sem_rls',
        safe: false,
        gap: 'Pai fora do ARRAY: DEFAULT recebe tudo e nasce sem RLS própria → vazamento cross-tenant no acesso direto.',
      };
    }
    return {
      outcome: 'insert_falha_23514',
      safe: false,
      gap: 'Pai particionado fora do ARRAY hardcoded nunca recebe partições: toda escrita falha.',
    };
  }

  // Autodescoberto mas sem user_id: a policy `auth.uid() = user_id` não compila.
  if (discovery.id === 'autodescoberto_sem_user_id') {
    return {
      outcome: 'erro_42703_na_criacao_da_policy',
      safe: false,
      gap: 'Autodescoberta ingênua quebra em particionada sem user_id (42703). Filtrar pais por presença da coluna.',
    };
  }

  const coverage = effectiveCoverage(horizon, drift, schedule.runsPerMonth);

  // Escrita retroativa: depende de partição histórica já existente.
  if (offset < 0) {
    return offset < -18
      ? hasDefault
        ? { outcome: 'retroativo_na_default', safe: true, gap: null }
        : {
            outcome: 'insert_falha_23514',
            safe: false,
            gap: 'Backfill/retroativo antigo sem partição DEFAULT falha e derruba o job de importação.',
          }
      : { outcome: 'gravado_em_particao_historica', safe: true, gap: null };
  }

  // Escrita muito à frente do horizonte: nenhuma cadência cobre 120 meses.
  if (offset > horizon) {
    return hasDefault
      ? { outcome: 'gravado_na_default', safe: true, gap: null }
      : {
          outcome: 'insert_falha_23514',
          safe: false,
          gap: 'Timestamp adiante do horizonte sem DEFAULT: relógio de câmera errado derruba a ingestão.',
        };
  }

  // Dentro do horizonte nominal, mas a cobertura pode ter expirado por drift.
  if (offset > coverage) {
    return hasDefault
      ? {
          outcome: 'gravado_na_default_por_cobertura_expirada',
          safe: true,
          gap: 'Sobrevive, mas a DEFAULT vira hotspot: exige alerta de cobertura.',
        }
      : {
          outcome: 'insert_falha_23514',
          safe: false,
          gap: `Cobertura expirada (horizon=${horizon}, drift=${drift}, cadência=${schedule.id}): ingestão para.`,
        };
  }

  return { outcome: 'gravado_na_particao_correta', safe: true, gap: null };
}

/* ------------------------------------------------------------------ */
/* Execução da matriz                                                  */
/* ------------------------------------------------------------------ */

const scenarios = [];
for (const discovery of DISCOVERY) {
  for (const schedule of SCHEDULES) {
    for (const horizon of HORIZONS) {
      for (const drift of DRIFT_MONTHS) {
        for (const target of WRITE_TARGETS) {
          for (const hasDefault of DEFAULT_PARTITION) {
            const input = { discovery, schedule, horizon, drift, target, hasDefault };
            const result = evaluate(input);
            scenarios.push({
              discovery: discovery.id,
              schedule: schedule.id,
              horizon,
              drift,
              target,
              hasDefault,
              ...result,
            });
          }
        }
      }
    }
  }
}

const unsafe = scenarios.filter((s) => !s.safe);
const gaps = [...new Set(scenarios.map((s) => s.gap).filter(Boolean))];

/** Agrupa contagem de inseguros por chave. */
const groupBy = (key) =>
  unsafe.reduce((acc, s) => {
    const k = String(s[key]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

const summary = {
  total: scenarios.length,
  safe: scenarios.length - unsafe.length,
  unsafe: unsafe.length,
  unsafeByDiscovery: groupBy('discovery'),
  unsafeBySchedule: groupBy('schedule'),
  unsafeByOutcome: groupBy('outcome'),
  gaps,
  generated_at: new Date().toISOString(),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'wave107.json'), JSON.stringify({ summary, scenarios }, null, 2));

const md = [
  '# Onda 107 — Simulação do ciclo de vida das partições',
  '',
  `Gerado em ${summary.generated_at}`,
  '',
  `- Cenários simulados: **${summary.total}**`,
  `- Seguros: **${summary.safe}**`,
  `- Inseguros: **${summary.unsafe}**`,
  '',
  '## Inseguros por descoberta do pai',
  ...Object.entries(summary.unsafeByDiscovery).map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
  '## Inseguros por cadência',
  ...Object.entries(summary.unsafeBySchedule).map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
  '## Inseguros por desfecho',
  ...Object.entries(summary.unsafeByOutcome).map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
  '## Gaps previstos (a serem fechados pela migração)',
  ...gaps.map((g, i) => `${i + 1}. ${g}`),
  '',
].join('\n');
writeFileSync(resolve(OUT_DIR, 'wave107.md'), md);

console.log(`Cenários: ${summary.total} | seguros: ${summary.safe} | inseguros: ${summary.unsafe}`);
console.log('Inseguros por cadência:', summary.unsafeBySchedule);
console.log('\nGaps previstos:');
gaps.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));
console.log(`\nRelatórios: reports/simulations/wave107.{json,md}`);
