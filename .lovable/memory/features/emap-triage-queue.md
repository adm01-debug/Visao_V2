---
name: E-Map fila de triagem
description: Onda 171 — ordem de atendimento do E-Map; gravidade manda, dívida promove um degrau só, ciente vai ao fim mas nunca some, sem planta continua na fila
type: feature
---

Módulo puro `src/lib/emap/triageQueue.ts` (sem `Date.now()`, sem DOM) + `TriageQueuePanel.tsx`.

1. **Gravidade é o eixo primário** — idade nunca reordena sozinha.
2. **Dívida promove no máximo UM degrau** e o teto é `offline` (`PROMOTION_CEILING`): tempo nunca transforma aviso em alarme, nem alcança o topo.
3. **Reconhecer não é resolver** — "ciente" vai para o fim da fila, mas mantém idade, contagem e presença (espelha a Onda 169).
4. **Sem planta conhecida ≠ inexistente** — `planId: null` continua na fila; locator que lança erro vira "sem planta", nunca derruba a fila.
5. **Ordem total e determinística** — `(ciente, tier, idade desc, cameraId asc)`; mesma entrada ⇒ mesma fila.
6. **Teto de exibição nunca corrompe contagem** — `totals` absoluto, `dropped` declarado; `next` não muda com o teto.
7. Relógio inválido (`NaN`/`Infinity`) devolve fila vazia em vez de ordem inventada; idade nunca é negativa.

Gate: `npm run simulate:wave171` (8.364 asserções, 0 falhas).
