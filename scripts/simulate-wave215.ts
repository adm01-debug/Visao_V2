/**
 * Onda 215 — Simulação do esquema de alarme (SIM Next §Configuração de alarme).
 *
 * O cadastro é julgado antes de qualquer disparo, então ele precisa sobreviver
 * a: dispositivo removido no meio do caminho, ação sem alvo, teto de canais
 * estourado por combinação (e não por uma ação sozinha), biblioteca de faces
 * de outro equipamento, agenda com lixo, limiar de desconexão absurdo e par
 * IA/não-IA colidindo no mesmo canal.
 *
 * Rodar: npm run simulate:wave215
 */

import {
  admitDisconnect,
  detectDuplicatePairings,
  diagnoseScheme,
  ALARM_EVENT_CATALOG,
  DISCONNECT_THRESHOLD_DEFAULT_S,
  DISCONNECT_THRESHOLD_MAX_S,
  DISCONNECT_THRESHOLD_MIN_S,
  MAX_EVENT_CHANNELS,
  MAX_PERIODS_PER_DAY,
  type AlarmActionDraft,
  type AlarmActionKind,
  type AlarmSchemeDraft,
  type SchemeDiagnosis,
} from '../src/lib/alarms/alarmScheme';

let assertions = 0;
let scenarios = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition) failures.push(label);
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

const ACTION_KINDS: readonly AlarmActionKind[] = [
  'display_live',
  'record',
  'snapshot',
  'sound',
  'email',
  'webhook',
  'ptz_preset',
  'relay_output',
];

const CHANNEL_BOUND: ReadonlySet<AlarmActionKind> = new Set<AlarmActionKind>([
  'display_live',
  'record',
  'snapshot',
  'ptz_preset',
]);

const HOSTILE_NAMES: readonly unknown[] = ['', '   ', 'Portaria', 'x'.repeat(200), '\n\t', 'Ação 1'];

/* ------------------------------------------------------------------ *
 * 1. Matriz do catálogo: todo tipo é reconhecido e nenhum inventado
 * ------------------------------------------------------------------ */

function catalogMatrix(): void {
  const seen = new Set<string>();
  for (const spec of ALARM_EVENT_CATALOG) {
    check(`catálogo sem tipo duplicado ${spec.type}`, !seen.has(spec.type));
    seen.add(spec.type);
    check(`catálogo rotula ${spec.type}`, spec.label.trim().length > 0);
    if (spec.aiTwin) {
      const twin = ALARM_EVENT_CATALOG.find((s) => s.type === spec.aiTwin);
      check(`par IA existe para ${spec.type}`, twin !== undefined);
      check(`par IA é simétrico em ${spec.type}`, twin?.aiTwin === spec.type);
      check(`só um lado do par é IA em ${spec.type}`, spec.aiFiltered !== twin?.aiFiltered);
    }

    const d = diagnoseScheme({
      id: `s-${spec.type}`,
      name: spec.label,
      enabled: true,
      eventType: spec.type,
      sourceIds: ['c1'],
      actions: [{ id: 'a', kind: 'record', recordChannelIds: ['c1'] }],
      faceLibraryIds: spec.requiresFaceLibrary ? ['lib'] : [],
    }, spec.requiresFaceLibrary ? { faceLibraries: [{ libraryId: 'lib', deviceIds: ['c1'] }] } : {});

    check(`tipo ${spec.type} é aceito`, d.eventType === spec.type);
    check(`tipo ${spec.type} sem bloqueio`, d.health !== 'inoperative');
    scenarios += 1;
  }
}

/* ------------------------------------------------------------------ *
 * 2. Fuzz do cadastro
 * ------------------------------------------------------------------ */

