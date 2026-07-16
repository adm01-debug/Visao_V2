# Wave 20 — Health check público

## Resumo
Novo endpoint `/functions/v1/health` (sem JWT) para monitoramento externo.

- Função SQL `public.system_health()` — SECURITY DEFINER, grant apenas para service_role, retorna `{ status, db, cron_jobs_active, cache_accessible, checked_at }`.
- Edge function `health/index.ts` — chama a função via service_role, adiciona `latency_ms` e `version`, aplica rate limit interno (60 req/min por IP).
- `verify_jwt = false` em `supabase/config.toml` — endpoint intencionalmente público.

## Cenários simulados
- 52 combinações (3 estados DB × 4 estados cron × 4 estados cache + 4 edge cases), 0 unsafe.
- HTTP 200 quando healthy/degraded, 503 quando unhealthy (padrão consumido por Pingdom/UptimeRobot).

## Gates de segurança
- Nenhum secret ou ID exposto no payload.
- SQL function REVOKE ALL FROM PUBLIC, anon, authenticated; execução real via service_role dentro do edge function.
- Rate limit fire-and-forget em memória evita amplificação de custo.
- Linter permanece em 1 warning intencional (get_operational_metrics, defendido por has_role).
