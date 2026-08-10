#!/usr/bin/env node
/**
 * Onda 120 — simulação exaustiva do veredito de surdez.
 *
 * Objetivo: provar, antes de qualquer migração, que a nova regra de evidência
 * (a) elimina os falsos positivos que a Onda 119 introduziu, (b) não perde
 * nenhum agente genuinamente surdo, e (c) é monótona — mais silêncio nunca
 * pode reduzir a taxa de surdez.
 *
 * Executa o produto cartesiano dos desfechos possíveis e depois uma bateria
 * de frotas sintéticas com perfis realistas.
 */

import {
  BACKEND_ABANDON_ERRORS,
  DEFAULT_VERDICT_POLICY as P,
  classifyEvidence,
  classifyOutcome,
  conformantTtlSeconds,
  judge,
  tallyEvidence,
} from '../src/lib/relayVerdict.ts';

let scenarios = 0;
let assertions = 0;
const failures = [];

function assert(cond, label, detail) {
  assertions += 1;
  if (!cond) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Bloco A — produto cartesiano de todas as formas possíveis de uma linha.
// ---------------------------------------------------------------------------
const STATUSES = ['pending', 'in_progress', 'done', 'failed', 'expired'];
const WINDOWS = [0, 1, 25, 44, 45, 59, 60, 61, 120, 600, 3600];
const ERRORS = [
  null,
  '',
  'task_expired_unfair_window',
  'task_expired_unclaimed',
  'task_expired_no_response',
  'backend_timeout',
  'relay_backend_abandoned',
  'ECONNREFUSED 192.168.1.50:80',
  'camera_http_401',
];

for (const status of STATUSES) {
  for (const windowSeconds of WINDOWS) {
    for (const claimed of [false, true]) {
      for (const expired of [false, true]) {
        for (const error of ERRORS) {
          scenarios += 1;
          const facts = { status, windowSeconds, claimed, error, expired };
          const outcome = classifyOutcome(facts);
          const evidence = classifyEvidence(outcome);

          // I1 — total: toda linha recebe exatamente uma classe conhecida.
          assert(
            ['alive', 'deaf', 'inconclusive'].includes(evidence),
            'I1 classificação total',
            JSON.stringify(facts)
          );

          // I2 — desistência nossa jamais acusa o agente (D3).
          if (BACKEND_ABANDON_ERRORS.includes(error ?? '')) {
            assert(
              evidence === 'inconclusive',
              'I2 abandono do backend é inconclusivo',
              JSON.stringify(facts)
            );
          }

          // I3 — resposta recebida jamais é surdez (D2).
          if (status === 'done' || status === 'failed') {
            if (!BACKEND_ABANDON_ERRORS.includes(error ?? '')) {
              assert(
                evidence === 'alive',
                'I3 resposta recebida é prova de vida',
                JSON.stringify(facts)
              );
            }
          }

          // I4 — janela abaixo do justo nunca vira surdez (D1).
          if (windowSeconds < P.fairWindowSeconds && status !== 'done' && status !== 'failed') {
            assert(evidence !== 'deaf', 'I4 janela injusta nunca acusa', JSON.stringify(facts));
          }

          // I5 — surdez exige janela justa e ausência de resposta.
          if (evidence === 'deaf') {
            assert(
              windowSeconds >= P.fairWindowSeconds,
              'I5 surdez exige janela justa',
              JSON.stringify(facts)
            );
            assert(
              status !== 'done' && status !== 'failed',
              'I5b surdez exige silêncio',
              JSON.stringify(facts)
            );
          }

          // I6 — tarefa viva (não expirada, sem status terminal) é inconclusiva.
          if (status === 'pending' && !expired && !BACKEND_ABANDON_ERRORS.includes(error ?? '')) {
            assert(
              evidence === 'inconclusive',
              'I6 tarefa em voo é inconclusiva',
              JSON.stringify(facts)
            );
          }

          // I7 — determinismo.
          assert(classifyOutcome(facts) === outcome, 'I7 determinismo');
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bloco B — o cenário exato da regressão da Onda 119.
// ---------------------------------------------------------------------------
{
  // Produtor grava TTL 45s, trigger estica para 60s, backend desiste em 25s.
  const regressao = {
    status: 'expired',
    windowSeconds: 60, // esticado pela Onda 119
    claimed: false,
    error: 'backend_timeout',
    expired: true,
  };
  scenarios += 1;
  assert(
    classifyEvidence(classifyOutcome(regressao)) === 'inconclusive',
    'B1 regressão da Onda 119 neutralizada',
    'tarefa abandonada pelo backend não pode acusar o agente'
  );

  // Câmera quebrada na LAN: 20 tarefas voltam com erro do alvo.
  const cameraQuebrada = Array.from({ length: 20 }, () => ({
    status: 'failed',
    windowSeconds: 60,
    claimed: true,
    error: 'camera_http_401',
    expired: false,
  }));
  scenarios += 1;
  const vc = judge(tallyEvidence(cameraQuebrada));
  assert(vc.deaf === false, 'B2 câmera quebrada não derruba agente saudável', vc.reason);
  assert(vc.deafRatio === 0, 'B2b taxa zero com agente respondendo', String(vc.deafRatio));

  // Agente genuinamente surdo: nada é reivindicado, janelas justas.
  const surdo = Array.from({ length: 12 }, () => ({
    status: 'expired',
    windowSeconds: 120,
    claimed: false,
    error: 'task_expired_unclaimed',
    expired: true,
  }));
  scenarios += 1;
  const vs = judge(tallyEvidence(surdo));
  assert(vs.deaf === true, 'B3 agente realmente surdo continua sendo detectado', vs.reason);
  assert(vs.deafRatio === 1, 'B3b taxa máxima', String(vs.deafRatio));

  // Agente travado: reivindica e some.
  const travado = Array.from({ length: 8 }, () => ({
    status: 'expired',
    windowSeconds: 300,
    claimed: true,
    error: 'task_expired_no_response',
    expired: true,
  }));
  scenarios += 1;
  assert(judge(tallyEvidence(travado)).deaf === true, 'B4 agente travado é detectado');

  // Frota inteira com produtor não-conforme: ninguém pode ser acusado.
  const naoConforme = Array.from({ length: 50 }, () => ({
    status: 'expired',
    windowSeconds: 45,
    claimed: false,
    error: 'task_expired_unfair_window',
    expired: true,
  }));
  scenarios += 1;
  const vn = judge(tallyEvidence(naoConforme));
  assert(vn.deafRatio === null, 'B5 produtor não-conforme não gera veredito', vn.reason);
  assert(vn.deaf === false, 'B5b nenhum reinício com evidência inconclusiva');
}

// ---------------------------------------------------------------------------
// Bloco C — frotas sintéticas: monotonicidade e ausência de falso positivo.
// ---------------------------------------------------------------------------
function makeTask(kind) {
  switch (kind) {
    case 'alive_ok':
      return { status: 'done', windowSeconds: 60, claimed: true, error: null, expired: false };
    case 'alive_err':
      return {
        status: 'failed',
        windowSeconds: 60,
        claimed: true,
        error: 'ECONNREFUSED',
        expired: false,
      };
    case 'deaf':
      return {
        status: 'expired',
        windowSeconds: 120,
        claimed: false,
        error: 'task_expired_unclaimed',
        expired: true,
      };
    case 'stuck':
      return {
        status: 'expired',
        windowSeconds: 120,
        claimed: true,
        error: 'task_expired_no_response',
        expired: true,
      };
    case 'abandoned':
      return {
        status: 'expired',
        windowSeconds: 60,
        claimed: false,
        error: 'backend_timeout',
        expired: true,
      };
    case 'unfair':
      return {
        status: 'expired',
        windowSeconds: 30,
        claimed: false,
        error: 'task_expired_unfair_window',
        expired: true,
      };
    default:
      throw new Error(`kind desconhecido: ${kind}`);
  }
}

for (let ok = 0; ok <= 12; ok += 1) {
  for (let err = 0; err <= 8; err += 2) {
    for (let deaf = 0; deaf <= 12; deaf += 1) {
      for (const noise of [0, 3, 9, 30]) {
        for (const noiseKind of ['abandoned', 'unfair']) {
          scenarios += 1;
          const tasks = [
            ...Array.from({ length: ok }, () => makeTask('alive_ok')),
            ...Array.from({ length: err }, () => makeTask('alive_err')),
            ...Array.from({ length: deaf }, () => makeTask('deaf')),
            ...Array.from({ length: noise }, () => makeTask(noiseKind)),
          ];
          const tally = tallyEvidence(tasks);
          const verdict = judge(tally);

          // I8 — ruído inconclusivo não altera o veredito.
          const semRuido = judge(
            tallyEvidence(
              tasks.filter((t) => classifyEvidence(classifyOutcome(t)) !== 'inconclusive')
            )
          );
          assert(
            verdict.deaf === semRuido.deaf && verdict.deafRatio === semRuido.deafRatio,
            'I8 ruído inconclusivo é neutro',
            `ok=${ok} err=${err} deaf=${deaf} noise=${noise}/${noiseKind}`
          );

          // I9 — denominador correto.
          assert(tally.alive === ok + err, 'I9 contagem de vida', `${tally.alive}`);
          assert(tally.deaf === deaf, 'I9b contagem de surdez', `${tally.deaf}`);
          assert(verdict.sample === ok + err + deaf, 'I9c amostra conclusiva');

          // I10 — nenhum agente que respondeu a tudo é acusado.
          if (deaf === 0) assert(verdict.deaf === false, 'I10 sem silêncio, sem acusação');

          // I11 — monotonicidade: uma surdez a mais nunca reduz a taxa.
          const maisSurdez = judge(tallyEvidence([...tasks, makeTask('deaf')]));
          if (verdict.deafRatio !== null && maisSurdez.deafRatio !== null) {
            assert(
              maisSurdez.deafRatio >= verdict.deafRatio - 1e-12,
              'I11 monotonicidade da surdez',
              `${verdict.deafRatio} → ${maisSurdez.deafRatio}`
            );
          }

          // I12 — simétrico: uma prova de vida a mais nunca aumenta a taxa.
          const maisVida = judge(tallyEvidence([...tasks, makeTask('alive_ok')]));
          if (verdict.deafRatio !== null && maisVida.deafRatio !== null) {
            assert(
              maisVida.deafRatio <= verdict.deafRatio + 1e-12,
              'I12 monotonicidade da vida',
              `${verdict.deafRatio} → ${maisVida.deafRatio}`
            );
          }

          // I13 — taxa sempre em [0,1].
          if (verdict.deafRatio !== null) {
            assert(verdict.deafRatio >= 0 && verdict.deafRatio <= 1, 'I13 taxa normalizada');
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bloco D — conformidade do produtor.
// ---------------------------------------------------------------------------
for (const backendMs of [1_000, 15_000, 25_000, 45_000, 60_000, 120_000]) {
  scenarios += 1;
  const ttl = conformantTtlSeconds(backendMs);
  // I14 — o TTL cobre a espera real do backend.
  assert(ttl * 1000 >= backendMs, 'I14 TTL cobre a espera do backend', `${ttl}s vs ${backendMs}ms`);
  // I15 — e nunca fica abaixo da janela justa (não gera linha descartável).
  assert(ttl >= P.fairWindowSeconds, 'I15 TTL conforme à janela justa', `${ttl}s`);
  // I16 — uma tarefa criada com esse TTL, se expirar sem claim, é diagnosticável.
  const t = {
    status: 'expired',
    windowSeconds: ttl,
    claimed: false,
    error: 'task_expired_unclaimed',
    expired: true,
  };
  assert(
    classifyEvidence(classifyOutcome(t)) === 'deaf',
    'I16 produtor conforme gera evidência útil'
  );
}

// ---------------------------------------------------------------------------
console.log(`Onda 120 — cenários simulados: ${scenarios.toLocaleString('pt-BR')}`);
console.log(`Onda 120 — asserções verificadas: ${assertions.toLocaleString('pt-BR')}`);

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`❌ ${failures.length} falha(s) (${unique.length} distintas):`);
  for (const f of unique.slice(0, 25)) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('✅ Invariantes I1..I16 sustentadas em todos os cenários.');
