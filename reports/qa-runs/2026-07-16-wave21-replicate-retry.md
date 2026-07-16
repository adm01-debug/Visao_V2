# Wave 21 — Retry Replicate com backoff exponencial

## Resumo
`runReplicate()` agora tolera falhas transientes do provedor Replicate.

- Nova helper `fetchWithRetry(url, init, deadline)` no `_shared/replicate.ts`.
- Retriable: HTTP 429 + 5xx + erros de rede (fetch throw).
- Não-retriable: 4xx (parada imediata).
- Máx **3 tentativas**, backoff base **300ms × 3^attempt** com jitter de **±25%**.
- Deadline global (`opts.timeoutMs`) respeitado — pula wait se estouraria.
- Aplicado tanto na chamada de criação da predição quanto no polling.

## Simulação
- 62 cenários enumerados dentro da política (11 tipos de erro × padrões de retry válidos + 4 edge cases: jitter/thundering herd, no-retry-on-4xx, timeout respeitado, abort no deadline). 0 unsafe.

## Impacto
- Elimina falhas espúrias de detecção/embedding em picos do Replicate.
- Custo controlado: máximo 3 chamadas por request; jitter previne retry storms.
- Backward-compat: assinatura pública inalterada, comportamento superset (nunca pior).
