# QA Run — Onda Fortress 1: Cofre de Credenciais RTSP

**Data:** 2026-07-22
**Escopo:** Separar credenciais RTSP do `stream_url` e criptografá-las com pgcrypto.

## Simulação
- Script: `scripts/simulate-wave-fortress-1-scenarios.mjs`
- Resultado: **948/948 ✅** (0 falhas)
- Cobertura: extração (`user:pass@`), URLs sem creds, senhas com `:` e `@` URL-encoded, IPv4/porta/query-string, 300 URLs geradas aleatoriamente, round-trip encrypt/decrypt lógico, idempotência de sanitização, RLS lógico por `user_id`.

## Backend
### Tabela `camera_credentials`
- Colunas: `camera_id (UNIQUE)`, `user_id`, `username`, `encrypted_password bytea`, `sanitized_url`, `key_fingerprint`.
- RLS: 4 policies por `auth.uid() = user_id`.
- GRANT **coluna-a-coluna**: `authenticated` NÃO recebe SELECT em `encrypted_password` (apenas `service_role`).

### Funções
| Função | Segurança | Grants |
|---|---|---|
| `extract_url_credentials(text)` | IMMUTABLE (invoker) | authenticated, service_role |
| `set_camera_credentials(uuid,text,text)` | SECURITY DEFINER | authenticated, service_role |
| `get_camera_stream_url(uuid,text)` | SECURITY DEFINER | **apenas** service_role |
| `audit_cameras_embedded_credentials()` | SECURITY DEFINER STABLE | authenticated, service_role |

- `set_camera_credentials` valida ownership (`user_id = auth.uid()` ou `admin`), extrai `user:pass` da URL, criptografa com `pgp_sym_encrypt` e **limpa o `stream_url` original** (defesa em profundidade).
- `get_camera_stream_url` requer key match via SHA-256 fingerprint (rejeita chave errada com `key mismatch` sem vazar dados).
- Auditoria retorna URL mascarada (`://***@`), nunca a senha em claro.

## Não-regressão
- Nenhuma alteração de tabelas existentes além do `UPDATE cameras.stream_url` disparado só no fluxo explícito `set_camera_credentials`.
- Consumidores atuais que leem `cameras.stream_url` continuam funcionando (URL saneada é reprodutível pelo worker via `get_camera_stream_url` + `SUPABASE_SERVICE_ROLE_KEY`).

## Warnings do linter
81 warnings de `SECURITY DEFINER` — **todos pré-existentes** de ondas anteriores. As 3 novas funções seguem o padrão já auditado (Onda 1 de Security Hardening).

## Próximo passo
Onda Fortress 2 — Edge function `camera-credentials-vault` que:
1. Recebe URL do frontend, chama `set_camera_credentials` com key vinda de `Deno.env.get('CAMERA_VAULT_KEY')`.
2. Migra em batch as câmeras listadas por `audit_cameras_embedded_credentials`.
