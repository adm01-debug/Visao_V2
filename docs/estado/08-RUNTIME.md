# Dimensão RUNTIME — produção observada

> **Método:** consultas de leitura ao banco de produção via MCP, executadas em 2026-08-16.
> Nenhuma escrita, nenhum DDL, nenhum deploy. Cada achado abaixo foi reproduzido por mim
> diretamente, não herdado de subagente nem de documento.
>
> **Limite declarado:** não há token de gestão Supabase nesta sessão, portanto **logs de Edge
> Functions e lista de funções deployadas são `NAO_VERIFICADO`**. Também não há `node_modules`,
> portanto nenhum teste ou build foi executado.

---

## Veredito da dimensão

O que está ligado, está ligado de verdade: 69 cron jobs ativos, 18.177 execuções bem-sucedidas
em 24h. Mas o runtime revela três coisas que o código sozinho não mostraria — uma rotina que
falha 100% das vezes há duas semanas, um caminho de fallback permanentemente quebrado, e 108
tabelas que nunca receberam um registro.

---

## R1 — `evaluate_maintenance_alerts()` falha em 100% das execuções há 14 dias

**Classificação: 🟨 IMPLEMENTADO_PARCIAL** (código completo, execução sempre aborta)

| Evidência | Valor |
|---|---|
| Job | `evaluate-maintenance-alerts` (jobid 52), schedule `23 * * * *`, `active = true` |
| Falhas acumuladas | **338** |
| Sucessos acumulados | 45 |
| Primeira falha | **2026-08-02 15:23 UTC** |
| Última falha | 2026-08-16 16:23 UTC (mais recente no momento da auditoria) |
| Taxa nos últimos 7 dias | **168 falhas / 168 execuções = 100%** |

Erro retornado pelo Postgres, textual:

```
ERROR:  column reference "severity" is ambiguous
DETAIL:  It could refer to either a PL/pgSQL variable or a table column.
QUERY:  EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'partition_backlog_trend' AND e.severity = severity
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    )
CONTEXT:  PL/pgSQL function evaluate_maintenance_alerts() line 226 at IF
```

**Objeto de banco:** `public.evaluate_maintenance_alerts()`, linha 226 do corpo da função.
A variável PL/pgSQL `severity` colide com a coluna `maintenance_alert_events.severity`; falta
qualificar ou renomear.

**Por que ninguém percebeu:** é exatamente o padrão de falha silenciosa — a rotina que *avisa*
sobre problemas de manutenção é a que está quebrada. Ela falha antes de emitir qualquer alerta,
então a ausência de alertas é lida como "está tudo bem". `maintenance_alert_events` continua
recebendo 1.310 linhas de outras rotinas, o que mascara o buraco.

**Correção é de uma linha** (qualificar `severity` com o alias da variável ou renomear a variável)
— mas **toca produção, é decisão do dono**.

---

## R2 — Fallback de resolução de URL de câmera permanentemente quebrado

**Classificação: 🟨 IMPLEMENTADO_PARCIAL** (caminho principal funciona, fallback nunca funcionou)

`public.edge_function_error_audit` é a **maior tabela de negócio do banco (49 MB, 90.462 linhas)**
e — verificado — **100% dessas linhas são do mesmo erro, da mesma função**:

| Campo | Valor |
|---|---|
| `function_name` | `resolve-camera-url` (única) |
| `error_code` | `rpc_failed` (único) |
| `message` | `Could not find the function public.get_camera_stream_url(p_camera_id, p_key) in the schema cache` |
| Ocorrências | **90.462** |
| Janela | 2026-07-23 18:44 → 2026-07-31 15:16 UTC |

**Causa-raiz, reproduzida:** incompatibilidade de **nome de parâmetro** entre código e banco.

- Código: `supabase/functions/resolve-camera-url/index.ts:118-121` chama
  `rpc('get_camera_stream_url', { p_camera_id, p_key })`
- Banco: a função existe com assinatura **`get_camera_stream_url(_camera_id uuid, _key text)`**

PostgREST resolve RPC por nome de argumento; `p_camera_id` ≠ `_camera_id`, então a função é
reportada como inexistente. Não é falta de permissão nem de deploy — é o nome do parâmetro.

**Calibragem honesta — o que este achado NÃO é.** A leitura apressada seria "o streaming de
câmeras está quebrado". Não está. Lendo `index.ts:107-138`, o v2 é tentado **primeiro**:

```
109  if (KEK_V1 && KEK_V1.length >= 16) {
110    const v2 = await admin.rpc('get_camera_stream_url_v2', { p_camera_id, p_kek: KEK_V1 })
...
117  if (!url) {
118    const v1 = await admin.rpc('get_camera_stream_url', { p_camera_id, p_key: VAULT_KEY })
```

E `get_camera_stream_url_v2(p_camera_id uuid, p_kek text)` **existe no banco com nomes
compatíveis**. Os 90k erros cessaram em 31/07 — data da migração Lovable→Supabase, quando o v2
passou a resolver.

