# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `77f8a4df80b10c1c25169538a3a664fb9aa368c6` (2026-11-26T19:54:02-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (1645), Markdown (406), SQL (378), JavaScript (291), JSON (99), YAML (80), Shell (17), Python (8)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright, cypress
- ui: tailwind, radix/shadcn
- estado: react-query, zustand, jotai
- gerenciador_pacotes: bun
- node: 22
- python: n/d
- deploy: vercel, netlify, docker, compose/swarm, fly, render, railway
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 2977 |
| arquivos_codigo | 1928 |
| linhas_codigo | 334359 |
| rotas | 89 |
| rotas_http_backend | 15 |
| vistas_por_id | 0 |
| itens_menu | 84 |
| modulos | 146 |
| componentes | 630 |
| hooks | 231 |
| edge_functions | 74 |
| tabelas | 185 |
| migrations | 364 |
| cron_jobs | 48 |
| testes | 263 |
| workflows | 46 |
| scripts | 351 |
| docs_md | 406 |

## Onde ficam as coisas
- telas: src/pages (77)
- componentes: src/components (522), src/pages (84), src/contexts (11)
- hooks: src/hooks (171), src/components (21), src/stores (17)
- servicos_logica: src/lib (185), src/stores (18), src/config (11)
- testes: co-localizado (__tests__) (170), tests/ (41), outro (31)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/inventario (5), scripts/maintenance (4), scripts/ci (3)
- docs: docs (167), (raiz) (13), .github (6)
- nomenclatura: {"componentes":"PascalCase (92%)","hooks":"use + PascalCase","servicos":"camelCase (97%)","edge_functions":"kebab-case (99%)","tabelas":"snake_case (94%)"}
- instruções para agentes no repo: .claude/CLAUDE.md, AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components | 0 | 0 | 119 | 99 | 22 | 46 |
| components/admin | 0 | 0 | 62 | 8 | 7 | 21 |
| components/alarms | 0 | 0 | 8 | 9 | 0 | 5 |
| components/alerts | 0 | 0 | 7 | 0 | 0 | 0 |
| components/analytics | 0 | 0 | 5 | 0 | 0 | 0 |
| components/cameras | 0 | 0 | 22 | 36 | 15 | 23 |
| components/common | 0 | 0 | 15 | 0 | 0 | 0 |
| components/dashboard | 0 | 0 | 13 | 32 | 4 | 7 |
| components/emap | 0 | 0 | 10 | 0 | 0 | 0 |
| components/faces | 0 | 0 | 6 | 1 | 1 | 2 |
| components/license-plate | 0 | 0 | 6 | 2 | 0 | 2 |
| components/maintenance | 0 | 0 | 11 | 1 | 0 | 2 |
| components/notification-settings | 0 | 0 | 5 | 2 | 1 | 1 |
| components/people | 0 | 0 | 7 | 7 | 2 | 3 |
| components/ppe | 0 | 0 | 5 | 6 | 1 | 2 |
| components/ptz | 0 | 0 | 19 | 3 | 4 | 6 |
| components/reports | 0 | 0 | 5 | 0 | 0 | 0 |
| components/scanner | 0 | 0 | 5 | 0 | 0 | 0 |
| components/security | 0 | 0 | 10 | 3 | 1 | 4 |
| components/settings | 0 | 0 | 12 | 5 | 0 | 10 |
| components/sidebar | 0 | 0 | 21 | 96 | 22 | 46 |
| components/skeletons | 0 | 0 | 13 | 0 | 0 | 0 |
| components/ui | 0 | 0 | 80 | 8 | 0 | 0 |
| components/video-player | 0 | 0 | 6 | 2 | 1 | 0 |
| components/widgets | 0 | 0 | 33 | 4 | 0 | 2 |
| components/zones | 0 | 0 | 5 | 22 | 3 | 4 |
| config | 0 | 0 | 11 | 96 | 22 | 46 |
| constants | 0 | 0 | 22 | 0 | 0 | 0 |
| contexts | 0 | 0 | 12 | 7 | 0 | 1 |
| hooks | 0 | 0 | 157 | 158 | 13 | 70 |
| layouts | 0 | 0 | 6 | 96 | 22 | 46 |
| lib | 0 | 0 | 72 | 96 | 22 | 46 |
| lib/alarms | 0 | 0 | 23 | 0 | 0 | 0 |
| lib/collab | 0 | 0 | 8 | 0 | 0 | 0 |
| lib/devices | 0 | 0 | 11 | 0 | 0 | 0 |
| lib/emap | 0 | 0 | 16 | 0 | 0 | 0 |
| lib/faces | 0 | 0 | 7 | 0 | 0 | 0 |
| lib/insightface | 0 | 0 | 6 | 1 | 0 | 2 |
| lib/maintenance | 0 | 0 | 12 | 0 | 0 | 0 |
| lib/retention | 0 | 0 | 6 | 0 | 0 | 0 |
| lib/vision | 0 | 0 | 9 | 0 | 0 | 0 |
| middleware | 0 | 0 | 6 | 0 | 0 | 0 |
| pages | 76 | 75 | 75 | 140 | 36 | 102 |
| pages/dev | 0 | 2 | 2 | 1 | 2 | 6 |
| providers | 0 | 0 | 7 | 2 | 0 | 1 |
| stores | 0 | 0 | 18 | 1 | 0 | 0 |
| types | 0 | 0 | 11 | 2 | 1 | 0 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/Index.tsx
- `/__test/live-preview` [tela] → src/pages/dev/LivePreviewHarnessPage.tsx
- `/__test/ptz-calibration` [tela] → src/pages/dev/PtzCalibrationHarnessPage.tsx
- `/*` [tela] → src/pages/NotFound.tsx
- `/acesso-negado` [tela] → src/pages/AcessoNegado.tsx
- `/admin/api-usage` [tela] → src/pages/ApiUsageDashboardPage.tsx (protegida)
- `/admin/csp-reports` [tela] → src/pages/CspReportsDashboardPage.tsx (protegida)
- `/agentes-locais` [tela] → src/pages/LocalAgentsPage.tsx (protegida)
- `/alarm-schemes` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/alerts` [tela] → src/pages/AlertsPage.tsx (protegida)
- `/alerts-timeline` [tela] → src/pages/AlertsTimelinePage.tsx (protegida)
- `/analytics` [tela] → src/pages/AnalyticsPage.tsx (protegida)
- `/auth` [tela] → src/pages/Auth.tsx (protegida)
- `/auth/callback` [tela] → src/pages/AuthCallback.tsx (protegida)
- `/automation-rules` [tela] → src/pages/AutomationRulesPage.tsx (protegida)
- `/bandwidth-monitor` [tela] → src/pages/BandwidthMonitorPage.tsx (protegida)
- `/behavior-detection` [tela] → src/pages/BehaviorDetectionPage.tsx (protegida)
- `/busca-de-faces` [tela] → src/pages/FaceSearchPage.tsx (protegida)
- `/cameras` [tela] → src/pages/CamerasPage.tsx (protegida)
- `/cameras/:id/status` [tela] → src/pages/CameraStatusPage.tsx (protegida)
- `/cameras/frota` [tela] → src/pages/CameraFleetHealthPage.tsx (protegida)
- `/cameras/novo` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/cls-report` [tela] → src/pages/CLSReportPage.tsx (protegida)
- `/collaborator-flow` [tela] → src/pages/CollaboratorFlowMapPage.tsx (protegida)
- `/conferencia-atestado` [tela] → src/pages/AttestationConferencePage.tsx (protegida)
- `/coverage` [tela] → src/pages/CoveragePage.tsx (protegida)
- `/dashboard` [tela] → src/pages/DashboardV2.tsx (protegida)
- `/dev/loading-states` [tela] → src/pages/LoadingStatesChecklistPage.tsx (protegida)
- `/dispositivos` [tela] → src/pages/DeviceRegistrationsPage.tsx (protegida)
- `/docs/api` [tela] → src/pages/ApiDocsPage.tsx
- `/esquemas-de-alarme` [tela] → src/pages/AlarmSchemesPage.tsx (protegida)
- `/evaluation` [tela] → src/pages/EvaluationPage.tsx (protegida)
- `/event-alerts` [tela] → src/pages/EventAlertsDashboardPage.tsx (protegida)
- `/eventos/fora-de-area` [tela] → src/pages/OutOfAreaEventsPage.tsx (protegida)
- `/eventos/noturnos` [tela] → src/pages/NightSuspiciousEventsPage.tsx (protegida)
- `/face-recognition` [tela] → src/pages/FaceRecognitionPage.tsx (protegida)
- `/face-search` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/favoritos` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/frota` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/goals-alerts` [tela] → src/pages/GoalsAlertsPage.tsx (protegida)
- `/heatmap` [tela] → src/pages/HeatmapPage.tsx (protegida)
- `/help` [tela] → src/pages/HelpPage.tsx (protegida)
- `/journey-reports` [tela] → src/pages/JourneyReportsPage.tsx (protegida)
- `/license-plate` [tela] → src/pages/LicensePlatePage.tsx (protegida)
- `/login` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/maintenance` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/manutencao` [tela] → src/pages/MaintenanceConsolePage.tsx (protegida)
- `/monitor/:cameraId` [tela] → src/pages/DetachedMonitorPage.tsx (protegida)
- `/motion-masks` [tela] → src/pages/MotionMasksPage.tsx (protegida)
- `/notificacoes` [tela] → src/pages/IncidentNotificationsPage.tsx (protegida)
- `/notification-settings` [tela] → src/pages/NotificationSettingsPage.tsx (protegida)
- `/nvr-downloads` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/nvrs` [tela] → src/pages/NvrsPage.tsx (protegida)
- `/nvrs/:id` [tela] → src/pages/NvrDetailPage.tsx (protegida)
- `/operations` [tela] → src/pages/OperationsPage.tsx (protegida)
- `/panic-events` [tela] → src/pages/PanicEventsPage.tsx (protegida)
- `/people` [tela] → src/pages/PeoplePage.tsx (protegida)
- `/persons` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/planta-baixa` [tela] → src/pages/SitePlanPage.tsx (protegida)
- `/playback` [tela] → src/pages/SyncPlaybackPage.tsx (protegida)
- `/playback/downloads` [tela] → src/pages/NvrDownloadsPage.tsx (protegida)
- `/playback/downloads/history` [tela] → src/pages/NvrDownloadHistoryPage.tsx (protegida)
- `/ppe` [tela] → src/pages/PPEPage.tsx (protegida)
- `/precos` [tela] → src/pages/PricingPage.tsx
- `/pricing` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/productivity` [tela] → src/pages/ProductivityDashboardPage.tsx (protegida)
- `/profile` [tela] → src/pages/ProfilePage.tsx (protegida)
- `/recognition-analytics` [tela] → src/pages/RecognitionAnalyticsPage.tsx (protegida)
- `/recognition-logs` [tela] → src/pages/RecognitionLogsPage.tsx (protegida)
- `/recordings` [tela] → src/pages/RecordingsPage.tsx (protegida)
- `/rede-colaborativa` [tela] → src/pages/CollabNetworkPage.tsx (protegida)
- `/register` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/registro-probatorio` [tela] → src/pages/EvidenceExportsPage.tsx (protegida)
- `/relatorio-semanal` [tela] → src/pages/WeeklyReportPage.tsx (protegida)
- `/reports` [tela] → src/pages/ReportsPage.tsx (protegida)
- `/reset-password` [tela] → src/pages/ResetPasswordPage.tsx
- `/schedules` [tela] → src/pages/SchedulesPage.tsx (protegida)
- `/security` [tela] → src/pages/SecurityPage.tsx (protegida)
- `/settings` [tela] → src/pages/SettingsPage.tsx (protegida)
- `/stream-alert-thresholds` [tela] → src/pages/StreamAlertThresholdsPage.tsx (protegida)
- `/stream-health` [tela] → src/pages/StreamHealthPage.tsx (protegida)
- `/stream-settings` [tela] → src/pages/StreamSettingsPage.tsx (protegida)
- `/telegram-settings` [tela] → src/pages/TelegramSettingsPage.tsx (protegida)
- `/test-mode` [tela] → src/pages/TestModePage.tsx (protegida)
- `/timelapse` [tela] → src/pages/TimelapsePage.tsx (protegida)
- `/users` [tela] → src/pages/UserManagementPage.tsx (protegida)
- `/vehicles` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/visualizacoes` [tela] → src/pages/FavoriteViewsPage.tsx (protegida)
- `/zones` [tela] → src/pages/ZonesPage.tsx (protegida)

