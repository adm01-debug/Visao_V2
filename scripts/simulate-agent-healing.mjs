#!/usr/bin/env node
/**
 * Onda 115 — Simulador exaustivo da política de auto-cura dos agentes locais.
 *
 * Varre o produto cartesiano de estados plausíveis (status, heartbeat, idade
 * de cadastro, mistura da fila de relay, tentativas prévias, cooldown) e
 * verifica as invariantes I1..I7 documentadas em `src/lib/agentHealing.ts`.
 *
 * Uso: `node scripts/simulate-agent-healing.mjs`
 */
import {
  DEFAULT_AGENT_HEALING_THRESHOLDS as T,
  decideAgentHealing,
  evaluateAgentHealing,
} from '../src/lib/agentHealing.ts';

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const MIN = 60_000;

const statuses = ['active', 'revoked'];
const silentMinutes = [null, 0, 1, 9, 10, 11, 29, 30, 31, 120, 1440, -5];
const createdAgoMinutes = [0, 5, 14, 15, 60, 10_000];
const relayMixes = [
  { done: 0, failed: 0, expired: 0, pending: 0 },
  { done: 4, failed: 1, expired: 0, pending: 0 },
  { done: 10, failed: 0, expired: 0, pending: 0 },
  { done: 9, failed: 1, expired: 0, pending: 2 },
  { done: 5, failed: 0, expired: 5, pending: 0 },
  { done: 1, failed: 4, expired: 5, pending: 9 },
  { done: 0, failed: 0, expired: 20, pending: 3 },
];
const attemptsList = [0, 1, 2, 3, 7];
const lastAttemptAgo = [null, 0, 7, 14, 15, 16, 600];

let cases = 0;
const failures = [];

function fail(msg, ctx) {
  if (failures.length < 20) failures.push(`${msg} :: ${JSON.stringify(ctx)}`);
}

const rank = { ok: 0, warning: 1, critical: 2 };

for (const status of statuses) {
  for (const silent of silentMinutes) {
    for (const createdAgo of createdAgoMinutes) {
      for (const relay of relayMixes) {
        for (const attempts of attemptsList) {
          for (const attemptAgo of lastAttemptAgo) {
            const agent = {
              id: 'a1',
              name: 'agente-teste',
              status,
              lastSeenAtMs: silent === null ? null : NOW - silent * MIN,
              createdAtMs: NOW - createdAgo * MIN,
              relay,
              attempts,
              lastAttemptAtMs: attemptAgo === null ? null : NOW - attemptAgo * MIN,
            };
            const d = decideAgentHealing(agent, NOW, T);
            cases += 1;
            const ctx = { status, silent, createdAgo, relay, attempts, attemptAgo, d };

            // I1 — revogado nunca recebe ação.
            if (status === 'revoked' && (d.action !== 'none' || d.enqueue || d.severity !== 'ok')) {
              fail('I1 violada: agente revogado recebeu ação', ctx);
            }

            // I2 — carência de instalação.
            if (
              status === 'active' &&
              silent === null &&
              createdAgo < T.graceMinutes &&
              d.action !== 'none'
            ) {
              fail('I2 violada: ação dentro da carência', ctx);
            }

            // I3 — cooldown respeitado.
            if (
              d.enqueue &&
              attemptAgo !== null &&
              attemptAgo < T.cooldownMinutes
            ) {
              fail('I3 violada: ação dentro do cooldown', ctx);
            }

            // I4 — restart exige tentativa anterior.
            if (d.action === 'restart' && attempts === 0) {
              fail('I4 violada: restart sem nudge prévio', ctx);
            }

            // I5 — tentativas esgotadas ⇒ escalate sem enfileirar.
            if (d.action === 'escalate' && d.enqueue) {
              fail('I5 violada: escalate enfileirou tarefa', ctx);
            }
            if (
              status === 'active' &&
              attempts >= T.maxAttempts &&
              d.severity !== 'ok' &&
              d.action !== 'escalate' &&
              !(silent === null && createdAgo < T.graceMinutes)
            ) {
              fail('I5 violada: tentativas esgotadas sem escalonamento', ctx);
            }

            // Totalidade: ação e severidade sempre em domínio conhecido.
            if (!['none', 'nudge', 'restart', 'escalate'].includes(d.action)) {
              fail('ação fora do domínio', ctx);
            }
            if (!['ok', 'warning', 'critical'].includes(d.severity)) {
              fail('severidade fora do domínio', ctx);
            }
            if (d.severity === 'ok' && d.enqueue) {
              fail('agente saudável gerou tarefa', ctx);
            }
          }
        }
      }
    }
  }
}

// I6 — monotonicidade: envelhecer o heartbeat nunca reduz a gravidade.
for (const relay of relayMixes) {
  for (const attempts of attemptsList) {
    let prev = -1;
    for (const silent of [0, 5, 9, 10, 20, 29, 30, 31, 120, 5000]) {
      const d = decideAgentHealing(
        {
          id: 'a1',
          name: 'm',
          status: 'active',
          lastSeenAtMs: NOW - silent * MIN,
          createdAtMs: NOW - 10_000 * MIN,
          relay,
          attempts,
          lastAttemptAtMs: null,
        },
        NOW,
        T,
      );
      cases += 1;
      if (rank[d.severity] < prev) {
        fail('I6 violada: severidade caiu com heartbeat mais velho', { relay, attempts, silent, d });
      }
      prev = Math.max(prev, rank[d.severity]);
    }
  }
}

// I7 — o resumo da frota nunca é mais brando que o pior agente.
for (let i = 0; i < 500; i += 1) {
  const agents = [];
  const n = 1 + (i % 5);
  for (let k = 0; k < n; k += 1) {
    const silent = [null, 2, 12, 45, 900][(i + k) % 5];
    agents.push({
      id: `a${k}`,
      name: `ag-${k}`,
      status: (i + k) % 7 === 0 ? 'revoked' : 'active',
      lastSeenAtMs: silent === null ? null : NOW - silent * MIN,
      createdAtMs: NOW - (60 + k) * MIN,
      relay: relayMixes[(i + k) % relayMixes.length],
      attempts: (i + k) % 4,
      lastAttemptAtMs: (i + k) % 3 === 0 ? null : NOW - ((i + k) % 40) * MIN,
    });
  }
  const v = evaluateAgentHealing({ nowMs: NOW, agents });
  cases += 1;
  const worst = v.decisions.reduce((m, d) => Math.max(m, rank[d.severity]), 0);
  if (rank[v.severity] !== worst) {
    fail('I7 violada: resumo divergiu do pior agente', { v });
  }
  if (v.severity === 'critical' && !v.reason) {
    fail('I7 violada: crítico sem motivo textual', { v });
  }
}

console.log(`Onda 115 — cenários simulados: ${cases.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} violação(ões):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Todas as invariantes I1..I7 verificadas.');
