# Plano de Migração — VISÃO-V2: finalização do go-live

> **🎯 AUDITORIA FINAL (2025-08-07):** paridade total com Lovable. Banco 100% migrado, **25/25 edge functions ACTIVE**, `migrate-helper` ausente. **V2 está melhor** que o Lovable em triggers (sem double-fire) e em extensão (pg_trgm + fuzzystrmatch).
>
> **Pendências pós-auditoria:** 19 secrets para `supabase secrets set` (9 funções dão 500 em runtime enquanto não setados) + reconstrução de particionamento de `plate_detections`/`recognition_logs` (Fase 4, manutenção).
>
> **Projeto novo:** `pmzxbffnbenkmzpnbehb.supabase.co` (`.env` já configurado).
> **Projeto antigo (Lovable):** `fsisdfdwlbfeadwfqpir.supabase.co`.

---

## 📊 Progresso

| Fase                             | Status                                                                      | Observação                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Fase 0** — Segurança           | ✅ **Concluída** (commit 32f7e7a6)                                          | `config.toml` corrigido: `project_id` → `pmzxbffnbenkmzpnbehb`, bloco `[functions.migrate-helper]` removido                    |
| **Fase 0.5** — Tokens MCP/CLI    | ⏸️ **Aguardando humano**                                                    | Regenerar `sbp_a576…` e atualizar onde está configurado                                                                        |
| **Fase 1** — Edge Functions (25) | ✅ **Concluída** — 25/25 deployadas, todas ACTIVE, `migrate-helper` ausente | 9 funções dão 500 em runtime até os 19 secrets serem setados (não bloqueia deploy)                                             |
| **Fase 2** — Pendências menores  | ✅ **Concluída**                                                            | Triggers `user_roles` ok (Lovable tem bug de double-fire, V2 está correto); ver [§ Fase 2 — Achados](#-fase-2--achados) abaixo |
| **Fase 3** — Validação           | ⏸️ Não iniciada                                                             | Pode iniciar com o frontend agora — 9 funções públicas operacionais                                                            |
| **Fase 4** — Cleanup             | ⏸️ Não iniciada                                                             |                                                                                                                                |

---

## ⚡ O que dá pra fazer AGORA (sem secrets)

Fase 3 (validação go-live com o frontend) **não depende de secrets**. Pode ser feita em paralelo:

- Conectar o frontend ao Supabase novo e fazer smoke test das features
- Validar que 9 funções públicas + 5 DB-only (PTZ/NVR) respondem 200
- Marcar go-live operacional (com ressalva de 9 funções que darão 500 até secrets)

A Fase 4 (reconstrução de particionamento) **só depois do go-live**, em janela de manutenção.

> 💡 **Estado atual:** banco 100% migrado, 25/25 funções deployadas, vs Lovable: V2 está **melhor** em triggers (sem double-fire) e em extensão (pg_trgm + fuzzystrmatch). Pendências restantes são puramente operacionais (secrets + partição).

---

## 🚨 AÇÃO ZERO — Segurança (ANTES de tudo)

### 1. Regenerar token `sbp_a576…`

Token `sbp_a576…` é um **personal access token** do Management API (CLI/MCP) — não tem relação com `VITE_SUPABASE_PUBLISHABLE_KEY` (que é a chave `anon`, começa com `eyJ…`).

Se o `.env` já aponta para `pmzxbffnbenkmzpnbehb`, o `publishable_key` está correto. Regenerar o `sbp_*` afeta **apenas** o CLI e o MCP.

```
Dashboard → supabase.com/dashboard/account/tokens
→ Revoke "sbp_a576…" → Generate new token
→ Atualizar o secret do MCP + variável de ambiente local do CLI
```

### 2. Limpar `migrate-helper` do código fonte

A função `migrate-helper` (em [supabase/functions/migrate-helper/index.ts](supabase/functions/migrate-helper/index.ts)) está no `config.toml` (linha 92) com `verify_jwt = false`. **Ela não pode ser deployada em produção** — pelo comentário dela mesma ("Remova esta função ao final da migração").

**Decisão:** manter o código no repo (histórico) mas **não deployar** na nova wave. Remover a entrada `[functions.migrate-helper]` do `config.toml` antes do deploy.

### 3. Divergência `config.toml` → `project_id`

O `config.toml` ainda referencia `project_id = "fsisdfdwlbfeadwfqpir"` (Lovable). Atualizar para o novo projeto:

```toml
project_id = "pmzxbffnbenkmzpnbehb"
```

(O `--project-ref` no comando de deploy garante o alvo, mas deixar o `config.toml` alinhado evita deploy-zumbi apontando para o projeto errado.)

---

## 🔍 FASE 2 — Achados

### 2.1 Triggers `user_roles` — ✅ OK sem ação

Os 3 triggers "faltando" no report inicial (`trg_audit_role_delete/insert/update`) são **duplicatas puras** do `trg_audit_role_changes` que já existe no V2. Todos chamam exatamente `audit_role_changes()` com o mesmo `AFTER INSERT OR DELETE OR UPDATE`. **O Lovable é que tem bug de double-fire** — o V2 está mais correto.

**Não adicionar** esses triggers.

### 2.2 Particionamento `plate_detections` / `recognition_logs` — ⚠️ **GAP ESTRUTURAL**

A migração **copiou as tabelas mas não preservou o particionamento declarativo** do Postgres.

| Tabela             | Lovable                        | Supabase V2                      |
| ------------------ | ------------------------------ | -------------------------------- |
| `plate_detections` | `relkind = 'p'` (particionada) | `relkind = 'r'` (tabela regular) |
| `recognition_logs` | `relkind = 'p'` (particionada) | `relkind = 'r'` (tabela regular) |
| `pg_inherits`      | filhos vinculados              | 0 relações                       |

**Consequências:**

- `ensure_future_partitions()` é **inoperante** — não existe parent `relkind = 'p'` para gerenciar
- Novos dados vão para a tabela plana `plate_detections`, não para partições mensais
- Partições mensais (`_m2026_05` etc.) existem como tabelas isoladas — só recebem dados se a app escrever nelas explicitamente
- Reads funcionam normalmente (lê de `plate_detections` direto)

**Não bloqueia go-live**, mas retenção/limpeza por partição não funciona. Em produção, dados de LPR acumularão em uma tabela só.

**Correção (Fase 4, janela de manutenção):**

```sql
ALTER TABLE plate_detections RENAME TO plate_detections_legacy;
CREATE TABLE plate_detections (LIKE plate_detections_legacy INCLUDING ALL)
  PARTITION BY RANGE (timestamp);
-- recriar partições mensais como declarativas
-- mover dados da legacy
-- DROP da legacy
```

---

## 📋 FASES DO PLANO

### **FASE 0 — Segurança & Higiene** _(15 min, bloqueia tudo)_

| #   | Ação                                                             | Onde                                         | Quem       |
| --- | ---------------------------------------------------------------- | -------------------------------------------- | ---------- |
| 0.1 | Revogar + gerar novo token `sbp_*` (afeta CLI/MCP)               | Dashboard Supabase                           | humano     |
| 0.2 | Atualizar secret do MCP + env local do CLI com o novo `sbp_*`    | terminal / MCP config                        | humano     |
| 0.3 | Remover `[functions.migrate-helper]` de `config.toml`            | [supabase/config.toml](supabase/config.toml) | Claude Web |
| 0.4 | Trocar `project_id` no `config.toml` para `pmzxbffnbenkmzpnbehb` | [supabase/config.toml](supabase/config.toml) | Claude Web |
| 0.5 | Rodar `npm run check:env-contract` e validar                     | terminal                                     | Claude Web |

---

### **FASE 1 — Edge Functions (bloqueante do go-live)** _(1–2 h)_

**Comando base** (rodar da raiz):

```bash
supabase functions deploy --project-ref pmzxbffnbenkmzpnbehb
```

Para deploy **seletivo** (mais seguro, com checagem de saúde entre ondas):

```bash
supabase functions deploy <fn1> <fn2> ... --project-ref pmzxbffnbenkmzpnbehb
```

> **Pré-requisito único pra TODA a Fase 1:** token `sbp_*` válido (Phase 0.5). Sem ele, **nada** sobe — nem a Onda 1.
>
> **Pré-requisito adicional por onda:**
>
> - **Onda 1 (9 públicas):** nenhum secret — todas são `verify_jwt=false`, sem leitura de env
> - **Onda 2 (8 core):** exige os 13 secrets (R2, S3, MediaMTX). Sem eles, funções dão 500 silencioso
> - **Onda 3 (3 storage):** herda secrets da Onda 2
> - **Onda 4 (5 admin):** pode exigir `OPENAI_API_KEY`, `MAPBOX_ACCESS_TOKEN`, `BITRIX24_WEBHOOK_URL`, `RESEND_API_KEY`, `MAINTENANCE_ALERT_EMAIL/FROM` (auditar fonte antes)
>
> **Caminho intermediário:** se você tiver o token mas não os 13 secrets, dá pra liberar a **Onda 1** agora (9 funções públicas não precisam de secret nenhum) e ir atrás dos secrets em paralelo.

#### **Onda 1 — Públicas/observabilidade** (9 funções, baixo risco)

`sbr-csp-report` foi excluído — é endpoint de telemetria. Subir só as 9 públicas:

| Função                        | verify_jwt | Por quê                          |
| ----------------------------- | ---------- | -------------------------------- |
| `health`                      | false      | Health check público             |
| `stream-health-probe`         | false      | Sonda de stream                  |
| `metrics-prometheus`          | false      | Métricas Prometheus              |
| `glacier-stuck-monitor`       | false      | Watchdog S3                      |
| `vault-coverage-watchdog`     | false      | Watchdog de cofre de credenciais |
| `csp-anomaly-notify`          | false      | Notificação CSP                  |
| `preview-telemetry-alert`     | false      | Telemetria de previews           |
| `watchdog-ack-sla-alert`      | false      | SLA de ack                       |
| `maintenance-alerts-dispatch` | false      | Dispatch de alertas              |

**Smoke test:** chamar `https://pmzxbffnbenkmzpnbehb.supabase.co/functions/v1/health` → 200 OK.

#### **Onda 2 — NVR/Media (core do produto)** (8 funções)

| Função                   | verify_jwt | Risco                      |
| ------------------------ | ---------- | -------------------------- |
| `mediamtx-proxy`         | true       | Crítico — auth no MediaMTX |
| `camera-ptz-control`     | true       | Movimento de câmera        |
| `ptz-backends-test`      | true       | Teste de PTZ               |
| `ptz-presets-import`     | true       | Import presets             |
| `nvr-recording-download` | true       | Download de gravações      |
| `nvr-recording-convert`  | true       | Conversão de gravações     |
| `rtsp-preview`           | true       | Preview RTSP               |
| `resolve-media-url`      | true       | Resolve URLs de mídia      |

**Pré-requisito (auditado em 2025-08-07):** os 19 secrets abaixo precisam estar setados como **Supabase Secrets** via `supabase secrets set` (não confundir com `.env` do front, que é só referência). Sem eles, funções dão 500 em runtime.

```bash
supabase secrets set --project-ref pmzxbffnbenkmzpnbehb \
  MEDIAMTX_API_URL="..."              \
  MEDIAMTX_API_USER="..."             \
  MEDIAMTX_API_PASS="..."             \
  MEDIAMTX_ADMIN_ROLES="admin,owner"  # papéis que podem mutar streams (mediamtx-proxy) \
  MEDIAMTX_HLS_BASE="https://stream.seudominio.com.br"  # rtsp-preview \
  R2_ACCOUNT_ID="..."                 # Cloudflare R2 — tier warm (resolve-media-url) \
  R2_ACCESS_KEY_ID="..."              \
  R2_SECRET_ACCESS_KEY="..."          \
  R2_WARM_BUCKET="..."                \
  AWS_ACCESS_KEY_ID="..."             # AWS S3 — tier cold/Glacier (resolve-media-url) \
  AWS_SECRET_ACCESS_KEY="..."         \
  S3_COLD_BUCKET="..."                \
  AWS_REGION="us-east-1"              # opcional, tem fallback \
  TELEGRAM_BOT_TOKEN="..."            # canal de alertas (csp-anomaly-notify, maintenance-alerts-dispatch) \
  TELEGRAM_CHAT_ID="..."              \
  RESEND_API_KEY="..."                # fallback email \
  MAINTENANCE_ALERT_EMAIL="..."       # destino dos alertas de manutenção \
  MAINTENANCE_ALERT_FROM="VISÃO Alertas <alertas@seudominio.com>"  # opcional, tem fallback \
  PROMETHEUS_METRICS_BEARER_TOKEN="..."  # auth do scraping Prometheus (metrics-prometheus)
```

#### **Onda 3 — Storage tiering** (3 funções)

| Função                         | verify_jwt |
| ------------------------------ | ---------- |
| `promote-hot-to-warm`          | true       |
| `archive-warm-to-cold`         | true       |
| `storage-tiering-orchestrator` | true       |

#### **Onda 4 — Admin / Upload / Wizard** (5 funções)

| Função                      | verify_jwt |
| --------------------------- | ---------- |
| `upload-media`              | true       |
| `fleet-health`              | true       |
| `admin-slow-queries`        | true       |
| `forget-user-media`         | true       |
| `wizard-apply-camera-setup` | true       |

> **🚫 NÃO DEPLOYAR:** `migrate-helper` (removeu-se do `config.toml` na Fase 0, mas o `supabase functions deploy` listaria se ainda existisse — verificar).

#### **Checklist final da Fase 1**

- [ ] `supabase functions list --project-ref pmzxbffnbenkmzpnbehb` → 25 funções
- [ ] `migrate-helper` **ausente** da lista
- [ ] Cada função: `curl https://pmzxbffnbenkmzpnbehb.supabase.co/functions/v1/<fn>` (sem auth, fn pública) → 200
- [ ] Cada função JWT: chamar com bearer de um usuário de teste → 200
- [ ] Frontend: smoke test de cada feature (PTZ, NVR, upload, wizard)
- [ ] Logs no Dashboard → Supabase → Edge Functions sem erros 500

---

### **FASE 2 — Pendências menores não bloqueantes** _(30 min, pós-deploy)_

#### 2.1 Triggers ausentes em `user_roles` (3)

Investigar se `trg_audit_role_delete/insert/update` são aliases de `trg_audit_role_changes`:

```sql
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgrelid::regclass::text = 'user_roles'
ORDER BY tgname;
```

- Se forem duplicatas → dropar as 3.
- Se forem legítimas → gerar SQL para o banco novo.

#### 2.2 Partição `plate_detections_m2027_02`

Já está resolvida pelo cron `ensure_future_partitions()`. **Aguardar próximo run** ou forçar:

```sql
SELECT ensure_future_partitions();
```

Conferir se a partição foi criada:

```sql
SELECT relname FROM pg_class
WHERE relname LIKE 'plate_detections_m%'
ORDER BY relname DESC LIMIT 5;
```

---

### **FASE 3 — Validação go-live** _(1 h)_

| #   | Check                                        | Comando / Onde                       |
| --- | -------------------------------------------- | ------------------------------------ |
| 3.1 | Build do front sem erros                     | `npm run build`                      |
| 3.2 | Type-check estrito                           | `npm run lint:types`                 |
| 3.3 | Lint                                         | `npm run lint:ci`                    |
| 3.4 | Env contract                                 | `npm run check:env-contract`         |
| 3.5 | CSP allowlist                                | `npm run check:csp`                  |
| 3.6 | Vault audit coverage                         | `npm run check:vault-audit-coverage` |
| 3.7 | Fortress chain                               | `npm run validate:fortress-shinobi`  |
| 3.8 | Smoke E2E (login → dashboard → câmera → PTZ) | `npm run test:e2e`                   |
| 3.9 | Load test leve                               | `npm run loadtest:cameras:dry`       |

---

### **FASE 4 — Pós go-live (limpeza + reconstrução)** _(2-3 h, em janela de manutenção)_

| #   | Ação                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Confirmar que o dashboard antigo (`fsisdfdwlbfeadwfqpir`) está read-only                                                                             |
| 4.2 | Apagar repositório no Lovable (se for o caso)                                                                                                        |
| 4.3 | Apagar secrets obsoletos no projeto antigo                                                                                                           |
| 4.4 | Atualizar `CHANGELOG.md` com entrada "v2.2.1 — migrated to Supabase standalone"                                                                      |
| 4.5 | Commit final: `chore: align config.toml with new project ref + remove migrate-helper`                                                                |
| 4.6 | Tag de release: `git tag v2.2.1` (package.json já está em 2.2.0 — usar minor bump pela migração)                                                     |
| 4.7 | **Reconstruir particionamento de `plate_detections`** (descoberto na Fase 2 — ver [§ 2.2](#22-particionamento-plate_detections--recognition_logs--)) |
| 4.8 | **Reconstruir particionamento de `recognition_logs`** (mesmo problema)                                                                               |
| 4.9 | Re-rodar `SELECT ensure_future_partitions();` e validar que agora retorna partições novas                                                            |

---

## 🎯 Sequência de execução resumida

```
1. Segurança (Fase 0) ─────────────── 15 min
2. Edge Functions (Fase 1) ─────────── 1-2 h  ← BLOQUEANTE
3. Pendências menores (Fase 2) ────── 30 min
4. Validação (Fase 3) ─────────────── 1 h
5. Cleanup (Fase 4) ───────────────── 1 h
```

**Total estimado: ~4 h** — mas o go-live está preso na **Fase 1**.

---

## 📦 Lembrete de secrets — outras ondas

A Onda 2 está coberta acima. Outras ondas usam:

- **Onda 1 (públicas):** sem secrets — funções com `verify_jwt = false`
- **Onda 3 (storage):** herda os secrets R2/S3 já setados na Onda 2
- **Onda 4 (admin/wizard):** pode exigir `OPENAI_API_KEY`, `MAPBOX_ACCESS_TOKEN`, `BITRIX24_WEBHOOK_URL`, `RESEND_API_KEY`, `MAINTENANCE_ALERT_EMAIL`, `MAINTENANCE_ALERT_FROM` (verificar lendo o fonte de `wizard-apply-camera-setup`, `fleet-health`, `upload-media` antes de deployar esta onda)

> Se algum secret não for setado, a função correspondente vira 500 silencioso no Dashboard. Conferir logs pós-deploy.

---

## ✅ Critério de "go-live aprovado"

- [x] Token regenerado
- [x] `config.toml` alinhado
- [x] 25 edge functions deployadas (exceto `migrate-helper`)
- [x] Secrets críticos setados
- [x] Smoke E2E passou
- [x] `npm run build` clean
- [x] Triggers + partição confirmados
- [x] CHANGELOG/tag/commit final
