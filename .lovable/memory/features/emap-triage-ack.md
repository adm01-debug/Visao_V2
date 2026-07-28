---
name: Triage Acknowledgement Durability
description: Onda 172 — livro de ciência da fila de triagem do E-Map, durável, com revogação por agravamento/reabertura/caducidade
type: feature
---

Onda 172 separa **fato** de **decisão humana** no E-Map.

- `src/lib/emap/triageAck.ts` é a regra única: `acknowledge`, `unacknowledge`,
  `evaluateAck`, `reconcileAcks`, `acknowledgedIds`, serialização versionada e
  adaptador `localStorage` (`visao.emap.triage-ack.v1`).
- **"Ciente" nunca apaga o relógio de atenção.** O código anterior chamava
  `clearAttention` no botão de ciência — isso mentia (sumia da fila) e zerava a
  dívida acumulada. Nunca reintroduzir.
- Ciência é sobre um **estado congelado** (`status`/`worst`/`openedAt`).
- Revogação automática: `escalated` (gravidade piorou, inclusive pelo `worst`),
  `reopened` (janela nova), `expired` (TTL 4h), `resolved` (saiu do relógio).
  Precedência: agravamento/reabertura antes de caducidade.
- **Melhora não revoga** — `alert` reconhecido que virou `warning` continua ciente.
- Envelope ilegível descarta tudo; registro corrompido é descartado sozinho;
  arquivo salvo no futuro (> 5 min de folga) é `clock_suspect`; teto de 500 registros.
- Invariantes do gate `simulate:wave172`: reconciliação nunca cria ciência,
  conserva o livro (mantidos + revogados = originais), é idempotente, e a fila
  nunca perde pendência por causa da ciência. 18.101 asserções, 0 falhas.
