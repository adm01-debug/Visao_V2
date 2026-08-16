# 06 — INTEGRAÇÕES EXTERNAS

> Auditoria da dimensão **INTEGRAÇÕES COM TERCEIROS** do repositório `/home/user/vis-o-v2`.
> Data: 2026-08-16. Base factual: `docs/estado/_FATOS_RUNTIME.md` + medições diretas
> adicionais no banco de produção (somente leitura, via MCP) feitas nesta auditoria.
>
> **Método:** cada linha cita `arquivo:linha`. Documentação foi tratada como *hipótese a testar*,
> nunca como fonte. Tráfego real foi verificado cruzando com tabelas do banco vivo.
> Nenhum valor de segredo é reproduzido — apenas nomes de variável.

## Legenda

| Símbolo | Critério |
|---|---|
| ✅ IMPLEMENTADO_TOTAL | código + credencial configurada + chamador real + **tráfego comprovado no banco** |
| 🟨 PARCIAL | código real e chamador existem, mas falta credencial em produção **ou** o tráfego cessou/nunca foi orgânico |
| 🟦 SUGERIDO_OU_INICIADO | código existe, mas sem credencial declarada, sem chamador de produção **ou** tabela de registro vazia |
| ⬛ MORTO | dependência/config presente sem nenhum ponto de execução, ou prometido e inexistente |

---

## 0. ACHADO CENTRAL — a ponte cron → Edge Functions está QUEBRADA em produção

Esta é a falha que domina toda a dimensão. **Medição feita nesta auditoria** (não estava em `_FATOS_RUNTIME.md`):

| Medição | Resultado |
|---|---|
| `SELECT count(*) FROM net._http_response` (janela retida: 2026-08-16 10:54 → 16:53) | **1.536 chamadas** |
| Agrupamento por `status_code, error_msg` | **1 único grupo: `status_code = NULL`, `error_msg = "Couldn't resolve host name"`, n = 1.536** |
| Taxa de sucesso HTTP saída via `pg_net` | **0 / 1.536 = 0,00 %** |
| Hosts distintos em `cron.job` (comandos com `http`) | 1 único: `https://fsisdfdwlbfeadwfqpir.supabase.co` — 14 jobs |
| `current_setting('app.settings.supabase_url', true)` | **NULL** → cai no fallback hardcoded |

O fallback hardcoded está em `public.invoke_onvif_event_puller()` (fonte lida via `pg_proc.prosrc`)
e replicado nos demais jobs; o mesmo host aparece em `supabase/config.toml:1`
(`project_id = "fsisdfdwlbfeadwfqpir"`), `.env.production:5` e `public/openapi.yaml:12`.

**Consequência medida:** as 14 Edge Functions agendadas por `pg_cron` — `camera-health-monitor`,
`monitoring-center-dispatch`, `storage-tiering-orchestrator`, `stream-health-probe`,
`rtsp-revalidate-scheduler`, `onvif-event-puller`, `glacier-stuck-monitor`,
`maintenance-alerts-dispatch`, `cron-watchdog`, `cron-watchdog-escalate`,
`connectivity-resolution-alert`, `csp-anomaly-notify`, `preview-telemetry-alert`,
`vault-coverage-watchdog`, `watchdog-ack-sla-alert` — **nunca são executadas**.

**Falso-verde perigoso:** `_FATOS_RUNTIME.md` registra "18.177 execuções bem-sucedidas, 24 falhas
(0,13 %)" em 24h. Confirmei o número (18.201 execuções / 24 falhas). Mas `net.http_post()` apenas
*enfileira*; o job SQL retorna `succeeded` mesmo quando a entrega HTTP falha depois. O painel de
cron mostra 99,87 % de saúde enquanto **100 % das integrações agendadas estão mudas**.

Isso explica os cortes de tráfego observados abaixo: `camera_health_state.last_check_at` máximo é
**2026-07-31 15:02**, e `edge_function_error_audit` (90.462 linhas, todas de `resolve-camera-url`)
tem última linha em **2026-07-31 15:16** — 16 dias antes desta auditoria.

---

## 1. Tabela mestra de integrações

### 1.1 Câmeras / vídeo

