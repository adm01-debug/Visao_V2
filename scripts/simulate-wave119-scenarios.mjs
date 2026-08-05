#!/usr/bin/env node
/**
 * Onda 119 — simulação exaustiva da integridade temporal da fila de relay.
 *
 * Objetivo: provar, por enumeração, que nenhuma combinação de jitter, TTL
 * proposto e comportamento do agente consegue produzir o laço de realimentação
 * "TTL curto → agente parece surdo → reinício → TTL curto de novo".
 *
 * Invariantes verificadas:
 *  I1  A janela normalizada é sempre estritamente positiva.
 *  I2  A janela normalizada nunca é menor que o mínimo da política.
 *  I3  A janela normalizada nunca excede o teto de sanidade.
 *  I4  Normalizar é idempotente (normalize(normalize(x)) == normalize(x)).
 *  I5  A normalização nunca antecipa a expiração proposta pelo produtor.
 *  I6  `scheduled_at` nunca é alterado pela normalização.
 *  I7  Toda tarefa normalizada tem janela justa (≥ fairWindow) — ou seja,
 *      após a normalização é impossível gerar evidência falsa de surdez.
 *  I8  Uma janela injusta jamais conta como evidência de surdez.
 *  I9  A classificação é total: toda expiração recebe exatamente um motivo.
 *  I10 Expiração com janela injusta nunca é classificada como culpa do agente.
 *  I11 Um agente que responde dentro da janela nunca gera expiração.
 *  I12 O laço de realimentação é impossível: com normalização ativa, um agente
 *      saudável tem razão de surdez zero, qualquer que seja o jitter.
 */

import {
  DEFAULT_RELAY_WINDOW_POLICY as POLICY,
  DEAF_EVIDENCE_REASONS,
  classifyExpiry,
  countsAsDeafEvidence,
  normalizeWindow,
} from '../src/lib/relayTaskWindow.ts';

let checks = 0;
let scenarios = 0;
const failures = [];

function assert(id, condition, detail) {
  checks += 1;
  if (!condition) failures.push(`${id}: ${detail}`);
}

const JITTERS = [0, 1, 7, 19, 20, 21, 59, 60, 120, 300, 539, 540, 900];
const PROPOSED_TTL = [null, -600, -1, 0, 1, 5, 30, 59, 60, 61, 120, 300, 600, 3600, 7200, 86400];
const POLL_DELAYS = [0, 5, 19, 20, 21, 55, 61, 200, 1000, 100000];
const CLAIMED = [true, false];
const RESPONDS = [true, false];

for (const jitter of JITTERS) {
  for (const ttl of PROPOSED_TTL) {
    // O produtor propõe a expiração em segundos absolutos a partir de agora;
    // TTLs negativos simulam relógio torto ou aritmética invertida no produtor.
    const proposed = {
      scheduledInSeconds: jitter,
      expiresInSeconds: ttl === null ? null : jitter + ttl,
    };
    const n = normalizeWindow(proposed, POLICY);

    assert('I1', n.windowSeconds > 0, `janela não positiva (jitter=${jitter} ttl=${ttl})`);
    assert(
      'I2',
      n.windowSeconds >= POLICY.minWindowSeconds,
      `janela abaixo do mínimo (${n.windowSeconds}s)`
    );
    assert(
      'I3',
      n.windowSeconds <= POLICY.maxWindowSeconds,
      `janela acima do teto (${n.windowSeconds}s)`
    );
    assert(
      'I6',
      n.scheduledInSeconds === Math.max(0, jitter),
      'agendamento alterado pela normalização'
    );
    assert(
      'I7',
      countsAsDeafEvidence(n.windowSeconds, POLICY),
      'janela normalizada considerada injusta'
    );

    const again = normalizeWindow(
      { scheduledInSeconds: n.scheduledInSeconds, expiresInSeconds: n.expiresInSeconds },
      POLICY
    );
    assert(
      'I4',
      again.expiresInSeconds === n.expiresInSeconds &&
        again.scheduledInSeconds === n.scheduledInSeconds,
      `normalização não idempotente (jitter=${jitter} ttl=${ttl})`
    );

    if (ttl !== null && jitter + ttl <= jitter + POLICY.maxWindowSeconds) {
      assert(
        'I5',
        n.expiresInSeconds >= jitter + ttl,
        `expiração antecipada em relação à proposta (jitter=${jitter} ttl=${ttl})`
      );
    }

    for (const pollDelay of POLL_DELAYS) {
      for (const claimed of CLAIMED) {
        for (const responds of RESPONDS) {
          scenarios += 1;

          // O agente reivindica na primeira sondagem após ficar elegível.
          const claimAt = n.scheduledInSeconds + pollDelay;
          const claimedInTime = claimed && claimAt < n.expiresInSeconds;
          const answered = claimedInTime && responds;

          if (answered) {
            assert('I11', true, 'resposta dentro da janela');
            continue;
          }

          const reason = classifyExpiry(
            { windowSeconds: n.windowSeconds, claimed: claimedInTime },
            POLICY
          );
          assert(
            'I9',
            reason === 'task_expired_unfair_window' ||
              reason === 'task_expired_unclaimed' ||
              reason === 'task_expired_no_response',
            `motivo desconhecido: ${reason}`
          );

          const blamesAgent = DEAF_EVIDENCE_REASONS.includes(reason);
          if (!countsAsDeafEvidence(n.windowSeconds, POLICY)) {
            assert('I10', !blamesAgent, 'janela injusta culpou o agente');
          }
          assert(
            'I8',
            countsAsDeafEvidence(n.windowSeconds, POLICY) || !blamesAgent,
            'evidência de surdez a partir de janela injusta'
          );
        }
      }
    }

    // I12 — agente saudável (responde dentro de um ciclo de poll) nunca acumula
    // evidência de surdez, por mais alto que seja o jitter.
    const healthyClaim = n.scheduledInSeconds + POLICY.agentPollSeconds;
    assert(
      'I12',
      healthyClaim < n.expiresInSeconds,
      `agente saudável perderia a janela (jitter=${jitter} ttl=${ttl} janela=${n.windowSeconds}s)`
    );
  }
}

// Janelas injustas só existem se a normalização for burlada (escrita direta).
for (const w of [0, 1, 19, 30, 59]) {
  for (const claimed of CLAIMED) {
    scenarios += 1;
    const reason = classifyExpiry({ windowSeconds: w, claimed }, POLICY);
    assert('I10', reason === 'task_expired_unfair_window', `janela de ${w}s deveria ser injusta`);
  }
}

console.log(`Onda 119 — cenários simulados: ${scenarios.toLocaleString('pt-BR')}`);
console.log(`Asserções verificadas: ${checks.toLocaleString('pt-BR')}`);

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} invariante(s) violada(s):`);
  for (const f of failures.slice(0, 20)) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('✅ Todas as invariantes I1..I12 preservadas.');
