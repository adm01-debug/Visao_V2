# 04 — DADOS (Supabase / PostgreSQL)

> Auditoria da dimensão DADOS. Escopo: `supabase/migrations/` (361 arquivos), `supabase/seed*.sql`,
> `supabase/*.sql`, `supabase/config.toml`, `src/integrations/supabase/`.
> Base factual: [`_FATOS_RUNTIME.md`](_FATOS_RUNTIME.md) (medições de produção de 2026-08-16).
> Medições adicionais desta auditoria feitas em `pg_class` / `pg_inherits` / `cron.job` do projeto
> `pmzxbffnbenkmzpnbehb`, somente leitura, em 2026-08-16.

**Legenda:** ✅ medido e íntegro · 🟨 medido, com risco · ⬛ medido, quebrado · 🟦 sem evidência (não verificável a partir do repositório)

---

## ⬛ VEREDITO: o ambiente NÃO é reconstruível a partir do repositório

Três provas independentes, cada uma suficiente sozinha:

| #   | Prova                                                                                                                                                                                                                                                                             | Evidência                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **O banco nunca foi construído pelas migrations.** O repo versiona 361 arquivos; `supabase_migrations.schema_migrations` tem **3 linhas**, todas de 2026-07-31 (auditoria/fix), nenhuma correspondendo à criação do schema                                                        | `_FATOS_RUNTIME.md:14-19`                                                                                                                                                                                                   |
| 2   | **`supabase db push` falharia num banco limpo.** 3 tabelas vivas (`profiles`, `query_telemetry`, `behavior_analyses`) nunca recebem `CREATE TABLE` em migration alguma, mas 19 comandos `ALTER TABLE` / `CREATE INDEX` / `CREATE POLICY` operam sobre elas                        | `20260404155413_…sql:137` (`CREATE INDEX … ON public.profiles`), `20260404164601_…sql:49` (`… ON public.query_telemetry`), `20260712200455_…sql:2` (`ALTER TABLE public.query_telemetry ALTER COLUMN user_id SET NOT NULL`) |
| 3   | **A arquitetura central declarada no repo não existe em produção.** O repo declara `plate_detections` e `recognition_logs` como `PARTITION BY RANGE`; o banco tem **0 tabelas particionadas** (`relkind='p'`) e **0 partições anexadas** (`pg_inherits` vazio no schema `public`) | `20260513180019_…sql:17,33` vs. medição em `pg_class`/`pg_inherits`                                                                                                                                                         |

Não há evidência de dump/restore versionado: `grep -riE 'pg_dump\|pg_restore\|--schema-only\|COPY … FROM stdin'` em `supabase/` retorna **zero** ocorrências. Não há `schema.sql` nem baseline.

**O que existe** é `docs/MIGRATION_PLAN.md`, que documenta a migração Lovable→Supabase e admite explicitamente a pendência (`MIGRATION_PLAN.md:3`):

> "Pendências pós-auditoria: … + **reconstrução de particionamento de `plate_detections`/`recognition_logs` (Fase 4, manutenção)**"
> "Projeto novo: `pmzxbffnbenkmzpnbehb.supabase.co`. Projeto antigo (Lovable): `fsisdfdwlbfeadwfqpir.supabase.co`."

O plano classifica a **Fase 4 — Cleanup** como "⏸️ Não iniciada" (`MIGRATION_PLAN.md:24`). A medição confirma: não foi iniciada.

---

## 1. ⬛ Drift de migrations

### 1.1 O commit único

| Fato                                     | Valor                                                                         | Evidência                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Commits no repositório                   | 603                                                                           | `git rev-list --count HEAD`                 |
| Commits que tocam `supabase/migrations/` | **1**                                                                         | `git log --oneline -- supabase/migrations/` |
| Esse commit                              | `e9bc5c4` "feat: Migração Banco Lovable para Supabase Visão - V2", 2026-08-10 | `git log -1 e9bc5c4`                        |
| Tamanho do commit                        | 2.959 arquivos, 635.978 inserções                                             | `git show --stat e9bc5c4`                   |

As 361 migrations não são um histórico incremental — são um **despejo único** de um branch, importado de uma vez. O repositório nunca observou a evolução do schema; ele recebeu o resultado final já pronto.

### 1.2 Faixas de data e convenção quebrada

