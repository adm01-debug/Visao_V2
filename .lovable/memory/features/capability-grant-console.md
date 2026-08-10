---
name: Console de concessões de permissão (Onda 151)
description: Onda 151 — admissão de concessões finas com prazo obrigatório ≤90d, anti-escalada, anti-auto-concessão, trilha imutável e gate db:check:grant-console
type: feature
---

## Regra única

`src/lib/permissions/grantConsole.ts` decide **admissão**; `capabilities.ts`
(Onda 150) decide **resolução**. As duas são puras e sem relógio próprio.

Recusas canônicas (mesmos códigos no banco, via `RAISE EXCEPTION`):
`actor_missing_capability`, `self_grant`, `unknown_capability`,
`reason_required`, `expiry_required`, `expiry_in_past`, `expiry_too_far`,
`escalation`, `redundant_grant`, `ineffective_deny`.

Decisões que não devem ser afrouxadas:

- **Prazo obrigatório, teto 90 dias.** Sem data de morte, exceção vira cargo.
- **Ninguém concede a si mesmo** (nem admin). Revogar a si mesmo é permitido.
- **Não se concede o que não se tem**; `deny` não exige posse.
- **Concessão redundante e `deny` inócuo são recusados** — linha que não muda
  o conjunto efetivo mente para a auditoria.
- **Revogação idempotente e irreversível** (`revoke_capability_grant` devolve
  `false` quando já revogada, sem segunda linha na trilha).

## Banco

- `public.user_capability_grant_audit` — trilha imutável (trigger bloqueia
  UPDATE/DELETE), leitura só para admin, `anon` revogado.
- `public.grant_capability(_user_id, _capability, _effect, _reason, _expires_at)`
  e `public.revoke_capability_grant(_grant_id, _reason)` — SECURITY DEFINER,
  `search_path = public`, `anon` revogado, guard interno por
  `users.grant_capability`. Escrita direta na tabela nunca é usada pela UI.

## Gates

- `npm run simulate:wave151` — 3.181 cenários, invariantes G1..G7.
- `npm run db:check:grant-console` — espelho TS↔JS + simulação + exercício
  dinâmico `tests/rls/capability-grant-console.sql` (13 verificações em
  transação revertida). Incluído em `db:check:all`.

## UI

`CapabilityGrantsCard` em `/usuarios` (admin). Pré-valida com a mesma regra
para explicar a recusa antes do clique; o veredito que vale é o do servidor.
