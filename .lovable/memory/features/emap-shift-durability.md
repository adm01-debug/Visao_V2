---
name: E-Map durabilidade do turno
description: Onda 170 — persistência do diário de turno e do relógio de atenção entre recargas; envelope inválido descarta tudo, turno expira mas pendência sobrevive
type: feature
---

Módulo puro `src/lib/emap/shiftJournalStore.ts` (sem `Date.now()`, sem `localStorage` dentro da regra):

1. **Dado ilegível nunca vira dado** — JSON quebrado, versão diferente de `SHIFT_STATE_SCHEMA_VERSION` ou envelope malformado descarta TUDO (`outcome: 'corrupt'`). Proibido aproveitar "a parte legível" de envelope inválido.
2. **Saneamento por registro** dentro de envelope válido: câmera corrompida cai sozinha, contada em `discardedEntries`.
3. **Relógio futuro é suspeito** — `savedAt > now + 5min` ⇒ `clock_suspect`, descarta. Idade negativa jamais é fabricada.
4. **Turno expira (12h), pendência não** — `rolled_over` abre turno novo com contadores zerados, mas o `AttentionLedger` é preservado e vira herança.
5. **Idade nunca é reconstruída** — `openedAt`/`since`/`lastSeen` voltam absolutos.
6. **Carga sempre informa o desfecho** — `ShiftLoadOutcome` é exibido no `ShiftHandoffCard` (`restoreOutcome`); perda de história nunca é silenciosa.

Bordas (`readShiftState`/`writeShiftState`/`clearShiftState`/`browserShiftStorage`) nunca lançam: modo privado ou cota cheia não derruba o mapa.

Gate: `npm run simulate:wave170` (5.672 asserções, 0 falhas).