| Integração | Classificação | Código (arquivo:linha) | Config (nomes de variável) | Tráfego real (tabela + linhas) |
|---|---|---|---|---|
| **MediaMTX — playback HLS/WebRTC/RTSP** | 🟨 PARCIAL | `src/hooks/useMediaMTX.ts:75-77` (lê `import.meta.env`); player em `src/components/StreamPlayer.tsx:11`, `src/hooks/video-stream/useHLSConnection.ts:5` | `VITE_MEDIAMTX_HLS_URL`, `VITE_MEDIAMTX_WEBRTC_URL`, `VITE_MEDIAMTX_RTSP_URL` — presentes em `.env.example:23-25`, `.env.development:17-19`, `.env.production:12-14`; gate de contrato em `scripts/check-env-contract.mjs:31-38` | **Valores de produção são placeholders**: `.env.production:12` = `https://stream.seudominio.com.br`. `cameras` = 35 linhas, mas só **3** têm `stream_url` (todas `rtsp://`). `stream_recordings` = 0 |
| **MediaMTX — Control API (plano de controle)** | 🟦 | `supabase/functions/mediamtx-proxy/index.ts:29-33` | `MEDIAMTX_API_URL`, `MEDIAMTX_API_USER`, `MEDIAMTX_API_PASS`, `MEDIAMTX_ADMIN_ROLES` (`.env.example:38-40`; `MEDIAMTX_ADMIN_ROLES` **não declarada** em nenhum `.env`) | Sem tabela de registro. `verify_jwt = true` em `supabase/config.toml:3-6`. Nenhum indício de execução |
| **MediaMTX — webhook de ingest (publish/unpublish)** | 🟦 | `supabase/functions/ingest-auth/index.ts:1-12` | `INGEST_WEBHOOK_SECRET` — **ausente de todos os `.env`** | `camera_ingest_endpoints` = **0 linhas** |
| **ONVIF — autodescoberta (nuvem)** | 🟦 | `supabase/functions/onvif-autodiscover/index.ts:91-93,207` (SOAP `device_service`) | Sem credencial própria (usa credencial da câmera) | `agent_discoveries` = **0 linhas**. Erros registrados em `edge_function_error_audit` são 100 % de `resolve-camera-url`, nenhum de `onvif-autodiscover` |
| **ONVIF — eventos PullPoint** | 🟦 DORMENTE | `supabase/functions/onvif-event-puller/index.ts:16,222`; SOAP em `_shared/onvifSoap.ts`; disparo em `public.invoke_onvif_event_puller()` (cron `onvif-event-puller-minutely`, `* * * * *`) | `internal_cron_secrets` name=`onvif_event_puller` — **1 linha existe** | `onvif_event_subscriptions` = **0**, `onvif_event_deliveries` = **0**, `camera_events` = **0**. Somado ao §0, a função nunca roda |
| **PTZ — ONVIF / Hikvision / Dahua / Axis** | 🟦 | `supabase/functions/camera-ptz-control/index.ts:1-5`; `ptz-onvif-discover/index.ts:1-3`; `ptz-backends-test/index.ts:1-5`; `ptz-presets-import/` | Credenciais por câmera (cofre) | `camera_ptz_config` = **0**, `camera_presets` = **0**, `ptz_connection_attempts` = **0**, `ptz_preflight_runs` = **0**, `camera_ptz_locks` = **0**. Apenas **1** de 35 câmeras tem `ptz_capable = true` |
| **ONVIF — I/O físico (relés / entradas digitais)** | 🟦 | `supabase/functions/camera-io-control/index.ts:1-8` | — | `camera_io_ports` = **0**, `io_actuation_log` = **0** |
| **NVR Dahua — HTTP-CGI (download de gravação)** | 🟦 | `supabase/functions/nvr-recording-download/index.ts:1-6` | Credenciais em `nvrs` | `nvrs` = **0 linhas**; `nvr_recording_downloads` = **0**; bucket `nvr-recordings` = **0 objetos**; `cameras.nvr_id IS NOT NULL` = **0** |
| **NVR — conversão .dav → MP4 (ffmpeg.wasm)** | 🟦 | `supabase/functions/nvr-recording-convert/index.ts:1-5` | — | Idem acima — sem insumo |
| **RTSP — handshake / medição de latência** | 🟨 | `supabase/functions/validate-rtsp-stream/index.ts:1-3`; alerta crítico em `validate-rtsp-stream/criticalAlert.ts:134` | — | `stream_restart_events` = **496 linhas, 0 com `succeeded = true`**, última em **2026-07-24**. `stream_health_checks` = **0** |
| **RTSP — prévia HLS efêmera** | 🟦 | `supabase/functions/rtsp-preview/index.ts:1-6`; `MEDIAMTX_HLS_BASE` | `MEDIAMTX_HLS_BASE` — **ausente de todos os `.env`** | `rtsp_preview_sessions` = **0**, `preview_telemetry_events` = **0**, `rtsp_revalidation_schedules` = **0** |
| **Firmware fingerprint (marca/modelo)** | 🟦 | `supabase/functions/firmware-fingerprint/index.ts:1-6` | — | `firmware_fingerprint_events` = **0** |
| **Agente Local ONVIF (binário Node)** | 🟦 | `agent/src/discover.ts:6,160-165` (WS-Discovery multicast, lib `onvif@^0.7.2` — `agent/package.json:15`); `agent/src/index.ts:27-35`; backend em `supabase/functions/agent-ingest/index.ts:1-3` e `agent-pair/index.ts:1-3` | `ONVIF_USERNAME`, `ONVIF_PASSWORD`, `NETWORK_CIDR`, `HEARTBEAT_INTERVAL`, `RELAY_ENABLED` — **nenhuma declarada em `.env.example`** | `local_agents` = **0**, `agent_discoveries` = **0**, `agent_relay_tasks` = **0**. Cron `heal-local-agents` roda a cada 10 min sobre tabela vazia |
| **Conexão por Registro (gravador atrás de NAT)** | 🟦 | `supabase/functions/device-connect/index.ts:1-6`; RPCs `enroll_device`, `rotate_device_secret`, `revoke_device` | — | `device_registrations` = **0**, `device_registration_audit` = **0**, `device_remote_commands` = **0** |
| **Cofre de credenciais de câmera (envelope encryption)** | 🟨 | `supabase/functions/camera-credentials-vault/index.ts:1-3`; consumo em `resolve-camera-url/index.ts:110-137` | `CAMERA_VAULT_KEY`, `CAMERA_VAULT_KEK_V1` — **ausentes de todos os `.env`** | `camera_vault_audit` = **878 linhas** (última 2026-08-07) — houve uso real. Mas `camera_credentials` = **0 linhas** e `resolve-camera-url` gerou **90.462 erros `rpc_failed`** (100 % do `edge_function_error_audit`), cessando em 2026-07-31 |
| **Redis (docker-compose)** | ⬛ MORTO | `docker-compose.yml:60-75` declara `visao-redis` | — | `grep -r "redis" src supabase/functions` → **nenhum cliente**. Serviço sobe e não é consumido por linha nenhuma de código |

