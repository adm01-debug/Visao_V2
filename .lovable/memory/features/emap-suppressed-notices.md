---
name: E-Map avisos silenciados
description: Onda 165 — livro auditável do que a política de aviso calou; só supressão de agravamento entra, expira por relógio, painel some quando vazio
type: feature
---

## Regra única

`src/lib/emap/suppressionLedger.ts` é a única fonte do que foi retido do operador.

- **Só agravamento retido entra no livro.** `improved` e `not_primed` NÃO são supressões
  auditáveis — nada foi escondido. Contá-los infla o painel e treina o operador a ignorá-lo.
- **O livro esquece:** retenção padrão 15 min, `now` sempre por parâmetro (nunca relógio interno).
- **Teto por câmera** (50): câmera oscilando não pode crescer o livro sem limite na aba.
- **Identidade de referência** quando nada muda; poda idempotente; relógio `NaN` é inerte.
- Painel `SuppressedNoticesPanel` **não renderiza** quando `total === 0`.

## Integração

`useSitePlans` grava `suppressed` de `evaluateNotices` e expõe `suppressionSummary` +
`dismissSuppressions(cameraId)`. `SitePlanPage` monta o painel na coluna do inspetor.

## Gate

`npm run simulate:wave165` — 216.823 asserções, 0 falhas.
