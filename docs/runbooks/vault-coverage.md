# Runbook — Vault Coverage (Onda Fortress 6)

Verifica e remedia falhas na cobertura do envelope encryption do cofre de credenciais RTSP.

## Alarme

- **Origem:** view `public.camera_vault_coverage_alerts` (campo `severity`)
- **Severidades:**
  - `ok` — 100% envelopadas
  - `warn` — existem credenciais legadas, mas todas as envelopadas foram atualizadas nas últimas 24 h
  - `critical` — existem credenciais legadas há mais de 24 h sem migração

## Diagnóstico rápido

```sql
-- 1. Estado agregado
SELECT * FROM public.camera_vault_coverage_alerts;

-- 2. Estatística detalhada por versão de KEK
SELECT * FROM public.envelope_encryption_stats();

-- 3. Últimos 20 eventos do cofre
SELECT created_at, action, actor_role, success, error_code, affected_rows
  FROM public.camera_vault_audit
  ORDER BY created_at DESC LIMIT 20;

-- 4. Câmeras ainda em criptografia legada
SELECT camera_id, updated_at
  FROM public.camera_credentials
  WHERE dek_wrapped IS NULL
    AND encrypted_password IS NOT NULL
  ORDER BY updated_at ASC LIMIT 20;
```

## Remediação

1. **Aplicar backfill em lotes** (chamado pela UI, `EnvelopeEncryptionCard → Migrar 100 legadas`):
   ```bash
   curl -sS -X POST "$SUPABASE_URL/functions/v1/camera-credentials-vault" \
     -H "Authorization: Bearer $USER_JWT_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"action":"backfill_envelope","limit":200}'
   ```
2. Repetir até `remaining = 0`.
3. Validar auditoria:
   ```sql
   SELECT action, success, affected_rows, metadata, created_at
     FROM public.camera_vault_audit
    WHERE action = 'backfill_envelope'
    ORDER BY created_at DESC LIMIT 10;
   ```

## Rotação de KEK (rewrap_kek)

Use quando `CAMERA_VAULT_KEK_V1` for comprometida:

1. Provisione `CAMERA_VAULT_KEK_V2` (novo segredo).
2. Execute o rewrap em lotes:
   ```bash
   curl -sS -X POST "$SUPABASE_URL/functions/v1/camera-credentials-vault" \
     -H "Authorization: Bearer $USER_JWT_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"action":"rewrap_kek","new_kek":"<KEK_V2>","from_version":1,"to_version":2,"limit":500}'
   ```
3. Repetir até `remaining = 0` no retorno.
4. Trocar a variável `CAMERA_VAULT_KEK_V1` para o valor de `KEK_V2` e remover a versão antiga.

## Escalada

- `severity = critical` por > 30 min ⇒ acionar plantão de segurança.
- Chamadas do cofre com `success = false` em rajada ⇒ investigar rate-limit e tentativas de bypass RLS (`error_code = 'unauthorized' | 'forbidden_admin_only'`).

## Referências

- Migração: `supabase/migrations/*camera_vault_audit*`
- Edge Function: `supabase/functions/camera-credentials-vault/index.ts`
- UI: `src/components/security/VaultAuditTimeline.tsx`

## Watchdog automático (Onda Fortress 7)

- Edge Function: `vault-coverage-watchdog` (verify_jwt=false, invocada por `pg_cron` a cada 15 min).
- Dedup: 60 min entre alertas Telegram entregues com sucesso (`VAULT_WATCHDOG_DEDUP_MIN`).
- Toda execução grava `action='watchdog_tick'` (heartbeat) ou `action='watchdog_alert'` (entrega) em `camera_vault_audit`.

### Health-check manual

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/vault-coverage-watchdog" \
  -H "Content-Type: application/json" -d '{}'
```

### Silenciar temporariamente (janela de manutenção)

```sql
-- Pausa o job
UPDATE cron.job SET active = false WHERE jobname = 'vault-coverage-watchdog';
-- Reativa
UPDATE cron.job SET active = true  WHERE jobname = 'vault-coverage-watchdog';
```
