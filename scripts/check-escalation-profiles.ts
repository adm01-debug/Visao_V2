/**
 * Onda 238 — gate de CI dos perfis de escalada.
 *
 * Confere três coisas que testes unitários não conseguem provar:
 *  1. **Paridade TS↔SQL** — a régua do painel e a régua do cron são a mesma,
 *     varrida em todas as combinações de perfil × severidade × nível.
 *  2. **Não-regressão da Onda 117** — o perfil `operational` continua idêntico,
 *     valor a valor, aos limiares históricos. Esta onda não tem licença para
 *     mudar o comportamento de nenhuma fonte que não declarou.
 *  3. **Exercício dinâmico** — a função de escalada é *executada* contra dados
 *     sintéticos em transação revertida, reproduzindo o defeito B (crônico
 *     renovado diariamente) e provando que ele agora escala. Gate estático
 *     não pega isso: a função compilava e rodava sem erro o tempo todo.
 */

import { execFileSync } from 'node:child_process';
import {
  DEFAULT_ESCALATION_THRESHOLDS,
  type MaintenanceSeverity,
} from '../src/lib/maintenanceEscalation.ts';
import {
  ESCALATION_PROFILE_PREFIXES,
  OPERATIONAL_PROFILE,
  SLOW_ACCOUNTING_PROFILE,
  escalationProfileFor,
} from '../src/lib/escalationProfiles.ts';

const failures: string[] = [];
let probes = 0;

function check(label: string, ok: boolean, extra = ''): void {
  probes += 1;
  if (!ok) failures.push(`${label}${extra ? `: ${extra}` : ''}`);
}