**O risco remanescente é real, porém latente:** se `KEK_V1` estiver ausente/curta ou o v2 falhar,
o fluxo cai no v1 — que **retorna HTTP 500 sempre**. O sistema hoje não tem fallback; tem um
caminho único com a aparência de dois. As 90.462 linhas provam que esse caminho já foi exercido
em massa.

---

## R3 — Migrations: o ambiente não é reconstruível a partir do repositório

**Classificação: 🟦 SUGERIDO_OU_INICIADO** (o pipeline existe como arquivos, não como processo)

| Medida | Valor |
|---|---|
| Migrations versionadas em `supabase/migrations/` | **361 arquivos** |
| Linhas em `supabase_migrations.schema_migrations` | **3** |

As três registradas, todas do mesmo dia:

```
20260731000000  initial_audit_snapshot
20260731180000  fix_cron_jobs_endpoint_migration
20260731200000  comprehensive_fixes_lgpd_fk_cron_selftests
```

O schema vivo tem 169 tabelas, 386 funções, 113 triggers e 406 policies. Esse schema **não foi
construído executando os 361 arquivos** — ele chegou por outro caminho (snapshot/restore durante
a migração Lovable→Supabase, commit `e9bc5c4`).

**Consequência prática:** um `supabase db reset` a partir do repositório não reproduz produção, e
não há garantia verificável de que os 361 arquivos, aplicados em ordem, gerem o schema atual.
Divergências entre arquivo e banco (como a assinatura de `get_camera_stream_url` no achado R2)
passam despercebidas justamente por isso.

---

## R4 — 108 de 169 tabelas nunca receberam um registro (64%)

**Classificação: 🟦 SUGERIDO_OU_INICIADO** para as features correspondentes

Tabela vazia com migration própria, RLS e índices é a prova mais barata de feature dormente.
Amostra do que está a zero (lista completa em `_FATOS_RUNTIME.md`):

| Domínio | Tabelas vazias |
|---|---|
| Reconhecimento facial | `face_embeddings`, `face_recognition_configs`, `detection_reviews` |
| NVR / gravação | `nvrs`, `nvr_recording_downloads`, `stream_recordings`, `recording_configs`, `video_clips` |
| PTZ / patrulha | `camera_presets`, `camera_ptz_config`, `camera_patrols`, `camera_patrol_stops`, `ptz_preflight_runs` |
| Dispositivos / agentes | `local_agents`, `device_registrations`, `device_remote_commands`, `agent_relay_tasks` |
| Notificação | `notification_dispatches`, `notification_recipients`, `monitoring_center_dispatches` |
| ONVIF | `onvif_event_subscriptions`, `onvif_event_deliveries` |
| Timelapse / heatmap | `timelapse_configs`, `timelapse_snapshots`, `timelapse_videos`, `heatmap_snapshots` |
| Automação | `rule_executions`, `alarm_schemes`, `arm_disarm_states` |
| Storage tiering | `storage_tiering_runs`, `glacier_stuck_alerts`, `media_assets` |

Vários desses domínios **têm cron job ativo rodando com sucesso** — o job executa, não encontra
nada para processar, e registra sucesso. Sucesso de cron não é prova de feature viva.

---

## R5 — O que está bom (não distorcer o quadro)

Medido, não suposto:

- **RLS em 169 de 169 tabelas** (100%), com 406 policies. Não há tabela exposta sem política.
- **Saúde do cron: 18.177 sucessos contra 24 falhas em 24h (0,13%)** — e as 24 falhas são todas
  do mesmo job (R1), não ruído distribuído.
- **Observabilidade real e em uso:** `db_health_snapshots` (4.305 linhas, a cada 10 min),
  `cron_watchdog_runs` (376), `cron_watchdog_escalations` (7.184), `agent_healing_runs` (3.009).
  O sistema se automonitora de fato — o watchdog existe, roda e grava.
- **Rotinas de retenção/purga funcionando:** as tabelas `*_purge_runs` têm linhas consistentes,
  indicando que a limpeza de dados acontece de verdade.
- **Particionamento implantado** para `plate_detections` e `recognition_logs`, com partições
  futuras já criadas até 2027-01 pelo job `ensure-future-partitions-daily`.

---

## Contradição registrada, não resolvida

`plate_detections` (100 linhas) e `recognition_logs` (250 linhas) reportam dados na tabela pai,
enquanto **todas as suas 22 partições reportam zero**. Em tabela particionada, `count(*)` na pai
soma as partições — os números deveriam bater. Isso indica que a pai é uma tabela comum
convivendo com um conjunto de partições órfãs, ou uma migração de particionamento incompleta.
**Encaminhado para a dimensão DADOS**; não afirmo a causa sem verificar o DDL.

---

## Lacunas desta dimensão

- **`NAO_VERIFICADO`:** logs de execução das Edge Functions, lista de funções efetivamente
  deployadas, e variáveis de ambiente/segredos em produção (exigem token de gestão Supabase).
- **`NAO_VERIFICADO`:** conclusão real dos checks de CI no GitHub.
- Não foram executados build, lint, testes ou qualquer código do projeto.
- Consultas pesadas de agregação sobre `cron.job_run_details` (160 MB) atingiram
  `statement timeout`; os números de falha por job foram obtidos com recortes menores.
