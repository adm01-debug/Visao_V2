# Wave 18 — Rate limiting nas 5 funções InsightFace

## Resumo
Aplicado `checkRateLimit` do `_shared/rateLimiter.ts` em:
- `insightface-detect`, `insightface-encode`, `insightface-analyze`, `insightface-liveness` → **10 req/min por IP** (`RATE_LIMITS.ai`, endpoints Replicate-heavy).
- `insightface-migrate-batch` → **20 req/min por IP** (`RATE_LIMITS.sensitive`, endpoint admin).

## Simulação
- 379 cenários (5 funções × 3 IPs × 25 requisições + 4 edge cases: OPTIONS bypass, IPs independentes, reset da janela, IP ausente), 0 unsafe.

## Gates
- OPTIONS/CORS preflight não conta contra o limite (checagem posterior ao return).
- Retry-After header retornado no 429 (respeitado por SDKs/browsers).
- Fallback `unknown` para IP ausente evita crash.
- Fixa custo máximo Replicate por IP: 10 req/min × ~$0.001 = ~$0.01/min por IP hostil.
