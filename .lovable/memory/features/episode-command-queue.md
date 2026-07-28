---
name: Episode Command Queue
description: Onda 182 — fila durável e idempotente de comandos de episódio de alarme entre a ponte (181) e as RPCs (180)
type: feature
---

`src/lib/alarms/episodeCommandQueue.ts` é a regra única de entrega dos comandos
`open`/`close` do livro de reincidência. Puro: sem rede, sem relógio, sem
`localStorage` (o adaptador é `src/hooks/useAlarmRecurrenceQueue.ts`).

Invariantes que não podem ser afrouxadas:

1. **Identidade pelo fato:** chave `kind:seriesKey:at`. Reenfileirar o mesmo
   fato é no-op — idempotência antes da rede, nunca depois.
2. **Ordem cronológica por série:** no máximo um item elegível por série;
   nenhum fato mais novo chega ao servidor antes de um mais antigo da mesma
   série. Séries diferentes drenam em paralelo.
3. **Falha de transporte não perde fato:** recuo exponencial 1s→60s, até 8
   tentativas.
4. **Recusa de regra é definitiva:** vai para carta morta (auditável), não fica
   em retentativa. `classifyRpcFailure` decide (stale/duplicate/permission =
   `permanent`).
5. **Teto de fila declarado:** 500 pendentes; estouro descarta os mais antigos
   e incrementa `dropped` (truncar em silêncio é pior que fila cheia).
6. **Persistência com envelope versionado:** JSON inválido ou versão
   desconhecida descarta tudo; registro corrompido é descartado sozinho.

Gate: `npm run simulate:wave182` (127.483 asserções, 0 falhas) +
`src/lib/alarms/__tests__/episodeCommandQueue.test.ts`.
