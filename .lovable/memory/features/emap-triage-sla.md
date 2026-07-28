---
name: E-Map prazo de atendimento (SLA da triagem)
description: Onda 174 — orçamento de atendimento por gravidade, congelamento do veredito pela ciência e regra de que relógio torto nunca acusa atraso
type: feature
---

# Onda 174 — prazo de atendimento da fila de triagem

Regra única em `src/lib/emap/triageSla.ts` (puro, sem `Date.now()`).

Invariantes:
1. O prazo é do fato: conta de `openedAt` (janela contínua), nunca do `since`.
2. Orçamento vem do PIOR estado da janela — melhora não afrouxa prazo.
3. Ciência válida CONGELA o veredito (`met`/`late`); nunca muda depois.
4. Relógio para trás devolve o orçamento inteiro — jamais cria violação.
5. Estado saudável = `not_applicable` e fica FORA do cálculo de conformidade.
6. `due_soon` = restante ≤ min(20% do orçamento, `dueSoonFloorMs` 30s).
7. Ciência de outra janela (`openedAt` diferente) não congela nada.
8. `compliance` é `null` sem atendimento concluído — nunca finge 100%.

Orçamentos padrão: alert 2min, offline 5min, warning 10min, unknown 15min.

UI: selo de prazo no `TriageQueuePanel` (recebe `acks`), com contadores
"fora do prazo" e "atendido com atraso". Gate: `npm run simulate:wave174`
(44.360 asserções, 0 falhas).