## Rotas HTTP de backend
- `GET /{t}` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `DELETE /c` → scripts/ai-context/cenarios.mjs
- `PUT /d` → scripts/ai-context/cenarios.mjs
- `GET /items` → scripts/ai-context/gerar.unit.mjs
- `GET /u` → scripts/ai-context/cenarios.mjs
- `GET /users` → scripts/ai-context/cenarios.mjs
- `POST /users/:id` → scripts/ai-context/cenarios.mjs
- `GET /x` → scripts/ai-context/cenarios.mjs
- `POST ${FN_PATH}?action=create` → tests/e2e/alertmanager-silence.spec.ts
- `GET ${FN_PATH}?action=list` → tests/e2e/alertmanager-silence.spec.ts
- `DELETE ${FN_PATH}?id=abcd1234` → tests/e2e/alertmanager-silence.spec.ts

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `admin-slow-queries` — tabelas: -; chamada por 1 arquivo(s) do front
- `admin-users` — tabelas: profiles, user_roles; chamada por 1 arquivo(s) do front
- `agent-ingest` — tabelas: agent_discoveries, agent_relay_tasks, local_agents; chamada por 2 arquivo(s) do front
- `agent-pair` — tabelas: local_agents; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `alertmanager-silence` — tabelas: alertmanager_silences_audit; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `analyze-image` — tabelas: -; chamada por 3 arquivo(s) do front
- `analyze-license-plate` — tabelas: -; chamada por 1 arquivo(s) do front
- `archive-warm-to-cold` — tabelas: media_assets; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `camera-credentials-vault` — tabelas: camera_vault_audit, user_roles; chamada por 2 arquivo(s) do front
- `camera-health-monitor` — tabelas: alerts, camera_health_state, cameras, notification_configs, stream_health_checks; chamada por 2 arquivo(s) do front, por SQL/cron
- `camera-io-control` — tabelas: camera_io_ports, camera_ptz_config, cameras, io_actuation_log; chamada por 1 arquivo(s) do front
- `camera-port-probe` — tabelas: -; chamada por 2 arquivo(s) do front
- `camera-ptz-control` — tabelas: audit_logs, camera_presets, camera_ptz_config, ptz_connection_attempts, user_roles; chamada por 1 arquivo(s) do front
- `check-ip` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `compare-faces` — tabelas: -; chamada por 3 arquivo(s) do front
- `connectivity-resolution-alert` — tabelas: connectivity_resolution_telemetry; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `cron-watchdog` — tabelas: cron_watchdog_runs; chamada por 1 arquivo(s) do front
- `cron-watchdog-escalate` — tabelas: cron_watchdog_escalations; chamada por 1 arquivo(s) do front
- `csp-anomaly-notify` (verify_jwt=false) — tabelas: audit_logs; chamada por 0 arquivo(s) do front
- `csp-report` — tabelas: csp_violation_reports; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `delete-my-account` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `detect-behavior` — tabelas: -; chamada por 1 arquivo(s) do front
- `detect-faces` — tabelas: -; chamada por 2 arquivo(s) do front
- `device-commands` — tabelas: device_registration_audit, device_registrations, device_remote_commands; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `device-connect` — tabelas: device_registration_audit, device_registrations; chamada por 1 arquivo(s) do front
- `evidence-seal` — tabelas: cameras, evidence_exports; chamada por 1 arquivo(s) do front
- `firmware-fingerprint` — tabelas: firmware_fingerprint_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `fleet-health` — tabelas: camera_health_state, cameras, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `forget-user-media` — tabelas: media_assets, media_forget_audit; chamada por 1 arquivo(s) do front
- `generate-face-encoding` — tabelas: -; chamada por 1 arquivo(s) do front
- `get-mapbox-token` — tabelas: -; chamada por 1 arquivo(s) do front
- `glacier-stuck-monitor` (verify_jwt=false) — tabelas: glacier_stuck_alerts; chamada por 0 arquivo(s) do front
- `health` (verify_jwt=false) — tabelas: query_telemetry; chamada por 0 arquivo(s) do front
- `ingest-auth` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `insightface-analyze` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `insightface-detect` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `insightface-encode` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `insightface-liveness` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `insightface-migrate-batch` — tabelas: face_embeddings, registered_persons; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `maintenance-alerts-dispatch` (verify_jwt=false) — tabelas: maintenance_alert_dispatches, maintenance_alert_events, maintenance_dispatch_runs, maintenance_dispatch_suppressions; chamada por 0 arquivo(s) do front, por SQL/cron
- `mediamtx-proxy` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `metrics-prometheus` (verify_jwt=false) — tabelas: glacier_stuck_alerts; chamada por 1 arquivo(s) do front
- `migrate-helper` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `monitoring-center-dispatch` — tabelas: monitoring_center_accounts; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `nvr-recording-convert` — tabelas: nvr_recording_downloads; chamada por 1 arquivo(s) do front
- `nvr-recording-download` — tabelas: nvr_recording_downloads; chamada por 1 arquivo(s) do front
- `onvif-autodiscover` — tabelas: agent_relay_tasks, local_agents; chamada por 2 arquivo(s) do front
- `onvif-event-puller` — tabelas: camera_ptz_config, cameras, internal_cron_secrets, onvif_event_subscriptions; chamada por 0 arquivo(s) do front, por SQL/cron
- `preview-telemetry-alert` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front, por SQL/cron
- `process-automation-rules` — tabelas: cameras, notification_configs, rule_executions, rules, video_clips; chamada por 0 arquivo(s) do front
- `process-frame` — tabelas: camera_detection_rules, camera_events, cameras, event_alerts, event_detections, organization_members, zone_events, zones; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `promote-hot-to-warm` — tabelas: media_assets; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `promote-test-executions` — tabelas: alerts, notification_configs, rule_executions, test_mode_sessions; chamada por 1 arquivo(s) do front
- `ptz-backends-test` — tabelas: audit_logs, camera_ptz_config, ptz_connection_attempts, user_roles; chamada por 1 arquivo(s) do front
- `ptz-onvif-discover` — tabelas: camera_presets, camera_ptz_config, camera_vault_audit, cameras, user_roles; chamada por 2 arquivo(s) do front
- `ptz-presets-import` — tabelas: audit_logs, camera_presets, camera_ptz_config, cameras, user_roles; chamada por 1 arquivo(s) do front
- `public-api` — tabelas: alerts, api_usage_logs, arm_disarm_states, cameras, event_alerts, panic_events, recordings, video_clips; chamada por 1 arquivo(s) do front
- `replay-rule-execution` — tabelas: alerts, rule_executions, test_mode_sessions; chamada por 1 arquivo(s) do front
- `resolve-camera-url` — tabelas: -; chamada por 0 arquivo(s) do front
- `resolve-media-url` — tabelas: media_assets; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `rtsp-preview` — tabelas: rtsp_preview_sessions; chamada por 1 arquivo(s) do front
- `rtsp-revalidate-scheduler` — tabelas: rtsp_revalidation_schedules; chamada por 0 arquivo(s) do front, por SQL/cron
- `run-retention` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `send-alert-notification` — tabelas: -; chamada por 3 arquivo(s) do front
- `send-telegram` — tabelas: -; chamada por 2 arquivo(s) do front
- `settings-backup` — tabelas: cameras, notification_configs, rules, zones; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `storage-tiering-orchestrator` — tabelas: media_assets, storage_tiering_runs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `stream-health-probe` (verify_jwt=false) — tabelas: cameras, stream_health_checks; chamada por 2 arquivo(s) do front
- `timeline-attest` — tabelas: timeline_attestations; chamada por 1 arquivo(s) do front
- `upload-media` — tabelas: media_assets; chamada por 2 arquivo(s) do front
- `validate-rtsp-stream` — tabelas: alerts, audit_logs, camera_health_state, cameras, notification_configs, stream_alert_thresholds, stream_health_checks; chamada por 2 arquivo(s) do front
- `vault-coverage-watchdog` (verify_jwt=false) — tabelas: camera_vault_audit, camera_vault_coverage_alerts; chamada por 0 arquivo(s) do front
- `watchdog-ack-sla-alert` (verify_jwt=false) — tabelas: cron_watchdog_escalations; chamada por 0 arquivo(s) do front
- `wizard-apply-camera-setup` — tabelas: -; chamada por 1 arquivo(s) do front

