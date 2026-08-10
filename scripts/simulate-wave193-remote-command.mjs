/**
 * Onda 193 — simulação exaustiva da admissão de comando remoto.
 *
 * Não testa "casos bonitos": varre o produto cartesiano completo do espaço de
 * entrada e cobra invariantes que, se quebradas, produzem exatamente os defeitos
 * que a regra existe para impedir — promessa falsa ao operador, reinício às
 * cegas, comando duplicado e comando eterno.
 *
 * Rodar: node --experimental-strip-types scripts/simulate-wave193-remote-command.mjs
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// Importa DIRETAMENTE o arquivo de produção (Node 22 remove as anotações de
// tipo). Copiar a regra para dentro do teste seria testar uma cópia — o defeito
// clássico que faz uma suíte verde conviver com produção quebrada.
const mod = await import(path.join(root, 'src/lib/devices/remoteCommandAdmission.ts'));

const {
  admitRemoteCommand,
  isEffectful,
  isExclusive,
  isTerminalReason,
  REMOTE_COMMANDS,
  COMMAND_CAPABILITY,
  MIN_TTL_MINUTES,
  MAX_TTL_MINUTES,
  IDEMPOTENCY_WINDOW_MINUTES,
} = mod;

let assertions = 0;
const failures = [];

const check = (condition, label, ctx) => {
  assertions += 1;
  if (!condition) {
    failures.push(`${label} :: ${JSON.stringify(ctx)}`);
    if (failures.length > 20) {
      console.error(failures.join('\n'));
      throw new Error('Falhas demais — abortando.');
    }
  }
};

const NOW = Date.parse('2026-07-28T12:00:00Z');
const MIN = 60_000;

const PRESENCES = [
  'ok',
  'expected_silence',
  'awaiting_first_contact',
  'enrollment_lapsed',
  'rejected_presence',
  'rotation_grace',
  'silent_warn',
  'silent_critical',
  'clock_anomaly',
];
const STATUSES = ['pending', 'active', 'revoked'];
const ALL_CAPS = new Set(Object.values(COMMAND_CAPABILITY));
const CAP_SETS = [new Set(), new Set(['cameras.view']), new Set(ALL_CAPS)];
const TTLS = [
  Number.NaN,
  0,
  MIN_TTL_MINUTES - 0.5,
  MIN_TTL_MINUTES,
  15,
  MAX_TTL_MINUTES,
  MAX_TTL_MINUTES + 1,
  Number.POSITIVE_INFINITY,
];
const IN_FLIGHTS = [
  null,
  { kind: 'device.reboot', expiresAt: NOW + 5 * MIN },
  { kind: 'device.reboot', expiresAt: NOW - 5 * MIN }, // expirado: não conflita
  { kind: 'config.read', expiresAt: NOW + 5 * MIN },
];

// ---------------------------------------------------------------------------
// 1. Varredura cartesiana completa do espaço de admissão
// ---------------------------------------------------------------------------
const seen = new Map();

for (const command of [...REMOTE_COMMANDS, 'osd.destroy', '', 'DEVICE.REBOOT']) {
  for (const presence of PRESENCES) {
    for (const status of STATUSES) {
      for (const caps of CAP_SETS) {
        for (const ttl of TTLS) {
          for (const inFlight of IN_FLIGHTS) {
            const req = {
              command,
              registrationStatus: status,
              presence,
              capabilities: caps,
              ttlMinutes: ttl,
              inFlight,
            };
            const v = admitRemoteCommand(req, NOW);
            const ctx = { command, presence, status, caps: [...caps], ttl, inFlight };

            // Invariante A — o veredito é sempre um dos quatro conhecidos.
            check(
              ['admit', 'defer', 'reject', 'replay'].includes(v.decision),
              'veredito fora do domínio',
              ctx
            );

            // Invariante B — só admitido/adiado tem prazo, e o prazo é futuro.
            if (v.decision === 'admit' || v.decision === 'defer') {
              check(typeof v.expiresAt === 'number' && v.expiresAt > NOW, 'prazo não futuro', ctx);
              check(
                v.expiresAt <= NOW + MAX_TTL_MINUTES * MIN,
                'prazo além do teto: comando eterno',
                ctx
              );
            } else {
              check(v.expiresAt === null, 'recusa carregando prazo', ctx);
            }

            // Invariante C — comando desconhecido nunca passa e nunca ecoa.
            if (!REMOTE_COMMANDS.includes(command)) {
              check(v.decision === 'reject', 'comando fora do catálogo admitido', ctx);
              check(v.reason === 'unknown_command', 'motivo errado p/ desconhecido', ctx);
              check(!v.message.includes(command) || command === '', 'recusa ecoa o pedido', ctx);
              continue;
            }

            // Invariante D — sem permissão nunca há efeito nem fila.
            if (!caps.has(COMMAND_CAPABILITY[command])) {
              check(v.decision === 'reject', 'comando sem permissão passou', ctx);
              check(v.reason === 'capability_missing', 'motivo errado p/ permissão', ctx);
              continue;
            }

            // Invariante E — prazo inválido é sempre recusa.
            const ttlOk = Number.isInteger(ttl) && ttl >= MIN_TTL_MINUTES && ttl <= MAX_TTL_MINUTES;
            if (!ttlOk) {
              check(
                v.decision === 'reject' && v.reason === 'invalid_ttl',
                'TTL inválido passou',
                ctx
              );
              continue;
            }

            // Invariante F — registro morto é recusa TERMINAL, jamais fila.
            if (
              status === 'revoked' ||
              presence === 'expected_silence' ||
              presence === 'enrollment_lapsed'
            ) {
              check(v.decision === 'reject', 'registro morto enfileirou comando', ctx);
              check(v.terminal === true, 'recusa de registro morto não é terminal', ctx);
              check(isTerminalReason(v.reason), 'motivo terminal inconsistente', ctx);
              continue;
            }

            // Invariante G — credencial recusada nunca vira fila (lixo garantido).
            if (presence === 'rejected_presence') {
              check(
                v.decision === 'reject' && v.reason === 'credential_rejected',
                'credencial recusada adiada',
                ctx
              );
              check(v.terminal === false, 'credencial recusada marcada como terminal', ctx);
              continue;
            }

            // Invariante H — comando de efeito NUNCA é admitido sem presença saudável.
            const healthy = presence === 'ok' || presence === 'rotation_grace';
            if (isEffectful(command) && !healthy) {
              check(v.decision === 'reject', 'efeito às cegas admitido/adiado', ctx);
              check(
                v.reason === 'presence_required' || v.reason === 'clock_unreliable',
                'motivo errado p/ efeito sem presença',
                ctx
              );
              continue;
            }

            // Invariante I — exclusividade só bloqueia com voo vivo.
            const flightAlive = inFlight !== null && inFlight.expiresAt > NOW;
            const conflicts = flightAlive && (isExclusive(command) || isExclusive(inFlight.kind));
            if (conflicts && healthy) {
              check(
                v.decision === 'reject' && v.reason === 'conflicting_command',
                'comando exclusivo concorrente admitido',
                ctx
              );
              continue;
            }

            // Invariante J — leitura em equipamento calado espera, não morre.
            if (!isEffectful(command) && !healthy && !conflicts) {
              check(v.decision === 'defer', 'leitura inócua recusada em vez de adiada', ctx);
              check(v.reason === 'awaiting_presence', 'motivo errado p/ adiamento', ctx);
              continue;
            }

            if (healthy && !conflicts) {
              check(
                v.decision === 'admit' && v.reason === 'admitted',
                'caso feliz não admitiu',
                ctx
              );
            }

            // Determinismo: mesma entrada, mesmo veredito.
            const key = JSON.stringify(ctx);
            const again = admitRemoteCommand(req, NOW);
            const prev = seen.get(key);
            check(
              JSON.stringify(again) === JSON.stringify(v) &&
                (prev === undefined || prev === JSON.stringify(v)),
              'regra não determinística',
              ctx
            );
            seen.set(key, JSON.stringify(v));
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Idempotência — repetir o pedido jamais cria um segundo comando
// ---------------------------------------------------------------------------
for (const command of REMOTE_COMMANDS) {
  for (const presence of PRESENCES) {
    for (const ageMin of [
      0,
      1,
      5,
      IDEMPOTENCY_WINDOW_MINUTES,
      IDEMPOTENCY_WINDOW_MINUTES + 1,
      120,
    ]) {
      for (const priorDecision of ['admit', 'defer', 'reject']) {
        for (const priorReason of ['admitted', 'awaiting_presence', 'registration_inactive']) {
          const base = {
            command,
            registrationStatus: 'active',
            presence,
            capabilities: new Set(ALL_CAPS),
            ttlMinutes: 10,
            inFlight: null,
          };
          const at = NOW + ageMin * MIN;
          const v = admitRemoteCommand(
            { ...base, prior: { decision: priorDecision, reason: priorReason, decidedAt: NOW } },
            at
          );
          const ctx = { command, presence, ageMin, priorDecision, priorReason };

          if (ageMin <= IDEMPOTENCY_WINDOW_MINUTES) {
            check(v.decision === 'replay', 'pedido repetido criou comando novo', ctx);
            check(v.reason === priorReason, 'replay alterou o motivo original', ctx);
            check(v.expiresAt === null, 'replay emitiu novo prazo', ctx);
          } else {
            check(v.decision !== 'replay', 'replay fora da janela', ctx);
            const fresh = admitRemoteCommand(base, at);
            check(
              v.decision === fresh.decision && v.reason === fresh.reason,
              'fora da janela o veredito deveria ser recalculado do zero',
              ctx
            );
          }
        }
      }
    }
  }
}

// Relógio para trás no registro anterior não pode virar replay eterno.
for (const skewMin of [1, 10, 60, 1440]) {
  const v = admitRemoteCommand(
    {
      command: 'config.read',
      registrationStatus: 'active',
      presence: 'ok',
      capabilities: new Set(ALL_CAPS),
      ttlMinutes: 5,
      prior: { decision: 'admit', reason: 'admitted', decidedAt: NOW + skewMin * MIN },
    },
    NOW
  );
  check(v.decision !== 'replay', 'registro no futuro virou replay', { skewMin });
}

// ---------------------------------------------------------------------------
// 3. Monotonicidade de gravidade: melhorar a presença nunca piora o veredito
// ---------------------------------------------------------------------------
const RANK = { admit: 0, defer: 1, replay: 1, reject: 2 };
for (const command of REMOTE_COMMANDS) {
  for (const ttl of [1, 10, 30]) {
    const better = admitRemoteCommand(
      {
        command,
        registrationStatus: 'active',
        presence: 'ok',
        capabilities: new Set(ALL_CAPS),
        ttlMinutes: ttl,
      },
      NOW
    );
    for (const presence of ['silent_warn', 'silent_critical', 'clock_anomaly']) {
      const worse = admitRemoteCommand(
        {
          command,
          registrationStatus: 'active',
          presence,
          capabilities: new Set(ALL_CAPS),
          ttlMinutes: ttl,
        },
        NOW
      );
      check(
        RANK[better.decision] <= RANK[worse.decision],
        'presença melhor produziu veredito pior',
        { command, presence, ttl }
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Fuzz: 200k estados aleatórios cobrando as invariantes duras
// ---------------------------------------------------------------------------
let seed = 193_2026;
const rnd = () => {
  seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
  return seed / 0x1_0000_0000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

for (let i = 0; i < 200_000; i += 1) {
  const command = pick([...REMOTE_COMMANDS, 'nope']);
  const presence = pick(PRESENCES);
  const req = {
    command,
    registrationStatus: pick(STATUSES),
    presence,
    capabilities: pick(CAP_SETS),
    ttlMinutes: pick([1, 7, 30, 31, -4, 2.5]),
    inFlight: pick(IN_FLIGHTS),
    prior: rnd() < 0.2 ? { decision: 'admit', reason: 'admitted', decidedAt: NOW - 60_000 } : null,
  };
  const at = NOW + Math.floor((rnd() - 0.5) * 4 * 3_600_000);
  const v = admitRemoteCommand(req, at);
  const ctx = { i, ...req, capabilities: [...req.capabilities], at };

  // Nenhum caminho lança, nenhum devolve mensagem vazia.
  check(typeof v.message === 'string' && v.message.length > 0, 'veredito sem explicação', ctx);
  // Efeito às cegas continua impossível, inclusive sob replay.
  if (
    v.decision === 'admit' &&
    isEffectful(command) &&
    presence !== 'ok' &&
    presence !== 'rotation_grace'
  ) {
    check(false, 'fuzz achou efeito admitido sem presença', ctx);
  }
  // Terminal nunca acompanha aceitação.
  check(
    !(v.terminal && (v.decision === 'admit' || v.decision === 'defer')),
    'aceite terminal',
    ctx
  );
}

// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`\n❌ Onda 193 — ${failures.length} falhas em ${assertions} asserções.`);
  process.exit(1);
}

console.log(
  `\n✅ Onda 193 — admissão de comando remoto: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`
);