### 1.2 IA / visão computacional

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Lovable AI Gateway — `google/gemini-1.5-flash`** (motor real de toda a visão server-side) | 🟨 | 7 funções: `analyze-image/index.ts:121,128`; `detect-behavior/index.ts:91,98`; `detect-faces/index.ts:50,58`; `compare-faces/index.ts:44,52`; `generate-face-encoding/index.ts:71,78`; `analyze-license-plate/index.ts:41,48`; `process-frame/index.ts:166,170` | `LOVABLE_API_KEY` — **ausente de todos os `.env*`** do repositório | `behavior_analyses` = **100 linhas** (últ. 2026-08-09, 10 câmeras); `plate_detections` = **100** (últ. 2026-08-09, **1 única câmera**); `recognition_logs` = **250** (**1 única câmera**); `ppe_violations` = **12**. Volumes exatamente redondos, câmera única e corte abrupto → **padrão de seed, não de tráfego orgânico** (`supabase/seed_behavior.sql`, `seed_ppe.sql`, `seed_intelligence.sql` existem no repo). `event_detections` = **0** |
| **Replicate — InsightFace / ArcFace r100 / RetinaFace / MiniFAS** | 🟦 | `supabase/functions/_shared/replicate.ts:14,108-113,205-213` (registry de modelos `cjwbw/retinaface`, `lucataco/arcface`, `cjwbw/insightface-analysis`, `minivision/silent-face-anti-spoofing`); 5 funções `insightface-*`; cliente front em `src/lib/insightface/client.ts:42-67` | `REPLICATE_API_TOKEN` (`_shared/replicate.ts:108`) — **ausente de todos os `.env*`**; a função lança `[500]: REPLICATE_API_TOKEN not configured` | `face_embeddings` = **0 linhas**; `face_recognition_configs` = **0**; `detection_reviews` = **0**. `query_telemetry` (24 linhas) contém **apenas** `operation = 'error_boundary_capture'` — **nenhuma transição de circuit breaker** (`circuit_transition`), que `replicate.ts:30` gravaria na primeira chamada. **A integração nunca foi invocada em produção** |
| **face-api.js (browser) + CDN jsdelivr** | 🟨 | `src/hooks/useFaceAPI.ts:12,73-76`; config em `src/config/models_config.ts:17,21` (`source: 'cdn'`) | Sem credencial. Pesos vêm de `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights` | `public/models/` contém **apenas `README.md`** — o modo `local` documentado em `models_config.ts:22` está vazio. Depende de CDN pública em runtime. Sem tabela de registro |
| **TensorFlow.js + COCO-SSD + MoveNet (pose)** | 🟦 | `package.json:355-357`; carga lazy em `src/hooks/useMLModels.ts:12,22,27`; `src/hooks/ppe/usePPELocalML.ts` | Sem credencial (modelos via CDN TFHub) | `ppe_violations` = 12 (seed); `heatmap_snapshots` = **0**; `dwell_sessions` = **0** |
| **Thresholds de modelo (governança de IA)** | 🟦 | `src/hooks/useModelThresholds.ts:75,185,214` (`defaultModel: 'face-api'`) | — | `model_thresholds` = **0 linhas** — nenhum limiar jamais persistido; o app opera com defaults hardcoded |

### 1.3 Mapas

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Mapbox GL JS** | 🟨 | `src/components/CameraMap.tsx:2,64-74,148,174`; token via `src/hooks/useMapboxToken.ts:12` → `supabase/functions/get-mapbox-token/index.ts:28` | Edge function lê **`MAPBOX_PUBLIC_TOKEN`** (`get-mapbox-token/index.ts:28`). **Divergência de nome:** `.env.example:35` declara `MAPBOX_ACCESS_TOKEN` e `.env.production.example:4` declara `VITE_MAPBOX_TOKEN`. **Nenhum dos três nomes coincide entre si**, e nenhum está em `.env.production` | Sem tabela de registro. `cameras.latitude/longitude` existem, mas o mapa degrada para a mensagem de erro em `CameraMap.tsx:206` se o token faltar |