function fuzzSchemes(): void {
  const r = rng(0x215a);

  for (let i = 0; i < 20000; i += 1) {
    const sourceCount = Math.floor(r() * 5);
    const sourceIds = Array.from({ length: sourceCount }, (_, k) => `c${k}`);
    const missingSourceIds = sourceIds.filter(() => r() < 0.35);

    const actionCount = Math.floor(r() * 5);
    const actions: AlarmActionDraft[] = Array.from({ length: actionCount }, (_, k) => {
      const kind = pick(r, ACTION_KINDS);
      const d = Math.floor(r() * 22);
      const rec = Math.floor(r() * 22);
      const display = Array.from({ length: d }, (_, j) => `d${k}-${j}`);
      const record = Array.from({ length: rec }, (_, j) => `r${k}-${j}`);
      const missing = [...display, ...record].filter(() => r() < 0.2);
      return {
        id: `a${k}`,
        kind,
        displayChannelIds: display,
        recordChannelIds: record,
        missingChannelIds: missing,
      };
    });

    const spec = pick(r, ALARM_EVENT_CATALOG);
    const libCount = Math.floor(r() * 3);
    const draft: AlarmSchemeDraft = {
      id: `s${i}`,
      name: pick(r, HOSTILE_NAMES) as string,
      enabled: r() < 0.7,
      eventType: r() < 0.05 ? 'evento_inexistente' : spec.type,
      sourceIds,
      missingSourceIds,
      actions,
      faceLibraryIds: Array.from({ length: libCount }, (_, k) => `lib${k}`),
      disconnectThresholdS: r() < 0.5 ? Math.floor(r() * 5000) - 100 : null,
      schedule: r() < 0.4
        ? Array.from({ length: 7 }, () =>
            Array.from({ length: Math.floor(r() * 9) }, () => ({
              startMin: Math.floor(r() * 1600) - 50,
              endMin: Math.floor(r() * 1600) - 50,
            })),
          )
        : null,
    };

    const d = diagnoseScheme(draft, { faceLibraries: [{ libraryId: 'lib0', deviceIds: ['c0'] }] });
    scenarios += 1;

    /* Invariante A — nunca lança e sempre devolve retrato completo. */
    check('A retrato completo', typeof d.health === 'string' && Array.isArray(d.issues));

    /* Invariante B — teto de canais jamais é ultrapassado. */
    check(
      'B teto de canais respeitado',
      d.budget.total <= MAX_EVENT_CHANNELS && d.budget.total === d.budget.displayed + d.budget.recorded,
    );

    /* Invariante C — contabilidade fechada: admitida ∪ recusada ⊆ ações viáveis,
       e admitida ∩ recusada = ∅. */
    const overlap = d.effectiveActionIds.filter((id) => d.budget.refusedActionIds.includes(id));
    check('C admitida e recusada são disjuntas', overlap.length === 0);

    /* Invariante D — bloqueio ⇔ inoperante ⇔ desarmado. */
    const hasBlocking = d.issues.some((iss) => iss.severity === 'blocking');
    check('D bloqueio implica inoperante', hasBlocking === (d.health === 'inoperative'));
    check('D inoperante nunca arma', !(d.health === 'inoperative' && d.armed));
    check('D armado exige habilitado', !(d.armed && !d.enabled));

    /* Invariante E — origem efetiva nunca inclui origem removida. */
    check(
      'E origem removida fora da efetiva',
      d.effectiveSourceIds.every((id) => !(missingSourceIds ?? []).includes(id)),
    );

    /* Invariante F — saudável só com zero achados. */
    check('F ok exige zero achados', (d.health === 'ok') === (d.issues.length === 0));

    /* Invariante G — agenda normalizada tem 7 dias e ≤6 períodos. */
    check(
      'G agenda normalizada',
      d.normalizedSchedule.length === 7 &&
        d.normalizedSchedule.every((day) => day.length <= MAX_PERIODS_PER_DAY),
    );

    /* Invariante H — limiar de desconexão só existe para o tipo certo,
       e sempre dentro da faixa. */
    if (d.eventType === 'device_disconnected') {
      const t = d.disconnectThresholdS!;
      check(
        'H limiar dentro da faixa',
        t >= DISCONNECT_THRESHOLD_MIN_S && t <= DISCONNECT_THRESHOLD_MAX_S,
      );
    } else {
      check('H limiar ausente fora do tipo', d.disconnectThresholdS === null);
    }

    /* Invariante I — ação ligada a canal jamais é admitida sem canal vivo. */
    for (const id of d.effectiveActionIds) {
      const src = actions.find((a) => a.id === id)!;
      if (!CHANNEL_BOUND.has(src.kind)) continue;
      const missing = new Set(src.missingChannelIds ?? []);
      const alive =
        (src.displayChannelIds ?? []).filter((c) => !missing.has(c)).length +
        (src.recordChannelIds ?? []).filter((c) => !missing.has(c)).length;
      check('I ação de canal admitida tem canal vivo', alive > 0);
    }

    /* Invariante J — idempotência: mesmo rascunho, mesmo veredito. */
    const again = diagnoseScheme(draft, { faceLibraries: [{ libraryId: 'lib0', deviceIds: ['c0'] }] });
    check('J determinístico', JSON.stringify(again) === JSON.stringify(d));
  }
}

/* ------------------------------------------------------------------ *
 * 3. Monotonicidade: remover coisa nunca melhora o veredito
 * ------------------------------------------------------------------ */

const RANK: Record<string, number> = { ok: 0, inconsistent: 1, inoperative: 2 };