| Faixa                  | Arquivos      | Convenção                                                                                                    |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `00001`–`00003`        | 3             | sequencial (`00001_consolidated_all_gaps.sql`, `00002_storage_buckets.sql`, `00003_notification_config.sql`) |
| 2025-12                | 15            | mista: 7 UUID + 8 data curta (`20251219_zones.sql`, `20251220_ppe_heatmap_tables.sql`)                       |
| 2026-01 / 03 / 04 / 05 | 32            | UUID (padrão Lovable)                                                                                        |
| **2026-07**            | **307 (85%)** | UUID                                                                                                         |
| 2026-08                | 4             | `timestamp_snake_case` (`20260808143000_fix_get_operational_metrics_remove_role_check.sql`)                  |

**Quatro convenções coexistem** no mesmo diretório:

| Padrão                                           | Qtd | Exemplo                                                   |
| ------------------------------------------------ | --- | --------------------------------------------------------- |
| `YYYYMMDDHHMMSS_<uuid>` (gerado pelo Lovable)    | 348 | `20260513180019_1b004e60-d0e7-408f-bb40-a38563dc6aa4.sql` |
| `YYYYMMDD_<nome>` (sem hora — ordenação ambígua) | 6   | `20251219_clips.sql`                                      |
| `YYYYMMDDHHMMSS_<snake_case>` (humano)           | 4   | `20260810170000_notification_configs_user_id.sql`         |
| `000NN_<nome>` (sequencial)                      | 3   | `00001_consolidated_all_gaps.sql`                         |

O prefixo `00001_consolidated_all_gaps.sql` (443 linhas, cria 12 tabelas) sugere uma tentativa de consolidação/baseline, mas **ela não substituiu nada**: as tabelas que ele cria são recriadas até 3× mais adiante (ver §4). É um baseline que foi somado, não aplicado.

O pico de 307 arquivos em julho/2026 concentra-se em poucos dias — 63 em 26/07, 51 em 17/07, 44 em 28/07 — ritmo de geração automática, não de release.

### 1.3 O gate de CI valida texto, não banco

`npm run check:migrations` (`package.json:97` → `scripts/lint-migrations.mjs`) roda em `.github/workflows/ci.yml:44` e `pr-test-suite.yml:67`. Ele é um **linter estático de texto**: acumula estado lendo os arquivos em ordem alfabética (`lint-migrations.mjs:7-11`) e nunca abre conexão com banco. Por isso o drift de 361→3 passou por 603 commits sem alarme.

O único caminho de aplicação é `supabase db push` (`package.json:46-47`, `scripts/db-migrate.sh:9`) — **não referenciado em nenhum workflow de CI**.

---

## 2. ⬛ Drift de objetos nos dois sentidos

### 2.1 Aritmética das tabelas

| Medida                                                                          | Valor   |
| ------------------------------------------------------------------------------- | ------- |
| Ocorrências de `CREATE TABLE` nas 361 migrations                                | 209     |
| Nomes distintos capturados                                                      | 175     |
| — falsos positivos (`public` de `format('… public.%I …')`, `for` de comentário) | −2      |
| — declarações estáticas de partição (`*_m2026_*`, `*_y2025_y2026_pre`)          | −20     |
| **Tabelas-base distintas declaradas no repo**                                   | **153** |
| Tabelas vivas nomeadas (169 − 22 órfãs de partição)                             | 147     |

### 2.2 Declaradas no repo mas AUSENTES no banco — 9 de 153 (5,9%)

Nenhuma delas tem `DROP TABLE` em migration alguma (verificado nos 361 arquivos). São features escritas que nunca chegaram a produção:

| Tabela                        | Declarada em                           |
| ----------------------------- | -------------------------------------- |
| `analysis_sessions`           | `00001_consolidated_all_gaps.sql:75`   |
| `continuous_analysis_configs` | `00001_consolidated_all_gaps.sql:50`   |
| `notification_history`        | `00003_notification_config.sql:59`     |
| `notification_templates`      | `00003_notification_config.sql:93`     |
| `camera_snapshots`            | `20251219_streaming_support.sql:172`   |
| `stream_stats`                | `20251219_streaming_support.sql:127`   |
| `recording_sessions`          | `20251219_clips.sql:146`               |
| `rule_violations`             | `20251219_continuous_analysis.sql:226` |
| `heatmap_data`                | `20251220_ppe_heatmap_tables.sql:137`  |

