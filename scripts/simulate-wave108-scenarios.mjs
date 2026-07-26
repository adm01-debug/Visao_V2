#!/usr/bin/env node
/**
 * Onda 108 — Drenagem da partição DEFAULT e alerta de contingência.
 *
 * Contexto (gap deixado aberto na Onda 107): a partição DEFAULT foi criada
 * como balde de contingência para timestamps fora de qualquer range. Ela
 * impede o 23514, mas cria três riscos novos:
 *
 *  1. `CREATE TABLE ... PARTITION OF` do mês seguinte precisa ESCANEAR a
 *     DEFAULT para provar que nenhuma linha pertenceria à nova partição.
 *     Com a DEFAULT populada, isso vira ACCESS EXCLUSIVE + seq scan → o job
 *     diário do cron pode travar a ingestão.
 *  2. Linhas legítimas (cobertura vencida por poucas horas) ficam presas na
 *     DEFAULT em vez de irem para a partição mensal — pruning não funciona e
 *     as queries por período varrem o balde inteiro.
 *  3. Lixo real (relógio de câmera em 1970 ou 2099) fica indistinguível de
 *     linha drenável, e drenar cegamente recria o problema todo mês.
 *
 * Este script simula a matriz de drenagem antes da migração e classifica cada
 * cenário em safe/unsafe, gravando reports/simulations/wave108.{json,md}.
 *
 * Uso: node scripts/simulate-wave108-scenarios.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'reports', 'simulations');

/* ------------------------------------------------------------------ */
/* Dimensões da matriz                                                 */
/* ------------------------------------------------------------------ */

/** Natureza da linha parada na DEFAULT. */
const ROW_KINDS = /** @type {const} */ ([
  { id: 'atrasada_mes_corrente', offset: 0, plausible: true },
  { id: 'virada_mes_seguinte', offset: 1, plausible: true },
  { id: 'retroativa_3_meses', offset: -3, plausible: true },
  { id: 'retroativa_5_anos', offset: -60, plausible: false },
  { id: 'relogio_zerado_1970', offset: -672, plausible: false },
  { id: 'relogio_futuro_2099', offset: 876, plausible: false },
]);

/** Estratégia de drenagem avaliada. */
const STRATEGIES = /** @type {const} */ ([
  { id: 'nenhuma', drains: false, createsTarget: false, quarantines: false },
  { id: 'drenagem_cega', drains: true, createsTarget: false, quarantines: false },
  { id: 'drenagem_criando_alvo', drains: true, createsTarget: true, quarantines: false },
  { id: 'drenagem_com_quarentena', drains: true, createsTarget: true, quarantines: true },
]);

/** Volume de linhas na DEFAULT no momento da drenagem. */
const VOLUMES = /** @type {const} */ ([0, 10, 5_000, 250_000, 5_000_000]);

/** Tamanho do lote por transação. */
const BATCH_SIZES = /** @type {const} */ ([0, 1_000, 50_000]);

/** Concorrência no instante da drenagem. */
const CONCURRENCY = /** @type {const} */ ([
  'ocioso',
  'ingestao_ativa',
  'cron_criando_particao',
  'relatorio_lendo_pai',
]);

/** A drenagem preserva o dono da linha? */
const TENANCY = /** @type {const} */ (['preserva_user_id', 'perde_user_id']);

/* ------------------------------------------------------------------ */
/* Modelo de decisão                                                   */
/* ------------------------------------------------------------------ */

/** Limite acima do qual mover tudo numa transação só é inviável. */
const SINGLE_TX_LIMIT = 100_000;

/**
 * @returns {{outcome: string, safe: boolean, gap: string|null}}
 */
