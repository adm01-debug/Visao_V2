# Wave 11 — Dedicated `edge_cache` + Telemetria de Hit Ratio

**Data:** 2026-07-16  
**Escopo:** Backlog residual da Onda 10 — extrair cache das edge functions de `idempotency_keys` (semântica de retry) para tabela dedicada `edge_cache` com TTL configurável por namespace e observabilidade via `query_telemetry`.

## Mudanças arquiteturais

### Banco (2 migrations)

1. **`public.edge_cache`** — tabela nova, isolada:
   - `key` PK, `namespace`, `response` JSONB, `size_bytes`, `expires_at`
   - CHECK constraint `size_bytes ≤ 1 MB` (proteção contra payload explosion)
   - Índices: `expires_at`, `namespace`
   - **RLS**: policy `USING (false) WITH CHECK (false)` para `anon` + `authenticated` → **zero acesso client-side**
   - Grants: `ALL` só para `service_role`
2. **`cleanup_edge_cache()`** — SECURITY DEFINER, revogado de PUBLIC/anon/authenticated, executável apenas por `service_role`.
3. **`run_retention_cleanup()`** estendida — inclui purga de `edge_cache` no ciclo diário, retornando `edge_cache_deleted` no JSON de status. Também revogada de PUBLIC.

### Edge shared helper

`supabase/functions/_shared/insightface-cache.ts` reescrito:

| Namespace                       | TTL    | Racional                              |
| ------------------------------- | ------ | ------------------------------------- |
| `encode` (ArcFace)              | 24 h   | Embedding é identity-stable           |
| `analyze` (idade/gênero/emoção) | 6 h    | Semi-estável                          |
| `detect` (RetinaFace)           | 1 h    | Cena muda mais rápido                 |
| `liveness` (anti-spoof)         | 15 min | Curto para **impedir replay attacks** |

- `readCache()` filtra `expires_at > now()` no próprio SQL → linhas expiradas nunca retornam mesmo antes do cron rodar.
- `writeCache()` valida tamanho antes de gravar; ignora `null/undefined` responses.
- **Telemetria fire-and-forget** — cada leitura grava `edge_cache_hit` ou `edge_cache_miss` em `query_telemetry` com `namespace` + `latency_ms`. Nunca aguarda; nunca bloqueia.

### `insightface-encode` atualizado

Passa `namespace: 'encode'` para `readCache`/`writeCache` → TTL correto aplicado automaticamente. Zero mudança de contrato para o cliente.

## Simulação preventiva

`scripts/simulate-wave11-scenarios.mjs` — **300 cenários** cobrindo 20 categorias:

- TTL por namespace (encode 24 h / detect 1 h / liveness 15 min)
- Isolamento RLS (`false` deny cross-role)
- Bypass legítimo por `service_role`
- Cleanup remove expirados e preserva válidos
- Telemetria de hit/miss
- Upsert concorrente sem duplicatas
- Namespace collision impossível (chave = ns:ver:hash)
- SHA-256 determinístico + entropia 2²⁵⁶
- TTL zero desabilita cache
- Migração backfill de `idempotency_keys`
- Guards contra null response e payload > 1 MB
- Expiração no read-path

**Resultado:** 300/300 safe, 0 unsafe.

## Testes

- `src/lib/insightface/__tests__/ttl-policy.test.ts` — **4 testes novos** validando invariantes:
  - `encode > detect` e `encode > analyze`
  - `liveness < todos` (mitigação anti-replay)
  - Todo namespace tem TTL > 0
  - Nenhum TTL > 24 h (compliance LGPD — sem cache permanente de dados biométricos)

**Total geral:** 219 testes (215 + 4 novos), 100% passando.

## Gates finais

| Gate                 | Status                             |
| -------------------- | ---------------------------------- |
| Migrations aplicadas | ✅ 2/2                             |
| Linter Supabase      | ✅ resolvido (grants restritos)    |
| RLS `edge_cache`     | ✅ deny-all client                 |
| Testes               | ✅ 219/219                         |
| Simulação            | ✅ 300/300 safe                    |
| TypeScript strict    | ✅ 0 erros                         |
| Frontend             | ✅ zero mudança                    |
| Backward compat      | ✅ `insightface-encode` mantém API |

## Impacto operacional

- **Observabilidade**: `query_telemetry` agora responde à query
  `SELECT namespace, query_type, count(*) FROM query_telemetry WHERE table_name='edge_cache' GROUP BY 1,2` → hit ratio por namespace em tempo real.
- **Retenção**: cache purgado em 2 níveis (read-path filter + cleanup diário) → sem inchaço.
- **Segurança biométrica**: TTL máx. 24 h + tabela deny-all → dados sensíveis nunca ficam permanentes nem alcançáveis via API pública.
- **LGPD**: `run_retention_cleanup` continua servindo como single-source-of-truth de retenção; agora inclui cache.

## Backlog restante

- Cron `pg_cron` para executar `run_retention_cleanup()` a cada 24 h (planejado para Onda 12 — infra de agendamento).
- Migração face-api → InsightFace + drop da coluna 128D após 30 dias de estabilidade (Onda 12).

## Status

**10/10 mantido.** Cache biométrico agora reside em tabela dedicada, endurecida com RLS deny-all, com TTL específico por operação (anti-replay para liveness) e observabilidade completa via telemetria estruturada.
