/**
 * Onda 244 — Simulação combinatória da carência de estreia das rotinas de
 * retenção.
 *
 * O defeito exercitado aqui: até a Onda 243, `minutesSinceLastRun === null`
 * caía direto em `never` (crítico). Toda rotina nova nascia acusada de estar
 * quebrada, no minuto seguinte ao próprio cadastro — e o operador aprendia a
 * ignorar a classe inteira de alertas de conformidade.
 *
 * As invariantes conferidas em cada cenário:
 *
 *  I1  Determinismo: a mesma entrada produz sempre o mesmo veredito.
 *  I2  Vocabulário fechado: nenhum veredito fora dos cinco conhecidos.
 *  I3  A estreia só existe quando NÃO há execução. Havendo execução, a idade
 *      de registro é irrelevante (silêncio governa sozinho).
 *  I4  Sem âncora de registro legível, ausência de execução é `never` — a
 *      falta de prova nunca compra silêncio.
 *  I5  `pending_first_run` nunca emite alerta; `never`/`stalled` emitem
 *      crítico; `warn` emite aviso; `ok` nada.
 *  I6  Monotonicidade da estreia: fixada a rotina sem execução, aumentar a
 *      idade nunca torna o veredito menos grave.
 *  I7  Monotonicidade do silêncio: com execução, aumentar o silêncio nunca
 *      torna o veredito menos grave.
 *  I8  Fronteira exata: a carência termina em `cadência + 15 min`, fechada à
 *      esquerda (o instante exato já é `never`).
 *  I9  Idade negativa (registro no futuro) é saneada para zero, jamais vira
 *      carência infinita nem `never` silencioso.
 *  I10 Cooldown permanece dentro de piso e teto, independente do veredito.
 */
import {
  RETENTION_ROUTINES,
  classifyRetentionHealth,
  retentionThresholds,
  isRetentionActionable,
  type RetentionHealth,
  type RetentionRoutine,
} from '../src/lib/retention/retentionRegistry.ts';
import {
  evaluateRetentionAlerts,
  retentionCooldownMinutes,
  severityForHealth,
  COOLDOWN_FLOOR_MINUTES,
  COOLDOWN_CEILING_MINUTES,
} from '../src/lib/retention/retentionAlerts.ts';

const KNOWN: readonly RetentionHealth[] = ['ok', 'warn', 'stalled', 'pending_first_run', 'never'];
const SEVERITY_RANK: Record<RetentionHealth, number> = {
  ok: 0,
  pending_first_run: 1,
  warn: 2,
  stalled: 3,
  never: 4,
};

let assertions = 0;
let scenarios = 0;
const failures: string[] = [];

function check(ok: boolean, label: string): void {
  assertions += 1;
  if (!ok && failures.length < 25) failures.push(label);
}

/** Cadências exercitadas: horária, diária e extremos plausíveis. */
const CADENCES = [1, 5, 15, 30, 60, 90, 120, 240, 360, 720, 1440, 2880, 4320, 10080, 43200];

/** Idades de registro, em minutos, relativas à fronteira da carência. */
const AGE_OFFSETS = [
  -1_000_000, -100_000, -10_000, -1_440, -61, -16, -2, -1, 0, 1, 2, 16, 61, 900, 10_000, 100_000,
];

/** Silêncios exercitados, relativos às fronteiras de warn/stalled. */
const SILENCE_OFFSETS = [-100_000, -1_000, -61, -2, -1, 0, 1, 2, 61, 1_000, 100_000];

