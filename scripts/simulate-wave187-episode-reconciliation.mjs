#!/usr/bin/env node
/**
 * Simulação — Onda 187: reconciliação ativa dos episódios abandonados.
 *
 * Varre o espaço de entrada procurando as formas de errar que o código de
 * produção não pode ter. Cada invariante abaixo é uma promessa que, se
 * quebrada, corrompe o livro de reincidência de forma irreversível.
 */

import {
  ABANDONED_OPEN_DAYS,
  MAX_RECONCILE_PER_RUN,
  RECONCILE_OFFSET_MS,
  planEpisodeReconciliation,
} from '../src/lib/retention/episodeReconciliation.ts';

const DAY = 86_400_000;
let assertions = 0;
const failures = [];
const invariant = (name, ok, detail) => {
  assertions += 1;
  if (!ok) failures.push(`${name}: ${detail}`);
};

// Gerador determinístico (mesma semente ⇒ mesma varredura no CI).
let seed = 187_0187;
const rnd = () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
};

const AGES = [-5, 0, 1, 7, 29, 29.99, 30, 30.01, 31, 90, 400, 3650];
const LIMITS = [1, 2, 7, 50, 499, 500, 501, 5000, Number.NaN, 0, -3];
const NOWS = [Date.UTC(2026, 6, 28), Date.UTC(2020, 0, 1), 0, Number.NaN, Number.POSITIVE_INFINITY];

for (const now of NOWS) {
  for (const limit of LIMITS) {
    for (let round = 0; round < 120; round += 1) {
      const size = 1 + Math.floor(rnd() * 12);
      const candidates = Array.from({ length: size }, (_, i) => {
        const age = AGES[Math.floor(rnd() * AGES.length)];
        const openedAt = rnd() < 0.05 ? Number.NaN : now - age * DAY;
        return { id: `e${i}`, seriesKey: `s${i % 4}`, openedAt };
      });

      const plan = planEpisodeReconciliation(candidates, now, limit);
      const byId = new Map(candidates.map((c) => [c.id, c]));

      // 1. Nenhum episódio é fechado no instante da execução.
      invariant(
        'corte declarado',
        plan.closes.every((c) => c.closedAt === c.openedAt + RECONCILE_OFFSET_MS),
        `fechamento fora do corte com now=${now} limit=${limit}`
      );

      // 2. A duração gravada é sempre a convenção — nunca uma medição inventada.
      invariant(
        'duração convencional',
        plan.closes.every((c) => c.durationMs === RECONCILE_OFFSET_MS),
        'duração divergente do corte'
      );

      // 3. Fechamento jamais antecede a abertura.
      invariant(
        'ordem temporal',
        plan.closes.every((c) => c.closedAt > c.openedAt),
        'fechamento antes da abertura'
      );

      // 4. Só entra quem já passou do corte, e nunca com relógio ilegível.
      invariant(
        'elegibilidade',
        plan.closes.every((c) => {
          const src = byId.get(c.id);
          return (
            src !== undefined &&
            Number.isFinite(src.openedAt) &&
            Number.isFinite(now) &&
            src.openedAt <= now - RECONCILE_OFFSET_MS
          );
        }),
        `episódio inelegível fechado com now=${now}`
      );

      // 5. Teto de lote é absoluto, qualquer que seja o pedido.
      invariant(
        'teto de lote',
        plan.closes.length <= MAX_RECONCILE_PER_RUN,
        `lote de ${plan.closes.length} acima do teto`
      );

      // 6. Ordem de drenagem: sempre do mais antigo para o mais novo.
      invariant(
        'antiguidade',
        plan.closes.every((c, i) => i === 0 || plan.closes[i - 1].openedAt <= c.openedAt),
        'fila drenada fora de ordem'
      );

      // 7. Conservação: todo candidato ou fecha ou é pulado, exatamente uma vez.
      const touched = new Set([...plan.closes.map((c) => c.id), ...plan.skipped.map((s) => s.id)]);
      invariant(
        'conservação',
        touched.size === candidates.length &&
          plan.closes.length + plan.skipped.length === candidates.length,
        `candidatos perdidos ou duplicados (${plan.closes.length}+${plan.skipped.length} de ${candidates.length})`
      );

      // 8. Relógio ilegível não fecha nada, jamais.
      if (!Number.isFinite(now)) {
        invariant('relógio ilegível', plan.closes.length === 0, 'fechou com relógio inválido');
      }

      // 9. Idempotência: o resultado aplicado não volta a ser elegível.
      const remaining = plan.skipped
        .filter((s) => s.reason === 'over_batch_limit')
        .map((s) => byId.get(s.id))
        .filter(Boolean);
      const second = planEpisodeReconciliation(remaining, now, limit);
      invariant(
        'idempotência',
        second.closes.every((c) => !plan.closes.some((p) => p.id === c.id)),
        'segunda passada refez fechamento já realizado'
      );

      // 10. Ordem de entrada não altera o resultado.
      const shuffled = [...candidates].sort(() => rnd() - 0.5);
      const again = planEpisodeReconciliation(shuffled, now, limit);
      invariant(
        'estabilidade',
        again.closes.length === plan.closes.length &&
          again.closes.every((c, i) => c.closedAt === plan.closes[i].closedAt),
        'resultado depende da ordem de entrada'
      );

      // 11. Adiamento é coerente com o que ficou de fora por teto.
      invariant(
        'adiamento',
        plan.deferred === plan.skipped.filter((s) => s.reason === 'over_batch_limit').length,
        'contagem de adiados diverge dos pulados por teto'
      );
    }
  }
}

// 12. Fronteira exata do corte: 30d menos 1ms não fecha; 30d fecha.
const now = Date.UTC(2026, 6, 28);
invariant(
  'fronteira',
  planEpisodeReconciliation(
    [{ id: 'x', seriesKey: 's', openedAt: now - RECONCILE_OFFSET_MS + 1 }],
    now
  ).closes.length === 0,
  'fechou episódio um milissegundo antes do corte'
);
invariant(
  'fronteira',
  planEpisodeReconciliation([{ id: 'x', seriesKey: 's', openedAt: now - RECONCILE_OFFSET_MS }], now)
    .closes.length === 1,
  'não fechou episódio exatamente no corte'
);
invariant(
  'coerência de corte',
  RECONCILE_OFFSET_MS === ABANDONED_OPEN_DAYS * DAY,
  'o corte deixou de derivar dos dias declarados'
);

if (failures.length > 0) {
  console.error(
    `❌ Simulação Onda 187 reprovada (${failures.length} falhas em ${assertions} asserções):`
  );
  for (const f of failures.slice(0, 20)) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(
  `✅ Simulação Onda 187 aprovada — ${assertions.toLocaleString('pt-BR')} asserções sobre 12 invariantes.`
);
