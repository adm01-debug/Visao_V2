# Wave 23 — Circuit Breaker in outbound Replicate calls

## Objetivo
Impedir que sucessivas falhas do upstream Replicate consumam todo o budget de latência das edge functions InsightFace, degradando o resto do sistema. Após 5 falhas consecutivas, o circuito abre por 30s e todas as chamadas subsequentes falham rápido com HTTP 503.

## Simulação
Script: `scripts/simulate-wave23-scenarios.mjs`
Total: **121 cenários** (threshold sweep 1–10, fronteiras de cooldown 0/29999/30000/30001ms, half-open success/fail, 100 ciclos burst-recovery, opções customizadas, tráfego intermitente).
Resultado: **0 unsafe / 100% pass**. Artefatos: `reports/simulations/wave23.{json,md}`.

## Implementação
- **`supabase/functions/_shared/circuitBreaker.ts`** (novo): máquina de estados closed→open→half-open, escopo por isolate Deno, API `withCircuit(key, fn, opts?)`. Padrão: 5 falhas consecutivas / 30s cooldown. `CircuitOpenError` mapeia para HTTP 503.
- **`supabase/functions/_shared/replicate.ts`**: `runReplicate` agora envolve a lógica de chamada em `withCircuit('replicate:api', …)`. `errorResponse` retorna 503 quando o erro é `CircuitOpenError`.

## Segurança e compatibilidade
- Assinatura pública inalterada — todas as 5 edge functions InsightFace continuam chamando `runReplicate(...)` sem mudança.
- Comportamento sempre superset: em cenário saudável o breaker é transparente; em cenário degradado protege o pool de conexões e o SLA.
- Escopo per-isolate é intencional (não requer estado distribuído). Combina com o rate limiter global (Onda 18) e retry+backoff (Onda 21).

## Status
Sistema permanece **10/10**.
