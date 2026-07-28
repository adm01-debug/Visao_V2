---
name: Face Search
description: Onda 197 — busca retroativa no histórico facial; semelhança nunca vira prova, "não medido" nunca é "não é", janela obrigatória ≤31 dias
type: feature
---

# Onda 197 — Busca de Faces (paridade SIM Next / Face Search)

Régua única em `src/lib/faces/faceSearch.ts`. Pura: sem rede, sem relógio próprio.
A tela (`/busca-de-faces`) e o hook `useFaceSearch` executam a régua; nunca a reescrevem.

## Invariantes que não podem regredir

1. **Fraude vence semelhança.** `spoofDetected` ⇒ `spoof_suspect`, mesmo com 99%.
2. **Semelhança abaixo do corte nunca é identificação.** Faixa de folga
   `CANDIDATE_MARGIN = 0.10` produz `candidate`, que exige conferência humana.
3. **Vivacidade < `LIVENESS_FLOOR` (0,5) só rebaixa**, nunca promove.
4. **`similarity === null` é `unverified`**, jamais `unidentified` — mesma regra
   da Onda 159: estado não conferido não é apresentado como conferido.
5. **Janela obrigatória**, fim exclusivo / início inclusivo, teto de
   `MAX_WINDOW_DAYS = 31`. Recusa é declarada (`describeRejection`), nunca
   correção silenciosa — exceto o corte de `toMs` no `now` (futuro não grava).
6. **Filtro de atributo exclui quem não tem o atributo** (`UNKNOWN_ATTRIBUTE_POLICY = 'exclude'`),
   e isso é dito ao operador na UI.
7. **Ordem determinística**: instante desc, empate por `id` asc.
8. **Teto de linhas declarado** (`MAX_ROWS = 500`): acima disso o resultado é
   marcado como truncado, nunca entregue como se fosse completo.

Fonte de dados: `recognition_logs` (particionada, isolada por `user_id` na RLS).
Nenhum agregado no banco — um segundo lugar definindo "identificado" divergiria.

Validação: `npm run simulate:wave197` (91.058 asserções) +
`src/lib/faces/__tests__/faceSearch.test.ts`.
