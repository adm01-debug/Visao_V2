#!/usr/bin/env node
/**
 * Onda 150 — SIMULAÇÃO EXAUSTIVA da regra de permissão fina (capabilities).
 *
 * Este arquivo carrega dois papéis:
 *
 *  1. **Modelo de referência em JS puro** (espelho declarado da regra de
 *     `src/lib/permissions/capabilities.ts`). O gate `check-capabilities.mjs`
 *     compara este espelho com o TypeScript e com o banco — divergência entre
 *     os três é falha de CI, não detalhe de implementação.
 *  2. **Varredura de cenários**: combinações determinísticas + fuzz semeado,
 *     validando 7 invariantes estruturais. Rodar sem argumento imprime o
 *     resumo; `--json` imprime o resultado legível por máquina.
 *
 * Por que simular antes de escrever a migração: a regra de permissão é o
 * único módulo do sistema onde um erro NÃO gera exceção — ele gera acesso
 * indevido silencioso. Não há stack trace para achar depois.
 */

export const CAPABILITIES = [
  'cameras.view',
  'cameras.manage',
  'cameras.ptz.control',
  'cameras.ptz.calibrate',
  'cameras.control_io',
  'recordings.view',
  'recordings.export',
  'recordings.delete',
  'alerts.view',
  'alerts.acknowledge',
  'alerts.dispatch',
  'maintenance.view',
  'maintenance.acknowledge',
  'collab.view',
  'collab.govern',
  'agents.view',
  'agents.heal',
  'users.view',
  'users.manage',
  'users.grant_capability',
  'audit.view',
];

const VIEWER = ['cameras.view', 'recordings.view', 'alerts.view'];
const OPERATOR = [
  ...VIEWER,
  'cameras.ptz.control',
  'recordings.export',
  'alerts.acknowledge',
  'maintenance.view',
  'collab.view',
  'agents.view',
];
const MANAGER = [
  ...OPERATOR,
  'cameras.manage',
  'cameras.ptz.calibrate',
  'cameras.control_io',
  'alerts.dispatch',
  'maintenance.acknowledge',
  'collab.govern',
  'users.view',
  'audit.view',
];

export const ROLE_BASELINE = {
  viewer: VIEWER,
  operator: OPERATOR,
  manager: MANAGER,
  admin: [...CAPABILITIES],
};

export const ROLES = ['viewer', 'operator', 'manager', 'admin'];
export const ADMIN_LOCKOUT_GUARD = ['users.grant_capability'];

export function isGrantActive(grant, nowMs) {
  if (grant.revokedAtMs != null && grant.revokedAtMs <= nowMs) return false;
  if (grant.expiresAtMs != null && grant.expiresAtMs <= nowMs) return false;
  return true;
}

/** Espelho da regra única. Mantido byte-a-byte equivalente ao TS. */
export function resolveCapabilities(role, grants, nowMs) {
  const granted = new Set(ROLE_BASELINE[role]);
  const denied = new Set();
  const allowed = new Set();
  const ignored = [];

  for (const grant of grants) {
    if (!CAPABILITIES.includes(grant.capability) || !isGrantActive(grant, nowMs)) {
      ignored.push(grant);
      continue;
    }
    if (grant.effect === 'deny') denied.add(grant.capability);
    else allowed.add(grant.capability);
  }

  const addedByGrant = [];
  for (const capability of allowed) {
    if (denied.has(capability) || granted.has(capability)) continue;
    granted.add(capability);
    addedByGrant.push(capability);
  }

  const removedByDeny = [];
  for (const capability of denied) {
    if (role === 'admin' && ADMIN_LOCKOUT_GUARD.includes(capability)) continue;
    if (!granted.delete(capability)) continue;
    removedByDeny.push(capability);
  }

  return {
    role,
    granted,
    addedByGrant: addedByGrant.sort(),
    removedByDeny: removedByDeny.sort(),
    ignored,
  };
}

/* ------------------------------------------------------------------ */
/* Varredura                                                           */
/* ------------------------------------------------------------------ */

/** Executa a varredura apenas quando o arquivo é o processo principal.
 *  Importado como modelo de referência (pelo gate), nada roda. */
const IS_MAIN = Boolean(process.argv[1]?.endsWith('simulate-wave150-capabilities.mjs'));

