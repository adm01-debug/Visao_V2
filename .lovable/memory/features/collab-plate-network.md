---
name: Rede colaborativa de placas (Onda 127)
description: Compartilhamento de placas entre organizações por HMAC por rede, com reciprocidade, TTL, revogação e cooldown
type: feature
---

# Onda 127 — Rede colaborativa entre organizações

Condomínios/empresas compartilham placas suspeitas **sem trafegar a placa em claro**.
O que circula é `plate_hash = HMAC-SHA256(chave da rede, placa canônica)`. Quem recebe
só confirma uma placa que ELA MESMA leu — não enumera o acervo alheio.

## Componentes
- `src/lib/collab/collabNetwork.ts` — espelho TS: `COLLAB_POLICY`, `canonicalPlate`,
  `clampTtlDays`, `decideShare`, `decideMatch`.
- Tabelas: `collab_networks`, `collab_network_secrets` (**RLS ligada e zero políticas**,
  nenhum grant — inalcançável pela API), `collab_memberships`, `collab_entries`,
  `collab_matches`.
- Rotinas DEFINER: `collab_policy`, `canonical_plate`, `collab_plate_hash`,
  `collab_member_status`, `collab_user_orgs`, `share_collab_plate`,
  `revoke_collab_entry`, `match_collab_plate`, trigger `collab_network_bootstrap`.

## Política (espelhada SQL ↔ TS)
TTL padrão 30d / máx 180d · severidade 2–5 · cooldown 900s · cota 5.000 entradas
ativas por org · confiança mínima do OCR 0,6 · placa canônica de 7 caracteres.

## Decisões que custaram caro
- **Canonicalização por posição** (máscara `AAANXNN`): `0→O` só em casa alfabética e
  `O→0` só em casa numérica. Correção global corromperia `BRA2E19`. A posição 5 é
  ambígua entre as gerações e **não** é corrigida.
- `canonicalPlate` é idempotente — se não fosse, a mesma placa geraria dois hashes.
- Cooldown é a **última** guarda: aplicá-lo antes faria uma entrada silenciada
  mascarar outra mais grave. Desempate: severidade ↓, expiração ↑, id ↑.
- A organização nunca é alertada pela entrada que ela mesma criou.
- `match_collab_plate` e `collab_plate_hash` são **service_role apenas**: expostas a
  `authenticated` viram oráculo de placas.

## Gates
`npm run db:check:collab-network` (em `db:check:all`) · `npm run simulate:collab-network`
(31 suítes, ~26 mil combinações).

## Armadilha recorrente
Os *default privileges* concedem `EXECUTE` a `authenticated` em toda função nova:
`REVOKE ... FROM PUBLIC, anon, authenticated` explícito é obrigatório.
