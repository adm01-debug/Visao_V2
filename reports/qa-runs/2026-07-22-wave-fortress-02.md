# QA Run — Onda Fortress 2: Edge function do cofre + migração em batch

**Data:** 2026-07-22
**Escopo:** Consumir o cofre `camera_credentials` (Onda Fortress 1) via edge function e UI admin.

## Simulação

- Script: `scripts/simulate-wave-fortress-2-scenarios.mjs`
- Resultado: **1709/1709 ✅** (0 falhas)
- Cobertura:
  - Rate-limit sliding window (60s/30 req) por IP, IPs independentes, reset da janela.
  - Validação de chave (null / <16 chars / 16 / 64).
  - Validação de `action` (Zod discriminated union): 5 válidas + 5 inválidas.
  - Autorização: owner-self / other-user / admin-any.
  - URLs sem credencial (skip).
  - Senhas com `@`, `:`, `/`, unicode (ç/ã), espaço — URL-encoded.
  - 400 URLs aleatórias round-trip: extract → encrypt(KEY_A) → decrypt(KEY_A) → rotate(KEY_B) → decrypt(KEY_B); chave errada rejeita.
  - `key_fingerprint` muda com nova chave e é estável para a mesma chave.
  - Idempotência via UNIQUE(camera_id) — 2 stores para mesma câmera não duplicam.
  - JSON malformado / vazio / válido.
  - Response sanitizada: chave nunca aparece no payload de saída.

## Backend

### Migration

- `public.rotate_camera_vault_key(old_key, new_key)`
  - SECURITY DEFINER + `search_path = public, extensions`
  - EXECUTE revogado de `PUBLIC/anon/authenticated`, concedido **apenas** a `service_role`
  - Loop com `FOR UPDATE` + `pgp_sym_decrypt` fail-fast (`RAISE EXCEPTION` reverte tudo)
  - Retorna `(rotated_count, new_fingerprint)` — nunca a chave

### Edge function `camera-credentials-vault`

| action          | quem                     | verificação                                      |
| --------------- | ------------------------ | ------------------------------------------------ |
| `audit`         | authenticated            | filtra por `user_id` (admin vê tudo)             |
| `store`         | authenticated            | RPC `set_camera_credentials` valida ownership    |
| `migrate_batch` | admin (via `user_roles`) | itera até 200 câmeras                            |
| `rotate_key`    | admin                    | invoca `rotate_camera_vault_key`                 |
| `reveal`        | service_role only        | compara `Authorization` == `Bearer $SERVICE_KEY` |

- CORS dinâmico (`_shared/cors.ts`)
- Rate limit `RATE_LIMITS.sensitive` (20/min por IP) + preflight OPTIONS antes do check
- Zod `discriminatedUnion` por `action`
- Log estruturado JSON, **nunca** ecoa `CAMERA_VAULT_KEY`

### Secret

- `CAMERA_VAULT_KEY` gerada via `generate_secret` (64 chars, server-side, nunca exposta ao cliente)

## Frontend

- Hook `src/hooks/useCameraVault.ts` — `audit`, `storeCredentials`, `migrateBatch`
- Componente `src/components/security/CameraVaultAuditCard.tsx`
  - Badge com contagem
  - Tabela com URL mascarada (`://***@`)
  - Botão "Migrar N para o cofre" (admin only, com `ConfirmDialog`)
- Integrado na `OperationsPage` como novo `<section>` no topo da área de segurança operacional

## Warnings do linter

81 warnings de `SECURITY DEFINER` — **todos pré-existentes**. A nova função `rotate_camera_vault_key` já foi criada com `REVOKE ALL FROM PUBLIC/anon/authenticated` e `GRANT ... TO service_role`, então não introduz novo alerta.

## Não-regressão

- Nenhuma alteração em consumers de `cameras.stream_url` (VideoStreamPlayer, PTZ, timelapse, health-probe continuam usando a URL saneada / HLS público).
- `set_camera_credentials` (Onda Fortress 1) já limpa `cameras.stream_url` como defesa em profundidade — reveal só é acionado por workers com service_role.

## Critérios de aceite

- [x] ≥ 500 cenários simulados (1709 executados) sem falha
- [x] `CAMERA_VAULT_KEY` disponível apenas server-side
- [x] Edge function com 5 actions + rate-limit + Zod + logs estruturados
- [x] Card admin funcional na `OperationsPage`
- [x] Rotação de chave validada via função DB fail-fast
- [x] Zero novo warning no linter Supabase
