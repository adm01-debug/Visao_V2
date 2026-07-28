/**
 * Simulação da Onda 226 — admissão de evento.
 *
 * Não testa "casos bonitos": varre o espaço de estados procurando os modos de
 * falha que custariam caro em produção — disparo fora da janela, silêncio com
 * vigilância valendo, e confusão entre "não sei" e "não está armado".
 *
 * Rode com: npx tsx scripts/simulate-wave226.ts
 */

import {
  admitEvent,
  type AdmissionScheme,
  type AdmissionReason,
} from '../src/lib/alarms/eventAdmission';
import { evaluateArmedNow } from '../src/lib/alarms/armedNow';
import { MINUTES_PER_DAY, type AlarmSchedule } from '../src/lib/alarms/alarmAggregation';

let assertions = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = '') => {
  assertions += 1;
  if (!cond) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
};

let seed = 226_20260728;
const rnd = (n: number) => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % n;
};

const HEALTHS = ['ok', 'inconsistent', 'inoperative'] as const;
const TYPES = ['motion_detection', 'intrusion', 'plate_denied', 'face_recognized'] as const;
const SOURCES = ['cam-a', 'cam-b', 'cam-c'] as const;
const WEEK = Date.UTC(2026, 6, 26, 0, 0);

const randomSchedule = (): AlarmSchedule | null => {
  if (rnd(5) === 0) return null; // 24×7
  const out: { startMin: number; endMin: number }[][] = [];
  for (let d = 0; d < 7; d += 1) {
    const periods: { startMin: number; endMin: number }[] = [];
    for (let i = rnd(3); i > 0; i -= 1) {
      const start = rnd(MINUTES_PER_DAY);
      const end = (start + 1 + rnd(700)) % MINUTES_PER_DAY;
      if (start !== end) periods.push({ startMin: start, endMin: end });
    }
    out.push(periods);
  }
  return out;
};

const randomScheme = (i: number): AdmissionScheme => {
  const declared = [...SOURCES].filter(() => rnd(2) === 0);
  if (declared.length === 0) declared.push(SOURCES[rnd(SOURCES.length)]);
  const missing = declared.filter(() => rnd(4) === 0);
  return {
    id: `s${i}`,
    eventType: TYPES[rnd(TYPES.length)],
    enabled: rnd(6) !== 0,
    health: HEALTHS[rnd(HEALTHS.length)],
    schedule: randomSchedule(),
    sourceIds: declared,
    missingSourceIds: missing,
  };
};

/* ---------------------------------------------------------------------------
 * 1. Varredura aleatória com oráculo independente.
 * ------------------------------------------------------------------------ */
for (let round = 0; round < 4000; round += 1) {
  const schemes = Array.from({ length: rnd(5) + 1 }, (_, i) => randomScheme(i));
  const sourceId = SOURCES[rnd(SOURCES.length)];
  const eventType = TYPES[rnd(TYPES.length)];
  const withClock = rnd(10) !== 0;
  const at = withClock ? WEEK + rnd(7 * MINUTES_PER_DAY) * 60_000 : null;
  const tz = [0, -180, 330, -720][rnd(4)];

  const v = admitEvent(schemes, { sourceId, eventType, at, tzOffsetMinutes: tz });

  // Oráculo: recalcula do zero, sem reaproveitar a implementação.
  const matched = schemes.filter(
    (s) => s.eventType === eventType && s.sourceIds.includes(sourceId),
  );
  const listening = matched.filter((s) => !s.missingSourceIds.includes(sourceId));
  const expectedAdmitting = listening
    .filter(
      (s) =>
        evaluateArmedNow(
          { enabled: s.enabled, health: s.health, schedule: s.schedule },
          at ?? Number.NaN,
          tz,
        ).effective,
    )
    .map((s) => s.id);

  ok(
    'oráculo/admissão',
    v.admitted === expectedAdmitting.length > 0,
    `admitted=${v.admitted} esperado=${expectedAdmitting.length > 0}`,
  );
  ok(
    'oráculo/lista',
    JSON.stringify(v.admittingSchemeIds) === JSON.stringify(expectedAdmitting),
    `${JSON.stringify(v.admittingSchemeIds)} ≠ ${JSON.stringify(expectedAdmitting)}`,
  );
  ok('E7 ordem estável', v.perScheme.length === matched.length);
  ok(
    'E7 ordem estável (ids)',
    v.perScheme.every((p, i) => p.schemeId === matched[i]?.id),
  );

  // E5 — relógio ausente jamais vira "fora da janela".
  if (!withClock) {
    ok('E5 sem relógio nunca admite', v.admitted === false);
    ok(
      'E5 sem relógio não acusa janela',
      v.reason !== 'out_of_window',
      `motivo=${v.reason}`,
    );
  }

  // Coerência interna: admitido ⇒ pelo menos um perScheme admitido.
  ok(
    'coerência',
    v.admitted === v.perScheme.some((p) => p.admitted),
  );
  // Nenhum motivo de admissão pode aparecer numa recusa e vice-versa.
  const admittedReasons: AdmissionReason[] = ['admitted', 'admitted_degraded'];
  ok(
    'motivo coerente com veredito',
    v.admitted === admittedReasons.includes(v.reason),
    `admitted=${v.admitted} motivo=${v.reason}`,
  );
}

/* ---------------------------------------------------------------------------
 * 2. Monotonicidade: habilitar um esquema nunca reduz a admissão.
 * ------------------------------------------------------------------------ */