### 1.4 Notificação

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Telegram Bot API** | 🟨 (código real, **credencial ausente em produção — provado**) | 8 funções: `send-telegram/index.ts:81,87`; `send-alert-notification/index.ts:177,183`; `cron-watchdog/index.ts:102`; `cron-watchdog-escalate/index.ts:80`; `glacier-stuck-monitor/index.ts:53`; `watchdog-ack-sla-alert/index.ts:122`; `maintenance-alerts-dispatch/index.ts:45`; `connectivity-resolution-alert/index.ts:97`. Chamadores front: `src/components/telegram/useTelegramConfig.ts:54`, `src/components/journey/useJourneyData.ts:372` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (`.env.example:32-33`), `CSP_ALERT_TELEGRAM_BOT_TOKEN`, `CSP_ALERT_TELEGRAM_CHAT_ID` (**não declaradas**) | **PROVA DIRETA:** `cron_watchdog_escalations` = **7.184 linhas, 100 % com `delivered = false` e `delivery_error = 'telegram_not_configured'`** (última 2026-07-31). Nenhuma mensagem jamais saiu |
| **Resend (e-mail)** | 🟨 (código real, **credencial ausente em produção — provado**) | `send-alert-notification/index.ts:94,122-137`; `maintenance-alerts-dispatch/index.ts:63,70`; política em `_shared/maintenanceDispatchPolicy.ts:398` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (`.env.example:34-35`), `MAINTENANCE_ALERT_EMAIL`, `MAINTENANCE_ALERT_FROM` (**não declaradas**) | **PROVA DIRETA:** `maintenance_dispatch_runs` = **52 linhas, 100 % com `outcome = 'muted'`, `detail.reason = 'no_channels_configured'`, `channels = []`, `sent = 0`** — com **`open_critical = 739`** pendentes. Nem Resend nem Telegram estavam configurados |
| **WhatsApp (API estilo Evolution)** | 🟦 | `send-alert-notification/index.ts:217-238` (`POST {URL}/message/sendText/{instance}`); UI em `src/components/notification-settings/ChannelsTab.tsx`, `src/components/settings/NotificationSettingsTab.tsx` | `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_INSTANCE` — **ausentes de todos os `.env*`** | `notification_dispatches` = **0**, `notification_recipients` = **0**. Canal existe só na UI |
| **Webhook de saída — `alert.created`** | 🟦 | `send-alert-notification/index.ts:251-308` (com bloqueio SSRF de loopback/link-local/RFC1918 nas linhas 265-279) | URLs vêm do payload (`recipients.webhookUrls`), não de env | `notification_dispatches` = **0**. Nenhuma entrega registrada |
| **Assinatura HMAC de webhook (v2)** | 🟦 | `supabase/functions/_shared/webhookHmac.ts:2,10-29` (HMAC-SHA256 sobre `${timestamp}.${body}`) | Segredo por destino, sem env | Nenhuma tabela de entrega povoada |
| **Central de monitoramento — SIA DC-09 / Contact ID** | 🟦 DORMENTE | `supabase/functions/monitoring-center-dispatch/index.ts:1-9,103,143` (entrega HTTP a receptoras Sigma/Moni/Commbox); frame em `_shared/contactId.ts`; RPCs `enqueue_monitoring_center_event`, `claim_monitoring_center_dispatches`, `settle_monitoring_center_dispatch`, `reap_monitoring_center_leases` | Endpoint por conta (`monitoring_center_accounts.endpoint_url`), sem env | `monitoring_center_accounts` = **0 linhas**; `monitoring_center_dispatches` = **0**. Cron `monitoring-center-dispatch-every-minute` roda `* * * * *` sobre fila vazia — e nem chega lá (§0). **Nenhum chamador de aplicação** existe fora de testes de contrato |
| **Push notifications (Web Push)** | ⬛ MORTO | `public/sw.js:46,50` tem `addEventListener('push')` e `showNotification` | Nenhuma chave VAPID em `.env*` | `grep -r "pushManager\|applicationServerKey\|VAPID" src` → **zero ocorrências**. Não existe *nenhum* ponto que assine o usuário no push; o handler nunca pode ser acionado |
| **Slack** | ⬛ (só como config de infra) | Único ponto: `observability/alertmanager/visao-routing.yml:94-112` (`slack_configs`, `api_url_file`) | `slack_webhook`, `slack_webhook_storage`, `slack_webhook_backend` — arquivos de segredo do Alertmanager, não do app | Nenhum código da aplicação chama Slack. O Alertmanager não é implantado em lugar nenhum (ver §1.6) |
| **PagerDuty / Jira** | ⬛ (só como config de infra) | `observability/alertmanager/visao-routing.yml:85-93,113-117` | `pagerduty_key`, `jira_webhook` (arquivos) | Idem — stack não implantada |
| **SMS / Twilio / SendGrid** | ⬛ INEXISTENTE | `grep -ri "twilio\|sendgrid" src supabase agent workers scripts` → **zero ocorrências** | — | — |

