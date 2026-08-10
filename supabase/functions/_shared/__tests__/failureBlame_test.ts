/**
 * Onda 146 — Simulação exaustiva da atribuição de culpa.
 *
 * Não é um teste de exemplos: é a varredura COMPLETA do produto cartesiano
 * (classe de rede × origem de execução × status upstream × dependência de
 * nuvem), verificando invariantes em cada célula. Qualquer regra nova que
 * quebre uma invariante falha aqui antes de chegar à produção.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  blameOf,
  deriveBlame,
  FAILURE_BLAME_VALUES,
  type BlameRule,
  type FailureBlame,
  type RunFrom,
} from '../failureBlame.ts';
import type { NetworkErrorKind } from '../networkError.ts';

const KINDS: readonly (NetworkErrorKind | null)[] = [
  null,
  'timeout',
  'aborted',
  'refused',
  'reset',
  'dns',
  'tls',
  'protocol',
  'redirect_loop',
  'unknown',
];
const RUN_FROMS: readonly RunFrom[] = ['cloud', 'relay', 'agent', 'client'];
const STATUSES: readonly (number | null)[] = [
  null,
  200,
  204,
  301,
  400,
  401,
  403,
  404,
  409,
  418,
  500,
  502,
  503,
  504,
];
const CLOUD_DEP: readonly boolean[] = [false, true];

interface Cell {
  kind: NetworkErrorKind | null;
  runFrom: RunFrom;
  upstreamStatus: number | null;
  cloudDependency: boolean;
}

function matrix(): Cell[] {
  const cells: Cell[] = [];
  for (const kind of KINDS) {
    for (const runFrom of RUN_FROMS) {
      for (const upstreamStatus of STATUSES) {
        for (const cloudDependency of CLOUD_DEP) {
          cells.push({ kind, runFrom, upstreamStatus, cloudDependency });
        }
      }
    }
  }
  return cells;
}

const CELLS = matrix();

Deno.test('simulação cobre centenas de cenários distintos', () => {
  assertEquals(CELLS.length, KINDS.length * RUN_FROMS.length * STATUSES.length * CLOUD_DEP.length);
  assert(CELLS.length >= 500, `esperava matriz grande, veio ${CELLS.length}`);
});

Deno.test('invariante: função total, sempre no vocabulário fechado', () => {
  const allowed = new Set<FailureBlame>(FAILURE_BLAME_VALUES);
  for (const cell of CELLS) {
    const verdict = deriveBlame(cell);
    assert(allowed.has(verdict.blame), `culpa fora do vocabulário: ${verdict.blame}`);
    assert(verdict.reason.length > 0, 'veredito sem justificativa');
    assertEquals(blameOf(cell), verdict.blame);
  }
});

Deno.test('invariante: determinismo — mesma entrada, mesmo veredito', () => {
  for (const cell of CELLS) {
    const a = deriveBlame(cell);
    const b = deriveBlame({ ...cell });
    assertEquals(a.blame, b.blame);
    assertEquals(a.rule, b.rule);
  }
});

Deno.test('invariante: cancelamento do chamador nunca acusa terceiros', () => {
  for (const cell of CELLS.filter((c) => c.kind === 'aborted')) {
    const v = deriveBlame(cell);
    assertEquals(v.blame, 'caller');
    assertEquals(v.rule, 'R0_caller_aborted');
  }
});

Deno.test('invariante: upstream que respondeu nunca é culpa do transporte', () => {
  for (const cell of CELLS) {
    if (cell.kind !== null || cell.upstreamStatus === null || cell.cloudDependency) continue;
    const v = deriveBlame(cell);
    assert(v.blame !== 'transport', `status ${cell.upstreamStatus} culpou o transporte`);
    assertEquals(v.rule, 'R2_upstream_responded');
  }
});

Deno.test('invariante: da nuvem, falha opaca jamais acusa o equipamento', () => {
  const opaque: NetworkErrorKind[] = ['timeout', 'reset', 'refused', 'unknown'];
  for (const kind of opaque) {
    for (const runFrom of ['cloud', 'client'] as RunFrom[]) {
      const v = deriveBlame({ kind, runFrom });
      assertEquals(v.blame, 'transport', `${kind}/${runFrom} deveria ser transporte`);
      assertEquals(v.rule, 'R5_remote_path_opaque');
    }
  }
});

Deno.test('invariante: dentro da LAN, o transporte deixa de ser suspeito', () => {
  for (const runFrom of ['agent', 'relay'] as RunFrom[]) {
    for (const kind of ['timeout', 'reset', 'unknown'] as NetworkErrorKind[]) {
      assertEquals(deriveBlame({ kind, runFrom }).blame, 'device', `${kind}/${runFrom}`);
    }
    // Porta recusada na LAN é serviço/porta, não equipamento morto.
    assertEquals(deriveBlame({ kind: 'refused', runFrom }).blame, 'config');
  }
});

Deno.test('invariante: dependência de nuvem tem precedência sobre leitura de rede', () => {
  for (const cell of CELLS) {
    if (!cell.cloudDependency || cell.kind === 'aborted') continue;
    assertEquals(deriveBlame(cell).rule, 'R1_cloud_dependency');
    assertEquals(deriveBlame(cell).blame, 'cloud');
  }
});

Deno.test('invariante: DNS é cadastro, não equipamento, em qualquer origem', () => {
  for (const runFrom of RUN_FROMS) {
    const v = deriveBlame({ kind: 'dns', runFrom });
    assertEquals(v.blame, 'config');
    assertEquals(v.rule, 'R3_name_resolution');
  }
});

Deno.test('invariante: falha determinística prova diálogo com a ponta', () => {
  for (const kind of ['tls', 'protocol', 'redirect_loop'] as NetworkErrorKind[]) {
    for (const runFrom of RUN_FROMS) {
      const v = deriveBlame({ kind, runFrom });
      assertEquals(v.blame, 'device');
      assertEquals(v.rule, 'R6_deterministic_peer');
    }
  }
});

Deno.test('invariante: 401/403 do upstream é credencial, não defeito físico', () => {
  for (const status of [401, 403]) {
    assertEquals(deriveBlame({ upstreamStatus: status }).blame, 'config');
  }
  assertEquals(deriveBlame({ upstreamStatus: 500 }).blame, 'device');
});

Deno.test('entrada inválida não derruba nem inventa culpa', () => {
  const garbage = [
    { runFrom: 'marte' as unknown as RunFrom },
    { upstreamStatus: 9999 },
    { upstreamStatus: Number.NaN },
    { upstreamStatus: -1 },
    {},
  ];
  for (const g of garbage) {
    const v = deriveBlame(g);
    assertEquals(v.blame, 'unknown');
    assertEquals(v.rule, 'R7_unknown');
  }
});

Deno.test('toda regra declarada é alcançável pela matriz', () => {
  const seen = new Set<BlameRule>();
  for (const cell of CELLS) seen.add(deriveBlame(cell).rule);
  const expected: BlameRule[] = [
    'R0_caller_aborted',
    'R1_cloud_dependency',
    'R2_upstream_responded',
    'R3_name_resolution',
    'R4_local_reach_proven',
    'R5_remote_path_opaque',
    'R6_deterministic_peer',
    'R7_unknown',
  ];
  for (const rule of expected) {
    assert(seen.has(rule), `regra morta (inalcançável): ${rule}`);
  }
});