function evaluate({ row, strategy, volume, batch, concurrency, tenancy }) {
  // Perder o dono da linha é falha de isolamento, independente do resto.
  if (strategy.drains && tenancy === 'perde_user_id') {
    return {
      outcome: 'linha_orfa_sem_dono',
      safe: false,
      gap: 'Drenagem via INSERT..SELECT sem carregar user_id gera linha órfã invisível ao dono e imune à RLS. Mover a linha inteira.',
    };
  }

  // Sem drenagem, a DEFAULT só cresce.
  if (!strategy.drains) {
    if (volume === 0) return { outcome: 'default_vazia_nada_a_fazer', safe: true, gap: null };
    if (concurrency === 'cron_criando_particao') {
      return {
        outcome: 'attach_bloqueado_por_scan_da_default',
        safe: false,
        gap: 'DEFAULT populada força scan + ACCESS EXCLUSIVE ao criar a partição do mês seguinte: o cron trava a ingestão.',
      };
    }
    return {
      outcome: 'linhas_presas_sem_pruning',
      safe: false,
      gap: 'Sem drenagem as linhas ficam fora da partição correta: pruning não se aplica e a consulta por período varre o balde.',
    };
  }

  if (volume === 0) return { outcome: 'default_vazia_nada_a_fazer', safe: true, gap: null };

  // Lote inexistente = tudo numa transação só.
  if (batch === 0 && volume > SINGLE_TX_LIMIT) {
    return {
      outcome: 'transacao_gigante_lock_prolongado',
      safe: false,
      gap: 'Drenagem sem lote em volume alto mantém lock longo e infla o WAL. Processar em lotes com commit por lote.',
    };
  }

  // Linha implausível: não existe partição de destino razoável.
  if (!row.plausible) {
    if (!strategy.quarantines) {
      return {
        outcome: 'cria_particao_absurda_ou_falha',
        safe: false,
        gap: 'Timestamp absurdo (1970/2099) sem quarentena faz a rotina criar partições inúteis ou falhar em loop todo dia.',
      };
    }
    return { outcome: 'linha_marcada_para_quarentena', safe: true, gap: null };
  }

  // Linha plausível, mas a partição de destino pode não existir.
  if (!strategy.createsTarget) {
    return {
      outcome: 'drenagem_falha_23514',
      safe: false,
      gap: 'Drenagem cega falha quando a partição de destino ainda não existe: garantir o alvo antes de mover.',
    };
  }

  if (concurrency === 'cron_criando_particao' && batch >= 50_000) {
    return {
      outcome: 'contencao_com_o_cron',
      safe: false,
      gap: 'Lote grande concorrendo com a criação de partição gera contenção de lock. Usar lote pequeno e lock advisory entre as rotinas.',
    };
  }

  return { outcome: 'linha_movida_para_particao_correta', safe: true, gap: null };
}

/* ------------------------------------------------------------------ */
/* Execução da matriz                                                  */
/* ------------------------------------------------------------------ */

const scenarios = [];
for (const row of ROW_KINDS) {
  for (const strategy of STRATEGIES) {
    for (const volume of VOLUMES) {
      for (const batch of BATCH_SIZES) {
        for (const concurrency of CONCURRENCY) {
          for (const tenancy of TENANCY) {
            const result = evaluate({ row, strategy, volume, batch, concurrency, tenancy });
            scenarios.push({
              row: row.id,
              strategy: strategy.id,
              volume,
              batch,
              concurrency,
              tenancy,
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
  unsafeByStrategy: groupBy('strategy'),
  unsafeByOutcome: groupBy('outcome'),
  gaps,
  generated_at: new Date().toISOString(),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'wave108.json'), JSON.stringify({ summary, scenarios }, null, 2));

const md = [
  '# Onda 108 — Simulação da drenagem da partição DEFAULT',
  '',
  `Gerado em ${summary.generated_at}`,
  '',
  `- Cenários simulados: **${summary.total}**`,
  `- Seguros: **${summary.safe}**`,
  `- Inseguros: **${summary.unsafe}**`,
  '',
  '## Inseguros por estratégia',
  ...Object.entries(summary.unsafeByStrategy).map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
  '## Inseguros por desfecho',
  ...Object.entries(summary.unsafeByOutcome).map(([k, v]) => `- \`${k}\`: ${v}`),
  '',
  '## Gaps previstos (a serem fechados pela migração)',
  ...gaps.map((g, i) => `${i + 1}. ${g}`),
  '',
].join('\n');
writeFileSync(resolve(OUT_DIR, 'wave108.md'), md);

console.log(`Cenários: ${summary.total} | seguros: ${summary.safe} | inseguros: ${summary.unsafe}`);
console.log('Inseguros por estratégia:', summary.unsafeByStrategy);
console.log('\nGaps previstos:');
gaps.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));
console.log('\nRelatórios: reports/simulations/wave108.{json,md}');