Todas as 9 vêm dos arquivos mais antigos (`00001`–`00003` e dez/2025), ou seja: o **baseline consolidado descreve um schema que produção nunca teve**.

### 2.3 No banco mas NÃO declaradas no repo — 3 de 147 (2,0%), todas com dados reais

| Tabela              | Linhas em prod | Situação no repo                                                                                                                                 |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `behavior_analyses` | 100            | **Zero ocorrências** em `supabase/migrations/`. Existe apenas em `supabase/seed_behavior.sql` e `src/components/behavior/useBehaviorAnalysis.ts` |
| `profiles`          | 1              | Citada em 9 arquivos (13 `… ON public.profiles`), **sem `CREATE TABLE`**                                                                         |
| `query_telemetry`   | 24             | Citada em 12 arquivos (6 `ALTER TABLE`, 6 policies/índices), **sem `CREATE TABLE`**                                                              |

`profiles` e `query_telemetry` são o caso mais grave: migrations que **alteram** tabelas que elas mesmas nunca criam. Num banco limpo, `supabase db push` aborta em `20260404155413_…sql:137`.

### 2.4 Drift dos demais objetos

| Objeto        | Declarado nas migrations                                                                    | Vivo em produção | Leitura                                          |
| ------------- | ------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| Funções       | 463 `CREATE [OR REPLACE] FUNCTION`                                                          | 386              | 🟦 não comparável 1:1 (`OR REPLACE` repete)      |
| Triggers      | 143 `CREATE TRIGGER` (53 `DROP … IF EXISTS`)                                                | 113              | 🟨                                               |
| Policies RLS  | 609 `CREATE POLICY` (244 `DROP … IF EXISTS`)                                                | 406              | 🟨                                               |
| Índices       | 480 `CREATE INDEX`                                                                          | —                | 🟦 não medido em prod                            |
| **Cron jobs** | 5 nomes literais em `cron.schedule('…')`; **48 dos 69 nomes vivos aparecem em algum texto** | **69 ativos**    | ⬛ **21 jobs vivos (30%) sem declaração alguma** |

Os 21 jobs de produção que **não existem em nenhum arquivo do repositório**:

```
close-stale-dwell-sessions          connectivity-resolution-alert-hourly
cron-watchdog-30m                   cron-watchdog-escalate-30m
daily-retention-cleanup             deliverability-alerts-hourly
detect-stale-ingest-publishers      escalate-stale-maintenance-alerts
evaluate-dwell-alerts               evaluate-vehicle-recurrence
glacier-stuck-monitor-15min         monitoring-center-dispatch-every-minute
purge-dispatch-suppressions         relay-lease-reaper
storage-tiering-orchestrator-15min  stream_health_probe_every_2m
vault-coverage-watchdog             visao-csp-anomaly-notify
visao-db-health-snapshot            visao-monthly-index-maintenance
watchdog-ack-sla-alert-hourly
```

Esses 21 jobs rodam sozinhos — parte dos 18.177 disparos/24h medidos em `_FATOS_RUNTIME.md:24` — e desapareceriam num rebuild a partir do repo.

---

## 3. ⬛ Tabelas vazias com investimento pesado — o retrato das features dormentes

Das 169 tabelas, **108 estão vazias** (`_FATOS_RUNTIME.md:63`): 86 nomeadas + 22 órfãs de partição.

**As 86 tabelas vazias nomeadas têm `CREATE TABLE` próprio no repo: 86/86 (100%).** Nenhuma é acidental.

### 3.1 Esforço declarado: vazias vs. em uso

| Grupo      | Tabelas | Policies | Índices | Triggers | ALTER | **Total de objetos** | Linhas em prod |
| ---------- | ------- | -------- | ------- | -------- | ----- | -------------------- | -------------- |
| **Vazias** | 86      | 261      | 238     | 71       | 194   | **764**              | **0**          |
| Com dados  | 61      | 218      | 219     | 61       | 187   | 685                  | ~137.000       |

**O código declarado para tabelas com zero linhas excede em 12% o declarado para todas as tabelas que sustentam o produto.** Por tabela: 8,9 objetos na vazia contra 11,2 na ativa — as dormentes foram construídas com quase o mesmo cuidado das reais.

### 3.2 As 15 maiores dormentes

