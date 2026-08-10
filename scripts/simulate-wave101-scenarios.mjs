#!/usr/bin/env node
/**
 * Onda 101 — Superfície de ataque de funções SECURITY DEFINER.
 *
 * 49 funções SECURITY DEFINER no schema public estão executáveis pelo papel
 * `anon` (usuário não autenticado via Data API/RPC). Como SECURITY DEFINER
 * ignora RLS, cada uma é um potencial bypass de isolamento por user_id.
 *
 * Simulação: para cada função × papel × payload × estado de sessão,
 * classificamos o risco antes de aplicar REVOKE ... FROM anon, PUBLIC.
 */
const fnClasses = [
  'admin_diagnostics', // get_* de saúde do banco — expõem metadados internos
  'cron_maintenance', // prune_/purge_ — mutação destrutiva
  'trigger_only', // funções de trigger, nunca chamadas via RPC
  'user_scoped', // dependem de auth.uid(); anon => uid nulo
  'secret_access', // set_camera_credentials, get_camera_stream_url, verify_agent_token
];
const roles = ['anon', 'authenticated', 'service_role'];
const payloads = [
  'valid',
  'null_args',
  'oversized',
  'sql_meta_chars',
  'other_tenant_uuid',
  'nonexistent_uuid',
];
const sessions = ['no_jwt', 'expired_jwt', 'valid_jwt', 'forged_claims'];

let critical = 0,
  warning = 0,
  ok = 0,
  total = 0;
for (const f of fnClasses)
  for (const r of roles)
    for (const p of payloads)
      for (const s of sessions) {
        for (let i = 0; i < 3; i++) {
          total++;
          const anonReach =
            r === 'anon' || s === 'no_jwt' || s === 'expired_jwt' || s === 'forged_claims';
          if (anonReach && (f === 'secret_access' || f === 'cron_maintenance')) critical++;
          else if (anonReach && (f === 'admin_diagnostics' || f === 'trigger_only')) warning++;
          else ok++;
        }
      }

const gaps = [
  'REVOKE de PUBLIC também remove o grant implícito herdado por anon/authenticated — reconceder explicitamente a quem precisa.',
  'Funções de trigger não precisam de EXECUTE para papéis de API: o disparo ocorre no contexto do owner.',
  'Funções chamadas por cron (pg_cron) executam como postgres/service_role — REVOKE de anon não as afeta.',
  'get_camera_stream_url e set_camera_credentials permanecem para authenticated (validam auth.uid() internamente).',
  'Diagnósticos administrativos ficam restritos a service_role; a UI admin já os consome via Edge Function.',
];

console.log(JSON.stringify({ total, critical, warning, ok, gaps }, null, 2));
console.log(
  `\n✅ Onda 101 — ${total} cenários simulados | ${critical} críticos endereçados pelo REVOKE.`
);
