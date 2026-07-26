/**
 * Onda 114 — simulação exaustiva do fan-in de alertas de manutenção.
 *
 * Varre o produto cartesiano de estados dos dois detectores (relógio e
 * backlog) e valida invariantes que, se violadas, produziriam ou alarme falso
 * ou silêncio perigoso — os dois modos de falha que arruínam um sistema de
 * alerta em produção.
 *
 * Rode com: npm run simulate:wave114
 */
import {
  evaluateMaintenanceSources,
  DEFAULT_MAINTENANCE_SOURCE_THRESHOLDS,
} from '../src/lib/maintenanceSourceAlerts.ts';

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const H = 3_600_000;
const T = DEFAULT_MAINTENANCE_SOURCE_THRESHOLDS;

const failures = [];
let scenarios = 0;

function check(id, ok, ctx) {
  if (!ok) failures.push(`${id}: ${JSON.stringify(ctx)}`);
}

const pick = (list, routine) => list.find((c) => c.routine === routine) ?? null;

// ---------------------------------------------------------------- geradores
const skewAges = [0, 0.5, 6, 24, 47.9, 48.1, 72, 500, -3 /* relógio recuou */];
const skewOks = [true, false];
const criticalCounts = [0, 1, 7, 60];
const warningCounts = [0, 1, 12];
const analyzed = [0, 60];

const clockStates = [null];
for (const age of skewAges)
  for (const ok of skewOks)
    for (const cc of criticalCounts)
      for (const wc of warningCounts)
        for (const an of analyzed)
          clockStates.push({
            ranAtMs: NOW - age * H,
            ok,
            errorDetail: ok ? null : 'timeout no GetSystemDateAndTime',
            camerasAnalyzed: an,
            camerasWarning: wc,
            camerasCritical: cc,
          });

const parents = ['plate_detections', 'recognition_logs'];
const severities = ['ok', 'warning', 'critical'];
const etas = [null, 0.5, 12, 23.9, 24.1, 400];
const staleFlags = [false, true];

const verdictOptions = [];
for (const sev of severities)
  for (const eta of etas)
    for (const stale of staleFlags)
      verdictOptions.push({ severity: sev, hoursToSaturation: eta, stale });

const backlogStates = [[]];
for (const a of verdictOptions) {
  backlogStates.push([{ parent: parents[0], currentRows: 5_000, ...a }]);
  for (const b of verdictOptions.filter((_, i) => i % 7 === 0)) {
    backlogStates.push([
      { parent: parents[0], currentRows: 5_000, ...a },
      { parent: parents[1], currentRows: 120_000, ...b },
    ]);
  }
}