if (IS_MAIN) {
  const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
  const HOUR = 3_600_000;

  /** PRNG semeado: reprodutibilidade é obrigatória num gate de segurança. */
  function makeRng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  }

  const failures = [];
  const fail = (scenario, invariant, detail) =>
    failures.push(`[${invariant}] ${scenario}: ${detail}`);

  const sorted = (set) => [...set].sort();
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const isSubset = (a, b) => a.every((v) => b.includes(v));

  let scenarioCount = 0;

  function checkInvariants(name, role, grants, nowMs) {
    scenarioCount += 1;
    const result = resolveCapabilities(role, grants, nowMs);
    const list = sorted(result.granted);

    // C1 — nunca inventa capacidade fora do catálogo.
    for (const capability of list) {
      if (!CAPABILITIES.includes(capability)) fail(name, 'C1', `capacidade órfã ${capability}`);
    }

    // C3 — negação ativa vence concessão ativa.
    const activeDenies = grants
      .filter(
        (g) => g.effect === 'deny' && isGrantActive(g, nowMs) && CAPABILITIES.includes(g.capability)
      )
      .map((g) => g.capability);
    for (const capability of activeDenies) {
      const guarded = role === 'admin' && ADMIN_LOCKOUT_GUARD.includes(capability);
      if (!guarded && result.granted.has(capability)) {
        fail(name, 'C3', `negação ignorada em ${capability}`);
      }
    }

    // C4 — concessão inativa é inerte: remover a linha não muda o resultado.
    const activeOnly = grants.filter((g) => isGrantActive(g, nowMs));
    const withoutInactive = sorted(resolveCapabilities(role, activeOnly, nowMs).granted);
    if (!eq(list, withoutInactive)) {
      fail(
        name,
        'C4',
        `linha inativa alterou o resultado (${list.length} vs ${withoutInactive.length})`
      );
    }

    // C5 — anti-lockout do admin.
    if (role === 'admin') {
      for (const capability of ADMIN_LOCKOUT_GUARD) {
        if (!result.granted.has(capability)) fail(name, 'C5', `admin perdeu ${capability}`);
      }
    }

    // C6 — ordem das concessões é irrelevante.
    const reversed = sorted(resolveCapabilities(role, [...grants].reverse(), nowMs).granted);
    if (!eq(list, reversed)) fail(name, 'C6', 'resultado dependeu da ordem das concessões');

    // C7 — função total e coerente com os deltas relatados.
    for (const capability of result.addedByGrant) {
      if (ROLE_BASELINE[role].includes(capability)) fail(name, 'C7', `${capability} não é delta`);
      if (!result.granted.has(capability)) fail(name, 'C7', `${capability} relatado mas ausente`);
    }
    for (const capability of result.removedByDeny) {
      if (result.granted.has(capability)) fail(name, 'C7', `${capability} removido mas presente`);
    }

    return result;
  }

  // C2 — monotonia do piso dos papéis (independe de concessão).
  for (let i = 1; i < ROLES.length; i += 1) {
    const lower = ROLE_BASELINE[ROLES[i - 1]];
    const higher = ROLE_BASELINE[ROLES[i]];
    if (!isSubset(lower, higher)) {
      fail('piso-dos-papeis', 'C2', `${ROLES[i - 1]} não está contido em ${ROLES[i]}`);
    }
  }

  /* Cenários nomeados: cada um veio de uma falha real de operação de CFTV. */
  const NAMED = [
    {
      name: 'terceirizado-ptz-por-uma-semana',
      role: 'viewer',
      grants: [
        { capability: 'cameras.ptz.control', effect: 'grant', expiresAtMs: NOW + 168 * HOUR },
      ],
      expectHas: ['cameras.ptz.control'],
      expectMissing: ['recordings.delete'],
    },
    {
      name: 'terceirizado-com-prazo-vencido-ontem',
      role: 'viewer',
      grants: [{ capability: 'cameras.ptz.control', effect: 'grant', expiresAtMs: NOW - HOUR }],
      expectMissing: ['cameras.ptz.control'],
    },
    {
      name: 'prazo-exatamente-agora-ja-venceu',
      role: 'viewer',
      grants: [{ capability: 'cameras.ptz.control', effect: 'grant', expiresAtMs: NOW }],
      expectMissing: ['cameras.ptz.control'],
    },
    {
      name: 'auditor-exporta-mas-nunca-apaga',
      role: 'operator',
      grants: [
        { capability: 'audit.view', effect: 'grant', expiresAtMs: null },
        { capability: 'recordings.delete', effect: 'deny', expiresAtMs: null },
      ],
      expectHas: ['audit.view', 'recordings.export'],
      expectMissing: ['recordings.delete'],
    },
    {
      name: 'operador-em-treinamento-perde-despacho',
      role: 'manager',
      grants: [{ capability: 'alerts.dispatch', effect: 'deny', expiresAtMs: NOW + 48 * HOUR }],
      expectMissing: ['alerts.dispatch'],
      expectHas: ['alerts.acknowledge'],
    },
    {
      name: 'grant-e-deny-simultaneos-vence-o-deny',
      role: 'manager',
      grants: [
        { capability: 'recordings.delete', effect: 'grant', expiresAtMs: null },
        { capability: 'recordings.delete', effect: 'deny', expiresAtMs: null },
      ],
      expectMissing: ['recordings.delete'],
    },
    {
      name: 'deny-revogado-volta-a-liberar',
      role: 'manager',
      grants: [
        {
          capability: 'alerts.dispatch',
          effect: 'deny',
          expiresAtMs: null,
          revokedAtMs: NOW - HOUR,
        },
      ],
      expectHas: ['alerts.dispatch'],
    },
    {
      name: 'admin-nao-pode-ser-trancado-por-fora',
      role: 'admin',
      grants: CAPABILITIES.map((capability) => ({ capability, effect: 'deny', expiresAtMs: null })),
      expectHas: ['users.grant_capability'],
      expectMissing: ['recordings.delete', 'cameras.view'],
    },
    {
      name: 'capacidade-orfa-de-versao-futura',
      role: 'viewer',
      grants: [{ capability: 'cameras.self_destruct', effect: 'grant', expiresAtMs: null }],
      expectMissing: ['cameras.manage'],
    },
    {
      name: 'concessao-duplicada-e-idempotente',
      role: 'viewer',
      grants: Array.from({ length: 25 }, () => ({
        capability: 'alerts.acknowledge',
        effect: 'grant',
        expiresAtMs: null,
      })),
      expectHas: ['alerts.acknowledge'],
    },
    {
      name: 'sem-concessao-alguma',
      role: 'operator',
      grants: [],
      expectHas: ['cameras.ptz.control'],
      expectMissing: ['cameras.manage'],
    },
    {
      name: 'deny-de-capacidade-que-o-papel-nao-tem',
      role: 'viewer',
      grants: [{ capability: 'recordings.delete', effect: 'deny', expiresAtMs: null }],
      expectMissing: ['recordings.delete'],
    },
  ];

  for (const scenario of NAMED) {
    const result = checkInvariants(scenario.name, scenario.role, scenario.grants, NOW);
    for (const capability of scenario.expectHas ?? []) {
      if (!result.granted.has(capability)) {
        fail(scenario.name, 'CENÁRIO', `esperava conceder ${capability}`);
      }
    }
    for (const capability of scenario.expectMissing ?? []) {
      if (result.granted.has(capability)) {
        fail(scenario.name, 'CENÁRIO', `não deveria conceder ${capability}`);
      }
    }
  }

  /* Varredura combinatória: todo papel × toda capacidade × todo efeito × todo
   * estado temporal (sem prazo / futuro / vencido / revogado). 4×20×2×4 = 640. */
  const TEMPORAL = [
    ['sem-prazo', { expiresAtMs: null }],
    ['prazo-futuro', { expiresAtMs: NOW + 24 * HOUR }],
    ['prazo-vencido', { expiresAtMs: NOW - 24 * HOUR }],
    ['revogado', { expiresAtMs: null, revokedAtMs: NOW - HOUR }],
  ];

  for (const role of ROLES) {
    for (const capability of CAPABILITIES) {
      for (const effect of ['grant', 'deny']) {
        for (const [temporalName, temporal] of TEMPORAL) {
          const name = `matriz:${role}/${capability}/${effect}/${temporalName}`;
          const grants = [{ capability, effect, ...temporal }];
          const result = checkInvariants(name, role, grants, NOW);
          const inactive = temporalName === 'prazo-vencido' || temporalName === 'revogado';
          const baseline = ROLE_BASELINE[role].includes(capability);
          const guarded = role === 'admin' && ADMIN_LOCKOUT_GUARD.includes(capability);
          const expected = inactive ? baseline : effect === 'deny' ? baseline && guarded : true;
          if (result.granted.has(capability) !== expected) {
            fail(name, 'MATRIZ', `esperado ${expected}, obtido ${result.granted.has(capability)}`);
          }
        }
      }
    }
  }

  /* Fuzz semeado: pilhas grandes e contraditórias de concessões. */
  const rng = makeRng(150);
  for (let i = 0; i < 400; i += 1) {
    const role = ROLES[Math.floor(rng() * ROLES.length)];
    const count = Math.floor(rng() * 12);
    const grants = Array.from({ length: count }, () => {
      const orphan = rng() < 0.08;
      const temporalRoll = rng();
      return {
        capability: orphan
          ? `orfa.${Math.floor(rng() * 1000)}`
          : CAPABILITIES[Math.floor(rng() * CAPABILITIES.length)],
        effect: rng() < 0.5 ? 'grant' : 'deny',
        expiresAtMs: temporalRoll < 0.4 ? null : NOW + (temporalRoll < 0.7 ? 1 : -1) * 12 * HOUR,
        revokedAtMs: rng() < 0.15 ? NOW - HOUR : null,
      };
    });
    checkInvariants(`fuzz#${i}`, role, grants, NOW);
  }

  const summary = {
    wave: 150,
    scenarios: scenarioCount,
    capabilities: CAPABILITIES.length,
    failures,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Onda 150 — simulação de permissões finas`);
    console.log(`  cenários varridos : ${scenarioCount}`);
    console.log(`  capacidades       : ${CAPABILITIES.length}`);
    console.log(`  invariantes       : C1..C7`);
    if (failures.length === 0) {
      console.log('  resultado         : OK — nenhuma violação');
    } else {
      console.log(`  resultado         : ${failures.length} violação(ões)`);
      for (const failure of failures) console.log(`    - ${failure}`);
    }
  }

  if (failures.length > 0) process.exitCode = 1;
}
