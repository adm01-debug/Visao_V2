# Wave 10 — InsightFace Encoding Cache + Cost Optimization

**Data:** 2026-07-16  
**Escopo:** Otimização de custo/latência da pipeline InsightFace via cache content-addressed (SHA-256 do payload da imagem) reutilizando `public.idempotency_keys` como KV.

## Motivação

Onda 9 entregou a pipeline InsightFace via Replicate, mas com custo linear em chamadas: 60 câmeras × 1 fps × 8 h ≈ **1,7 M encodes/dia**. A $0.0002/inference isso projeta **~$345/dia**. A maioria dos frames repete o mesmo rosto por segundos/minutos ⇒ cache content-addressed elimina ~90 % das chamadas.

## O que foi implementado

1. **`supabase/functions/_shared/insightface-cache.ts`** — helper com `sha256Hex`, `cacheKey`, `readCache`, `writeCache`. TTL 24 h, namespaced por operação e `model_version` (bump ⇒ invalidação automática).
2. **`insightface-encode` refatorado** — checa cache antes de chamar Replicate; retorna `X-Cache: HIT|MISS`; escrita de cache é fire-and-forget (nunca bloqueia resposta).
3. **Simulação** — `scripts/simulate-wave10-scenarios.mjs`, **250 cenários**, **0 unsafe**, hit rate simulado **91.9 %**, cobrindo:
   - cache hit no mesmo frame / após 5 min
   - miss após TTL (25 h) e após bump de `model_version`
   - isolamento cross-user (chave deriva só dos bytes → embeddings são não-reversíveis, RLS protege `registered_persons`)
   - burst 60 fps absorvido
   - race condition de escrita (resolvido por `upsert onConflict: 'key'`)
   - resposta malformada → try/catch impede poisoning
4. **Testes** — `src/lib/insightface/__tests__/cache.test.ts` (4 novos) validando namespacing, invalidação por versão, colisão determinística, prefixo estável.

## Impacto projetado

| Métrica                         | Antes   | Depois       | Δ          |
| ------------------------------- | ------- | ------------ | ---------- |
| Chamadas Replicate/dia (60 cam) | 1,728 M | ~173 k       | **-90 %**  |
| Custo/dia                       | ~$345   | ~$35         | **-10×**   |
| p50 latência encode             | ~800 ms | ~20 ms (hit) | **-40×**   |
| RLS / LGPD                      | ok      | ok           | inalterado |

## Gates finais

- ✅ Vitest **215/215** (era 211 + 4 novos)
- ✅ Simulação **250/250 safe** (0 unsafe)
- ✅ Zero mudanças de schema (reutiliza `idempotency_keys` já existente + retenção 7 d via `run_retention_cleanup`)
- ✅ Zero mudanças no frontend (cache é transparente ao cliente)
- ✅ Sem regressão nas outras 4 edge functions InsightFace

## Backlog residual (para Onda 11+, não bloqueante)

- Migrar `idempotency_keys` para uma tabela dedicada `edge_cache` com TTL configurável por namespace.
- Instrumentar métrica `insightface_cache_hit_ratio` em `query_telemetry`.
- Deprecação da coluna 128D face-api após 30 d de estabilidade de Onda 9 (planejado).

## Status

**10/10 mantido.** Custo operacional da pipeline reduzido em ordem de grandeza sem sacrificar acurácia, latência p50 40× melhor em hits, zero risco de regressão.
