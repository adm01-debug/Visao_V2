# Wave Storage 27 — Simulação E2E do fluxo de silenciamento

**Checks:** 50/50  
**Cenários totais (retry + perm + fuzz):** 318

## Cobertura

- Retries com backoff (5xx, 429, timeout, network) — terminais em 4xx
- Fuzz de 300 combinações aleatórias (nunca excede 3 tentativas)
- Matriz de permissões (anônimo/viewer/admin) com auditoria obrigatória
- Rate-limit 20 req/min por admin com janela deslizante e isolamento
- Payload de auditoria com todos os 13 campos exigidos
- Justificativa mínima 5 chars, trim, truncamento em 500

_Sem falhas._