function monotonicity(): void {
  const r = rng(0xbeef);
  for (let i = 0; i < 4000; i += 1) {
    const sourceIds = ['c0', 'c1', 'c2'];
    const base: AlarmSchemeDraft = {
      id: `m${i}`,
      name: 'Base',
      enabled: true,
      eventType: 'intrusion',
      sourceIds,
      actions: [
        { id: 'a0', kind: 'record', recordChannelIds: ['c0'] },
        { id: 'a1', kind: 'email' },
      ],
    };
    const before = diagnoseScheme(base);
    const removed = sourceIds.filter(() => r() < 0.5);
    const after = diagnoseScheme({ ...base, missingSourceIds: removed });

    check(
      'K remoção nunca melhora',
      RANK[after.health]! >= RANK[before.health]!,
    );
    check(
      'K remoção nunca aumenta origens efetivas',
      after.effectiveSourceIds.length <= before.effectiveSourceIds.length,
    );
    scenarios += 1;
  }
}

/* ------------------------------------------------------------------ *
 * 4. Duplicidade IA / não-IA
 * ------------------------------------------------------------------ */

function duplicity(): void {
  const r = rng(0xd0d0);
  const mk = (id: string, type: string, sources: string[], enabled: boolean): SchemeDiagnosis =>
    diagnoseScheme({
      id,
      name: id,
      enabled,
      eventType: type,
      sourceIds: sources,
      actions: [{ id: `${id}-a`, kind: 'record', recordChannelIds: sources }],
    });

  for (let i = 0; i < 3000; i += 1) {
    const pool = ['c0', 'c1', 'c2', 'c3'];
    const plainSources = pool.filter(() => r() < 0.6);
    const aiSources = pool.filter(() => r() < 0.6);
    const plainEnabled = r() < 0.8;
    const aiEnabled = r() < 0.8;
    const useTwin = r() < 0.7;

    const plain = mk('p', useTwin ? 'tripwire' : 'motion_detection', plainSources, plainEnabled);
    const ai = mk('x', 'tripwire_ai', aiSources, aiEnabled);
    const dup = detectDuplicatePairings([plain, ai]);
    scenarios += 1;

    const expected =
      useTwin && plain.armed && ai.armed
        ? plainSources.filter((c) => aiSources.includes(c))
        : [];

    check('L duplicidade exata', dup.length === expected.length);
    check(
      'L duplicidade só em canal compartilhado',
      dup.every((p) => expected.includes(p.channelId)),
    );
    check(
      'L duplicidade ordenada',
      dup.every((p, idx) => idx === 0 || dup[idx - 1]!.channelId <= p.channelId),
    );
    check('L duplicidade nunca desarma ninguém', plain.armed === (plainEnabled && plain.health !== 'inoperative'));
  }
}

/* ------------------------------------------------------------------ *
 * 5. Desconexão
 * ------------------------------------------------------------------ */

function disconnectMatrix(): void {
  const causes = ['manual', 'network', 'device', 'unknown'] as const;
  const thresholds = [null, 30, 60, 180, 3600, 5, 100000, Number.NaN];
  const offsets = [-1, 0, 1, 29, 30, 59, 60, 179, 180, 181, 3599, 3600, Number.NaN];

  for (const enabled of [true, false]) {
    for (const t of thresholds) {
      const d = diagnoseScheme({
        id: 'dc',
        name: 'Queda',
        enabled,
        eventType: 'device_disconnected',
        sourceIds: ['c0'],
        actions: [{ id: 'a', kind: 'email' }],
        disconnectThresholdS: t as number | null,
      });
      const effective = d.disconnectThresholdS ?? DISCONNECT_THRESHOLD_DEFAULT_S;

      for (const cause of causes) {
        for (const offlineForS of offsets) {
          const verdict = admitDisconnect(d, { cause, offlineForS });
          scenarios += 1;

          check('M manual nunca admite', !(cause === 'manual' && verdict.admitted));
          check('M desarmado nunca admite', !(!d.armed && verdict.admitted));
          if (d.armed && cause !== 'manual') {
            const shouldAdmit = Number.isFinite(offlineForS) && offlineForS >= effective;
            check('M limiar respeitado', verdict.admitted === shouldAdmit);
          }
          check(
            'M motivo coerente',
            verdict.admitted ? verdict.reason === 'admitted' : verdict.reason !== 'admitted',
          );
        }
      }
    }
  }

  /* Tipo errado nunca é admitido pela porta de desconexão. */
  for (const spec of ALARM_EVENT_CATALOG) {
    if (spec.type === 'device_disconnected') continue;
    const d = diagnoseScheme({
      id: 'w',
      name: 'Outro',
      enabled: true,
      eventType: spec.type,
      sourceIds: ['c0'],
      actions: [{ id: 'a', kind: 'email' }],
      faceLibraryIds: spec.requiresFaceLibrary ? ['lib'] : [],
    }, { faceLibraries: [{ libraryId: 'lib', deviceIds: ['c0'] }] });
    const verdict = admitDisconnect(d, { cause: 'network', offlineForS: 999999 });
    check('M tipo errado recusado', !verdict.admitted && verdict.reason === 'wrong_type');
    scenarios += 1;
  }
}