function sql(query: string): string {
  return execFileSync('psql', ['-At', '-c', query], { encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// 1. Paridade da resolução de perfil (O1).
// ---------------------------------------------------------------------------
const ROUTINES = [
  'admission_trend:ledger_stock',
  'admission_reconcile:ledger_stock',
  'admission_backlog:admission_ledger',
  'retention:admission_ledger',
  'partition_drain',
  'maintenance_watchdog',
  'blame:cloud',
  'admission_trend', // sem dois-pontos: NÃO é a classe lenta
  'xadmission_trend:foo', // prefixo no meio: também não
  '',
];
const resolved = sql(
  `SELECT string_agg(coalesce(public.escalation_profile_for(r), 'NULL'), '|' ORDER BY ord)
     FROM unnest(ARRAY[${ROUTINES.map((r) => `'${r.replace(/'/g, "''")}'`).join(',')}]) WITH ORDINALITY AS t(r, ord)`
).split('|');
ROUTINES.forEach((routine, i) => {
  check(
    `perfil[${routine || '<vazio>'}]`,
    resolved[i] === escalationProfileFor(routine).id,
    `SQL=${resolved[i]} TS=${escalationProfileFor(routine).id}`
  );
});

// ---------------------------------------------------------------------------
// 2. Paridade da escada (todas as combinações).
// ---------------------------------------------------------------------------
const profiles = [OPERATIONAL_PROFILE, SLOW_ACCOUNTING_PROFILE];
const severities: MaintenanceSeverity[] = ['critical', 'warning'];
const ladderRows = sql(
  `SELECT string_agg(p || '/' || s || '/' || l || '=' ||
            coalesce(public.escalation_ladder_minutes(p, s, l)::TEXT, 'NULL'), ',' ORDER BY p, s, l)
     FROM unnest(ARRAY['operational','slow_accounting']) p,
          unnest(ARRAY['critical','warning']) s,
          generate_series(1, 3) l`
);
const ladderMap = new Map(ladderRows.split(',').map((kv) => kv.split('=') as [string, string]));
for (const profile of profiles) {
  for (const severity of severities) {
    for (let level = 1; level <= 3; level += 1) {
      const ts = profile.ladderMinutes[severity][level] ?? null;
      const got = ladderMap.get(`${profile.id}/${severity}/${level}`);
      const want = ts === null ? 'NULL' : String(ts);
      check(`escada ${profile.id}/${severity}/${level}`, got === want, `SQL=${got} TS=${want}`);
    }
  }
}

// Tempos por perfil.
for (const profile of profiles) {
  const row = sql(
    `SELECT min_step_minutes || '|' || undelivered_grace_minutes || '|' || anchor_mode
       FROM public.escalation_profile_timing('${profile.id}')`
  ).split('|');
  check(`min_step ${profile.id}`, Number(row[0]) === profile.minStepMinutes, `${row[0]}`);
  check(`grace ${profile.id}`, Number(row[1]) === profile.undeliveredGraceMinutes, `${row[1]}`);
  check(`anchor ${profile.id}`, row[2] === profile.anchorMode, `${row[2]}`);
}

// ---------------------------------------------------------------------------
// 3. Não-regressão da Onda 117 (O1).
// ---------------------------------------------------------------------------
for (const severity of severities) {
  const legacy = DEFAULT_ESCALATION_THRESHOLDS.ageMinutesByLevel[severity];
  const now = OPERATIONAL_PROFILE.ladderMinutes[severity];
  for (let level = 1; level <= 3; level += 1) {
    const legacyValue = Number.isFinite(legacy[level]) ? legacy[level] : null;
    check(
      `Onda 117 preservada ${severity}/${level}`,
      (now[level] ?? null) === legacyValue,
      `${now[level]} vs ${legacyValue}`
    );
  }
}
check(
  'minStep 117',
  OPERATIONAL_PROFILE.minStepMinutes === DEFAULT_ESCALATION_THRESHOLDS.minStepMinutes
);
check(
  'grace 117',
  OPERATIONAL_PROFILE.undeliveredGraceMinutes ===
    DEFAULT_ESCALATION_THRESHOLDS.undeliveredGraceMinutes
);
check(
  'teto crítico 117',
  OPERATIONAL_PROFILE.maxLevel.critical === DEFAULT_ESCALATION_THRESHOLDS.maxLevel.critical
);
check(
  'teto warning 117',
  OPERATIONAL_PROFILE.maxLevel.warning === DEFAULT_ESCALATION_THRESHOLDS.maxLevel.warning
);

// O2 verificável: nenhum degrau abaixo da cadência declarada.
for (const profile of profiles) {
  if (profile.cadenceMinutes === null) continue;
  for (const severity of severities) {
    for (const value of profile.ladderMinutes[severity]) {
      if (value === null) continue;
      check(`O2 ${profile.id}/${severity}`, value >= profile.cadenceMinutes, `${value}`);
    }
  }
  check(`O2 minStep ${profile.id}`, profile.minStepMinutes >= profile.cadenceMinutes);
}

// Toda classe declarada precisa existir também no SQL.
for (const [prefix, profile] of ESCALATION_PROFILE_PREFIXES) {
  const got = sql(`SELECT public.escalation_profile_for('${prefix}exemplo')`);
  check(`classe declarada ${prefix}`, got === profile.id, got);
}

// ---------------------------------------------------------------------------
// 4. Exercício dinâmico em transação revertida.
// ---------------------------------------------------------------------------
// O gate roda como papel sem UPDATE nas tabelas de manutenção: o exercício
// vive numa função SECURITY DEFINER que cria e desfaz os próprios dados.
const guards = sql(
  `SELECT string_agg(guard || '=' || ok::TEXT || '(' || coalesce(detail, '') || ')', E'\n') FROM public.escalation_profile_selftest()`
)
  .split('\n')
  .filter(Boolean);
check('autoteste devolveu 8 guardas', guards.length === 8, `${guards.length}`);
for (const line of guards) {
  const [name, verdict] = line.split('=');
  check(`autoteste ${name}`, verdict.startsWith('true'), verdict);
}

// Nenhum resíduo do autoteste no banco.
const leftovers = sql(
  `SELECT count(*) FROM public.maintenance_alert_events WHERE routine LIKE '%__selftest%'`
);
check('sem resíduo', leftovers === '0', leftovers);

if (failures.length) {
  console.error(`Gate de perfis de escalada: ${failures.length} falha(s).`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log(
  `Gate de perfis de escalada OK — ${probes} sondas, paridade TS↔SQL completa, exercício dinâmico com 8 guardas.`
);