### 1.5 Storage / arquivamento

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Supabase Storage (tier *hot*)** | 🟦 | `promote-hot-to-warm/index.ts:173-174`; `resolve-media-url/index.ts:200-207`; `upload-media/` | Nativo (service role) | **10 buckets existem, TODOS com 0 objetos**: `avatars`, `camera-clips`, `camera-continuous`, `camera-snapshots`, `camera-thumbnails`, `heatmap-snapshots`, `nvr-recordings`, `person-photos`, `recordings`, `site-plans`. `media_assets` = **0 linhas** |
| **Cloudflare R2 (tier *warm*, SigV4 via `aws4fetch`)** | 🟦 | `promote-hot-to-warm/index.ts:69-72,162`; `archive-warm-to-cold/index.ts:76-79,190`; `resolve-media-url/index.ts:28-31` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_WARM_BUCKET` — **as quatro ausentes de todos os `.env*`** | `media_assets` = 0; `storage_tiering_runs` = **0** |
| **AWS S3 Glacier Deep Archive (tier *cold*)** | 🟦 | `archive-warm-to-cold/index.ts:22-23,80-84,181-191` (`x-amz-storage-class`, classes válidas `GLACIER`/`DEEP_ARCHIVE`/`GLACIER_IR` na linha 30); restore em `resolve-media-url/index.ts:33-36,104` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_COLD_BUCKET`, `S3_COLD_STORAGE_CLASS` — **as cinco ausentes de todos os `.env*`** | `storage_tiering_runs` = **0**, `glacier_stuck_alerts` = **0**, `media_forget_audit` = **0**. Cron `storage-tiering-orchestrator-15min` e `glacier-stuck-monitor-15min` ativos, ambos bloqueados pelo §0. UI existe (`src/components/admin/GlacierStuckAlertsCard.tsx`, `StorageTieringSloCard.tsx`, `StorageTierCostsCard.tsx`) sobre dados vazios |
| **Worker de upload de mídia (host MediaMTX → nuvem)** | 🟦 | `workers/media-uploader/index.mjs:22-25,112` (`POST {SUPABASE_URL}/functions/v1/upload-media`) | `RECORDINGS_DIR`, `SUPABASE_URL`, `SERVICE_JWT`, `WORKER_CONCURRENCY` — **nenhuma em `.env*`** | Todos os buckets vazios ⇒ o worker nunca entregou nada |

### 1.6 Observabilidade

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Prometheus — endpoint de scrape** | 🟨 | `supabase/functions/metrics-prometheus/index.ts:50` (Bearer token), 180 linhas de exposição | `PROMETHEUS_METRICS_BEARER_TOKEN` — **ausente de todos os `.env*`**; instrução de scrape em `observability/README.md:20-33` | Endpoint existe; **nenhum Prometheus é implantado**: `grep -rn "prometheus" docker-compose*.yml k8s/ docker/` → **zero**. Regras em `observability/prometheus/*.yml` são arquivos soltos, não referenciados por nenhum deployment |
| **Alertmanager — API de silences** | 🟦 | `supabase/functions/alertmanager-silence/index.ts:25-26,122` | `ALERTMANAGER_URL`, `ALERTMANAGER_TOKEN` — **ausentes de todos os `.env*`** | `alertmanager_silences_audit` = **0 linhas** |
| **Alertmanager — roteamento (Telegram/PagerDuty/Slack/Jira)** | 🟦 | `observability/alertmanager/visao-routing.yml:29-117` (rotas por severidade, `time_intervals` America/Sao_Paulo, `inhibit_rules` multi-burn-rate) | Segredos via `*_file` montados no container | Arquivo YAML versionado; **nenhum container Alertmanager em `docker-compose*.yml` ou `k8s/`**. Configuração sofisticada sem destino |
| **Grafana — dashboards** | 🟦 | `observability/grafana/visao-slo-dashboard.json`, `visao-tiering-dashboard.json`, `visao-blackbox-dashboard.json` | — | Sem provisionamento; nenhum serviço Grafana em compose/k8s |
| **Blackbox exporter** | 🟦 | `observability/blackbox/blackbox.yml`, `observability/blackbox/prometheus-scrape.yml` | — | Idem |
| **Sentry** | ⬛ MORTO | `package.json:349-350` (`@sentry/react@^10.68.0`, `@sentry/tracing@^7.100.0`); objeto de config em `src/config/sentry.ts:3-10` | `VITE_SENTRY_DSN` — vazio em `.env.example:52`, **ausente de `.env.production`** | `grep -rn "initSentry\|@sentry/react\|Sentry\." src` fora de `src/config/sentry.ts` → **zero ocorrências**. `SENTRY_CONFIG` é exportado e **nunca consumido**. Duas dependências major-divergentes (v10 + v7) carregadas sem inicialização |
| **OpenTelemetry** | ⬛ INEXISTENTE | `grep -ri "otel\|opentelemetry" src supabase agent workers` → **zero** | — | Citado em `docs/MONITORING.md`, ausente do código |
| **CSP report-uri (webhook de entrada)** | 🟦 | `supabase/functions/csp-report/index.ts:49,116`; análise em `csp-anomaly-notify/` (cron `*/20 * * * *`) | `verify_jwt = false` (`supabase/config.toml`) | `csp_violation_reports` = **0 linhas** |

### 1.7 Autenticação de terceiros / pagamento

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **Lovable Cloud Auth — OAuth Google / Apple** | 🟨 | `src/integrations/lovable/index.ts:3,14-20` (arquivo **auto-gerado**, `@lovable.dev/cloud-auth-js`); UI em `src/components/OAuthButtons.tsx:45`, montada em `src/pages/auth/AuthForms.tsx:98,205` | Sem variável no repo — configuração vive no painel Lovable | `profiles` = **1 linha**, `user_roles` = **2**, `organization_members` = **3**. Impossível distinguir OAuth de e-mail/senha pelo schema; sem evidência de uso de OAuth |
| **Pagamento (Stripe / MercadoPago / qualquer gateway)** | ⬛ INEXISTENTE | Única menção a "Stripe": `src/components/testMode/DryRunReportCard.tsx` (string de exemplo) e `src/integrations/README.md` (promessa) | — | **Nenhum código de pagamento existe** |