| Esforço | Tabela                              | Policies | Índices | Triggers | ALTER | Arquivos | `CREATE TABLE`                        |
| ------: | ----------------------------------- | -------: | ------: | -------: | ----: | -------: | ------------------------------------- |
|      33 | `video_clips`                       |       10 |      15 |        1 |     7 |        9 | `00001_consolidated_all_gaps.sql:177` |
|      27 | `stream_recordings`                 |        9 |       8 |        1 |     9 |        8 | `20251219_streaming_support.sql:70`   |
|      27 | `recording_configs`                 |       10 |       4 |        2 |    11 |        9 | `00001_consolidated_all_gaps.sql:148` |
|      25 | `face_recognition_configs`          |       10 |       3 |        2 |    10 |       10 | `00001_consolidated_all_gaps.sql:288` |
|      22 | `agent_relay_tasks`                 |        3 |       5 |        1 |    13 |        6 | `20260723145152_…sql:2`               |
|      21 | `rule_executions`                   |        8 |      11 |        0 |     2 |       10 | `20260107162747_…sql:2`               |
|      19 | `arm_disarm_states`                 |        8 |       4 |        3 |     4 |        9 | `20260315204921_…sql:28`              |
|      17 | `vehicles`                          |        8 |       3 |        2 |     4 |        6 | `20260315195956_…sql:5`               |
|      16 | `media_assets`                      |        4 |       7 |        2 |     3 |        3 | `20260717193527_…sql:19`              |
|      15 | `agent_healing_actions`             |        2 |       1 |        0 |    12 |        3 | `20260726170712_…sql:42`              |
|      14 | `heatmap_snapshots`                 |        8 |       4 |        0 |     2 |        6 | `20251220_ppe_heatmap_tables.sql:167` |
|      14 | `device_remote_commands`            |        3 |       4 |        1 |     6 |        3 | `20260728133707_…sql:2`               |
|      13 | `maintenance_dispatch_suppressions` |        1 |       2 |        1 |     9 |        2 | `20260729145038_…sql:3`               |
|      12 | `collab_matches`                    |        2 |       4 |        1 |     5 |        2 | `20260726203734_…sql:60`              |
|      11 | `preview_telemetry_events`          |        3 |       6 |        0 |     2 |        1 | `20260723134311_…sql:8`               |

`video_clips` é o retrato mais nítido: **15 índices e 10 policies para zero linhas**, retrabalhada em 9 migrations distintas. `agent_relay_tasks` foi alterada 13 vezes sem jamais receber um registro.

Nenhuma das 86 está sem vestígio no repo — o desperdício é integralmente rastreável e integralmente deliberado.

---

## 4. 🟨 Migrations duplicadas e conflitantes

| Verificação                              | Resultado               |
| ---------------------------------------- | ----------------------- |
| Arquivos com conteúdo idêntico (md5)     | **0**                   |
| Timestamps duplicados (`YYYYMMDDHHMMSS`) | **0**                   |
| Objetos recriados múltiplas vezes        | **sim, extensivamente** |

### 4.1 Mesmo objeto criado várias vezes

Tabelas com múltiplos `CREATE TABLE` na história:

| Tabela                                                                                                                                   |  Vezes | Primeira                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------- |
| `recognition_logs`                                                                                                                       |      4 | `00001_consolidated_all_gaps.sql:264` |
| `analysis_history`, `recording_configs`, `video_clips`, `registered_persons`, `face_recognition_configs`, `zones`, `zone_events`         | 3 cada | `00001_consolidated_all_gaps.sql`     |
| `plate_detections`, `stream_recordings`, `notification_configs`, `heatmap_snapshots`, `continuous_analysis_configs`, `analysis_sessions` | 2 cada | —                                     |

Funções mais reescritas: `retention_routine_registry` (5×), `update_updated_at_column` / `evaluate_retention_alerts` / `escalate_stale_maintenance_alerts` / `ensure_future_partitions` (4× cada).

Policies com nome idêntico recriadas em arquivos diferentes — as 4 policies de `recognition_logs` ("Users can view/insert/update/delete their own recognition logs") aparecem **4 vezes cada**; as de `plate_detections`, 3–4 vezes.

### 4.2 Não-idempotência: um replay quebra

