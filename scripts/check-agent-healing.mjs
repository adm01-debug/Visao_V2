#!/usr/bin/env node
/**
 * Onda 115 — Gate da auto-cura dos agentes locais.
 *
 * Ponto cego que este gate fecha: a rotina pode existir, estar agendada e
 * ainda assim ser inócua — porque a fila rejeita o tipo de tarefa de cura,
 * porque a função virou executável por usuário comum, ou porque escalonamentos
 * acontecem sem gerar alerta (detecção sem notificação = não detectar).
 *
 * Falha (exit 1) quando:
 *  - `heal_local_agents` não existe, não é SECURITY DEFINER, ou é executável
 *    por `anon`/`authenticated`;
 *  - a constraint de `agent_relay_tasks.kind` não aceita as tarefas de cura;
 *  - o job de cron `heal-local-agents` não está agendado;
 *  - a última varredura registrada falhou (`ok = false`);
 *  - existe escalonamento nas últimas 24h sem alerta `local_agent_healing`
 *    correspondente no barramento de manutenção;
 *  - o veredito de `src/lib/agentHealing.ts` sobre os dados reais é `critical`.
 *
 * Avisa (sem falhar) quando o veredito é `warning`.
 *
 * Uso: `npm run db:check:agent-healing`
 */
import { execFileSync } from 'node:child_process';
import { evaluateAgentHealing } from '../src/lib/agentHealing.ts';

const conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

/**
 * @param {string} sql
 * @returns {string[][]}
 */
function query(sql) {
  const args = [...(conn ? [conn] : []), '-tA', '-F', '\u0001', '-X', '-q', '-c', sql];
  const out = execFileSync('psql', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('\u0001'));
}

const errors = [];
const warnings = [];

// 1) A função existe, é DEFINER e não é exposta a usuários finais.
const fn = query(`
  SELECT p.prosecdef::text,
         has_function_privilege('anon', p.oid, 'EXECUTE')::text,
         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents'
`);

if (fn.length === 0) {
  errors.push('função public.heal_local_agents() não existe');
} else {
  const [secdef, anonExec, authExec] = fn[0];
  if (secdef !== 'true') errors.push('heal_local_agents deixou de ser SECURITY DEFINER');
  if (anonExec === 'true') errors.push('heal_local_agents é executável por anon');
  if (authExec === 'true') errors.push('heal_local_agents é executável por authenticated');
}

// 2) A fila aceita os tipos de tarefa de cura.
const kinds = query(`
  SELECT pg_get_constraintdef(c.oid)
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'agent_relay_tasks' AND c.conname = 'agent_relay_tasks_kind_check'
`);
const kindDef = kinds[0]?.[0] ?? '';
for (const kind of ['self_heal_ping', 'self_heal_restart']) {
  if (!kindDef.includes(kind)) {
    errors.push(`agent_relay_tasks.kind não aceita '${kind}' — a cura nunca chega ao agente`);
  }
}

// 3) Agendamento ativo. `cron.job` pode não ser legível na conexão do sandbox:
// nesse caso a verificação vira aviso, para não transformar falta de
// privilégio em falso negativo de infraestrutura.
try {
  const job = query(`
    SELECT active::text, schedule FROM cron.job WHERE jobname = 'heal-local-agents'
  `);
  if (job.length === 0) {
    errors.push("job de cron 'heal-local-agents' não está agendado");
  } else if (job[0][0] !== 'true') {
    errors.push("job de cron 'heal-local-agents' está inativo");
  }
} catch {
  warnings.push(
    'Sem permissão para ler `cron.job` nesta conexão — verificação de agendamento pulada.'
  );
}

// 4) Última varredura saudável.
const lastRun = query(`
  SELECT ok::text, COALESCE(error_detail, ''),
         EXTRACT(EPOCH FROM (now() - ran_at))/3600.0
  FROM public.agent_healing_runs ORDER BY ran_at DESC LIMIT 1
`);
if (lastRun.length === 0) {
  warnings.push('nenhuma varredura de auto-cura registrada ainda');
} else {
  const [ok, detail, ageHours] = lastRun[0];
  if (ok !== 'true')
    errors.push(`última varredura de auto-cura falhou: ${detail || 'sem detalhe'}`);
  if (Number(ageHours) > 2) {
    warnings.push(`última varredura de auto-cura há ${Number(ageHours).toFixed(1)}h`);
  }
}

// 5) Escalonamento sem alerta = elo detector→notificação partido.
const orphan = query(`
  SELECT count(*)
  FROM public.agent_healing_actions a
  WHERE a.action = 'escalate'
    AND a.created_at > now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'local_agent_healing'
        AND e.created_at BETWEEN a.created_at - interval '10 minutes'
                             AND a.created_at + interval '6 hours'
    )
`);
if (Number(orphan[0]?.[0] ?? 0) > 0) {
  errors.push(`${orphan[0][0]} escalonamento(s) de agente sem alerta de manutenção correspondente`);
}

// 6) Veredito da política canônica sobre os dados reais.
const agents = query(`
  SELECT a.id, a.name, a.status,
         COALESCE(EXTRACT(EPOCH FROM a.last_seen_at)*1000, -1)::bigint,
         (EXTRACT(EPOCH FROM a.created_at)*1000)::bigint,
         COALESCE(t.done,0), COALESCE(t.failed,0), COALESCE(t.expired,0), COALESCE(t.pending,0),
         COALESCE(h.attempts,0),
         COALESCE(EXTRACT(EPOCH FROM h.last_attempt)*1000, -1)::bigint
  FROM public.local_agents a
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE r.status='done')    AS done,
           count(*) FILTER (WHERE r.status='failed')  AS failed,
           count(*) FILTER (WHERE r.status='expired' OR (r.status='pending' AND r.expires_at < now())) AS expired,
           count(*) FILTER (WHERE r.status='pending' AND r.expires_at >= now()) AS pending
    FROM public.agent_relay_tasks r
    WHERE r.agent_id = a.id AND r.created_at > now() - interval '1 hour' AND r.kind = 'http_request'
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS attempts, max(created_at) AS last_attempt
    FROM public.agent_healing_actions x
    WHERE x.agent_id = a.id AND x.action IN ('nudge','restart')
      AND x.created_at > COALESCE(a.last_seen_at, '-infinity'::timestamptz)
  ) h ON true
`);

const verdict = evaluateAgentHealing({
  nowMs: Date.now(),
  agents: agents.map((r) => ({
    id: r[0],
    name: r[1],
    status: r[2] === 'revoked' ? 'revoked' : 'active',
    lastSeenAtMs: Number(r[3]) < 0 ? null : Number(r[3]),
    createdAtMs: Number(r[4]),
    relay: {
      done: Number(r[5]),
      failed: Number(r[6]),
      expired: Number(r[7]),
      pending: Number(r[8]),
    },
    attempts: Number(r[9]),
    lastAttemptAtMs: Number(r[10]) < 0 ? null : Number(r[10]),
  })),
});

if (verdict.severity === 'critical') {
  errors.push(`veredito da frota de agentes: ${verdict.reason}`);
} else if (verdict.severity === 'warning') {
  warnings.push(`veredito da frota de agentes: ${verdict.reason}`);
}

for (const w of warnings) console.warn(`AVISO: ${w}`);

if (errors.length > 0) {
  console.error('\nGate da auto-cura de agentes FALHOU:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log(
  `Auto-cura de agentes OK — ${verdict.detail.agents_total} agente(s) avaliado(s), severidade: ${verdict.severity}`
);
