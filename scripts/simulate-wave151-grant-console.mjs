#!/usr/bin/env node
/**
 * Onda 151 — simulação de admissão de concessões (console de permissões).
 *
 * Modelo de referência em JS puro, espelhando
 * `src/lib/permissions/grantConsole.ts`. Varre cenários nomeados (vindos das
 * falhas reais que a Onda 150 deixou em aberto), matriz combinatória e fuzz
 * semeado, contra as invariantes G1..G7.
 *
 * Rodar: `npm run simulate:wave151`
 */
import {
  CAPABILITIES,
  ROLE_BASELINE,
  ROLES,
  ADMIN_LOCKOUT_GUARD,
  resolveCapabilities,
} from './simulate-wave150-capabilities.mjs';

export const MAX_GRANT_DAYS = 90;
export const MAX_GRANT_MS = MAX_GRANT_DAYS * 24 * 60 * 60 * 1000;
export const MIN_REASON_LENGTH = 8;

export function evaluateGrantRequest(req, nowMs) {
  const actor = resolveCapabilities(req.actorRole, req.actorGrants ?? [], nowMs);
  if (!actor.granted.has('users.grant_capability')) return 'actor_missing_capability';
  if (req.actorId === req.targetId) return 'self_grant';
  if (!CAPABILITIES.includes(req.capability)) return 'unknown_capability';
  if ((req.reason ?? '').trim().length < MIN_REASON_LENGTH) return 'reason_required';
  if (req.expiresAtMs == null) return 'expiry_required';
  if (req.expiresAtMs <= nowMs) return 'expiry_in_past';
  if (req.expiresAtMs - nowMs > MAX_GRANT_MS) return 'expiry_too_far';

  const target = resolveCapabilities(req.targetRole, req.targetGrants ?? [], nowMs);
  const targetHas = target.granted.has(req.capability);

  if (req.effect === 'grant') {
    if (!actor.granted.has(req.capability)) return 'escalation';
    if (targetHas) return 'redundant_grant';
    return null;
  }
  if (req.targetRole === 'admin' && ADMIN_LOCKOUT_GUARD.includes(req.capability)) {
    return 'ineffective_deny';
  }
  if (!targetHas) return 'ineffective_deny';
  return null;
}

export function evaluateRevokeRequest(req, nowMs) {
  const actor = resolveCapabilities(req.actorRole, req.actorGrants ?? [], nowMs);
  if (!actor.granted.has('users.grant_capability')) {
    return { allowed: false, rejection: 'actor_missing_capability', noop: false };
  }
  if (!req.grantExists) return { allowed: false, rejection: 'not_found', noop: false };
  if (req.alreadyRevoked) return { allowed: true, rejection: null, noop: true };
  return { allowed: true, rejection: null, noop: false };
}

function projectChanged(req, nowMs) {
  const before = [...resolveCapabilities(req.targetRole, req.targetGrants ?? [], nowMs).granted].sort();
  const after = [
    ...resolveCapabilities(
      req.targetRole,
      [
        ...(req.targetGrants ?? []),
        { capability: req.capability, effect: req.effect, expiresAtMs: req.expiresAtMs, revokedAtMs: null },
      ],
      nowMs,
    ).granted,
  ].sort();
  return before.join('|') !== after.join('|');
}

/* ------------------------------ cenários ---------------------------- */

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const DAY = 86_400_000;
const base = (over = {}) => ({
  actorId: 'admin-1',
  actorRole: 'admin',
  actorGrants: [],
  targetId: 'user-2',
  targetRole: 'viewer',
  targetGrants: [],
  capability: 'cameras.ptz.control',
  effect: 'grant',
  reason: 'técnico terceirizado da semana',
  expiresAtMs: NOW + 7 * DAY,
  ...over,
});

