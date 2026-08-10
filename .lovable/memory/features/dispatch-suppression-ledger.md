---
name: Dispatch Suppression Ledger
description: Onda 242 — trilha append-only dos silêncios do despacho externo (S1–S10), ruído evitado medido, condição calada sem entrega é `starved`, RPC admin-only maintenance_suppression_ledger
type: feature
---

# Onda 242 — Trilha do ruído evitado

**Defeito corrigido:** o motivo `condition_throttled` (Onda 240) nascia no plano de
despacho, virava número no log e morria. Sem trilha não havia como provar quanto
ruído a política evitou, nem como distinguir "calado porque já avisei" de
"calado por engano".

## Leis S1–S10 (`src/lib/maintenance/suppressionLedger.ts`)

- **S1** unidade = par (condição, canal) num instante; nunca agregado cru do banco.
- **S2** linha ilegível (condição vazia, canal desconhecido, janela negativa) vai
  para `unreadable`, **nunca** conta como economia.
- **S3** fora da janela declarada é descartada; a leitura não extrapola.
- **S4** instante no futuro é ilegível, não economia.
- **S5** zero linhas ⇒ `no_history`. Ausência de dado nunca é "calmo".
- **S6** condição suprimida **sem nenhuma entrega** na janela ⇒ `starved` (crítico),
  independentemente do volume.
- **S7** o **pior** governa o veredito geral, nunca a média.
- **S8** volume medido por **taxa diária** (`<1` light, `1–5` moderate, `>5` heavy).
- **S9** teto de 2000 linhas com saturação visível (`saturated`).
- **S10** ordem estável: supressões desc, empate por chave asc.

## Banco

- `public.maintenance_dispatch_suppressions`: append-only (gatilho
  `block_dispatch_suppression_mutation`), sem Data API (`REVOKE` + policy
  RESTRICTIVE `false`), CHECKs: `window_minutes > 0` (janela zero nunca suprime),
  `remaining_minutes <= window_minutes`, canal/severidade fechados.
- `public.maintenance_suppression_ledger(p_window_hours)` — SECURITY DEFINER,
  admin-only, devolve **linhas cruas + entregas** para a régua recalcular o
  veredito na UI (divergência aparece em vez de sumir).
- `public.maintenance_suppression_selftest()` — service_role, exercita as 6
  guardas e limpa o que criou (validado dinamicamente).

## App

- Escrita: `supabase/functions/maintenance-alerts-dispatch` grava os skips
  `condition_throttled`; falha de auditoria **nunca** derruba o envio.
- Leitura: `useDispatchSuppressions` + `DispatchSuppressionCard` em `/manutencao`.
- Gates: `npm run simulate:wave242` (1.944 cenários / 17.705 asserções),
  `npm run test:wave242`.