for (const cadence of CADENCES) {
  const { warnAfterMinutes, stalledAfterMinutes, debutAfterMinutes } =
    retentionThresholds(cadence);

  // --- Bloco A: sem execução, variando a idade de registro -------------------
  const ladder: number[] = [];
  for (const offset of AGE_OFFSETS) {
    const age = debutAfterMinutes + offset;
    scenarios += 1;

    const health = classifyRetentionHealth(null, cadence, age);
    const again = classifyRetentionHealth(null, cadence, age);
    check(health === again, `I1 determinismo cadence=${cadence} age=${age}`);
    check(KNOWN.includes(health), `I2 vocabulário: ${health}`);

    const expected: RetentionHealth =
      Math.max(0, age) < debutAfterMinutes ? 'pending_first_run' : 'never';
    check(health === expected, `I8 fronteira cadence=${cadence} age=${age} → ${health}`);

    const severity = severityForHealth(health);
    check(
      health === 'pending_first_run' ? severity === null : severity === 'critical',
      `I5 severidade cadence=${cadence} age=${age} health=${health}`,
    );
    check(
      isRetentionActionable(health) === (health === 'never'),
      `I5b acionável cadence=${cadence} health=${health}`,
    );

    ladder.push(SEVERITY_RANK[health]);
  }

  const sortedAges = [...AGE_OFFSETS].sort((a, b) => a - b);
  let previous = -1;
  for (const offset of sortedAges) {
    const rank = SEVERITY_RANK[classifyRetentionHealth(null, cadence, debutAfterMinutes + offset)];
    check(rank >= previous, `I6 monotonicidade da estreia cadence=${cadence} offset=${offset}`);
    previous = rank;
  }

  // --- Bloco B: sem execução e sem âncora legível ----------------------------
  for (const age of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
    scenarios += 1;
    const health = classifyRetentionHealth(null, cadence, age as number | null);
    check(health === 'never', `I4 âncora ilegível (${String(age)}) → ${health}`);
  }

  // Idade negativa: registro no futuro é saneado para zero → carência válida.
  scenarios += 1;
  check(
    classifyRetentionHealth(null, cadence, -5000) === 'pending_first_run',
    `I9 idade negativa cadence=${cadence}`,
  );

  // --- Bloco C: com execução, a estreia não interfere ------------------------
  const silences = [
    0,
    ...SILENCE_OFFSETS.map((o) => warnAfterMinutes + o),
    ...SILENCE_OFFSETS.map((o) => stalledAfterMinutes + o),
  ];
  for (const silence of silences) {
    for (const age of [null, 0, 1, debutAfterMinutes, 1_000_000]) {
      scenarios += 1;
      const health = classifyRetentionHealth(silence, cadence, age);
      const baseline = classifyRetentionHealth(silence, cadence, null);
      check(health === baseline, `I3 estreia irrelevante com execução cadence=${cadence}`);
      check(KNOWN.includes(health), `I2 vocabulário: ${health}`);
      check(health !== 'pending_first_run', `I3b execução nunca é estreia`);

      const s = Math.max(0, silence);
      const expected: RetentionHealth =
        s < warnAfterMinutes ? 'ok' : s < stalledAfterMinutes ? 'warn' : 'stalled';
      check(health === expected, `I7 escada de silêncio cadence=${cadence} silence=${silence}`);
    }
  }

  let previousSilenceRank = -1;
  for (const silence of [...silences].sort((a, b) => a - b)) {
    const rank = SEVERITY_RANK[classifyRetentionHealth(silence, cadence, null)];
    check(rank >= previousSilenceRank, `I7b monotonicidade do silêncio cadence=${cadence}`);
    previousSilenceRank = rank;
  }

  // --- Bloco D: cooldown -----------------------------------------------------
  scenarios += 1;
  const cooldown = retentionCooldownMinutes(cadence);
  check(
    cooldown >= COOLDOWN_FLOOR_MINUTES && cooldown <= COOLDOWN_CEILING_MINUTES,
    `I10 cooldown cadence=${cadence} → ${cooldown}`,
  );

  check(ladder.length === AGE_OFFSETS.length, 'I6b cobertura da escada');
}

// --- Bloco E: fan-in sobre o registro real -----------------------------------
for (const routine of RETENTION_ROUTINES as readonly RetentionRoutine[]) {
  const { debutAfterMinutes } = retentionThresholds(routine.cadenceMinutes);
  for (const age of [0, 1, debutAfterMinutes - 1, debutAfterMinutes, debutAfterMinutes + 1]) {
    scenarios += 1;
    const alerts = evaluateRetentionAlerts(
      [{ jobName: routine.jobName, minutesSinceLastRun: null, minutesSinceRegistration: age }],
      [routine],
    );
    const shouldEmit = age >= debutAfterMinutes;
    check(alerts.length === (shouldEmit ? 1 : 0), `I5c emissão ${routine.jobName} age=${age}`);
    if (shouldEmit) {
      check(alerts[0].severity === 'critical', `I5d severidade ${routine.jobName}`);
      check(alerts[0].health === 'never', `I5e veredito ${routine.jobName}`);
      check(
        alerts[0].routine === `retention:${routine.jobName}`,
        `I5f chave ${routine.jobName}`,
      );
    }
  }

  // Rotina registrada sem observação alguma continua crítica (sem âncora).
  scenarios += 1;
  const orphan = evaluateRetentionAlerts([], [routine]);
  check(orphan.length === 1 && orphan[0].health === 'never', `I4b sem observação ${routine.jobName}`);
}

// --- Resultado ----------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n❌ Onda 244 — ${failures.length} invariante(s) violada(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `✅ Onda 244 — carência de estreia consistente: ${scenarios.toLocaleString('pt-BR')} cenários / ${assertions.toLocaleString('pt-BR')} asserções.`,
);