## Cron jobs (pg_cron / vercel)
- `admission-backlog-fanin` 17 4 * * * (20260728214725_dd10a129-4393-4fdd-bcf1-9ee1e9aebea0.sql)
- `camera_health_monitor_every_3m` */3 * * * * → edge camera-health-monitor (20260722160517_e09ef3b9-cf60-4380-9b63-be6b03f1da08.sql)
- `camera-clock-skew-daily` 37 2 * * * (20260726164045_4f752cdc-864d-4d6e-9af1-01bb6bd4ace1.sql)
- `camera-schedules-tick` * * * * * (20260721223250_826b4eec-9373-499c-a8dd-ca1ec3bc9c2e.sql)
- `cleanup-old-test-events` 17 3 * * * (20260722154205_5339226b-52b4-486b-bd8b-fc81f24dae65.sql)
- `close-expired-test-sessions` * * * * * (20260722154205_5339226b-52b4-486b-bd8b-fc81f24dae65.sql)
- `collab-expire-invitations` 11 * * * * (20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql)
- `collab-purge-entries` 29 3 * * * (20260726213824_8e8ceb67-bec1-4f50-8621-0a7977747cad.sql)
- `collab-purge-notifications` 41 * * * * (20260726213323_a51dadea-1b39-4872-a508-6d55c3d4f28d.sql)
- `correlate-backlog-root-cause` 47 */6 * * * (20260726171536_0c67e895-1d6a-4abb-ac82-5c5b62aefce7.sql)
- `drain-default-partitions-daily` 47 3 * * * (20260726161031_f6cd3ef5-c6e9-449d-a26e-275592a89a9a.sql)
- `ensure-future-partitions-daily` 17 3 * * * (20260726160312_a030319d-6cbf-4eda-8f72-534488c93caf.sql)
- `evaluate_and_restart_streams_every_2m` */2 * * * * (20260721224954_defe3350-72e4-4a38-95ca-2a165a0b0fca.sql)
- `evaluate-abandoned-episode-alerts` 19 * * * * (20260728114331_9fc51fcf-f5e4-4eda-a8c0-db8fd216b923.sql)
- `evaluate-admission-reconcile` 53 3 * * * (20260728220009_6f6f2266-2f7b-4c85-a1ba-77ef0c107960.sql)
- `evaluate-admission-trend` 55 3 * * * (20260728221817_40ddd631-d738-47a4-a38d-75fa95a6ad6b.sql)
- `evaluate-blame-alerts` */10 * * * * (20260727191150_d75437e5-2b45-4389-aede-2fc23c9936df.sql)
- `evaluate-device-silence` */10 * * * * (20260728132715_25d51dfc-b806-4239-9ca3-1f19a925e460.sql)
- `evaluate-maintenance-alerts` 23 * * * * (20260726162557_5a851bad-4c84-45f8-8c4e-faef1d9f61d2.sql)
- `evaluate-retention-alerts` 33 * * * * (20260726214946_94268541-a9fc-4df5-8a7e-296c711c84be.sql)
- `expire-device-remote-commands` */2 * * * * (20260728133707_8928683b-42ce-4e11-993d-a13b95d3ae33.sql)
- `heal-local-agents` */10 * * * * (20260726170712_7387281b-5d67-4c52-843a-809f062cf42c.sql)
- `maintenance-alerts-dispatch-hourly` 33 * * * * → edge maintenance-alerts-dispatch (20260726163231_161aa556-2b59-412e-ab65-3eceadd4eccc.sql)
- `onvif-event-puller-minutely` * * * * * (20260727215240_50209121-e802-4bef-8614-73ef9d70c854.sql)
- `partition-backlog-sampler` 13,43 * * * * (20260726165123_bf1cbeb3-8556-483b-8157-dcb7fac91032.sql)
- `preview-telemetry-alert-15min` */15 * * * * → edge preview-telemetry-alert (20260723134939_31d48320-1eaa-4448-9d0e-38cff13cdc95.sql)
- `prune_edge_function_error_audit_daily` 15 3 * * * (20260723160840_596c0977-bbf2-410c-a98a-97e8a64ff954.sql)
- `prune-cron-watchdog-escalations-daily` 15 3 * * * (20260723164151_f00a08e6-0296-4734-9c12-dfbb6644f7fd.sql)
- `prune-cron-watchdog-runs-daily` 17 3 * * * (20260723163456_93aea3f6-3451-4a78-a44c-bb1fdb30fb0e.sql)
- `prune-preview-telemetry-daily` 15 3 * * * (20260723134742_03a140d8-7fcf-457a-b391-10d08bf2f25a.sql)
- `purge-admission-ledger` 47 3 * * * (20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql)
- `purge-admission-reconcile-snapshots` 43 3 * * * (20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql)
- `purge-agent-discoveries` 35 3 * * * (20260723152313_5f2f9f3f-9eeb-4b48-b8e9-018305dd51b6.sql)
- `purge-agent-relay-tasks` 15 3 * * * (20260723151542_7896555a-0955-468f-8280-b381fad151c0.sql)
- `purge-alarm-recurrence-episodes` 51 3 * * * (20260728113255_55a06d58-5b6e-46d8-9b28-3a9cb31930c2.sql)
- `purge-bandwidth-samples-daily` 15 3 * * * (20260722100501_6c6475a8-ae89-40ab-a941-f8ae8923996e.sql)
- `purge-cron-history-daily` 23 4 * * * (20260907120000_fix_operational_metrics_cron_health_and_purge.sql)
- `record-admission-reconcile-snapshot` 51 3 * * * (20260728221148_d1e46a1a-e9cd-4bb8-a86d-875804100f02.sql)
- `relay-purge-watchdog` 17 */6 * * * (20260723152212_f1fb73ae-411a-4be8-bb9c-7dc8e7dd67a5.sql)
- `relay-redelivery-health` 23 * * * * (20260726182514_daa52b02-2cd7-469b-9ca2-1e3ac235b3b3.sql)
- `relay-reliability-check` */15 * * * * (20260723151433_06e2e954-1fc2-40a6-b731-68809c507e57.sql)
- `rtsp-revalidate-scheduler-every-minute` * * * * * (20260722161441_6c8be835-6470-4d0f-8c3e-ab8af63b4a0d.sql)
- `sweep-device-remote-commands` */5 * * * * (20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql)
- `timelapse-capture-tick` * * * * * (20260721224434_d87b33aa-87de-4a92-8cb0-5859f4dfaee3.sql)
- `timelapse-purge-daily` 15 3 * * * (20260721224434_d87b33aa-87de-4a92-8cb0-5859f4dfaee3.sql)
- `triage-default-quarantine` 57 2 * * * (20260726161919_2dcc9663-b934-4550-8dee-e5a5bc153c1f.sql)
- `visao-csp-anomaly-check` */15 * * * * (20260717131325_8693bbee-57b5-4645-875e-83bd1681f913.sql)
- `visao-weekly-selective-vacuum` 15 3 * * 0 (20260717133548_c0aaa9c7-81bf-4b3e-b901-34680c898ef1.sql)

## Integrações externas
- SDKs: Supabase, i18next, react-query, zod
- hosts mais citados: api.telegram.org, www.onvif.org, ai.gateway.lovable.dev, docs.oasis-open.org, pmzxbffnbenkmzpnbehb.supabase.co, x.supabase.co, api.resend.com, evil.example, qnjozykmaeifjqpicaue.supabase.co, assets.mixkit.co, www.google.com, 76579cc3-ec2f-4e92-bdb3-20d12f2c763d.lovableproject.com, 837595d9-3a7f-4e37-9433-f7e4909f201a.lovableproject.com, api.exemplo.com, api.ipify.org
- webhooks recebidos: csp-anomaly-notify, glacier-stuck-monitor, health, maintenance-alerts-dispatch, metrics-prometheus, migrate-helper, preview-telemetry-alert, stream-health-probe, vault-coverage-watchdog, watchdog-ack-sla-alert
- env de integração (só nomes): AGENT_TOKEN, ALERTMANAGER_TOKEN, AWS_SECRET_ACCESS_KEY, BITRIX24_WEBHOOK_URL, CSP_ALERT_TELEGRAM_BOT_TOKEN, INGEST_WEBHOOK_SECRET, LOVABLE_API_KEY, MAPBOX_ACCESS_TOKEN, MAPBOX_PUBLIC_TOKEN, OPENAI_API_KEY, PROMETHEUS_METRICS_BEARER_TOKEN, R2_SECRET_ACCESS_KEY, R2_WARM_BUCKET, REPLICATE_API_TOKEN, RESEND_API_KEY, RESEND_FROM_EMAIL, RETENTION_SECRET, S3_COLD_BUCKET, S3_COLD_STORAGE_CLASS, TELEGRAM_BOT_TOKEN, WHATSAPP_API_KEY, WHATSAPP_API_URL, WHATSAPP_INSTANCE