for (let round = 0; round < 1500; round += 1) {
  const base = randomScheme(0);
  const event = {
    sourceId: base.sourceIds[0],
    eventType: base.eventType,
    at: WEEK + rnd(7 * MINUTES_PER_DAY) * 60_000,
    tzOffsetMinutes: 0,
  };
  const off = admitEvent([{ ...base, enabled: false }], event);
  const on = admitEvent([{ ...base, enabled: true }], event);
  ok('monotonicidade enabled', !(off.admitted && !on.admitted));
  ok('desabilitado nunca admite', off.admitted === false);

  // Saúde: inoperante nunca admite; degradado admite sempre que íntegro admite.
  const dead = admitEvent([{ ...base, enabled: true, health: 'inoperative' }], event);
  const soft = admitEvent([{ ...base, enabled: true, health: 'inconsistent' }], event);
  const good = admitEvent([{ ...base, enabled: true, health: 'ok' }], event);
  ok('N2 inoperante nunca admite', dead.admitted === false);
  ok('N3 degradado acompanha o íntegro', soft.admitted === good.admitted);
  if (soft.admitted) ok('N3 ressalva declarada', soft.reason === 'admitted_degraded');
  if (good.admitted) ok('íntegro sem ressalva', good.reason === 'admitted');
}

/* ---------------------------------------------------------------------------
 * 3. OR entre esquemas: acrescentar esquema nunca retira admissão.
 * ------------------------------------------------------------------------ */
for (let round = 0; round < 1500; round += 1) {
  const a = randomScheme(0);
  const b = { ...randomScheme(1), eventType: a.eventType, sourceIds: a.sourceIds };
  const event = {
    sourceId: a.sourceIds[0],
    eventType: a.eventType,
    at: WEEK + rnd(7 * MINUTES_PER_DAY) * 60_000,
    tzOffsetMinutes: 0,
  };
  const only = admitEvent([a], event);
  const both = admitEvent([a, b], event);
  ok('E6 OR monotônico', !(only.admitted && !both.admitted));
  ok(
    'E6 sem ressalva alheia',
    !(both.admitted && both.reason === 'admitted_degraded' && only.reason === 'admitted'),
  );
}

/* ---------------------------------------------------------------------------
 * 4. Fronteiras nomeadas.
 * ------------------------------------------------------------------------ */
const window8to10: AlarmSchedule = [[], [{ startMin: 480, endMin: 600 }], [], [], [], [], []];
const mon = (h: number, m = 0) => Date.UTC(2026, 6, 27, h, m);
const scheme = (over: Partial<AdmissionScheme> = {}): AdmissionScheme => ({
  id: 'x',
  eventType: 'intrusion',
  enabled: true,
  health: 'ok',
  schedule: window8to10,
  sourceIds: ['cam-a'],
  missingSourceIds: [],
  ...over,
});
const ev = (over: Partial<{ sourceId: string; eventType: string; at: number | null }> = {}) => ({
  sourceId: 'cam-a',
  eventType: 'intrusion',
  at: mon(9),
  tzOffsetMinutes: 0,
  ...over,
});

const cases: [string, AdmissionReason, boolean][] = [
  ['dentro da janela', 'admitted', true],
];
ok(`fronteira: ${cases[0][0]}`, admitEvent([scheme()], ev()).reason === 'admitted');
ok('fronteira: abertura inclusiva', admitEvent([scheme()], ev({ at: mon(8) })).admitted);
ok('fronteira: fechamento exclusivo', !admitEvent([scheme()], ev({ at: mon(10) })).admitted);
ok(
  'fronteira: fechamento reporta janela',
  admitEvent([scheme()], ev({ at: mon(10) })).reason === 'out_of_window',
);
ok(
  'E1 tipo diferente é no_scheme',
  admitEvent([scheme()], ev({ eventType: 'motion_detection' })).reason === 'no_scheme',
);
ok(
  'E2 origem não declarada é no_scheme',
  admitEvent([scheme()], ev({ sourceId: 'cam-z' })).reason === 'no_scheme',
);
ok(
  'E3 origem ausente não escuta',
  admitEvent([scheme({ missingSourceIds: ['cam-a'] })], ev()).reason === 'source_missing',
);
ok(
  'E3 origem ausente é listada',
  admitEvent([scheme({ missingSourceIds: ['cam-a'] })], ev()).missingSourceSchemeIds.length === 1,
);
ok(
  'E5 relógio nulo é indeterminado',
  admitEvent([scheme()], ev({ at: null })).reason === 'indeterminate',
);
ok('E5 NaN é indeterminado', admitEvent([scheme()], ev({ at: Number.NaN })).reason === 'indeterminate');
ok('lista vazia é no_scheme', admitEvent([], ev()).reason === 'no_scheme');
ok(
  'E6 indeterminado vence fora-da-janela',
  admitEvent([scheme({ id: 'a' }), scheme({ id: 'b' })], ev({ at: null })).reason ===
    'indeterminate',
);
ok(
  'E6 fora-da-janela vence desabilitado',
  admitEvent([scheme({ id: 'a', enabled: false }), scheme({ id: 'b' })], ev({ at: mon(10) }))
    .reason === 'out_of_window',
);
ok(
  'agenda nula é 24×7',
  admitEvent([scheme({ schedule: null })], ev({ at: mon(3) })).admitted,
);
ok(
  'fuso desloca a janela',
  admitEvent([scheme()], { ...ev({ at: mon(11) }), tzOffsetMinutes: -120 }).admitted,
);
ok(
  'entradas sujas não quebram',
  admitEvent([scheme({ sourceIds: [' cam-a '] })], ev()).admitted,
);

/* ------------------------------------------------------------------------ */
if (failures.length > 0) {
  console.error(`✗ Onda 226: ${failures.length} falha(s) em ${assertions} asserções`);
  for (const f of failures.slice(0, 20)) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ Onda 226 — ${assertions.toLocaleString('pt-BR')} asserções sem divergência`);
