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
- ~~**Particionamento implantado** para `plate_detections` e `recognition_logs`, com partições
  futuras já criadas até 2027-01 pelo job `ensure-future-partitions-daily`.~~

> ### ⚠️ CORREÇÃO — item acima estava ERRADO
>
> **O que eu afirmei:** que o particionamento estava implantado, e listei isso como ponto positivo.
>
> **O que é verdade:** **não existe nenhuma tabela particionada neste banco.** Verifiquei em
> `pg_class` após a dimensão DADOS levantar a contradição:
>
> ```
> plate_detections           relkind = 'r'
> recognition_logs           relkind = 'r'
> plate_detections_m2026_08  relkind = 'r'
> recognition_logs_m2026_08  relkind = 'r'
> ```
>
> `relkind = 'r'` é heap comum; tabela particionada seria `'p'` e partição anexada apareceria em
> `pg_inherits`. As 22 "partições" são **tabelas órfãs, desanexadas e vazias**, carregando índices
> e policies que não servem a nada.
>
> **Por que eu errei:** inferi particionamento a partir do *padrão de nomes* (`_m2026_08`) e da
> existência do cron `ensure-future-partitions-daily`, sem consultar `relkind`. Nome de tabela e
> job agendado não são prova de estrutura — exatamente o erro que esta auditoria existe para achar.
> Inferência plausível não é evidência.
>
> **Consequência:** isto sai da lista de pontos fortes e entra como achado grave. Ver `04-DADOS.md`.
> A contradição registrada no fim deste documento fica **resolvida por esta correção**.

---

## Contradição registrada — RESOLVIDA

`plate_detections` (100 linhas) e `recognition_logs` (250 linhas) reportavam dados na pai enquanto
suas 22 "partições" reportavam zero. **Resolvido:** nenhuma delas é particionada. São heaps comuns
(`relkind='r'`) convivendo com 22 tabelas órfãs vazias. Ver o bloco de correção em R5.

---

## R6 — Os dados que existem são de SEED, não de uso real

**Classificação: 🟦 SUGERIDO_OU_INICIADO** para as features de ALPR, comportamento e EPI

Achado que muda a leitura de todo o resto desta auditoria, verificado por mim após a dimensão
FRONTEND levantar suspeita de dado fabricado.

**Tabela vazia prova feature dormente — mas tabela com dados NÃO prova feature viva.**

`plate_detections` tem 100 linhas. Verificado em produção:

| Consulta | Resultado |
|---|---|
| `count(DISTINCT camera_name)` | **1** (só `'Estacionamento'`) |
| linhas com `camera_name = 'Upload Manual'` | **0** |
| linhas com `confidence = 0.92` | **0** |

E `supabase/seed_intelligence.sql` popula exatamente `plate_detections`, com a câmera
`'Estacionamento'` apontando para `rtsp://demo/stream2` — um endereço de demonstração.

Os arquivos de seed populam, ao todo, estas tabelas "com dados":

| Arquivo | Tabelas populadas |
|---|---|
| `seed_intelligence.sql` | `alerts`, `analysis_history`, `event_alerts`, `organizations`, `organization_members`, `panic_events`, `plate_detections`, `recognition_logs`, `registered_persons`, `registered_plates` |
| `seed_gestao.sql` | `collab_invitations`, `collab_memberships`, `collab_networks`, `evidence_exports`, `organizations`, `organization_members`, `site_plans`, `site_plan_placements`, `user_roles`, `zones`, `zone_events` |
| `seed_ppe.sql` | `cameras`, `ppe_configs`, `ppe_violations`, `ppe_zones` |
| `seed_behavior.sql` | `behavior_analyses` |
| `seed-automation-rules.sql` | `rules` |
| `seed.sql` | `cameras` |

**São 25 das 61 tabelas "com dados" (41%) alcançadas por algum seed** *(número corrigido na
validação; publicado antes como 26 — ver `09-VALIDACAO.md`)* — incluindo praticamente
todas as tabelas de *funcionalidade de negócio*: ALPR, reconhecimento facial, EPI, zonas, regras,
colaboração, câmeras.

**Implicação para o critério de "pronto".** O que resta como tráfego genuíno e autônomo são as
tabelas de *infraestrutura*: `edge_function_error_audit`, `cron_watchdog_*`, `db_health_snapshots`,
`agent_healing_runs`, `maintenance_alert_*`, `partition_backlog_samples`, `*_purge_runs`,
`camera_vault_audit`, `stream_restart_events`. Ou seja: **a máquina que se automonitora tem uso
real; o produto de videomonitoramento não tem uso comprovado por esta auditoria.**

Isso não afirma que o produto nunca funcionou — afirma que **não há evidência de uso real em
produção** nos dados atuais, e que os números da tabela de linhas não podem ser lidos como adoção.

---

## Correção registrada — achado do FRONTEND redimensionado

A dimensão FRONTEND reportou dois caminhos que fabricam dado e gravam no banco:
`components/LicensePlateRecognition.tsx:68-78` (placa aleatória, `confidence: 0.92`, toast
"Placa detectada") e `components/behavior/useBehaviorAnalysis.ts:126-128`
(`generateMockBehavior()` no `catch`).

**O código é real** — li e confirmei ambos, linha a linha. O `catch` da função de placas de fato
gera `generateMockPlate()`, persiste via `addDetection` e anuncia sucesso ao usuário sem nenhuma
marcação de que é simulação. **Continua sendo um achado grave** (🟨): basta a Edge Function
`analyze-license-plate` falhar para o operador ver uma placa inventada como detecção verdadeira.

**Mas o dimensionamento estava errado.** A leitura de que esse caminho teria contaminado as 100
linhas de `plate_detections` **não se sustenta**: zero linhas têm `camera_name = 'Upload Manual'`
e zero têm `confidence = 0.92` — a assinatura exata do código fabricador. Os 100 registros vieram
de `seed_intelligence.sql`.

**Resumo honesto:** o risco de fabricação é real e está armado no código; a contaminação de dados
não ocorreu. Registrado como risco latente, não como incidente consumado.

---

## Lacunas desta dimensão

- **`NAO_VERIFICADO`:** logs de execução das Edge Functions, lista de funções efetivamente
  deployadas, e variáveis de ambiente/segredos em produção (exigem token de gestão Supabase).
- **`NAO_VERIFICADO`:** conclusão real dos checks de CI no GitHub.
- Não foram executados build, lint, testes ou qualquer código do projeto.
- Consultas pesadas de agregação sobre `cron.job_run_details` (160 MB) atingiram
  `statement timeout`; os números de falha por job foram obtidos com recortes menores.