const NAMED = [
  ['concessão legítima de PTZ por 7 dias', base(), null],
  ['sem prazo (permanente disfarçada)', base({ expiresAtMs: null }), 'expiry_required'],
  ['prazo além do teto de 90 dias', base({ expiresAtMs: NOW + 91 * DAY }), 'expiry_too_far'],
  ['prazo exatamente no teto', base({ expiresAtMs: NOW + 90 * DAY }), null],
  ['prazo no passado', base({ expiresAtMs: NOW - DAY }), 'expiry_in_past'],
  ['prazo igual ao agora (borda fechada)', base({ expiresAtMs: NOW }), 'expiry_in_past'],
  ['auto-concessão de admin', base({ targetId: 'admin-1' }), 'self_grant'],
  ['ator sem permissão de conceder', base({ actorRole: 'operator' }), 'actor_missing_capability'],
  [
    'manager tentando conceder o que não tem',
    base({ actorRole: 'manager', capability: 'recordings.delete' }),
    'escalation',
  ],
  [
    'manager concedendo o que tem',
    base({
      actorRole: 'manager',
      actorGrants: [{ capability: 'users.grant_capability', effect: 'grant', expiresAtMs: NOW + 10 * DAY }],
      capability: 'cameras.manage',
      targetRole: 'operator',
    }),
    null,
  ],
  ['concessão redundante (piso já dá)', base({ capability: 'cameras.view' }), 'redundant_grant'],
  ['justificativa curta', base({ reason: 'ok' }), 'reason_required'],
  ['justificativa só com espaços', base({ reason: '          ' }), 'reason_required'],
  ['capacidade órfã', base({ capability: 'cameras.teleport' }), 'unknown_capability'],
  [
    'deny anti-lockout em admin',
    base({ effect: 'deny', capability: 'users.grant_capability', targetId: 'admin-2', targetRole: 'admin' }),
    'ineffective_deny',
  ],
  ['deny de algo que o alvo não tem', base({ effect: 'deny', capability: 'recordings.delete' }), 'ineffective_deny'],
  ['deny efetivo sobre o piso', base({ effect: 'deny', capability: 'cameras.view' }), null],
  [
    'deny não exige posse do ator',
    base({
      actorRole: 'manager',
      actorGrants: [{ capability: 'users.grant_capability', effect: 'grant', expiresAtMs: NOW + DAY }],
      effect: 'deny',
      capability: 'alerts.view',
    }),
    null,
  ],
  [
    'ator com concessão vencida de grant_capability',
    base({ actorRole: 'manager', actorGrants: [{ capability: 'users.grant_capability', effect: 'grant', expiresAtMs: NOW - 1 }] }),
    'actor_missing_capability',
  ],
  [
    'alvo já tem por concessão ativa',
    base({ targetGrants: [{ capability: 'cameras.ptz.control', effect: 'grant', expiresAtMs: NOW + DAY }] }),
    'redundant_grant',
  ],
  [
    'alvo tinha, mas a concessão venceu',
    base({ targetGrants: [{ capability: 'cameras.ptz.control', effect: 'grant', expiresAtMs: NOW - 1 }] }),
    null,
  ],
];