### 1.8 API pública exposta pelo próprio sistema

| Integração | Classificação | Código (arquivo:linha) | Config | Tráfego real |
|---|---|---|---|---|
| **`public-api` v1 (REST)** | 🟦 | `supabase/functions/public-api/index.ts:176-477` — rotas `/v1/health`, `/v1/status`, `/v1/cameras`, `/v1/events`, `/v1/events/count`, `/v1/events/summary`, `/v1/alerts`, `/v1/panic`; whitelists anti-injection nas linhas 20-23; log em `:140` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (nativos). Auth = JWT do usuário + RLS | `api_usage_logs` = **0 linhas** — `public-api/index.ts:140` é o **único** escritor dessa tabela em todo o repo. **Nenhuma chamada externa jamais foi feita à API pública** |
| **Contrato OpenAPI 3.1** | 🟦 | `public/openapi.yaml:1-25` (server: `https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/public-api`) | — | Servido estaticamente; sem tráfego (idem acima) |
| **SDK cliente TypeScript** | 🟦 | `src/sdk/visao-api-client.ts`, `src/sdk/visao-api.d.ts` | — | Sem consumidor externo comprovável |

---

## 2. Integrações PROMETIDAS na documentação que NÃO existem no código

Esta seção é o achado de maior valor da dimensão. Cada item cita a promessa e a prova de ausência.

### 2.1 `src/integrations/README.md` — "Integrações Disponíveis (24)"

> *"## Integrações Disponíveis (24)"* — `src/integrations/README.md:3`
>
> Lista: AWS (S3, **Rekognition**), Azure Cognitive Services, GCP, Firebase, **Stripe**, **MercadoPago**,
> **Slack**, **Discord**, WhatsApp, SMS, Email, **OpenAI**, **Anthropic**, **Twitch**, **YouTube**,
> **Zoom**, WebRTC, **Bitrix24**, **Google Calendar**, **Microsoft Graph**, S3, Supabase, FFmpeg, GStreamer.
>
> E um exemplo de uso: `import { slack, discord, whatsapp } from '@/integrations';` — `src/integrations/README.md:63`

**PROVA DE AUSÊNCIA — o barril inteiro tem 5 linhas:**

```
src/integrations/index.ts:1-6
/**
 * VISÃO - Integrations barrel export
 */
export * from './supabase/client';
export * from './supabase/types';
```

Não existe `slack`, `discord`, `whatsapp`, `stripe`, nem nenhum dos 24. `ls src/integrations` retorna
apenas `README.md`, `index.ts`, `lovable/`, `supabase/`. **23 das 24 integrações prometidas são ficção**;
a única real é Supabase. O trecho de código do README **não compila**.

### 2.2 `docs/INTEGRATIONS.md`

| Promessa (arquivo:linha) | Verificação no código |
|---|---|
| *"## 10. APIs Externas — \| OpenAI \| Análise de imagem \|"* — `docs/INTEGRATIONS.md:126-131` | ⬛ `grep -ri "openai" src supabase agent workers scripts` → **zero ocorrências**. Análise de imagem usa **Lovable AI Gateway com `google/gemini-1.5-flash`** (`analyze-image/index.ts:121,128`). Doc nomeia o fornecedor errado |
| *"\| Twilio \| SMS \|"* — `docs/INTEGRATIONS.md:131` | ⬛ zero ocorrências de `twilio` no repositório |
| *"\| SendGrid \| Email alternativo \|"* — `docs/INTEGRATIONS.md:132` | ⬛ zero ocorrências de `sendgrid` |
| *"## 9. Slack (via Webhook) — `await fetch(SLACK_WEBHOOK_URL, …)`"* — `docs/INTEGRATIONS.md:112-122` | ⬛ Nenhum `SLACK_WEBHOOK_URL` no código nem em `.env*`. Slack existe apenas no YAML do Alertmanager, que não é implantado |
| *"## 1. Telegram — Comandos do Bot: `/start`, `/status`, `/cameras`, `/alerts`"* — `docs/INTEGRATIONS.md:19-26` | ⬛ **Não existe webhook de entrada do Telegram**. Todas as 8 chamadas são *saída* (`sendMessage`/`sendPhoto`). Nenhum handler processa comandos. Bot conversacional inexistente |
| *"## 2. Email (Resend) — `templates: { alert: 'tmpl_alert_v1', report: 'tmpl_report_v1' }`"* — `docs/INTEGRATIONS.md:36-39` | 🟨 Resend existe, mas **sem templates**: `send-alert-notification/index.ts:106-119` monta HTML inline. Os IDs `tmpl_*` não aparecem em lugar nenhum |
| *"## 3. Push Notifications — `Notification.requestPermission()`"* — `docs/INTEGRATIONS.md:45-53` | ⬛ Sem `pushManager.subscribe`, sem VAPID. Handler órfão em `public/sw.js:46` |
| *"## 8. Face-api.js — ssdMobilenetv1 / faceLandmark68Net / faceRecognitionNet"* — `docs/INTEGRATIONS.md:102-108` | 🟨 `useFaceAPI.ts:73-76` carrega **`tinyFaceDetector`**, não `ssdMobilenetv1`. Modelos vêm de CDN externa; `public/models/` está vazio |

### 2.3 `.env.example` — variável sem consumidor