| Comando          | Total |                            Guardado |   Não-idempotentes |
| ---------------- | ----: | ----------------------------------: | -----------------: |
| `CREATE TABLE`   |   209 |       103 com `IF NOT EXISTS` (49%) |            **106** |
| `CREATE INDEX`   |   480 |       327 com `IF NOT EXISTS` (68%) |            **153** |
| `CREATE POLICY`  |   609 | 244 `DROP POLICY IF EXISTS` no repo | **déficit de 365** |
| `CREATE TRIGGER` |   143 |         53 `DROP TRIGGER IF EXISTS` |  **déficit de 90** |

`CREATE POLICY` **não aceita** `IF NOT EXISTS` em PostgreSQL: sem o `DROP` pareado, a segunda passagem falha com `42710 duplicate_object`. Com 365 policies desguarnecidas, rodar as 361 migrations em sequência num banco que já as tenha visto é garantidamente destrutivo.

**Zero arquivos usam `BEGIN;`/`COMMIT;`** — uma migration que falhe no meio deixa o schema parcialmente aplicado, sem rollback.

---

## 5. 🟦 Seeds: 5 dos 7 arquivos não são aplicados por ninguém

| Arquivo                          |  Bytes | `INSERT` | Tabelas alvo                                                                                                                                                                                           | Quem aplica                                                                             |
| -------------------------------- | -----: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `seed.sql`                       |    356 |        1 | `cameras` (2 câmeras demo)                                                                                                                                                                             | `db:seed` → `supabase db seed` (convenção CLI: só este arquivo, só em `db reset` local) |
| `seed_gestao.sql`                | 25.181 |       13 | `organizations`, `organization_members`, `user_roles`, `zones`, `zone_events`, `site_plans`, `site_plan_placements`, `collab_networks`, `collab_memberships`, `collab_invitations`, `evidence_exports` | **ninguém**                                                                             |
| `seed_intelligence.sql`          | 15.535 |       10 | `alerts`, `analysis_history`, `event_alerts`, `panic_events`, `plate_detections`, `recognition_logs`, `registered_persons`, `registered_plates`, `organizations`, `organization_members`               | **ninguém**                                                                             |
| `seed_ppe.sql`                   | 15.188 |        4 | `cameras`, `ppe_configs`, `ppe_violations`, `ppe_zones`                                                                                                                                                | **ninguém**                                                                             |
| `seed_behavior.sql`              | 13.165 |        1 | `behavior_analyses`                                                                                                                                                                                    | **ninguém**                                                                             |
| `seed-automation-rules.sql`      |  5.092 |        1 | `rules`                                                                                                                                                                                                | **ninguém** (mas ver abaixo)                                                            |
| `fix_journey_rls.sql`            |  1.854 |        0 | — (correção de RLS avulsa)                                                                                                                                                                             | **ninguém**                                                                             |
| `check_notification_configs.sql` |     99 |        0 | — (query de diagnóstico)                                                                                                                                                                               | **ninguém**                                                                             |

Busca por `seed*.sql` em `package.json`, `scripts/`, `.github/`, `Makefile`, `*.yml`, `*.ts`, `*.mjs`, `*.sh`, `*.toml`: as únicas referências fora de `docs/` são **`db:seed` → `supabase db seed`** (`package.json:48`), que na convenção do CLI carrega apenas `supabase/seed.sql`. Os scripts `seed:e2e-user` / `seed:healing-ci-user` são `.mjs` e não tocam estes `.sql`.

🟦 **Os 5 seeds temáticos (74 KB, 29 `INSERT`) são arquivos mortos.** Não há evidência de aplicação automatizada em nenhum ponto do repositório.

### 5.1 Os seeds apontam para o projeto certo — o `config.toml` não

Os seeds carregam o cabeçalho `-- Projeto: pmzxbffnbenkmzpnbehb` (`seed_gestao.sql:3`) e `scripts/seed-rules.mjs:6` usa `https://pmzxbffnbenkmzpnbehb.supabase.co` — o projeto **de produção**, o que medi. Já `supabase/config.toml:1` diz:

```toml
project_id = "fsisdfdwlbfeadwfqpir"
```

que é o **projeto Lovable antigo** (`MIGRATION_PLAN.md:8`). Um `supabase db push` a partir deste repositório, sem `--linked` explícito, aponta para o projeto errado.

### 5.2 Divergência `seed-automation-rules.sql` vs. migration homônima

