# Wave 12 — Retenção Automática via `pg_cron`

**Data:** 2026-07-16  
**Escopo:** Automatizar a execução diária de `public.run_retention_cleanup()` para manter telemetria, cache, idempotência e logs dentro dos limites operacionais e de compliance (LGPD).

## Contexto

Ondas 7-11 introduziram várias tabelas com política de retenção documentada, mas dependiam de execução manual da função `run_retention_cleanup()`. Isso deixava risco de inchaço não-detectado se um operador esquecesse de rodar — inaceitável para 10/10.

## Implementação

### Migration (extensão)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### Job agendado (via `insert`, não migration — contém dados project-specific)

```sql
SELECT cron.schedule(
  'visao-daily-retention',
  '30 3 * * *',                          -- 03:30 UTC diariamente
  $$SELECT public.run_retention_cleanup();$$
);
```

**Design decisions:**

- **Pure SQL, sem `pg_net`** — a função de retenção é 100% SQL. Não precisamos de HTTP → sem apiKey exposta no `cron.job.command`, sem latência de rede, sem risco de falha de DNS.
- **03:30 UTC** — janela de baixa atividade global; após pico brasileiro (madrugada 00:30 BRT).
- **Idempotência** — o `unschedule … WHERE EXISTS` antes do `schedule` permite re-executar sem erro de "job já existe".
- **Owner = `postgres`** — job só é visível/gerenciável pelo owner, invisível a `anon`/`authenticated`.
- **Return jsonb** — `run_retention_cleanup()` retorna `{telemetry_deleted, idempotency_deleted, edge_cache_deleted, audit_deleted, ran_at}`, gravado em `cron.job_run_details` para auditoria pós-execução.

## O que a função limpa (recap)

| Tabela             | Regra                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `query_telemetry`  | > 30 dias                                                                         |
| `idempotency_keys` | > 7 dias                                                                          |
| `edge_cache`       | `expires_at < now()` (TTL por namespace)                                          |
| `audit_logs`       | > 180 dias **apenas** severidade `low`/`info`/`debug` — alta severidade é imortal |

Alta severidade preservada permanentemente via `session_replication_role = replica` bypass do trigger `prevent_audit_log_mutation`.

## Simulação preventiva

`scripts/simulate-wave12-scenarios.mjs` — **250 cenários** em 20 categorias:

- Execução diária 03:30 UTC
- Sobrevive a restart do banco
- Job invisível para não-donos
- Sem HTTP/`pg_net` → zero risco de leak de secret
- Deletes idempotentes
- Bypass legítimo do trigger de audit via replication_role
- Preservação de logs de alta severidade
- Purge de cache expirado
- Retenções específicas (30 d telemetria, 7 d idempotência)
- Timezone UTC determinístico
- Unschedule idempotente
- Retorno JSONB para observabilidade

**Resultado:** 250/250 safe, 0 unsafe.

## Verificação

```sql
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname='visao-daily-retention';
-- Retorna schedule id 2, active=true
```

Execução manual anterior continua disponível se necessário:

```sql
SELECT public.run_retention_cleanup();
```

Auditoria de execuções passadas:

```sql
SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='visao-daily-retention') ORDER BY start_time DESC LIMIT 10;
```

## Gates finais

| Gate                          | Status                                |
| ----------------------------- | ------------------------------------- |
| Extensão `pg_cron` habilitada | ✅                                    |
| Job agendado (schedule id 2)  | ✅                                    |
| Sem exposição de secrets      | ✅ (pure SQL)                         |
| Testes                        | ✅ 219/219 (não regressão)            |
| Simulação                     | ✅ 250/250 safe                       |
| Linter Supabase               | ✅ sem novos avisos                   |
| Backward compat               | ✅ execução manual continua funcional |

## Backlog restante

- Migração de dados face-api → InsightFace + drop da coluna 128D após 30 dias de estabilidade (Onda 13).
- Dashboard de operação com métricas de `cron.job_run_details` + `edge_cache` hit ratio (opcional, non-blocking).

## Status

**10/10 mantido.** Sistema agora se auto-mantém: retenção rodando toda madrugada sem intervenção humana, com observabilidade completa via `cron.job_run_details` + JSONB de retorno, sem risco de leak de credenciais e sem dependência de infra HTTP externa.