> `BITRIX24_WEBHOOK_URL="https://seudominio.bitrix24.com.br/rest/1/webhook-token/"` — `.env.example:36`

⬛ `grep -ri "bitrix" src supabase scripts agent workers` → **zero ocorrências**. Segredo documentado
para uma integração que não existe. (`src/integrations/README.md:40` também promete Bitrix24.)

> `OPENAI_API_KEY="sk-..."` — `.env.example:31`

⬛ Nenhum consumidor. A chave que o código realmente precisa — `LOVABLE_API_KEY` — **não está declarada
em nenhum `.env`**. O contrato de segredos aponta para o fornecedor errado.

### 2.4 `README.md`

| Promessa (arquivo:linha) | Verificação |
|---|---|
| *"\| OpenAI GPT-4V \| Análise de imagem \|"* — `README.md:129` | ⬛ Idem §2.2 — é Gemini 1.5 Flash via Lovable |
| *"`OPENAI_API_KEY=sk-...`"* — `README.md:208-209` | ⬛ Variável morta |
| *"`VITE_MEDIAMTX_URL=http://localhost:8888`"* — `README.md:219` e `docker-compose.yml:19` | ⬛ **Nome inexistente no código.** `src/hooks/useMediaMTX.ts:75-77` lê `VITE_MEDIAMTX_HLS_URL`/`_WEBRTC_URL`/`_RTSP_URL`. O `docker-compose.yml` passa a variável errada como build-arg — o container sai com o fallback `localhost:8888` cravado (a mesma regressão que `scripts/check-env-contract.mjs:5-8` diz ter travado, mas o gate não cobre `docker-compose.yml`) |
| *"\| TensorFlow.js \| COCO-SSD \| MoveNet \|"* — `README.md:121-126` | 🟦 Dependências instaladas e carregadas lazily (`useMLModels.ts:12,22,27`), porém `model_thresholds` = 0 e `event_detections` = 0 — sem operação comprovada |

### 2.5 `docs/WEBHOOKS.md`

> *"const webhook = await webhookService.create({ url, secret, events, enabled })"* — `docs/WEBHOOKS.md:30-35`
> Catálogo de 8 eventos: `alert.created`, `alert.acknowledged`, `recognition.match`,
> `recognition.unknown`, `zone.violation`, `camera.status`, `recording.started`, `recording.stopped` — `docs/WEBHOOKS.md:11-19`

⬛ `grep -rn "webhookService" src` → **zero ocorrências**. Não existe registro/CRUD de webhooks.
O único webhook de saída real emite **um único evento** — `alert.created`
(`send-alert-notification/index.ts:286`) — com URLs vindas do payload da chamada, não de configuração
persistida. **7 dos 8 eventos prometidos não existem.**

### 2.6 `docs/AI_MODELS.md`

> *"`await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')`"* — `docs/AI_MODELS.md:31`

⬛ Caminho `/models` está **vazio** (`public/models/` contém só `README.md`), e o código usa CDN
(`src/config/models_config.ts:17,21`). O snippet da doc falharia com 404.

### 2.7 `docs/MONITORING.md` / `observability/README.md`

> *"O token vem do secret `PROMETHEUS_METRICS_BEARER_TOKEN` (Lovable Cloud)."* — `observability/README.md:35`
> *"Roteamento: `critical` → PagerDuty; demais → Telegram Ops."* — `observability/README.md:41`

🟦 O bundle de observabilidade é **inteiramente aspiracional**: nenhum Prometheus, Alertmanager,
Grafana ou Blackbox aparece em `docker-compose.yml`, `docker-compose.dev.yml`,
`docker-compose.prod.yml`, `docker/` ou `k8s/`. Os arquivos são artefatos versionados sem consumidor.

---

## 3. Síntese quantitativa

| Classificação | Quantidade | Observação |
|---|---|---|
| ✅ IMPLEMENTADO_TOTAL | **0** | **Nenhuma** integração externa satisfaz os quatro critérios simultaneamente. A única com tráfego comprovado (`camera_vault_audit`, 878 linhas) é interna ao Supabase e sua contraparte de leitura acumulou 90.462 erros |
| 🟨 PARCIAL | 10 | MediaMTX playback, RTSP handshake, cofre de câmera, Lovable AI Gateway, face-api.js, Mapbox, Telegram, Resend, Prometheus endpoint, OAuth Lovable |
| 🟦 SUGERIDO_OU_INICIADO | 30 | Maioria com código sério e completo, mas **credencial não declarada + tabela de registro vazia** |
| ⬛ MORTO / INEXISTENTE | 10 | Sentry, Redis, Push Web, Slack (app), Twilio, SendGrid, OpenAI, Bitrix24, Pagamento, OpenTelemetry |

**Variáveis de ambiente exigidas por Edge Functions e ausentes de TODOS os `.env*` do repositório**
(levantadas por `grep -roE "Deno.env.get\('[A-Z0-9_]+'\)" supabase/functions` cruzado com os `.env*`):