`supabase/seed-automation-rules.sql` (5.092 B) e `supabase/migrations/20260808150000_seed_automation_rules.sql` (4.788 B) populam a mesma tabela `rules` e **diferem** em conteúdo. Duas fontes de verdade para os mesmos dados, sem indicação de qual prevalece.

---

## 6. ⬛ Particionamento: as 22 "partições" são tabelas órfãs

### 6.1 A contradição

`_FATOS_RUNTIME.md` registra `plate_detections` com 100 linhas e `recognition_logs` com 250, enquanto as 22 partições `*_m2026_*` estão vazias. Numa tabela particionada isso é **impossível** — o pai não armazena tuplas, a contagem do pai é a soma das partições.

Medição direta em `pg_class` / `pg_inherits` (schema `public`):

| Métrica                                                                                  |   Valor |
| ---------------------------------------------------------------------------------------- | ------: |
| Tabelas particionadas (`relkind = 'p'`)                                                  |   **0** |
| Partições anexadas (linhas em `pg_inherits`)                                             |   **0** |
| Tabelas `relkind='r'` com nome de partição (`plate_detections_*` / `recognition_logs_*`) |  **22** |
| Índices sobre essas 22                                                                   | **110** |
| Policies RLS sobre essas 22                                                              |  **22** |

`plate_detections` e `recognition_logs` são **heaps comuns** (`relkind='r'`, `relispartition=false`) que guardam suas 100 e 250 linhas diretamente. As 22 tabelas com nome de partição são **standalone, desanexadas, vazias** — `relispartition = false`, `inhparent` inexistente. São sósias: carregam o nome, os 5 índices clonados e a policy de cada partição, mas nenhum vínculo com o pai.

### 6.2 O que as migrations declaram

`20260513180019_1b004e60-d0e7-408f-bb40-a38563dc6aa4.sql` (72 linhas) é destrutivo por construção:

```sql
-- 1. Preparar transição: Remover tabelas antigas (vazias)
DROP TABLE IF EXISTS public.plate_detections CASCADE;      -- :2
DROP TABLE IF EXISTS public.recognition_logs CASCADE;      -- :3
...
) PARTITION BY RANGE (created_at);                          -- :17  recognition_logs
) PARTITION BY RANGE (created_at);                          -- :33  plate_detections
```

O comentário assume que as tabelas estão vazias — hoje elas têm 350 linhas somadas. Aplicar essa migration em produção **destrói dados reais sem backup**, e não há `BEGIN;` para reverter.

Mais 2 migrations declaram partições estáticas (`20260712113637_…sql`, `20260712115534_…sql`, cobrindo até `m2027_01`) e 6 arquivos definem `ensure_future_partitions()` — cuja versão em `20260716181225_…sql:25` cria partições **dinamicamente** via `format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I …')`. É esse `%I` dinâmico que explica por que 20 partições são declaradas estaticamente mas 22 existem: `plate_detections_default` e `recognition_logs_default` só nascem em tempo de execução.

### 6.3 Explicação

O quadro medido é consistente com **dump/restore lógico da Lovable para o projeto novo**: `pg_dump` sem preservar a hierarquia de particionamento restaura o pai como heap comum e cada partição como tabela independente. Os dados que estavam distribuídos foram concentrados no pai; as partições vieram vazias e desanexadas.

Isso é exatamente o que `MIGRATION_PLAN.md:3` chama de "reconstrução de particionamento de `plate_detections`/`recognition_logs` (Fase 4, manutenção)" e que `MIGRATION_PLAN.md:24` marca como **"⏸️ Não iniciada"**.

### 6.4 Consequências ativas

- **`ensure-future-partitions-daily`, `drain-default-partitions-daily`, `triage-default-quarantine`, `partition-backlog-sampler`** — 4 dos 69 cron jobs ativos operam sobre um esquema de particionamento inexistente. `partition_backlog_samples` (474 linhas), `partition_maintenance_runs` (28), `partition_drain_runs` (25) e `partition_quarantine_runs` (22) são telemetria de manutenção de partições que não existem.
- 4 gates de qualidade (`scripts/check-partition-coverage.mjs`, `check-partition-drain.mjs`, `check-partition-quarantine.mjs`, `check-partition-backlog-trend.mjs`) validam essa mesma estrutura ausente.
- 110 índices e 22 policies mantidos sobre 22 tabelas que nunca receberão uma linha.

---