## Permissões / papéis
- papéis no código: status (31), admin (14), alert (11), button (9), user (8), system (7), group (6), main (6), navigation (6), region (5), img (4), presentation (4), anon (3), dialog (3), link (3), manager (3), operator (3), viewer (3), banner (2), list (2), separator (2), tab (2), agent (1), alertdialog (1), auth_owner (1), authenticated_no_role (1), combobox (1), contentinfo (1), listitem (1), menuitem (1), meter (1), progressbar (1), public (1), service_role (1), slider (1), sup (1), switch (1), toolbar (1), tooltip (1)
- enums de papel: app_role: admin|manager|operator|viewer; org_role: owner|admin|member|viewer
- guards: src/components/ProtectedRoute.tsx · rotas protegidas: 69 · públicas: /, /__test/live-preview, /__test/ptz-calibration, /*, /acesso-negado, /docs/api, /precos, /reset-password
- feature flags: ENABLE_ANALYTICS, ENABLE_DEVTOOLS, FEATURE_CONFIG, FEATURE_X, adminOnly, disabledFeature, enabledFeature, newFlag, nonexistent, nova-tela, novo-inbox, percentFeature

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- componentes_ambiguos: 0
- menu_sem_destino: 6 — ex.: Animação de entrada detectada -> anim-in, Animação de saída detectada -> anim-out, Drawer abre -> open
- edges_orfas: 24 — ex.: agent-pair, alertmanager-silence, archive-warm-to-cold
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 8 — ex.: plate_detections_m2026_05, plate_detections_m2026_06, plate_detections_m2026_07
- tabelas_usadas_sem_definicao: 5 — ex.: avatars, face_detections, faces
- tabelas_com_drift_migration_vs_types: 18 — ex.: alerts, analysis_history, cameras
- rpcs_sem_definicao: 4 — ex.: pg_advisory_unlock, pg_try_advisory_lock, reap_monitoring_center_leases
- componentes_orfaos: 66 — ex.: src/components/AccessDenied.tsx, src/components/AlertDetail.tsx, src/components/AlertNotification.tsx
- componentes_com_nome_duplicado: 73 — ex.: ActionSheet, AlertSeverity, AlertType
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 6 — ex.: DEV, PROD, VITE_COVERAGE_HTML_ARTIFACTS_URL
- ciclos_de_import: 6
- possiveis_segredos_no_codigo: 1 — ex.: scripts/ai-context/cenarios.mjs:1048

## Grafo de código (graphify)
- 22018 nós · 38456 arestas · 1871 comunidades · grafo do commit `77f8a4df`
- comunidades maiores: badge.tsx (511), cn (363), Button (337), scripts (329), react (251), label.tsx (229), utils.ts (170), EvaluationPage.tsx (137), CamerasPage.tsx (115), rateLimiter.ts (108), webhookSchemas.ts (106), AddCameraDialog.tsx (101)
- símbolos mais chamados: cn() (src/lib/utils.ts), useAuth() (src/contexts/AuthContext.tsx), q() (scripts/supabase_snapshot/snapshot.py), useCameras() (src/hooks/useCameras.ts), .collect() (scripts/supabase_snapshot/test_snapshot.py), excluded_sql() (scripts/supabase_snapshot/snapshot.py), fail() (scripts/automation.mjs), getOfflineDB() (src/lib/offlineStorage.ts), useToast() (src/hooks/use-toast.ts), fail() (scripts/graphify-local.mjs), .metadata() (scripts/supabase_snapshot/test_snapshot.py), MaintenanceError (scripts/maintenance/lib.mjs)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- package.json (33)
- package-lock.json (29)
- bun.lock (19)
- CHANGELOG.md (8)
- .github/workflows/ci.yml (5)
- .github/workflows/e2e-playwright.yml (4)
- CLAUDE.md (4)
- src/components/AlertsByCameraChart.tsx (4)
- src/hooks/usePPEDetection.ts (4)
- src/index.css (4)
- tests/e2e/mobile-nav-class-presence.spec.ts (4)
- .github/workflows/inventario-estado-semanal.yml (3)
- docs/AUDITORIA_ENTERPRISE_DETALHADA.md (3)
- docs/agentes/github-ci.md (3)
- scripts/check-lockfile-parity.mjs (3)

## Workflows
- `a11y-axe.yml` — Accessibility (axe-core) (pull_request, push, workflow_dispatch)
- `accessibility.yml` — Accessibility Tests (push, workflow_dispatch)
- `auto-merge.yml` — Auto Merge (pull_request_target)
- `automation-local.yml` — Automação local (pull_request, push, workflow_dispatch)
- `blue-green.yml` — Blue-Green Deployment (workflow_dispatch)
- `bundle-size.yml` — Bundle Size (push, workflow_dispatch)
- `canary-deploy.yml` — Canary Deploy (workflow_dispatch)
- `cd.yml` — Continuous Deployment (push, workflow_dispatch)
- `chromatic.yml` — Chromatic (push, workflow_dispatch)
- `ci-failure-alert.yml` — CI Failure Alert (workflow_run)
- `ci.yml` — CI (pull_request, push, workflow_dispatch)
- `codeql.yml` — CodeQL (push, schedule, workflow_dispatch; cron 0 0 * * 0)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 3 * * * *)
- `coverage.yml` — Coverage Report (pull_request, push, workflow_dispatch)
- `dependency-audit.yml` — dependency-audit (push, schedule, workflow_dispatch; cron 0 0 * * 1)
- `dependency-review.yml` — Dependency Review (pull_request)
- `deploy-freeze-check.yml` — SLO Deploy Freeze Check (pull_request, push, workflow_dispatch)
- `deploy.yml` — Deploy (push, workflow_dispatch)
- `docker-security.yml` — Docker Security (pull_request, push)
- `e2e-coverage.yml` — E2E Coverage (push, workflow_dispatch)
- `e2e-playwright.yml` — E2E Playwright (pull_request, workflow_dispatch)
- `e2e.yml` — E2E Tests (push, workflow_dispatch)
- `feature-flags.yml` — Feature Flags (push, workflow_dispatch)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 23 10 * * 1)
- `k8s-deploy.yml` — Kubernetes Deploy (workflow_dispatch)
- `knip.yml` — Knip — Dead Code Audit (pull_request, push, schedule, workflow_dispatch; cron 0 6 * * 1)
- `labeler.yml` — Labeler (pull_request_target)
- `lighthouse.yml` — Lighthouse CI (push, workflow_dispatch)
- `lint-autofix.yml` — Lint Auto-fix (pull_request, workflow_dispatch)
- `lint.yml` — Lint (pull_request, push, workflow_dispatch)
- `performance.yml` — Performance (push, workflow_dispatch)
- `pr-test-suite.yml` — PR Test Suite (pull_request, workflow_dispatch)
- `pr-verify.yml` — PR Verify Stack & Build (pull_request, workflow_dispatch)
- `preview.yml` — Preview (pull_request)
- `qa-console-full.yml` — QA Console Full Sweep (pull_request, schedule, workflow_dispatch; cron 0 4 * * *)
- `release.yml` — Release (push)
- `rollback.yml` — Rollback (workflow_dispatch)
- `security-scan.yml` — Security Scan (push, schedule, workflow_dispatch; cron 0 0 * * 0)
- `security.yml` — Security (push, schedule, workflow_dispatch; cron 0 0 * * 0)
- `semantic-release.yml` — Semantic Release (push, workflow_dispatch)
- `size.yml` — Size Check (push, workflow_dispatch)
- `stale.yml` — Stale Issues (schedule, workflow_dispatch; cron 0 0 * * *)
- `stress-test.yml` — Stress Test (schedule, workflow_dispatch; cron 0 3 * * 0)
- `terraform.yml` — Terraform (workflow_dispatch)
- `test.yml` — CI (pull_request, push, workflow_dispatch)
- `visual-regression.yml` — Visual Regression (push, workflow_dispatch)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `analyze`: `vite-bundle-analyzer`
- `verify:stack`: `bash scripts/verify-stack.sh`
- `build:analyze`: `ANALYZE=1 vite build && node scripts/bundle-report.mjs`
- `bundle:report`: `node scripts/bundle-report.mjs`
- `prebuild`: `npm run type-check:strict && npm run check:no-plain-rtsp && npm run check:vault-audit-coverage && npm run check:env-contract && npm run check:mediamtx-path-contract`
- `check:no-plain-rtsp`: `node scripts/check-no-plain-rtsp.mjs`
- `check:vault-audit-coverage`: `node scripts/check-vault-audit-coverage.mjs`
- `check:env-contract`: `node scripts/check-env-contract.mjs`
- `simulate:env-contract`: `node scripts/simulate-env-contract-scenarios.mjs`
- `simulate:wave-fortress-3`: `node scripts/simulate-wave-fortress-3-scenarios.mjs`
- `simulate:wave-fortress-4`: `node scripts/simulate-wave-fortress-4-scenarios.mjs`
- `simulate:wave-fortress-6`: `node scripts/simulate-wave-fortress-6-scenarios.mjs`
- `simulate:wave-fortress-7`: `node scripts/simulate-wave-fortress-7-scenarios.mjs`
- `validate:fortress-shinobi`: `node scripts/simulate-wave-fortress-4-scenarios.mjs && node scripts/simulate-wave-fortress-6-scenarios.mjs && node scripts/simulate-wave-fortress-7-scenarios.mjs && node scripts/check-no-plain-rtsp.mjs && node scripts/check-vault-audit-coverage.mjs && node scripts/check-env-contract.mjs && node scripts/simulate-env-contract-scenarios.mjs && node scripts/simulate-mediamtxpath-scenarios.mjs && node scripts/lint-migrations.mjs && node scripts/check-mediamtx-path-contract.mjs`
- `loadtest:cameras`: `node scripts/run-camera-load-test.mjs`
- `loadtest:cameras:dry`: `node scripts/run-camera-load-test.mjs --dry-run --cameras=100 --concurrency=25 --scenario=ramp`
- `loadtest:cameras:k6`: `k6 run tests/load/k6-camera-previews.js`
- `build`: `npm run check:mobile-nav:auto && npm run check:page-content && npm run check:single && npm run check:skeletons -- --skip-build && npm run gen:audit-pdf && vite build && node scripts/generate-version-json.mjs && npm run check:critical-path && npm run check:tailwind-animations`
- `gen:audit-pdf`: `node scripts/generate-audit-pdf.mjs`
- `check:tailwind-animations`: `node scripts/check-tailwind-animations.mjs`
- `build-storybook`: `storybook build`
- `prebuild:dev`: `npm run type-check:strict`
- `build:dev`: `vite build --mode development`
- `bundle-size`: `size-limit`
- `check:bundle-size`: `node scripts/check-bundle-size.mjs`
- `check:single`: `node scripts/check-single-usage.mjs`
- `check:mobile-nav`: `node scripts/check-mobile-nav.mjs`
- `check:mobile-nav:auto`: `node scripts/check-mobile-nav.mjs --auto-classify`
- `check:mobile-nav:snapshot`: `node scripts/check-mobile-nav.mjs --snapshot`
- `check:page-content`: `node scripts/check-page-content.mjs`
- `check:csp`: `node scripts/check-csp-allowlist.mjs`
- `clean`: `rm -rf dist node_modules/.cache`
- `coverage`: `vitest run --coverage && node scripts/build-coverage-report.mjs`
- `coverage:ci`: `vitest run --coverage --passWithNoTests`
- `coverage:html`: `vitest run --coverage --reporter=html`
- `cypress`: `cypress open`
- `cypress:open`: `cypress open`
- `cypress:run`: `cypress run`
- `db:generate`: `bash scripts/generate-types.sh`
- `db:migrate`: `supabase db push`
- `db:push`: `supabase db push`
- `db:seed`: `supabase db seed`
- `db:studio`: `supabase studio`
- `dev`: `vite`
- `docker:build`: `docker build -t visao .`
- `docker:push`: `docker push visao`
- `docker:run`: `docker run -p 3000:3000 visao`
- `e2e`: `cypress run`
- `e2e:ci`: `cypress run --headless`
- `e2e:headed`: `cypress open`
- `format`: `prettier --write .`
- `format:check`: `prettier --check .`
- `format:fix`: `prettier --write .`
- `i18n:compile`: `echo "i18n compiled"`
- `i18n:extract`: `i18next-parser`
- `lint`: `eslint .`
- `lint:ci`: `eslint . --max-warnings=0`
- `lint:css`: `stylelint "**/*.css"`
- `lint:fix`: `eslint . --fix`
- `lint:types`: `tsc --noEmit`
- `precommit`: `lint-staged`
- `prepare`: `husky install`
- `preview`: `vite preview`
- `release`: `semantic-release`
- `security-audit`: `npm audit --audit-level=high`
- `size-limit`: `size-limit`
- `storybook`: `storybook dev -p 6006`
- `test`: `vitest`
- `test:coverage`: `vitest --coverage`
- `test:e2e`: `cypress run`
- `test:mobile-nav-runtime`: `playwright test mobile-nav-padding`
- `test:mobile-nav-overlap`: `playwright test mobile-nav-overlap`
- `test:mobile-nav-visual`: `playwright test mobile-nav-visual --project=mobile-safari`
- `test:mobile-nav-visual:update`: `playwright test mobile-nav-visual --project=mobile-safari --update-snapshots`
- `test:mobile-nav-scroll-positions`: `playwright test tests/e2e/mobile-nav-scroll-positions.spec.ts --project=mobile-safari`
- `test:mobile-nav-multi-viewport-theme`: `playwright test tests/e2e/mobile-nav-multi-viewport-theme.spec.ts --project=mobile-safari`
- `test:mobile-nav-multi-viewport-theme:update`: `playwright test tests/e2e/mobile-nav-multi-viewport-theme.spec.ts --project=mobile-safari --update-snapshots`
- `test:smoke`: `playwright test smoke-pages`
- `test:filters`: `playwright test filters-lifecycle`
- `test:cls-regression`: `playwright test cls-regression`
- `test:ui`: `vitest --ui`
- `test:unit`: `vitest run`
- `test:watch`: `vitest --watch`
- `type-check`: `tsc --noEmit`
- `type-check:strict`: `tsc --noEmit -p tsconfig.strict.json`
- `type-check:full`: `tsc --noEmit -p tsconfig.app.json`
- `inventario`: `node scripts/inventario/gerar-rotas.mjs && node scripts/inventario/gerar-repo.mjs < /dev/null`
- `inventario:rotas`: `node scripts/inventario/gerar-rotas.mjs`
- `inventario:rotas:check`: `node scripts/inventario/gerar-rotas.mjs --check`
- `inventario:edges`: `node scripts/inventario/gerar-repo.mjs < /dev/null`
- `inventario:banco`: `node scripts/inventario/gerar-banco.mjs`
- `inventario:test`: `node --test scripts/inventario/inventario.unit.mjs`
- `typecheck`: `tsc --noEmit`
- `validate`: `npm run lint && npm run type-check && npm run test`
- `check:skeletons`: `node scripts/validate-skeletons.mjs`
- `check:migrations`: `node scripts/lint-migrations.mjs`
- `check:lockfile-parity`: `node scripts/check-lockfile-parity.mjs`
- `test:mobile-nav-class`: `playwright test mobile-nav-class-presence`
- `test:mobile-nav-content-overlap`: `playwright test mobile-nav-content-overlap`
- `test:mobile-nav-measured`: `playwright test mobile-nav-measured-overlap`
- `test:mobile-drawer`: `playwright test mobile-drawer`
- `test:auth-routes-mobile-nav`: `playwright test auth-routes-mobile-nav`
- `report:mobile-nav-diff`: `node scripts/build-mobile-nav-diff-report.mjs`
- `report:qa-screenshots`: `node scripts/build-qa-screenshots-report.mjs`
- `qa:visual-snapshots`: `playwright test qa-visual-snapshots --project=chromium`
- `qa:console-sweep`: `playwright test qa-console-sweep --project=chromium`
- `report:qa-console`: `node scripts/build-qa-console-report.mjs`
- `qa:console-full`: `npm run qa:console-sweep && npm run report:qa-console`
- `seed:e2e-user`: `node scripts/seed-e2e-user.mjs`
- `seed:e2e-user:ci`: `node scripts/seed-e2e-user.mjs --ci`
- `seed:healing-ci-user`: `node scripts/seed-healing-ci-user.mjs`
- `seed:healing-ci-user:ci`: `node scripts/seed-healing-ci-user.mjs --ci`
- `db:exercise:healing-loop`: `node scripts/exercise-healing-loop.mjs`
- `pretest:e2e:ci`: `npm run seed:e2e-user:ci`
- `test:e2e:ci`: `E2E_AUTH_REQUIRED=1 playwright test --project=mobile-safari`
- `preview:reset`: `bash scripts/reset-preview-qa.sh`
- `preview:reset:fast`: `bash scripts/reset-preview-qa.sh --fast`
- `preview:reset:no-qa`: `bash scripts/reset-preview-qa.sh --no-qa`
- `preview:reset-and-qa`: `bash scripts/reset-preview-qa.sh`
- `qa:gates`: `node scripts/quality-gates.mjs --profile=dev`
- `qa:gates:ci`: `node scripts/quality-gates.mjs --profile=ci`
- `qa:gates:dev`: `node scripts/quality-gates.mjs --profile=dev`
- `audit:deadcode`: `node scripts/audit-deadcode.mjs`
- `audit:deadcode:json`: `node scripts/audit-deadcode.mjs --format=json`
- `audit:deadcode:strict`: `node scripts/audit-deadcode.mjs --strict`
- `audit:report`: `node scripts/build-dependency-audit-report.mjs --refresh`
- `audit:deadcode:check`: `node scripts/audit-deadcode.mjs --quiet && node scripts/check-deadcode-baseline.mjs`
- `audit:deadcode:check:strict`: `node scripts/audit-deadcode.mjs --quiet && node scripts/check-deadcode-baseline.mjs --strict`
- `audit:deadcode:baseline`: `node scripts/audit-deadcode.mjs --quiet && node scripts/check-deadcode-baseline.mjs --update`
- `audit:unused`: `node scripts/audit-unused-ts.mjs`
- `audit:unused:strict`: `node scripts/audit-unused-ts.mjs --strict`
- `simulate:detection`: `node scripts/simulate-detection-scenarios.mjs`
- `simulate:detection:strict`: `node scripts/simulate-detection-scenarios.mjs --strict`
- `chunks:report`: `node scripts/chunk-size-report.mjs`
- `chunks:report:warn`: `node scripts/chunk-size-report.mjs --warn-only`
- `build:chunks-report`: `vite build && node scripts/chunk-size-report.mjs --warn-only`
- `check:critical-path`: `node scripts/check-critical-path.mjs`
- `lint:advisory`: `LINT_ADVISORY=1 eslint .`
- `simulate:mediamtxpath`: `node scripts/simulate-mediamtxpath-scenarios.mjs`
- `check:mediamtx-path-contract`: `node scripts/check-mediamtx-path-contract.mjs`
- `test:ci`: `vitest run --passWithNoTests`
- `coverage:check`: `node scripts/check-coverage-baseline.mjs`
- `coverage:baseline`: `node scripts/check-coverage-baseline.mjs --update`
- `coverage:comment`: `node scripts/build-coverage-comment.mjs`
- `test:ci:flaky-retry`: `node scripts/vitest-flaky-retry.mjs`
- `test:suite:ci`: `npm run coverage:ci && npm run coverage:check`
- `db:check:monitoring-centers`: `node scripts/check-monitoring-centers.mjs`
- `simulate:monitoring-centers`: `vitest run src/__tests__/lib/monitoringCenter.test.ts`
- `db:check:definer`: `node scripts/check-definer-exposure.mjs`
- `db:check:rls`: `node scripts/check-rls-exposure.mjs`
- `db:check:dba`: `node scripts/check-dba-privileges.mjs`
- `db:check:partitions`: `node scripts/check-partition-coverage.mjs`
- `db:check:drain`: `node scripts/check-partition-drain.mjs`
- `db:check:quarantine`: `node scripts/check-partition-quarantine.mjs`
- `db:check:maintenance-alerts`: `node scripts/check-maintenance-alerts.mjs`
- `db:check:maintenance-dispatch`: `node scripts/check-maintenance-dispatch.mjs`
- `db:check:maintenance-sources`: `node scripts/check-maintenance-sources.mjs`
- `simulate:wave110`: `node scripts/simulate-wave110-scenarios.mjs`
- `simulate:wave111`: `node scripts/simulate-wave111-scenarios.mjs`
- `simulate:wave112`: `node scripts/simulate-wave112-scenarios.mjs`
- `simulate:wave113`: `node scripts/simulate-wave113-scenarios.mjs`
- `simulate:wave114`: `node scripts/simulate-wave114-scenarios.mjs`
- `simulate:wave115`: `node scripts/simulate-agent-healing.mjs`
- `db:check:clock-skew`: `node scripts/check-camera-clock-skew.mjs`
- `db:check:backlog-trend`: `node scripts/check-partition-backlog-trend.mjs`
- `db:check:agent-healing`: `node scripts/check-agent-healing.mjs`
- `db:check:error-blame`: `node scripts/check-error-blame.mjs`
- `db:check:blame-routing`: `node scripts/check-blame-routing.mjs`
- `db:check:capabilities`: `node scripts/check-capabilities.mjs`
- `db:check:alarm-recurrence`: `node scripts/check-alarm-recurrence.mjs`
- `db:check:alarm-schemes`: `node scripts/check-alarm-schemes.mjs`
- `db:check:armed-now`: `tsx scripts/check-armed-now.ts`
- `db:check:event-admission`: `tsx scripts/check-event-admission.ts`
- `db:check:admission-ledger`: `tsx scripts/check-admission-ledger.ts`
- `db:check:favorite-views`: `node scripts/check-favorite-views.mjs`
- `db:check:device-silence`: `node scripts/check-device-silence.mjs`
- `simulate:wave192`: `node scripts/simulate-wave192-device-silence.mjs`
- `db:check:device-connect`: `node scripts/check-device-connect.mjs`
- `simulate:wave191`: `node scripts/simulate-wave191-device-connect.mjs`
- `db:check:device-enrollment`: `node scripts/check-device-enrollment.mjs`
- `simulate:wave190`: `node scripts/simulate-wave190-device-enrollment.mjs`
- `simulate:wave189`: `node scripts/simulate-wave189-detached-monitor.mjs`
- `simulate:wave150`: `node scripts/simulate-wave150-capabilities.mjs`
- `sim:wave147`: `node scripts/simulate-wave147-blame-routing.mjs`
- `db:check:all`: `npm run db:check:definer && npm run db:check:rls && npm run db:check:dba && npm run db:check:partitions && npm run db:check:drain && npm run db:check:quarantine && npm run db:check:maintenance-alerts && npm run db:check:maintenance-dispatch && npm run db:check:clock-skew && npm run db:check:backlog-trend && npm run db:check:maintenance-sources && npm run db:check:agent-healing && npm run db:check:root-cause && npm run db:check:escalation && npm run db:check:restart-budget && npm run db:check:relay-window && npm run db:check:relay-verdict && npm run db:check:relay-lease && npm run db:check:relay-redelivery && npm run db:check:healing-arbiter && npm run db:check:ingest-endpoints && npm run db:check:dwell-analytics && npm run db:check:monitoring-centers && npm run db:check:collab-network && npm run db:check:collab-governance && npm run db:check:collab-notifications && npm run db:check:collab-silence && npm run db:check:collab-retention && npm run db:check:collab-entry-lifecycle && npm run db:check:retention-registry && npm run db:check:retention-alerts && npm run db:check:maintenance-console && npm run db:check:collab-nav-badge && npm run db:check:error-blame && npm run db:check:blame-routing && npm run db:check:capabilities && npm run db:check:grant-console && npm run db:check:path-failover && npm run db:check:path-evidence && npm run db:check:camera-io && npm run db:check:onvif-events && npm run db:check:evidence-custody && npm run db:check:evidence-exports && npm run db:check:evidence-seal && npm run db:check:evidence-dossier && npm run db:check:emap && npm run db:check:alarm-recurrence && npm run db:check:chronic-series && npm run db:check:recurrence-retention && npm run db:check:bridge-watch && npm run db:check:episode-reconciliation && npm run db:check:favorite-views && npm run db:check:device-enrollment && npm run db:check:device-connect && npm run db:check:device-silence && npm run db:check:remote-commands && npm run db:check:command-delivery && npm run db:check:command-sweep && npm run db:check:timeline-attestation && npm run db:check:alarm-schemes && npm run db:check:armed-now && npm run db:check:event-admission && npm run db:check:admission-ledger && npm run db:check:admission-retention && npm run db:check:admission-backlog && npm run db:check:admission-reconcile && npm run db:check:admission-orphan && npm run db:check:admission-trend && npm run db:check:admission-trend-alert && npm run db:check:reconcile-retention && npm run db:check:escalation-profiles && npm run db:check:suppression-retention && npm run db:check:escalation-decay`
- `simulate:wave116`: `node scripts/simulate-wave116-scenarios.mjs`
- `simulate:wave117`: `node scripts/simulate-wave117-scenarios.mjs`
- `db:check:root-cause`: `node scripts/check-root-cause-correlation.mjs`
- `db:check:escalation`: `node scripts/check-maintenance-escalation.mjs`
- `simulate:wave118`: `node scripts/simulate-wave118-scenarios.mjs`
- `db:check:restart-budget`: `node scripts/check-agent-restart-budget.mjs`
- `simulate:wave119`: `node scripts/simulate-wave119-scenarios.mjs`
- `simulate:network-chaos`: `node scripts/simulate-wave144-network-chaos.mjs`
- `db:check:relay-window`: `node scripts/check-relay-task-window.mjs`
- `db:check:relay-verdict`: `node scripts/check-relay-verdict.mjs`
- `db:check:relay-lease`: `node scripts/check-relay-lease.mjs`
- `db:check:relay-redelivery`: `node scripts/check-relay-redelivery.mjs`
- `db:check:healing-arbiter`: `node scripts/check-healing-arbiter.mjs`
- `db:check:ingest-endpoints`: `node scripts/check-ingest-endpoints.mjs`
- `db:check:dwell-analytics`: `node scripts/check-dwell-analytics.mjs`
- `db:check:collab-network`: `node scripts/check-collab-network.mjs`
- `db:check:collab-governance`: `node scripts/check-collab-governance.mjs`
- `db:check:collab-notifications`: `node scripts/check-collab-notifications.mjs`
- `db:check:collab-silence`: `node scripts/check-collab-notification-silence.mjs`
- `db:check:collab-retention`: `node scripts/check-collab-retention.mjs`
- `db:check:retention-registry`: `node scripts/check-retention-registry.mjs`
- `db:check:collab-nav-badge`: `node scripts/check-collab-nav-badge.mjs`
- `db:check:retention-alerts`: `node scripts/check-retention-alerts.mjs`
- `db:check:maintenance-console`: `node scripts/check-maintenance-console.mjs`
- `db:check:collab-entry-lifecycle`: `node scripts/check-collab-entry-lifecycle.mjs`
- `simulate:collab-network`: `vitest run src/__tests__/lib/collabNetwork.test.ts`
- `sim:wave148`: `node scripts/simulate-wave148-owner-filter.mjs`
- `sim:wave149`: `node scripts/simulate-wave149-owner-aging.mjs`
- `simulate:wave151`: `node scripts/simulate-wave151-grant-console.mjs`
- `db:check:grant-console`: `node scripts/check-grant-console.mjs`
- `simulate:wave152`: `node scripts/simulate-wave152-path-failover.mjs`
- `db:check:path-failover`: `node scripts/check-path-failover.mjs`
- `simulate:wave153`: `node scripts/simulate-wave153-path-evidence.mjs`
- `db:check:path-evidence`: `node scripts/check-path-evidence.mjs`
- `db:check:camera-io`: `node scripts/check-camera-io.mjs`
- `db:check:onvif-events`: `node scripts/check-onvif-events.mjs`
- `db:check:evidence-custody`: `node scripts/check-evidence-custody.mjs`
- `db:check:evidence-exports`: `node scripts/check-evidence-exports.mjs`
- `db:check:timeline-attestation`: `node scripts/check-timeline-attestation.mjs`
- `db:check:evidence-seal`: `node scripts/check-evidence-seal.mjs`
- `db:check:evidence-dossier`: `node scripts/check-evidence-dossier.mjs`
- `db:check:emap`: `node scripts/check-emap.mjs`
- `simulate:wave158`: `node scripts/simulate-wave158-evidence-seal.mjs`
- `simulate:wave159`: `node scripts/simulate-wave159-evidence-registry.mjs`
- `simulate:wave160`: `node scripts/simulate-wave160-dossier.mjs`
- `simulate:wave161`: `node scripts/simulate-wave161-emap.mjs`
- `simulate:wave162`: `node scripts/simulate-wave162-emap-realtime.mjs`
- `simulate:wave163`: `node scripts/simulate-wave163-emap-notices.mjs`
- `simulate:wave164`: `node scripts/simulate-wave164-emap-pulse.mjs`
- `simulate:wave165`: `node scripts/simulate-wave165-emap-suppressions.mjs`
- `simulate:wave166`: `node scripts/simulate-wave166-plan-navigator.mjs`
- `simulate:wave167`: `node scripts/simulate-wave167-attention-router.mjs`
- `simulate:wave168`: `node scripts/simulate-wave168-attention-clock.mjs`
- `simulate:wave169`: `node scripts/simulate-wave169-shift-handoff.mjs`
- `simulate:wave170`: `node scripts/simulate-wave170-shift-durability.mjs`
- `simulate:wave171`: `node scripts/simulate-wave171-triage-queue.mjs`
- `simulate:wave172`: `node scripts/simulate-wave172-triage-ack.mjs`
- `simulate:wave173`: `node scripts/simulate-wave173-ack-handoff.mjs`
- `simulate:wave174`: `node scripts/simulate-wave174-triage-sla.mjs`
- `simulate:wave175`: `node scripts/simulate-wave175-shift-performance.mjs`
- `simulate:wave176`: `node scripts/simulate-wave176-triage-escalation.mjs`
- `simulate:wave177`: `node scripts/simulate-wave177-alarm-treatment.mjs`
- `simulate:wave178`: `node scripts/simulate-wave178-alarm-aggregation.mjs`
- `simulate:wave179`: `node scripts/simulate-wave179-alarm-recurrence.mjs`
- `simulate:wave181`: `node scripts/simulate-wave181-episode-bridge.mjs`
- `simulate:wave182`: `node scripts/simulate-wave182-episode-queue.mjs`
- `db:check:chronic-series`: `node scripts/check-chronic-series.mjs`
- `simulate:wave183`: `node scripts/simulate-wave183-chronic-series.mjs`
- `db:check:recurrence-retention`: `node scripts/check-alarm-recurrence-retention.mjs`
- `simulate:wave184`: `npx tsx scripts/simulate-wave184-recurrence-retention.mjs`
- `db:check:bridge-watch`: `tsx scripts/check-episode-bridge-watch.mjs`
- `simulate:wave185`: `tsx scripts/simulate-wave185-episode-bridge.mjs`
- `db:check:episode-reconciliation`: `tsx scripts/check-episode-reconciliation.mjs`
- `simulate:wave187`: `tsx scripts/simulate-wave187-episode-reconciliation.mjs`
- `db:check:remote-commands`: `node scripts/check-remote-commands.mjs`
- `db:check:command-delivery`: `node scripts/check-command-delivery.mjs`
- `simulate:wave194`: `node --experimental-strip-types scripts/simulate-wave194-command-delivery.mjs`
- `db:check:command-sweep`: `bun scripts/check-command-sweep.mjs`
- `simulate:wave195`: `bun scripts/simulate-wave195-command-sweep.mjs`
- `simulate:wave196`: `bun scripts/simulate-wave196-command-reliability.mjs`
- `simulate:wave197`: `bun scripts/simulate-wave197-face-search.mjs`
- `simulate:wave198`: `bun scripts/simulate-wave198-reference-match.mjs`
- `simulate:wave199`: `npx tsx scripts/simulate-wave199.ts`
- `simulate:wave200`: `npx tsx scripts/simulate-wave200.ts`
- `simulate:wave201`: `npx tsx scripts/simulate-wave201.ts`
- `simulate:wave202`: `npx tsx scripts/simulate-wave202.ts`
- `simulate:wave203`: `npx tsx scripts/simulate-wave203.ts`
- `simulate:wave205`: `npx tsx scripts/simulate-wave205.ts`
- `simulate:wave206`: `npx tsx scripts/simulate-wave206.ts`
- `simulate:wave207`: `npx tsx scripts/simulate-wave207.ts`
- `simulate:wave208`: `npx tsx scripts/simulate-wave208.ts`
- `simulate:wave209`: `npx tsx scripts/simulate-wave209.ts`
- `simulate:wave208:video`: `npx tsx scripts/simulate-wave208-video.ts`
- `simulate:wave211`: `npx tsx scripts/simulate-wave211.ts`
- `simulate:wave212`: `npx tsx scripts/simulate-wave212.ts`
- `simulate:wave213`: `npx tsx scripts/simulate-wave213.ts`
- `simulate:wave214`: `npx tsx scripts/simulate-wave214.ts`
- `simulate:wave215`: `npx tsx scripts/simulate-wave215.ts`
- `simulate:wave229`: `npx tsx scripts/simulate-wave229.ts`
- `simulate:wave230`: `tsx scripts/simulate-wave230-admission-retention.ts`
- `simulate:wave231`: `tsx scripts/simulate-wave231-purge-history.ts`
- `db:check:admission-retention`: `tsx scripts/check-admission-retention.ts`
- `simulate:wave232`: `tsx scripts/simulate-wave232-backlog-alert.ts`
- `db:check:admission-backlog`: `tsx scripts/check-admission-backlog.ts`
- `db:check:admission-reconcile`: `tsx scripts/check-admission-reconcile.ts`
- `simulate:wave233`: `tsx scripts/simulate-wave233-reconcile.ts`
- `simulate:wave236`: `tsx scripts/simulate-wave236-trend-alert.ts`
- `db:check:admission-trend-alert`: `tsx scripts/check-admission-trend-alert.ts`
- `simulate:wave235`: `tsx scripts/simulate-wave235-orphan-trend.ts`
- `db:check:admission-trend`: `tsx scripts/check-admission-trend.ts`
- `simulate:wave234`: `tsx scripts/simulate-wave234-orphan-alert.ts`
- `db:check:admission-orphan`: `tsx scripts/check-admission-orphan.ts`
- `simulate:wave237`: `tsx scripts/simulate-wave237-snapshot-retention.ts`
- `db:check:escalation-profiles`: `tsx scripts/check-escalation-profiles.ts`
- `simulate:wave238`: `tsx scripts/simulate-wave238-escalation-profiles.ts`
- `db:check:reconcile-retention`: `tsx scripts/check-reconcile-retention.ts`
- `db:check:suppression-retention`: `tsx scripts/check-suppression-retention.ts`
- `simulate:wave239`: `tsx scripts/simulate-wave239-console-profile.ts`
- `simulate:wave240`: `tsx scripts/simulate-wave240-condition-throttle.ts`
- `simulate:wave241`: `tsx scripts/simulate-wave241-condition-silence.ts`
- `simulate:wave242`: `tsx scripts/simulate-wave242-suppression-ledger.ts`
- `simulate:wave243`: `tsx scripts/simulate-wave243-suppression-retention.ts`
- `simulate:wave244`: `tsx scripts/simulate-wave244-retention-debut.ts`
- `simulate:wave245`: `tsx scripts/simulate-wave245-retention-debut-view.ts`
- `simulate:wave247`: `tsx scripts/simulate-wave247-deliverability-alert.ts`
- `test:wave243`: `vitest run src/__tests__/lib/suppressionRetention.test.ts`
- `test:wave242`: `vitest run src/__tests__/lib/suppressionLedger.test.ts`
- `simulate:wave248`: `tsx scripts/simulate-wave248-acknowledgement-decay.ts`
- `simulate:wave249`: `tsx scripts/simulate-wave249-escalation-decay.ts`
- `db:check:escalation-decay`: `tsx scripts/check-escalation-decay.ts`
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`

## Documentos (raiz e docs/)
- `.github/CODE_OF_CONDUCT.md` — Code of Conduct (21 linhas)
- `.github/CONTRIBUTING.md` — Contributing to VISÃO (34 linhas)
- `.github/ISSUE_TEMPLATE.md` (29 linhas)
- `.github/PULL_REQUEST_TEMPLATE.md` (18 linhas)
- `.github/README.md` — 🔧 GitHub Configuration (79 linhas)
- `.github/SECURITY.md` — Política de Segurança (10 linhas)
- `AGENTS.md` — AGENTS.md — VISÃO V2 (126 linhas)
- `ARCHITECTURE.md` — 🏗️ Architecture Overview (41 linhas)
- `CHANGELOG.md` — Changelog (227 linhas)
- `CLAUDE.md` (2 linhas)
- `CODE_OF_CONDUCT.md` — Código de Conduta do Contribuidor (75 linhas)
- `CONTRIBUTING.md` — 🤝 Guia de Contribuição - VISÃO (271 linhas)
- `DEPLOYMENT.md` — 🚀 Deployment Guide (50 linhas)
- `ESTADO_ATUAL.md` — ESTADO ATUAL DO SISTEMA — Auditoria (310 linhas)
- `FUNCIONALIDADES_COMPLETAS.md` — VisionAI — Levantamento Exaustivo de Funcionalidades (476 linhas)
- `POSTING_RULES.md` — POSTING_RULES.md — Regras de contribuição (65 linhas)
- `README.md` — 🎥 VISÃO - Sistema de Vigilância Inteligente (346 linhas)
- `SECURITY.md` — 🔒 Política de Segurança — VISÃO (96 linhas)
- `audit_report.md` — AUDITORIA ENTERPRISE - SISTEMA VISÃO (V2.2.0) (98 linhas)
- `docs/ACCESSIBILITY.md` — ♿ Accessibility Guide - Projeto VISÃO (135 linhas)
- `docs/ACCESSIBILITY_GUIDE.md` — Accessibility Guide (WCAG 2.1 AA) (66 linhas)
- `docs/AI_ML_GUIDE.md` — 🤖 Guia de IA/ML (89 linhas)
- `docs/AI_MODELS.md` — 🤖 AI Models - Projeto VISÃO (158 linhas)
- `docs/ANALYTICS_GUIDE.md` — 📊 Analytics Guide - Projeto VISÃO (175 linhas)
- `docs/API.md` — 📡 API - Edge Functions (345 linhas)
- `docs/API_CONVENTIONS.md` — API Conventions (46 linhas)
- `docs/API_QUICK_START.md` — 🚀 API Quick Start (107 linhas)
- `docs/API_REFERENCE.md` — 📚 API Reference - Projeto VISÃO (303 linhas)
- `docs/ARCHITECTURE.md` — 🏗️ Arquitetura - VISÃO (63 linhas)
- `docs/AUDITORIA_ENTERPRISE_DETALHADA.md` — AUDITORIA ENTERPRISE - SISTEMA VISÃO (V2.2.0) (98 linhas)
- `docs/AUDITORIA_V9_FINAL.md` — 🔬 AUDITORIA COMPLETA V9 - VERIFICAÇÃO DAS 176 MELHORIAS (199 linhas)
- `docs/AUTHENTICATION.md` — 🔐 Authentication Guide - Projeto VISÃO (240 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Visao_V2 (437 linhas)
- `docs/BACKUP.md` — 💾 Backup Guide - Projeto VISÃO (183 linhas)
- `docs/BACKUP_RECOVERY.md` — Backup & Recovery Guide (87 linhas)
- `docs/BUILD_ERRORS_REPORT.md` — 📋 Relatório de Erros de Build - VISÃO (226 linhas)
- `docs/CACHING_GUIDE.md` — Caching Guide (28 linhas)
- `docs/CHANGELOG.md` — 📝 Changelog da Documentação (67 linhas)
- `docs/CHANGELOG_V11.md` — VISÃO V11 - CHANGELOG (171 linhas)
- `docs/CHANGELOG_V15.md` — 📋 CHANGELOG V15 (61 linhas)
- `docs/CI-CD.md` — 🔄 CI/CD Guide - Projeto VISÃO (216 linhas)
- `docs/CLS_MONITORING.md` — Monitoramento de CLS (Cumulative Layout Shift) (115 linhas)
- `docs/CODE_EXAMPLES.md` — 💻 Exemplos de Código - VISÃO (119 linhas)
- `docs/CODE_MARKERS_TRACKING.md` — 🔖 Code Markers Tracking (88 linhas)
- `docs/CODE_QUALITY_RULES.md` — Code Quality Rules — VISÃO (292 linhas)
- `docs/CODING_STYLE.md` — Coding Style Guide — VISÃO (105 linhas)
- `docs/COMPONENTS.md` — 🧩 Components Guide - Projeto VISÃO (156 linhas)
- `docs/COMPONENTS_CATALOG.md` — 🎨 Catálogo de Componentes (105 linhas)
- `docs/COMPONENT_LIBRARY.md` — 📚 Component Library Reference (240 linhas)
- `docs/CONTRIBUTING.md` — 🤝 Contributing Guide - Projeto VISÃO (122 linhas)
- `docs/CONTRIBUTING_GUIDE.md` — 🤝 Guia de Contribuição (69 linhas)
- `docs/COVERAGE_DASHBOARD.md` — Dashboard de Cobertura de Código (124 linhas)
- `docs/CUSTOM_HOOKS_GUIDE.md` — Custom Hooks Guide (91 linhas)
- `docs/DATABASE.md` — 📊 Database Schema - VISÃO (88 linhas)
- `docs/DATA_DICTIONARY.md` — 📖 Dicionário de Dados — VISÃO (39 linhas)
- `docs/DEPENDENCY_AUDIT.md` — Dependency Audit — VISÃO (185 linhas)
- `docs/DEPLOY.md` — Deploy Guide (12 linhas)
- `docs/DEPLOYMENT.md` — 🚀 Guia de Deploy - VISÃO (228 linhas)
- `docs/DEPLOY_ADVANCED.md` — 🚀 Guia de Deploy Avançado (118 linhas)
- `docs/DEPLOY_GUIDE.md` — 🎬 VISÃO - Guia de Deploy Completo (355 linhas)
- `docs/DEVELOPMENT.md` — Guia de Desenvolvimento - VISÃO (100 linhas)
- `docs/DOCKER.md` — 🐳 Docker Guide - Projeto VISÃO (195 linhas)
- `docs/DOCKER_GUIDE.md` — Docker Guide (28 linhas)
- `docs/EDGE-FUNCTIONS.md` — ⚡ Edge Functions - Guia Completo (102 linhas)
- `docs/EDGE_FUNCTIONS.md` — ⚡ Edge Functions Quick Reference (42 linhas)
- `docs/ENVIRONMENT_SETUP.md` — ⚙️ Configuração de Ambiente (85 linhas)
- `docs/ENV_VARIABLES.md` — ⚙️ Environment Variables - Projeto VISÃO (109 linhas)
- `docs/ERROR_HANDLING_GUIDE.md` — Error Handling Guide (55 linhas)
- `docs/FAQ.md` — ❓ FAQ - Projeto VISÃO (261 linhas)
- `docs/FILTER_SYSTEM.md` — Sistema unificado de filtros (92 linhas)
- `docs/FOLDER_STRUCTURE.md` — Folder Structure (51 linhas)
- `docs/GETTING_STARTED.md` — 🚀 Getting Started - Projeto VISÃO (119 linhas)
- `docs/GITHUB_ACTIONS_BILLING.md` — ⚠️ GitHub Actions Billing Issue (90 linhas)
- `docs/GLOSSARY.md` — Glossary (86 linhas)
- `docs/HOOKS.md` — 🪝 Hooks - VISÃO (53 linhas)
- `docs/HOOKS_REFERENCE.md` — 🪝 Referência de Hooks (104 linhas)
- `docs/I18N_GUIDE.md` — Internationalization (i18n) Guide (86 linhas)
- `docs/IMPLEMENTACAO_FINAL.md` — 🎯 RELATÓRIO FINAL - 144 MELHORIAS IMPLEMENTADAS (213 linhas)
- `docs/INSTALLATION.md` — 🛠️ Guia de Instalação (74 linhas)
- `docs/INTEGRATIONS.md` — 🔌 Integrations Guide - Projeto VISÃO (137 linhas)
- `docs/INTERNATIONALIZATION_GUIDE.md` — Internationalization (i18n) Guide (30 linhas)
- `docs/INVENTARIO_COMPLETO.md` — 📋 INVENTÁRIO COMPLETO DO REPOSITÓRIO VISÃO (488 linhas)
- `docs/INVENTARIO_COMPLETO_2024-12-23.md` — 📊 INVENTÁRIO EXAUSTIVO - PROJETO VISÃO (343 linhas)
- `docs/INVENTARIO_EXAUSTIVO_2024-12-22.md` — 🔍 INVENTÁRIO EXAUSTIVO - PROJETO VISÃO (724 linhas)
- `docs/INVENTARIO_EXAUSTIVO_2024-12-27.md` — 📋 INVENTÁRIO EXAUSTIVO DO PROJETO VISÃO (1044 linhas)
- `docs/INVENTARIO_EXAUSTIVO_2026-01-09.md` — 📦 INVENTÁRIO EXAUSTIVO DO REPOSITÓRIO VISÃO (296 linhas)
- `docs/INVENTARIO_EXAUSTIVO_PROJETO.md` — 📋 INVENTÁRIO EXAUSTIVO DO PROJETO VISÃO (543 linhas)
- `docs/INVENTARIO_MINUCIOSO_2024-12-22.md` — 📋 INVENTÁRIO EXAUSTIVO E MINUCIOSO - PROJETO VISÃO (365 linhas)
- `docs/JSDOC_GUIDE.md` — 📝 Guia de Documentação JSDoc (135 linhas)
- `docs/LANGUAGE_POLICY.md` — 🇧🇷 POLÍTICA DE IDIOMA - PROJETO VISÃO (111 linhas)
- `docs/LAYOUTS.md` — 📐 Layouts Guide - Projeto VISÃO (536 linhas)
- `docs/LOADING_STATES_CHECKLIST.md` — Loading States Checklist (DEV/QA) (47 linhas)
- `docs/MEDIAMTX_SETUP.md` — MediaMTX - Servidor de Streaming RTSP→HLS (227 linhas)
- `docs/MELHORIAS_COMPLETAS.md` — ✅ MELHORIAS CONCLUÍDAS - PROJETO VISÃO (128 linhas)
- `docs/MELHORIAS_CONCLUIDAS.md` — ✅ MELHORIAS 100% CONCLUÍDAS (73 linhas)
- `docs/MELHORIAS_IMPLEMENTADAS.md` — ✅ MELHORIAS IMPLEMENTADAS - PROJETO VISÃO (102 linhas)
- `docs/MELHORIAS_IMPLEMENTADAS_2026-01-15.md` — 📊 RELATÓRIO DE MELHORIAS IMPLEMENTADAS - VIS-O (167 linhas)
- `docs/MELHORIAS_IMPLEMENTADAS_FINAL.md` — ✅ MELHORIAS IMPLEMENTADAS - PROJETO VISÃO (95 linhas)
- `docs/MELHORIAS_IMPLEMENTADAS_V6.md` — ✅ MELHORIAS IMPLEMENTADAS V6 (184 linhas)
- `docs/MELHORIAS_PENDENTES.md` — ✅ TODAS AS MELHORIAS IMPLEMENTADAS - 100% CONCLUÍDO (121 linhas)
- `docs/MELHORIAS_PENDENTES_2024-12-23.md` — 🔍 MELHORIAS PENDENTES - PROJETO VISÃO (376 linhas)
- `docs/MELHORIAS_PENDENTES_COMPLETAS.md` — 📋 LISTA EXAUSTIVA DE MELHORIAS PENDENTES - PROJETO VISÃO (503 linhas)
- `docs/MELHORIAS_PENDENTES_EXAUSTIVAS.md` — 📋 LISTA EXAUSTIVA DE MELHORIAS PENDENTES - PROJETO VISÃO (351 linhas)
- `docs/MELHORIAS_PENDENTES_REAIS.md` — 🔴 MELHORIAS PENDENTES - ANÁLISE EXAUSTIVA PÓS-IMPLEMENTAÇÃO (298 linhas)
- `docs/MELHORIAS_PENDENTES_V2.md` — 📋 LISTA EXAUSTIVA DE MELHORIAS PENDENTES V2 - PROJETO VISÃO (366 linhas)
- `docs/MELHORIAS_PENDENTES_V3.md` — 📋 LISTA EXAUSTIVA DE MELHORIAS PENDENTES V3 - PROJETO VISÃO (341 linhas)
- `docs/MELHORIAS_PENDENTES_V5.md` — 🔍 ANÁLISE EXAUSTIVA V5 - MELHORIAS PENDENTES (288 linhas)
- `docs/MELHORIAS_PENDENTES_V8.md` — 🔬 ANÁLISE EXAUSTIVA V8 - MELHORIAS PENDENTES (355 linhas)
- `docs/MELHORIAS_SESSAO_2026-01-09.md` — 🚀 RELATÓRIO FINAL - SESSÃO 09/01/2026 (108 linhas)
- `docs/MELHORIAS_SESSAO_2026-01-10.md` — 📊 RELATÓRIO FINAL DE MELHORIAS - Sessão 2026-01-10 (107 linhas)
- `docs/MELHORIAS_V3_COMPLETAS.md` — ✅ 176 MELHORIAS IMPLEMENTADAS - V3 COMPLETO (159 linhas)
- `docs/MIGRATION.md` — 🔄 Migration Guide - Projeto VISÃO (198 linhas)
- `docs/MIGRATION_PLAN.md` — Plano de Migração — VISÃO-V2: finalização do go-live (339 linhas)
- `docs/MOBILE_GUIDE.md` — Mobile Development Guide (98 linhas)
- `docs/MOBILE_NAV_VISUAL_TESTING.md` — Mobile Nav Visual Testing (84 linhas)
- `docs/MONITORING.md` — 📊 Monitoring Guide - Projeto VISÃO (196 linhas)
- `docs/MONITORING_GUIDE.md` — 📊 Guia de Monitoramento (64 linhas)
- `docs/PAGE_CONTENT_STANDARD.md` — Padrão de Conteúdo de Páginas (`PageContent`) (95 linhas)
- `docs/PERFORMANCE.md` — ⚡ Performance Guide - Projeto VISÃO (135 linhas)
- `docs/PERFORMANCE_GUIDE.md` — ⚡ Guia de Performance (51 linhas)
- `docs/PERFORMANCE_OPTIMIZATION.md` — Performance Optimization Guide (128 linhas)
- `docs/PLANO_IMPLEMENTACAO_2024-12-27.md` — 🎯 PLANO DE IMPLEMENTAÇÃO EXAUSTIVO - PROJETO VISÃO (416 linhas)
- `docs/PLANO_IMPLEMENTACAO_COMPLETO_2024-12-27.md` — 🔍 ANÁLISE EXAUSTIVA E PLANO DE IMPLEMENTAÇÃO (531 linhas)
- `docs/PLANO_IMPLEMENTACAO_V10.md` — 🚀 PLANO DE IMPLEMENTAÇÃO EXAUSTIVO V10 - PROJETO VISÃO (438 linhas)
- `docs/PLANO_IMPLEMENTACAO_V12.md` — 🎯 PLANO DE IMPLEMENTAÇÃO V12 - PROJETO VISÃO (440 linhas)
- `docs/PLANO_IMPLEMENTACAO_V16_EXAUSTIVO.md` — 🎯 PLANO DE IMPLEMENTAÇÃO EXAUSTIVO - VIS-O (426 linhas)
- `docs/PLANO_IMPLEMENTACAO_V17_MELHORIAS.md` — 🎯 PLANO DE IMPLEMENTAÇÃO V17 — MELHORIAS PENDENTES (83 linhas)
- `docs/PLANO_IMPLEMENTACAO_V18_MELHORIAS.md` — 🎯 PLANO DE IMPLEMENTAÇÃO V18 - MELHORIAS PENDENTES (469 linhas)
- `docs/PLANO_IMPLEMENTACAO_V19_MELHORIAS.md` — 🚀 PLANO DE IMPLEMENTAÇÃO V19 - MELHORIAS PENDENTES (1390 linhas)
- `docs/PLANO_MELHORIAS_V11_COMPLETO.md` — 🎯 PLANO DE MELHORIAS V11 - PROJETO VISÃO (574 linhas)
- `docs/PLANO_MELHORIAS_V12.md` — 🎯 PLANO DE MELHORIAS V12 - PROJETO VISÃO (419 linhas)
- `docs/PLANO_MELHORIAS_V13_COMPLETO.md` — 🎯 PLANO DE MELHORIAS V13 - ANÁLISE EXAUSTIVA (547 linhas)
- `docs/PLANO_MELHORIAS_V14_PENDENTES.md` — 🎯 PLANO DE MELHORIAS V14 - ANÁLISE EXAUSTIVA (817 linhas)
- `docs/PLANO_MELHORIAS_V15.md` — 🎯 PLANO DE MELHORIAS V15 - ANÁLISE EXAUSTIVA (581 linhas)
- `docs/PLUGINS.md` — 🔌 Plugins Guide - Projeto VISÃO (245 linhas)
- `docs/PROMPT_CONTINUIDADE.md` — 🔄 PROMPT DE CONTINUIDADE - PROJETO VIS-O (79 linhas)
- `docs/QA-MANUAL-RESPONSIVIDADE.md` — 🧪 QA Manual — Rotas Autenticadas e Menu Mobile (272 linhas)
- `docs/README.md` — 📚 Documentação do VISÃO (36 linhas)
- `docs/REAL-TIME.md` — ⚡ Real-Time Guide - Projeto VISÃO (203 linhas)
- `docs/REFACTORING_LARGE_FILES.md` — 📝 Guia de Refatoração de Arquivos Grandes (106 linhas)
- `docs/REFATORACAO_ARQUIVOS_GRANDES.md` — 📊 PLANO DE REFATORAÇÃO - ARQUIVOS GRANDES (120 linhas)
- `docs/RELATORIO_100_PORCENTO_2026-01-15.md` — 🏆 RELATÓRIO FINAL: SISTEMA VIS-O 100% FUNCIONAL 🏆 (205 linhas)
- `docs/RELATORIO_CONSOLIDADO_QA_PhD.md` — 🏆 RELATÓRIO CONSOLIDADO - ANÁLISE QA PhD COMPLETA (250 linhas)
- `docs/RELATORIO_FINAL_V15.md` — 🎉 RELATÓRIO FINAL - PLANO V15 IMPLEMENTADO (239 linhas)
- `docs/RELATORIO_FINAL_V17_COMPLETO.md` — 🏆 RELATÓRIO FINAL V17 - IMPLEMENTAÇÃO COMPLETA (146 linhas)
- `docs/RELATORIO_FINAL_V18_101_MELHORIAS.md` — 🏆 RELATÓRIO FINAL V18 - 101 MELHORIAS IMPLEMENTADAS (182 linhas)
- `docs/RELATORIO_FINAL_V2_2026-01-11.md` — 🏆 RELATÓRIO FINAL COMPLETO - VIS-O v2.0.1 (210 linhas)
- `docs/RELATORIO_FINAL_V4.md` — 🏆 RELATÓRIO FINAL - 176 MELHORIAS IMPLEMENTADAS (95 linhas)
- `docs/RELATORIO_QA_EXAUSTIVO.md` — 🔬 RELATÓRIO DE QA EXAUSTIVO - ANÁLISE PhD (157 linhas)
- `docs/RELATORIO_QA_TURBO_FINAL.md` — 🔥 RELATÓRIO QA TURBO - TOLERÂNCIA ZERO - V2 (174 linhas)
- `docs/RELEASE-REGRESSION-CHECKLIST.md` — VISÃO — Checklist de regressão pré-release (146 linhas)
- `docs/RELEASE.md` — 🚀 Guia de Releases - VISÃO (145 linhas)
- `docs/RELEASE_PROCESS.md` — Release Process (40 linhas)
- `docs/ROUTING_GUIDE.md` — Routing Guide (72 linhas)
- `docs/SCALING.md` — 📈 Scaling Guide - Projeto VISÃO (176 linhas)
- `docs/SDK.md` — 🔌 SDK Reference - Projeto VISÃO (282 linhas)
- `docs/SECURITY-IP-WHITELIST.md` — 🔒 Sistema de Whitelist de IPs - VISÃO (200 linhas)
- `docs/SECURITY.md` — 🔒 Security Guide - Projeto VISÃO (114 linhas)
- `docs/SECURITY_BEST_PRACTICES.md` — Security Best Practices (152 linhas)
- `docs/SECURITY_GUIDE.md` — 🔐 Guia de Segurança (64 linhas)
- `docs/SECURITY_REVIEW_CALENDAR.md` — 🗓️ Calendário de Revisão de Segurança — VISÃO (43 linhas)
- `docs/SKELETON_VALIDATION.md` — Skeleton Validation Pipeline (136 linhas)
- `docs/SLO.md` — 📈 Objetivos de Nível de Serviço (SLOs) — VISÃO (32 linhas)
- `docs/STATE_MANAGEMENT.md` — State Management Guide (79 linhas)
- `docs/STATE_MANAGEMENT_GUIDE.md` — State Management Guide (61 linhas)
- `docs/STORYBOOK.md` — 📚 Storybook Guide - Projeto VISÃO (163 linhas)
- `docs/SUPABASE_GUIDE.md` — 🗄️ Guia do Supabase (94 linhas)
- `docs/TESTE_EXAUSTIVO_FUNCIONALIDADES_2026-01-15.md` — 🧪 RELATÓRIO DE TESTE EXAUSTIVO DE FUNCIONALIDADES - VIS-O (265 linhas)
- `docs/TESTING.md` — 🧪 Guia de Testes - VISÃO (61 linhas)
- `docs/TESTING_GUIDE.md` — 🧪 Guia de Testes (102 linhas)
- `docs/THEMING.md` — 🎨 Theming Guide - Projeto VISÃO (225 linhas)
- `docs/TROUBLESHOOTING.md` — 🔧 Troubleshooting Guide - Projeto VISÃO (158 linhas)
- `docs/TYPES.md` — 📝 Types Reference - Projeto VISÃO (182 linhas)
- `docs/V10_CONCLUSAO.md` — 🏆 IMPLEMENTAÇÃO V10 COMPLETA (62 linhas)
- `docs/V19_IMPLEMENTATION_COMPLETE.md` — 🎉 VIS-O V19 - IMPLEMENTAÇÃO COMPLETA (88 linhas)
- `docs/V19_PROGRESS.md` — 🚀 PLANO DE IMPLEMENTAÇÃO V19 - STATUS FINAL (150 linhas)
- `docs/V20_COMPLETE.md` — 🎉 V20 Implementation Complete (75 linhas)
- `docs/V20_IMPLEMENTATION.md` — 🚀 V20 Implementation Progress (70 linhas)
- `docs/V21_COMPLETE.md` — 🚀 V21 Implementation Complete (41 linhas)
- `docs/V24_COMPLETE.md` — 🚀 V24 Implementation Complete (39 linhas)
- `docs/VIDEO_STREAMING.md` — 📹 Video Streaming - Projeto VISÃO (195 linhas)
- `docs/VISUAL_BASELINE_CONVENTION.md` — Convenção de Baselines Visuais (105 linhas)
- `docs/WEBHOOKS.md` — 🔗 Webhooks Guide - Projeto VISÃO (186 linhas)
- `docs/WEBSOCKET_GUIDE.md` — WebSocket Guide (75 linhas)
- `docs/prod-readiness.md` — Visao_V2 - Prod Readiness Report (67 linhas)
- `docs/qa-checklist-template.md` — ✅ Checklist Guiado de QA — Responsividade & Mobile Nav (211 linhas)
- subpastas de docs/: docs/archive (20), docs/runbooks (16), docs/estado (10), docs/agentes (6), docs/reverse (3), docs/qa-runs (2), docs/adr (1), docs/analysis (1), docs/api (1), docs/audits (1)
- CHANGELOG topo: [2026-11-26] - Máscaras de movimento passam a redigir o quadro analisado pela IA (fix)

## Últimos commits
- 2026-11-26 `77f8a4df` fix(a11y): destrava o E2E corrigindo violacoes critical/serious nos 6 projetos (#225)
- 2026-11-26 `e7192cd4` fix(máscaras): máscaras de movimento redigem o quadro enviado à análise (#230)
- 2026-11-26 `2e6ff990` feat(navegacao): expoe no menu as rotas que so existiam digitando a url (#227)
- 2026-11-23 `0f04bf27` fix(fake-data): remove math.random() de caminhos de producao (#215)
- 2026-11-22 `1b85fe30` fix(config): migra tooling do projeto morto fsisdfdwlbfeadwfqpir para pmzxbffnbenkmzpnbehb (#214)
- 2026-11-22 `35df3aca` fix(face): carrega modelos de rosto da fonte configurada (cdn por padrão) (#213)
- 2026-11-21 `11cc5dee` docs(auditoria): corrige status e refina criterios de cobertura
- 2026-11-21 `8a666a74` docs: declara universo da contagem e precisao do bitrate
- 2026-11-21 `b8448d8b` docs: refina cobertura da auditoria e criterios mfa/bitrate
- 2026-11-21 `6096c21c` docs(auditoria): confirma mfa e bitrate adaptativo implementados
- 2026-11-21 `18526f7d` feat(clips): grava clips no servidor (integra useClipStorage morto ao recorder) (#211)
- 2026-11-21 `9404ed1d` feat(video): bitrate adaptativo degrada nivel ao zerar buffer e recupera para auto (#210)
- 2026-11-21 `76c09083` feat(auth): login exige MFA TOTP para contas com fator verificado (#209)
- 2026-11-20 `60623f43` fix(ci): ref morto do Supabase + remove service_role_key dos E2E + fail-fast de DNS
- 2026-11-20 `fa20b5c8` chore(deps): bump @hookform/resolvers from 5.9.1 to 7.0.6 (#204)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
