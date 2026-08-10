---
name: Hardening de funções SECURITY DEFINER
description: Regra de exposição de RPCs SECURITY DEFINER (anon revogado, guard has_role/auth.uid obrigatório) validada por npm run db:check:definer
type: constraint
---

Toda função `SECURITY DEFINER` no schema `public`:

- **Nunca** pode ter `EXECUTE` para `anon` ou `PUBLIC` (SECURITY DEFINER ignora RLS).
- Se for executável por `authenticated`, precisa de guard interno: `public.has_role(auth.uid(), 'admin')` para métricas globais/DBA, ou filtro por `auth.uid()` para dados de usuário.
- Funções que recebem `_user_id` como parâmetro devem incluir `AND (auth.uid() IS NULL OR _user_id = auth.uid())` — `auth.uid() IS NULL` libera apenas `service_role`/cron.
- Funções de trigger e rotinas de manutenção (`prune_*`, `purge_*`, `cleanup_*`, relay/agent) ficam só com `service_role`.

**Validação:** `npm run db:check:definer` (`scripts/check-definer-exposure.mjs`) falha o build se houver exposição a anon ou função sem guard.

**Índices de FK:** toda FK de coluna única precisa de índice no lado filho; colunas anuláveis esparsas usam índice parcial `WHERE col IS NOT NULL`.
