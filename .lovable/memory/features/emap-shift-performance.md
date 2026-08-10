---
name: Desempenho do turno (SLA agregado)
description: Onda 175 — MTTA, conformidade e dívida vencida herdada no relatório de turno do E-Map
type: feature
---

Módulo `src/lib/emap/shiftPerformance.ts` (puro, sem relógio próprio).

Regras invioláveis:

1. MTTA/conformidade só usam vereditos congelados (`met`/`late`). Pendência aberta nunca entra na média — senão ignorar o alarme "melhora" o número.
2. Atribuição pelo instante da CIÊNCIA (`frozenAt` dentro de `[startedAt, now]`), não pela abertura. Herdada atendida agora conta para este turno.
3. Vencido herdado (`openedAt < startedAt`) vai em `inheritedBreached`, nunca somado a `breachedInShift`. `breachedInShift + inheritedBreached === byState.breached`.
4. Sem amostra: `mttaMs` e `compliance` são `null` — nunca 0 ms nem 100%.
5. Duração negativa (drift de NTP) é descartada da amostra, não zerada.
6. Ciência de outra janela (`ack.openedAt !== entry.openedAt`) é inerte.

UI: `ShiftHandoffCard` recebe `acks` e anexa o bloco de desempenho ao relatório copiado.
Gate: `npm run simulate:wave175` (7.123 asserções, 0 falhas).
