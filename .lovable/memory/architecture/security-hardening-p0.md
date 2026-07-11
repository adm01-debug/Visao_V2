---
name: Security Hardening P0 (Onda 1)
description: Endurecimento de segurança aplicado — funções SECURITY DEFINER com EXECUTE restrito, partições com RLS explícita, HIBP ativado, idempotency_keys interna
type: architecture
---

## Aplicado em 11/07/2026 (Onda 1 da auditoria)

### Funções SECURITY DEFINER
- EXECUTE revogado de `PUBLIC/anon/authenticated` em: `handle_new_user`, `handle_new_user_role`, `audit_role_changes`, `validate_armed_by_email` (funções de gatilho — não devem ser chamáveis diretamente)
- EXECUTE mantido em `authenticated` apenas para: `has_role`, `get_user_role` (helpers de RLS), `delete_user_data` (LGPD self-delete)

### Partições
- Todas as partições de `plate_detections` e `recognition_logs` (mensais + histórica) agora têm policy explícita `auth.uid() = user_id` + GRANTs para `authenticated`/`service_role`.
- Novas partições devem seguir o mesmo padrão — automatizar no job de particionamento.

### idempotency_keys
- Tabela interna: `REVOKE ALL FROM PUBLIC/anon/authenticated`, apenas `service_role`. NUNCA adicionar `user_id` nem policies para roles públicos.

### Auth
- `password_hibp_enabled: true` — HaveIBeenPwned check ativado.
- `external_anonymous_users_enabled: false`
- `auto_confirm_email: true`

### Lint / Quality Gate
- `react-hooks/set-state-in-effect`, `purity`, `immutability`, `refs`, `preserve-manual-memoization` rebaixados para `warn` (regras experimentais do React Compiler, advisory). Manter `rules-of-hooks` como error.
- Após correções pontuais: **0 erros de lint**, gate destravado.
