/**
 * Simulação exaustiva das Ondas 220 (catálogo/seleção) e 221 (agenda).
 *
 * Não é teste de exemplo: é varredura combinatória com entradas hostis,
 * conferindo invariantes que, se quebradas, produzem cobertura falsa —
 * o pior defeito possível num cadastro de alarme.
 *
 * Uso: npx tsx scripts/simulate-wave220-221.ts
 */

import {
  reconcileSelection,
  sanitizeCatalog,
  sanitizeIds,
  selectSingle,
  toggleSelection,
  buildSchemeContext,
  type CatalogSnapshot,
  type FaceLibraryOption,
} from '../src/lib/alarms/schemeCatalog';
import {
  MAX_PERIODS_PER_DAY,
  diagnoseScheduleForm,
  emptyScheduleForm,
  formToSchedule,
  formatClock,
  parseClock,
  scheduleToForm,
  type ScheduleFormState,
  type SchedulePeriodRow,
} from '../src/lib/alarms/alarmScheduleForm';
import { isWithinSchedule, normalizeSchedule } from '../src/lib/alarms/alarmAggregation';

let asserts = 0;
let failures = 0;
const seen = new Set<string>();

function check(cond: boolean, law: string, detail: () => string): void {
  asserts += 1;
  if (cond) return;
  failures += 1;
  const key = `${law}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.error(`✗ ${law}: ${detail()}`);
}

/* ---------------- PRNG determinístico ---------------- */
let seed = 0x2b220221;
const rnd = (): number => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length) % xs.length]!;
const int = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1));

/* ================================================================== *
 * Onda 220 — catálogo e seleção
 * ================================================================== */

const HOSTILE_IDS: unknown[] = [
  null,
  undefined,
  42,
  'cam-1',
  '  cam-1  ',
  '',
  '   ',
  { id: 'cam-1' },
  ['cam-1'],
  NaN,
];

const catalogIds = ['cam-1', 'cam-2', 'cam-3', 'cam-4'];

for (let scenario = 0; scenario < 20_000; scenario += 1) {
  const known = rnd() < 0.7;
  const options = catalogIds
    .filter(() => rnd() < 0.7)
    .map((id) => ({ id, label: rnd() < 0.2 ? '' : `Câmera ${id}` }));
  // catálogo com duplicata proposital (K5)
  if (rnd() < 0.3 && options.length > 0) options.push({ ...options[0]!, label: 'DUPLICADO' });
  const snapshot: CatalogSnapshot = { known, options };

  const selectedRaw: unknown[] = [];
  const n = int(0, 6);
  for (let i = 0; i < n; i += 1) {
    selectedRaw.push(rnd() < 0.6 ? pick([...catalogIds, 'fantasma-1']) : pick(HOSTILE_IDS));
  }

  const view = reconcileSelection(selectedRaw, snapshot);
  const clean = sanitizeIds(selectedRaw);
  const canon = sanitizeCatalog(snapshot);
  const catalogSet = new Set(canon.options.map((o) => o.id));

  // K1/K2 — nada se perde: presente + ausente = selecionado (quando há prova).
  if (known) {
    check(
      view.present.length + view.missingIds.length === clean.length,
      'K1 contabilidade fechada da seleção',
      () => JSON.stringify({ clean, view }),
    );
    for (const id of clean) {
      const isPresent = view.present.some((o) => o.id === id);
      check(
        isPresent === catalogSet.has(id),
        'K1 presença espelha o catálogo',
        () => `${id} ${isPresent} ${catalogSet.has(id)}`,
      );
    }
  } else {
    check(view.missingIds.length === 0, 'K2 sem catálogo não há acusação de ausência', () =>
      JSON.stringify(view.missingIds),
    );
  }

  // K3 — ordem preservada e sem duplicatas.
  check(
    JSON.stringify(view.selected) === JSON.stringify(clean),
    'K3 ordem/dedup da seleção',
    () => JSON.stringify([view.selected, clean]),
  );
  check(new Set(view.selected).size === view.selected.length, 'K3 sem duplicata', () =>
    JSON.stringify(view.selected),
  );

  // K5 — rótulo estável, sem ids repetidos no catálogo canônico.
  check(
    new Set(canon.options.map((o) => o.id)).size === canon.options.length,
    'K5 catálogo sem id repetido',
    () => JSON.stringify(canon.options),
  );
  check(
    canon.options.every((o) => o.label.length > 0),
    'K5 rótulo nunca vazio',
    () => JSON.stringify(canon.options),
  );

  // K1 — disponíveis nunca contêm um já escolhido.
  check(
    view.available.every((o) => !clean.includes(o.id)),
    'K1 disponíveis excluem escolhidos',
    () => JSON.stringify(view.available),
  );

  // K6 — toggle idempotente e reversível, inclusive para fantasma.
  const target = pick([...catalogIds, 'fantasma-1']);
  const once = toggleSelection(clean, target);
  const twice = toggleSelection(once, target);
  // K6 é reversibilidade de *conjunto*: reinserir manda para o fim da lista
  // (é a ordem em que o operador escolheu), e a ordem de origens não altera
  // nenhuma decisão da régua.
  check(
    JSON.stringify([...twice].sort()) === JSON.stringify([...clean].sort()),
    'K6 toggle reversível',
    () => JSON.stringify({ clean, once, twice, target }),
  );
  check(
    once.includes(target) !== clean.includes(target),
    'K6 toggle alterna',
    () => JSON.stringify({ clean, once, target }),
  );
  check(
    JSON.stringify(toggleSelection(clean, '   ')) === JSON.stringify(clean),
    'K6 id vazio é inerte',
    () => JSON.stringify(clean),
  );

  // S6 — seleção exclusiva nunca deixa mais de um.
  const single = selectSingle(clean, target);
  check(single.length <= 1, 'K6 seleção exclusiva', () => JSON.stringify(single));

  // K7 — contexto só existe com prova.
  const libs: FaceLibraryOption[] = canon.options.map((o) => ({
    ...o,
    deviceIds: [pick(catalogIds)],
  }));
  const ctx = buildSchemeContext(libs, known);
  check(
    known ? Array.isArray(ctx.faceLibraries) : ctx.faceLibraries === undefined,
    'K7 vínculo só quando conhecido',
    () => JSON.stringify({ known, ctx }),
  );
}

/* ================================================================== *
 * Onda 221 — agenda
 * ================================================================== */

const CLOCKS = [
  '00:00',
  '00:01',
  '07:30',
  '08:00',
  '12:00',
  '18:00',
  '23:59',
  '24:00',
  '25:00',
  '7:5',
  '',
  'abc',
  '12:60',
  '  09:00  ',
];

let row = 0;
const mkRow = (start: string, end: string): SchedulePeriodRow => ({
  id: `r${++row}`,
  start,
  end,
});

// Fronteiras exatas do relógio (G6).
check(parseClock('00:00') === 0, 'G6 meia-noite início', () => 'x');
check(parseClock('23:59') === 1439, 'G6 último minuto', () => 'x');
check(parseClock('24:00') === null, 'G6 24:00 recusado como início', () => 'x');
check(parseClock('24:00', { allowEndOfDay: true }) === 1440, 'G6 24:00 aceito como fim', () => 'x');
check(parseClock('24:01', { allowEndOfDay: true }) === null, 'G6 além do dia', () => 'x');
for (let m = 0; m <= 1440; m += 1) {
  check(parseClock(formatClock(m), { allowEndOfDay: true }) === m, 'G6 round-trip do relógio', () =>
    formatClock(m),
  );
}

// G1 — agenda vazia é 24×7 declarado.
const emptyDiag = diagnoseScheduleForm(emptyScheduleForm());
check(emptyDiag.alwaysOn && emptyDiag.valid, 'G1 vazio é 24x7', () => JSON.stringify(emptyDiag));
check(formToSchedule(emptyScheduleForm()) === null, 'G1 vazio persiste null', () => 'x');
check(
  isWithinSchedule(formToSchedule(emptyScheduleForm()), Date.UTC(2026, 6, 28, 3, 0)),
  'G1 24x7 sempre dentro',
  () => 'x',
);

// G8 — entrada hostil nunca lança.
for (const hostile of [null, undefined, 42, 'x', {}, [1, 2, 3], [[null]], [[{ id: 1 }]]]) {
  let threw = false;
  try {
    diagnoseScheduleForm(hostile);
    formToSchedule(hostile);
  } catch {
    threw = true;
  }
  check(!threw, 'G8 entrada hostil não lança', () => JSON.stringify(hostile));
}

for (let scenario = 0; scenario < 30_000; scenario += 1) {
  const days: SchedulePeriodRow[][] = [[], [], [], [], [], [], []];
  const dayIndex = int(0, 6);
  const count = int(0, 8); // acima do teto de propósito
  for (let i = 0; i < count; i += 1) {
    days[dayIndex]!.push(mkRow(pick(CLOCKS), pick(CLOCKS)));
  }
  const state = days as ScheduleFormState;
  const diag = diagnoseScheduleForm(state);

  // G2 — excedente é recusado e nomeado, nunca silenciado.
  if (count > MAX_PERIODS_PER_DAY) {
    const issue = diag.issues.find((i) => i.code === 'too_many_periods');
    check(issue !== undefined, 'G2 excedente recusado', () => JSON.stringify(diag.issues));
    check(
      (issue?.rowIds.length ?? 0) === count - MAX_PERIODS_PER_DAY,
      'G2 excedente nomeado',
      () => JSON.stringify(issue),
    );
  }

  // G3/G6 — cada linha inválida tem uma recusa própria.
  for (const r of days[dayIndex]!) {
    const s = parseClock(r.start);
    const e = parseClock(r.end, { allowEndOfDay: true });
    const named = diag.issues.some((i) => i.rowIds.includes(r.id));
    if (s === null || e === null || e === 0 || s === e) {
      check(named, 'G3/G6 linha inválida nomeada', () => JSON.stringify(r));
    }
  }

  // G4 — cruzar a meia-noite é válido e declarado.
  for (const r of days[dayIndex]!) {
    const s = parseClock(r.start);
    const e = parseClock(r.end, { allowEndOfDay: true });
    if (s !== null && e !== null && e !== 0 && s > e) {
      check(
        diag.crossMidnightRowIds.includes(r.id),
        'G4 cruzamento declarado',
        () => JSON.stringify(r),
      );
      check(
        !diag.issues.some((i) => i.rowIds.includes(r.id) && i.code !== 'overlapping_periods' && i.code !== 'too_many_periods'),
        'G4 cruzamento não é erro',
        () => JSON.stringify({ r, issues: diag.issues }),
      );
    }
  }

  // G7 — o que é válido sobrevive ao round-trip sem perda nem invenção.
  if (diag.valid) {
    const persisted = formToSchedule(state);
    const back = scheduleToForm(persisted);
    const norm = normalizeSchedule(persisted);
    const validRows = days[dayIndex]!.length;
    check(
      (back[dayIndex]?.length ?? 0) === validRows,
      'G7 round-trip preserva contagem',
      () => JSON.stringify({ state, back }),
    );
    check(
      (norm[dayIndex]?.length ?? 0) === validRows,
      'G2 agenda válida nunca é truncada pelo avaliador',
      () => JSON.stringify({ persisted, norm }),
    );
    // Nenhuma janela válida pode desaparecer na avaliação.
    for (const r of days[dayIndex]!) {
      const s = parseClock(r.start)!;
      const e = parseClock(r.end, { allowEndOfDay: true })!;
      const mid = s < e ? Math.floor((s + e) / 2) : s;
      const at = Date.UTC(2026, 6, 26 + dayIndex, 0, 0) + mid * 60_000;
      check(
        isWithinSchedule(persisted, at),
        'G7 janela gravada é janela avaliada',
        () => JSON.stringify({ r, dayIndex, mid }),
      );
    }
  }
}

/* G5 — sobreposição: varredura exaustiva de pares de janelas ---------- */
const GRID = [0, 120, 360, 480, 720, 1080, 1380];
// Fim `00:00` é entrada ambígua recusada por G6 — não entra na varredura de G5.
const END_GRID = [...GRID.filter((m) => m !== 0), 1440];
for (const s1 of GRID) {
  for (const e1 of END_GRID) {
    if (s1 === e1) continue;
    for (const s2 of GRID) {
      for (const e2 of END_GRID) {
        if (s2 === e2) continue;
        const state: ScheduleFormState = [
          [mkRow(formatClock(s1), formatClock(e1)), mkRow(formatClock(s2), formatClock(e2))],
          [],
          [],
          [],
          [],
          [],
          [],
        ];
        const diag = diagnoseScheduleForm(state);
        const overlapping = diag.issues.some((i) => i.code === 'overlapping_periods');

        // Verdade de referência: minuto a minuto.
        let shared = 0;
        for (let m = 0; m < 1440; m += 1) {
          const in1 = s1 < e1 ? m >= s1 && m < e1 : m >= s1 || m < e1;
          const in2 = s2 < e2 ? m >= s2 && m < e2 : m >= s2 || m < e2;
          if (in1 && in2) shared += 1;
        }
        check(
          overlapping === shared > 0,
          'G5 sobreposição detectada exatamente',
          () => JSON.stringify({ s1, e1, s2, e2, shared, overlapping }),
        );
      }
    }
  }
}

console.log(
  `\nOnda 220/221 — ${asserts.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`,
);
if (failures > 0) process.exit(1);
