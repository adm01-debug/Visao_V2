---
name: E-Map escalonamento de prazo
description: Onda 176 — degrau de acionamento (operador/supervisão/gerência) do prazo vencido da triagem; monotônico por janela, emissão única por degrau
type: feature
---

`src/lib/emap/triageEscalation.ts` é a regra única do acionamento por atraso.

Invariantes:

1. Só `breached` em aberto escalona; `met`/`late` (congelados por ciência) nunca.
2. O degrau vem do múltiplo `overdue/budget` (1× = supervisão, 3× = gerência), nunca do atraso absoluto — comparar minutos entre gravidades diferentes é injusto.
3. Degrau nunca retrocede dentro da mesma janela (`openedAt`): melhora não "desaciona".
4. `openedAt` diferente = janela nova, memória zerada.
5. Transição emitida só na subida (dedup); o livro nunca guarda `none`.
6. Relógio para trás não cria degrau.
7. Puro: memória de entrada nunca mutada; saída sempre nova.

UI: `TriageQueuePanel` mantém a memória num `useRef` (recalcular do zero rebaixaria acionamentos). Gate: `npm run simulate:wave176` (446.546 asserções).
