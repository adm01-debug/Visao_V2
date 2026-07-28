---
name: E-Map ciência entre turnos
description: Onda 173 — ciência dada antes do início do turno é revogada na montagem e vira lista de revalidação; nunca some em silêncio
type: feature
---

# Onda 173 — a ciência não atravessa o turno

Regra única (`src/lib/emap/ackHandoff.ts`):
**ciência com `at < shiftJournal.startedAt` não vale para quem assume o turno.**

- Corte é o início do turno, **nunca** o TTL de 4h da Onda 172.
- Revogar não apaga história: fato ainda aberto vira `InheritedAck` (carimbo
  original + estado atual + flag `escalated`), exibido em `InheritedAckCard`.
- Ciência de câmera já normalizada é `stale` (higiene), não dívida.
- `shiftStartedAt`/`now` inválidos = no-op: relógio quebrado nunca apaga ciência.
- Idempotente, puro, imutável; ordem gravidade → idade → id.
- Aplicado uma única vez na montagem de `SitePlanPage` (via `useRef`), antes de
  qualquer reconciliação da 172.

Gate: `npm run simulate:wave173` (111.996 asserções, 0 falhas).