## 7. 🟨 Tipos gerados (`src/integrations/supabase/`)

`types.ts` — 324 KB, 10.818 linhas — tipa **167 tabelas** e 282 funções (contra 169 tabelas e 386 funções vivas).

| Divergência                                        |         Qtd | Detalhe                                                                                                                            |
| -------------------------------------------------- | ----------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tabelas **vivas com dados** sem tipo em `types.ts` |       **4** | `behavior_analyses` (100 linhas), `ppe_configs` (3), `ppe_violations` (12), `ppe_zones` (6) — o frontend é cego a 4 tabelas em uso |
| Tabelas tipadas que **não existem no banco**       |       **2** | `plate_detections_m2027_02`, `recognition_logs_m2027_02` (prod vai só até `m2027_01`)                                              |
| Funções tipadas vs. vivas                          | 282 vs. 386 | 🟦 104 funções sem tipo — não verifiquei quais são internas                                                                        |

Os 2 fantasmas `m2027_02` provam que `types.ts` foi gerado contra um **estado de banco diferente do atual** (provavelmente antes de um `DROP` de partições futuras, ou contra outro projeto). O arquivo se declara auto-gerado (`client.ts:1`), mas não há script que o regenere contra produção: `db:generate` (`package.json:45`) roda `supabase gen types typescript --local` — contra o stack **local**, e grava em `src/types/supabase.ts`, **caminho diferente** do `src/integrations/supabase/types.ts` que o `client.ts` importa. O arquivo em uso não tem pipeline de regeneração.

---

## 8. 🟨 `config.toml` e o plano de migração que se declara concluído

| Alegação em `MIGRATION_PLAN.md:20`                                                                                      | Estado medido                                                                     | Veredito     |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------ |
| "Fase 0 — Segurança ✅ **Concluída** (commit 32f7e7a6): `config.toml` corrigido: `project_id` → `pmzxbffnbenkmzpnbehb`" | `supabase/config.toml:1` = `project_id = "fsisdfdwlbfeadwfqpir"`                  | ⬛ **falsa** |
| "…bloco `[functions.migrate-helper]` removido"                                                                          | `supabase/config.toml:92` = `[functions.migrate-helper]` com `verify_jwt = false` | ⬛ **falsa** |
| "Banco 100% migrado"                                                                                                    | 0 partições, 3 tabelas não declaradas, 21 cron jobs órfãos                        | ⬛ **falsa** |

A correção existiu: `32f7e7a "Atualizou config.toml"` (2026-08-09) alterou 4 linhas do arquivo. Mas `e9bc5c4` (2026-08-10, o commit da migração Lovable→Supabase) **reintroduziu o arquivo inteiro** — `git show e9bc5c4 -- supabase/config.toml` mostra `93 insertions(+)`, incluindo `+project_id = "fsisdfdwlbfeadwfqpir"` e `+[functions.migrate-helper]`. O despejo em massa reverteu a correção de segurança do dia anterior, e a documentação nunca foi atualizada.

O próprio `MIGRATION_PLAN.md:53` cita o comentário da função: _"Remova esta função ao final da migração"_ — `migrate-helper` continua no `config.toml` com `verify_jwt = false`, isto é, **sem autenticação**.

`config.toml` declara 26 blocos `[functions.*]` para **75 edge functions em disco** (`supabase/functions/*/`) — 49 funções sem configuração explícita de `verify_jwt`.

`supabase/README.md:7-8` descreve _"functions/ # 10 Edge Functions"_ e _"migrations/ # 19 migrações SQL"_. Os números reais são 75 e 361 — o README está **19× defasado** em migrations e **7,5× em functions**.

---

## Classificação por área