/* ------------------------------------------------------------------ *
 * 6. Entradas hostis (nunca lançar)
 * ------------------------------------------------------------------ */

function hostile(): void {
  const junk: unknown[] = [
    null,
    undefined,
    {},
    { id: 1, name: 2, enabled: 'sim', eventType: 3, sourceIds: 'c0', actions: 'nada' },
    { id: 's', name: 'x', enabled: true, eventType: 'intrusion', sourceIds: [null, '', '  ', 'c0', 'c0'], actions: [null, { id: '' }, { kind: 'record' }] },
    { id: 's', name: 'x', enabled: true, eventType: 'intrusion', sourceIds: ['c0'], actions: [{ id: 'a', kind: 'record', recordChannelIds: [1, 2, 'c0'] }] },
    { id: 's', name: 'x', enabled: true, eventType: 'face_recognized', sourceIds: ['c0'], actions: [{ id: 'a', kind: 'email' }], faceLibraryIds: 'lib' },
    { id: 's', name: 'x', enabled: true, eventType: 'intrusion', sourceIds: ['c0'], actions: [{ id: 'a', kind: 'email' }], schedule: 'sempre' },
    { id: 's', name: 'x', enabled: true, eventType: 'intrusion', sourceIds: ['c0'], actions: [{ id: 'a', kind: 'email' }], schedule: [null, undefined, 5, [], [], [], []] },
  ];

  for (const raw of junk) {
    let threw = false;
    try {
      const d = diagnoseScheme(raw as AlarmSchemeDraft);
      check('N nunca arma com lixo bloqueante', d.health !== 'ok' || d.issues.length === 0);
      check('N agenda sempre com 7 dias', d.normalizedSchedule.length === 7);
      check('N ids duplicados colapsados', new Set(d.effectiveSourceIds).size === d.effectiveSourceIds.length);
    } catch {
      threw = true;
    }
    check('N entrada hostil não lança', !threw);
    scenarios += 1;
  }

  /* Conjunto hostil de diagnósticos na detecção de duplicidade. */
  let threw = false;
  try {
    detectDuplicatePairings([]);
    detectDuplicatePairings([diagnoseScheme({} as AlarmSchemeDraft)]);
  } catch {
    threw = true;
  }
  check('N duplicidade com lixo não lança', !threw);
  scenarios += 1;
}

/* ------------------------------------------------------------------ *
 * 7. Teto de canais — combinações exatas na fronteira
 * ------------------------------------------------------------------ */

function budgetFrontier(): void {
  for (let first = 0; first <= MAX_EVENT_CHANNELS + 4; first += 1) {
    for (let second = 0; second <= MAX_EVENT_CHANNELS + 4; second += 3) {
      const d = diagnoseScheme({
        id: 'b',
        name: 'Teto',
        enabled: true,
        eventType: 'motion_detection',
        sourceIds: ['c0'],
        actions: [
          { id: 'a', kind: 'display_live', displayChannelIds: Array.from({ length: first }, (_, i) => `d${i}`) },
          { id: 'b', kind: 'record', recordChannelIds: Array.from({ length: second }, (_, i) => `r${i}`) },
        ],
      });
      scenarios += 1;

      check('O teto nunca estourado', d.budget.total <= MAX_EVENT_CHANNELS);
      if (first > MAX_EVENT_CHANNELS) {
        check('O ação sozinha maior que o teto é recusada', d.budget.refusedActionIds.includes('a'));
      }
      if (first <= MAX_EVENT_CHANNELS && first + second <= MAX_EVENT_CHANNELS && first > 0 && second > 0) {
        check('O cabe: nada recusado', d.budget.refusedActionIds.length === 0);
        check('O cabe: soma exata', d.budget.total === first + second);
      }
      check(
        'O recusa é declarada',
        (d.budget.refusedActionIds.length > 0) ===
          d.issues.some((i) => i.code === 'channel_budget_exceeded'),
      );
    }
  }
}

function main(): void {
  catalogMatrix();
  fuzzSchemes();
  monotonicity();
  duplicity();
  disconnectMatrix();
  hostile();
  budgetFrontier();

  if (failures.length > 0) {
    const unique = [...new Set(failures)];
    console.error(`❌ Onda 215 — ${failures.length} violações (${unique.length} distintas):`);
    for (const violation of unique.slice(0, 20)) console.error(`   • ${violation}`);
    process.exit(1);
  }

  console.log(
    `✅ Onda 215 — esquema de alarme: ${assertions.toLocaleString('pt-BR')} asserções em ${scenarios.toLocaleString('pt-BR')} cenários`,
  );
}

main();