// ------------------------------------------------------------------ varredura
for (const clockSkewRun of clockStates) {
  for (const backlogVerdicts of backlogStates) {
    scenarios++;
    const out = evaluateMaintenanceSources({ nowMs: NOW, clockSkewRun, backlogVerdicts });
    const skew = pick(out, 'camera_clock_skew');
    const backlog = pick(out, 'partition_backlog_trend');
    const ctx = { clockSkewRun, backlogVerdicts };

    // I1 — no máximo um candidato por rotina (dedup estrutural).
    check('I1', out.length === new Set(out.map((c) => c.routine)).size, ctx);

    // I2 — severidade sempre no vocabulário aceito pelo CHECK da tabela.
    check('I2', out.every((c) => c.severity === 'warning' || c.severity === 'critical'), ctx);

    // I3 — todo candidato tem motivo legível não vazio (vai para o Telegram).
    check('I3', out.every((c) => typeof c.reason === 'string' && c.reason.trim().length > 0), ctx);

    // I4 — detector ausente ou obsoleto NUNCA passa silencioso.
    const age = clockSkewRun ? (NOW - clockSkewRun.ranAtMs) / H : Infinity;
    if (clockSkewRun === null || age > T.staleHours) {
      check('I4', skew?.severity === 'critical', ctx);
    }

    // I5 — falha de execução tem precedência sobre a contagem medida.
    if (clockSkewRun && age <= T.staleHours && age >= 0 && !clockSkewRun.ok) {
      check('I5', skew?.severity === 'critical' && skew.reason.includes('falhou'), ctx);
    }

    // I6 — câmera crítica sempre escala para critical; warning nunca mascara.
    if (clockSkewRun && age <= T.staleHours && clockSkewRun.ok && clockSkewRun.camerasCritical > 0) {
      check('I6', skew?.severity === 'critical', ctx);
    }

    // I7 — frota saudável e detector recente => silêncio absoluto.
    if (
      clockSkewRun &&
      age <= T.staleHours &&
      clockSkewRun.ok &&
      clockSkewRun.camerasCritical === 0 &&
      clockSkewRun.camerasWarning === 0
    ) {
      check('I7', skew === null, ctx);
    }

    // I8 — coletor de backlog cego é crítico (ausência de dado != ausência de problema).
    if (backlogVerdicts.length === 0) {
      check('I8', backlog?.severity === 'critical' && backlog.detail.blind === true, ctx);
    }

    // I9 — qualquer série obsoleta domina a classificação do backlog.
    if (backlogVerdicts.some((v) => v.stale)) {
      check('I9', backlog?.severity === 'critical', ctx);
    }

    // I10 — série crítica não obsoleta => critical apontando um pai crítico.
    if (backlogVerdicts.length > 0 && !backlogVerdicts.some((v) => v.stale)) {
      const crit = backlogVerdicts.filter((v) => v.severity === 'critical');
      if (crit.length > 0) {
        check(
          'I10',
          backlog?.severity === 'critical' && crit.some((v) => v.parent === backlog.detail.parent),
          ctx,
        );
      } else if (backlogVerdicts.some((v) => v.severity === 'warning')) {
        // I11 — só warnings => warning (nunca inflar severidade).
        check('I11', backlog?.severity === 'warning', ctx);
      } else {
        // I12 — tudo ok => silêncio.
        check('I12', backlog === null, ctx);
      }
    }

    // I13 — o pai escolhido satura antes de qualquer outro crítico.
    if (backlog?.severity === 'critical' && typeof backlog.detail.parent === 'string') {
      const crit = backlogVerdicts.filter((v) => v.severity === 'critical' && !v.stale);
      if (crit.length > 0 && !backlogVerdicts.some((v) => v.stale)) {
        const chosen = crit.find((v) => v.parent === backlog.detail.parent);
        const minEta = Math.min(...crit.map((v) => v.hoursToSaturation ?? Infinity));
        check('I13', (chosen?.hoursToSaturation ?? Infinity) === minEta, ctx);
      }
    }

    // I14 — as duas rotinas são independentes: o estado do relógio jamais
    // altera o veredito do backlog (e vice-versa).
    const isolated = evaluateMaintenanceSources({
      nowMs: NOW,
      clockSkewRun: null,
      backlogVerdicts,
    });
    check(
      'I14',
      JSON.stringify(pick(isolated, 'partition_backlog_trend')) === JSON.stringify(backlog),
      ctx,
    );

    // I15 — determinismo: mesma entrada, mesma saída.
    check(
      'I15',
      JSON.stringify(evaluateMaintenanceSources({ nowMs: NOW, clockSkewRun, backlogVerdicts })) ===
        JSON.stringify(out),
      ctx,
    );
  }
}

// I16 — monotonicidade temporal: envelhecer um detector saudável nunca reduz a
// severidade emitida.
const rank = { none: 0, warning: 1, critical: 2 };
for (const wc of [0, 3]) {
  for (const cc of [0, 2]) {
    let prev = 'none';
    for (const age of [0, 10, 30, 47, 49, 100, 1000]) {
      scenarios++;
      const out = evaluateMaintenanceSources({
        nowMs: NOW,
        clockSkewRun: {
          ranAtMs: NOW - age * H,
          ok: true,
          camerasAnalyzed: 60,
          camerasWarning: wc,
          camerasCritical: cc,
        },
        backlogVerdicts: [],
      });
      const sev = pick(out, 'camera_clock_skew')?.severity ?? 'none';
      check('I16', rank[sev] >= rank[prev], { wc, cc, age, sev, prev });
      prev = sev;
    }
  }
}

console.log(`\nOnda 114 — cenários simulados: ${scenarios.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} violação(ões):`);
  for (const f of failures.slice(0, 20)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as invariantes I1..I16 mantidas.');
