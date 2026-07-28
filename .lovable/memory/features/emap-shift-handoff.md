---
name: E-Map passagem de turno
description: Onda 169 — diário de turno do E-Map; reconhecer nunca é resolver, herdado nunca é novo, teto de detalhe não altera contagens
type: feature
---

Onda 169 — passagem de turno (`src/lib/emap/shiftHandoff.ts`, `src/components/emap/ShiftHandoffCard.tsx`, gate `npm run simulate:wave169`).

Regras invioláveis:
1. **Reconhecer não é resolver.** "Ciente" fecha como `acknowledged` e JAMAIS entra em `normalized`.
2. **Herdado nunca vira novo.** `openedAt < startedAt` ⇒ `inherited`; herdado + surgido = total aberto.
3. **Sumiu não é normalizou.** Câmera fora do escopo fecha como `removed` (categoria própria).
4. **Teto de detalhe nunca corrompe contagem.** `totals` é absoluto; `dropped` é declarado no relatório de texto.
5. **Registro idempotente** por (câmera, abertura, fechamento, motivo) — StrictMode não duplica história.
6. Módulo puro/imutável (sem `Date.now()`); `SitePlanPage` mantém espelho em `ref` para derivar fechamentos fora do updater do React.