| Área                                | Status | Justificativa em uma linha                                                                                 |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Reconstrutibilidade do ambiente     | ⬛     | 3/361 migrations aplicadas; `db push` aborta em banco limpo por 3 tabelas nunca criadas                    |
| Histórico de migrations             | ⬛     | 1 commit para 361 arquivos; 4 convenções de nome; baseline consolidado que descreve schema inexistente     |
| Drift repo → banco                  | ⬛     | 9/153 tabelas declaradas ausentes; 21/69 cron jobs vivos sem declaração                                    |
| Drift banco → repo                  | ⬛     | 3 tabelas com dados de produção sem `CREATE TABLE` em migration alguma                                     |
| Particionamento                     | ⬛     | 0 tabelas particionadas em prod; 22 órfãs com 110 índices; migration de rebuild é destrutiva sem transação |
| Tabelas vazias / features dormentes | ⬛     | 764 objetos declarados para 86 tabelas com 0 linhas — 12% a mais que para as 61 tabelas em uso             |
| Idempotência das migrations         | 🟨     | 365 `CREATE POLICY` sem `DROP` pareado; 106 `CREATE TABLE` sem `IF NOT EXISTS`; 0 arquivos transacionais   |
| Duplicação de arquivos              | ✅     | 0 arquivos idênticos, 0 timestamps colididos — a duplicação é semântica, não de arquivo                    |
| Seeds                               | 🟦     | 5 de 7 arquivos (74 KB) sem qualquer referência em scripts, CI ou `package.json`                           |
| Tipos gerados                       | 🟨     | 4 tabelas com dados sem tipo; 2 tipos fantasma; sem pipeline de regeneração no caminho usado               |
| `config.toml`                       | 🟨     | Aponta para o projeto Lovable antigo; `migrate-helper` com `verify_jwt=false`; 49/75 functions sem bloco   |
| Gate de CI para migrations          | 🟨     | `lint-migrations.mjs` valida texto, nunca conecta ao banco — cego a 100% do drift medido                   |
| RLS declarada vs. viva              | 🟨     | 609 policies declaradas vs. 406 vivas; 169/169 tabelas com RLS em prod (`_FATOS_RUNTIME.md:10`)            |
| Extensões / versão do Postgres      | ✅     | PG 17.6 + 8 extensões, medido em `_FATOS_RUNTIME.md:8-9`                                                   |

---

## Lacunas desta auditoria

Itens que **não** foram medidos. Nenhuma conclusão acima depende deles.

1. **Conteúdo linha a linha das 361 migrations.** Por instrução de escopo, o inventário foi feito por _pattern matching_ (regex sobre `CREATE`/`ALTER`/`DROP`). SQL dentro de `DO $$ … $$`, `EXECUTE format(…)` e funções PL/pgSQL não é totalmente capturado — os números de objetos declarados são **piso, não teto**.
2. **Comparação estrutural coluna a coluna.** Não comparei tipos, defaults, constraints ou FKs entre o declarado e o vivo para nenhuma das 144 tabelas coincidentes. Uma tabela pode existir nos dois lados com formatos incompatíveis; isso não foi verificado.
3. **Índices vivos vs. declarados.** Contei 480 `CREATE INDEX` no repo, mas não recenseei `pg_index` em produção (exceto os 110 das 22 órfãs). O drift de índices é 🟦.
4. **As 386 funções e 113 triggers vivos, individualmente.** Só comparei totais. Não sei quais das 386 funções existem sem declaração no repo — provável, dado o padrão dos cron jobs, mas **não medido**.
5. **Corpo das 406 policies RLS.** Verifiquei que 169/169 tabelas têm RLS habilitado (via `_FATOS_RUNTIME.md`), mas não auditei se as expressões `USING`/`WITH CHECK` vivas correspondem às declaradas. Uma policy pode existir e ser permissiva demais.
6. **Se as 9 tabelas ausentes já existiram e foram removidas.** Confirmei apenas que **nenhuma migration as remove**. Podem ter sido dropadas manualmente, ou nunca criadas. Sem log de DDL, indistinguível.
7. **Storage buckets.** `00002_storage_buckets.sql` existe, mas não medi `storage.buckets` em produção.
8. **Se `supabase db push` de fato falha.** A conclusão de §Veredito prova 2 é **dedução estática** a partir da ausência de `CREATE TABLE` para `profiles`/`query_telemetry`/`behavior_analyses`. Não executei `db push` contra um banco limpo — `node_modules` não está instalado (`_FATOS_RUNTIME.md:93`) e isso exigiria provisionar um Postgres.
9. **Qual foi o mecanismo exato do dump/restore.** §6.3 é a explicação mais consistente com as medições (`relkind='r'` + `pg_inherits` vazio + `MIGRATION_PLAN.md` Fase 4 não iniciada), mas **não há artefato de dump versionado** que a comprove diretamente.
10. **Conteúdo dos 5 seeds mortos.** Verifiquei alvo e volume de `INSERT`, não a validade dos dados contra o schema atual.