function run() {
  const failures = [];
  const fail = (m) => failures.push(m);
  let scenarios = 0;

  for (const [name, req, expected] of NAMED) {
    scenarios += 1;
    const got = evaluateGrantRequest(req, NOW);
    if (got !== expected) fail(`cenário "${name}": esperado ${expected} obtido ${got}`);
  }

  const checkInvariants = (req, verdict) => {
    if (verdict !== null) return;
    // G1 prazo válido
    if (req.expiresAtMs == null || req.expiresAtMs <= NOW || req.expiresAtMs - NOW > MAX_GRANT_MS) {
      fail(`G1 violada: aprovado com prazo inválido (${req.expiresAtMs})`);
    }
    // G2 nunca sobre si mesmo
    if (req.actorId === req.targetId) fail('G2 violada: auto-concessão aprovada');
    // G3 grant exige posse do ator
    if (req.effect === 'grant') {
      const actor = resolveCapabilities(req.actorRole, req.actorGrants ?? [], NOW);
      if (!actor.granted.has(req.capability)) fail(`G3 violada: escalada em ${req.capability}`);
    }
    // G4 sempre muda algo
    if (!projectChanged(req, NOW)) fail(`G4 violada: aprovação sem efeito (${req.capability}/${req.effect})`);
    // G5 ator autorizado
    const actor = resolveCapabilities(req.actorRole, req.actorGrants ?? [], NOW);
    if (!actor.granted.has('users.grant_capability')) fail('G5 violada: ator sem users.grant_capability');
  };

  // matriz combinatória: papéis × capacidades × efeitos × 4 prazos
  const EXPIRIES = [null, NOW - 1, NOW + DAY, NOW + 200 * DAY];
  for (const actorRole of ROLES) {
    for (const targetRole of ROLES) {
      for (const capability of CAPABILITIES) {
        for (const effect of ['grant', 'deny']) {
          for (const expiresAtMs of EXPIRIES) {
            scenarios += 1;
            const req = base({ actorRole, targetRole, capability, effect, expiresAtMs });
            const verdict = evaluateGrantRequest(req, NOW);
            checkInvariants(req, verdict);
            // G6 determinismo: mesma entrada, mesmo veredito
            if (evaluateGrantRequest(req, NOW) !== verdict) fail('G6 violada: veredito não determinístico');
          }
        }
      }
    }
  }

  // fuzz semeado
  let seed = 151_2026;
  const rnd = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  for (let i = 0; i < 600; i += 1) {
    scenarios += 1;
    const grants = [];
    const n = Math.floor(rnd() * 4);
    for (let g = 0; g < n; g += 1) {
      grants.push({
        capability: rnd() < 0.9 ? pick(CAPABILITIES) : 'cap.fantasma',
        effect: rnd() < 0.5 ? 'grant' : 'deny',
        expiresAtMs: rnd() < 0.2 ? NOW - 1 : NOW + Math.floor(rnd() * 30) * DAY + 1,
        revokedAtMs: rnd() < 0.15 ? NOW - 1 : null,
      });
    }
    const sameUser = rnd() < 0.2;
    const req = base({
      actorRole: pick(ROLES),
      actorGrants: grants,
      targetRole: pick(ROLES),
      targetGrants: grants.slice().reverse(),
      targetId: sameUser ? 'admin-1' : 'user-2',
      capability: rnd() < 0.9 ? pick(CAPABILITIES) : 'cap.fantasma',
      effect: rnd() < 0.5 ? 'grant' : 'deny',
      reason: rnd() < 0.15 ? 'x' : 'motivo operacional registrado',
      expiresAtMs: rnd() < 0.15 ? null : NOW + Math.floor(rnd() * 120) * DAY + 1,
    });
    const verdict = evaluateGrantRequest(req, NOW);
    checkInvariants(req, verdict);

    // G6 (ordem): as regras do ator/alvo são conjuntos, não pilhas
    const shuffled = { ...req, actorGrants: [...req.actorGrants].reverse(), targetGrants: [...req.targetGrants].reverse() };
    if (evaluateGrantRequest(shuffled, NOW) !== verdict) {
      fail('G6 violada: veredito depende da ordem das concessões');
    }

    // G7 revogação idempotente
    const rev = evaluateRevokeRequest(
      { actorRole: req.actorRole, actorGrants: req.actorGrants, grantExists: true, alreadyRevoked: false },
      NOW,
    );
    const rev2 = evaluateRevokeRequest(
      { actorRole: req.actorRole, actorGrants: req.actorGrants, grantExists: true, alreadyRevoked: true },
      NOW,
    );
    if (rev.allowed !== rev2.allowed) fail('G7 violada: revogação não idempotente');
    if (rev2.allowed && !rev2.noop) fail('G7 violada: revogação repetida escreveria de novo');
  }

  return { scenarios, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { scenarios, failures } = run();
  console.log('Onda 151 — simulação de admissão de concessões');
  console.log(`  cenários varridos : ${scenarios}`);
  console.log(`  invariantes       : G1..G7`);
  if (failures.length === 0) console.log('  resultado         : OK — nenhuma violação');
  else {
    console.log(`  resultado         : ${failures.length} violação(ões)`);
    for (const f of failures.slice(0, 25)) console.log(`    - ${f}`);
    process.exitCode = 1;
  }
}

export { run };