`LOVABLE_API_KEY`, `REPLICATE_API_TOKEN`, `MAPBOX_PUBLIC_TOKEN`, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_WARM_BUCKET`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_COLD_BUCKET`, `S3_COLD_STORAGE_CLASS`,
`WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_INSTANCE`, `ALERTMANAGER_URL`,
`ALERTMANAGER_TOKEN`, `PROMETHEUS_METRICS_BEARER_TOKEN`, `CAMERA_VAULT_KEY`,
`CAMERA_VAULT_KEK_V1`, `INGEST_WEBHOOK_SECRET`, `MEDIAMTX_HLS_BASE`, `MEDIAMTX_ADMIN_ROLES`,
`RETENTION_SECRET`, `MIGRATE_HELPER_ACCESS_KEY`, `CSP_ALERT_TELEGRAM_BOT_TOKEN`,
`CSP_ALERT_TELEGRAM_CHAT_ID`, `MAINTENANCE_ALERT_EMAIL`, `MAINTENANCE_ALERT_FROM`,
`TRUSTED_IPS`, `BLOCKED_IPS`, `ADMIN_IPS`, `VAULT_WATCHDOG_DEDUP_MIN`.

**Inverso — variáveis declaradas em `.env.example` sem nenhum consumidor:**
`OPENAI_API_KEY` (`.env.example:31`), `BITRIX24_WEBHOOK_URL` (`.env.example:36`).

---

## 4. Lacunas desta auditoria

Limites do que foi possível medir. Nada abaixo deve ser lido como afirmação sobre o estado real.

1. **`node_modules` não instalado** (`_FATOS_RUNTIME.md:93`). Nenhum build, lint, teste ou execução foi
   realizado. Não afirmo que qualquer integração "compila" ou "funciona" — apenas que o código existe
   ou não, e que o banco registra ou não tráfego.

2. **Segredos de produção são invisíveis.** Edge Functions do Supabase leem segredos do painel da
   plataforma, não de arquivos `.env` do repositório. Onde escrevi "credencial ausente", o que medi é
   *"ausente da configuração versionada"*. Nos casos de **Telegram** e **Resend** existe prova indireta
   forte da ausência **real** em produção (`cron_watchdog_escalations.delivery_error =
   'telegram_not_configured'` em 7.184/7.184 linhas; `maintenance_dispatch_runs.detail.reason =
   'no_channels_configured'` em 52/52). Para as demais (Replicate, R2, AWS, WhatsApp, Mapbox,
   Alertmanager, Prometheus) **não há prova direta** — apenas ausência de tráfego, que é compatível
   tanto com "segredo faltando" quanto com "recurso nunca acionado".

3. **Retenção do `pg_net` é curta.** `net._http_response` retinha 1.536 linhas cobrindo apenas
   ~6 horas (2026-08-16 10:54 → 16:53). A conclusão "100 % de falha de DNS" é sólida para essa janela;
   não posso afirmar desde quando a falha existe. A correlação com o corte de
   `camera_health_state.last_check_at` (2026-07-31) e `edge_function_error_audit` (2026-07-31) **sugere**
   ~16 dias, mas isso é inferência, não medição.

4. **Não consegui distinguir com certeza projeto Supabase.** `.env.production:5`, `supabase/config.toml:1`
   e `public/openapi.yaml:12` apontam para `fsisdfdwlbfeadwfqpir`. O banco auditado bate exatamente com
   `_FATOS_RUNTIME.md` (169 tabelas em `public`, 69 cron jobs, 35 câmeras, 26.879 alertas), então é o
   mesmo banco daquela medição. **Se** esse banco pertencer a outro projeto que não
   `fsisdfdwlbfeadwfqpir`, isso explicaria diretamente o "Couldn't resolve host name" — mas não confirmei
   a identidade do projeto e não especulo sobre a causa raiz.

5. **Não inspecionei logs das Edge Functions** (retidos na plataforma Supabase, fora do alcance por SQL).
   Integrações invocadas diretamente pelo navegador (`supabase.functions.invoke`) — Mapbox,
   InsightFace, `send-telegram`, `analyze-image` — poderiam ter tráfego que **não deixa rastro em
   tabela**. Para essas, usei tabelas de destino como proxy (`face_embeddings` = 0,
   `model_thresholds` = 0), o que é evidência forte mas não exaustiva.

6. **Seed vs. tráfego orgânico não é 100 % separável.** Classifiquei `recognition_logs` (250),
   `plate_detections` (100) e `behavior_analyses` (100) como prováveis dados semeados — com base em
   volumes redondos, **camera_id único** nos dois primeiros, corte abrupto em 2026-08-09 e existência de
   `supabase/seed_behavior.sql`, `seed_ppe.sql`, `seed_intelligence.sql`. Não li o conteúdo dos seeds
   linha a linha para confirmar correspondência exata.

7. **Escopo deliberadamente excluído:** UI/UX, lógica de negócio interna, migrations/drift de schema,
   RLS, CI/CD e qualidade de teste. `_FATOS_RUNTIME.md:12-19` documenta drift crítico de migrations
   (361 arquivos versionados vs. 3 registrados) — mencionado aqui **apenas** porque significa que o
   schema vivo pode divergir do que o código de integração espera, o que é uma fonte plausível dos
   `rpc_failed` de `resolve-camera-url`. Diagnóstico dessa causa pertence a outra dimensão.

8. **Não testei nenhum endpoint externo.** Não fiz chamada a Mapbox, Replicate, Resend, Telegram,
   Lovable Gateway, R2, S3 ou qualquer receptora. Toda avaliação é estática (código + config) ou
   observacional (banco).
