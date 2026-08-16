# FATOS DE RUNTIME — medidos em produção (2026-08-16)

> Medições diretas no banco de produção via MCP, somente leitura.
> **Estes são fatos verificados**, não inferências. Use-os como evidência; não os contradiga sem medir.

## Ambiente

- PostgreSQL 17.6 — 270 MB — schema `public` com **169 tabelas** e 2 views
- Extensões ativas: `pg_cron` 1.6.4, `pg_net` 0.20.4, `pgcrypto`, `pg_trgm`, `pg_stat_statements`, `supabase_vault` 0.3.1, `uuid-ossp`, `fuzzystrmatch`
- **386 funções** em `public`, **113 triggers**, **406 policies RLS**, **169/169 tabelas com RLS habilitado**

## Migrations — DRIFT CRÍTICO

- Repositório versiona **361 arquivos** em `supabase/migrations/`
- `supabase_migrations.schema_migrations` registra **3 linhas**:
  - `20260731000000_initial_audit_snapshot`
  - `20260731180000_fix_cron_jobs_endpoint_migration`
  - `20260731200000_comprehensive_fixes_lgpd_fk_cron_selftests`
- **O schema vivo não foi construído pelo pipeline de migrations do repo.**

## Cron (pg_cron)

- **69 jobs, todos `active = true`**
- Últimas 24h: **18.177 execuções bem-sucedidas, 24 falhas** (0,13%)
- `cron.job_run_details` = 160 MB (maior objeto do banco)

## Tabelas COM dados reais (61 de 169)

| tabela | linhas | tabela | linhas |
|---|---|---|---|
| edge_function_error_audit | 90.462 | alerts | 26.879 |
| cron_watchdog_escalations | 7.184 | db_health_snapshots | 4.305 |
| agent_healing_runs | 3.009 | maintenance_alert_events | 1.310 |
| maintenance_alert_escalations | 1.309 | camera_vault_audit | 878 |
| collab_notification_purge_runs | 498 | stream_restart_events | 496 |
| partition_backlog_samples | 474 | zone_events | 384 |
| cron_watchdog_runs | 376 | recognition_logs | 250 |
| camera_clock_skew_findings | 234 | behavior_analyses | 100 |
| plate_detections | 100 | root_cause_correlation_runs | 86 |
| event_alerts | 60 | maintenance_dispatch_runs | 52 |
| analysis_history | 40 | **cameras** | **35** |
| zones | 32 | partition_maintenance_runs | 28 |
| evidence_exports | 25 | partition_drain_runs | 25 |
| query_telemetry | 24 | agent_discoveries_purge_runs | 23 |
| agent_relay_purge_runs | 23 | camera_clock_skew_runs | 22 |
| partition_quarantine_runs | 22 | collab_entry_purge_runs | 21 |
| admission_ledger_purge_runs | 18 | admission_reconcile_purge_runs | 18 |
| alarm_recurrence_purge_runs | 18 | maintenance_suppression_purge_runs | 18 |
| admission_reconcile_snapshots | 16 | camera_health_state | 16 |
| registered_plates | 15 | ppe_violations | 12 |
| registered_persons | 12 | audit_logs | 9 |
| rules | 8 | panic_events | 6 |
| ppe_zones | 6 | site_plan_placements | 6 |
| collab_invitations | 3 | organization_members | 3 |
| organizations | 3 | ppe_configs | 3 |
| site_plans | 3 | collab_memberships | 2 |
| collab_network_secrets | 2 | collab_networks | 2 |
| collab_notifications | 2 | notification_configs | 2 |
| user_roles | 2 | collab_governance_audit | 1 |
| connectivity_resolution_telemetry | 1 | internal_cron_secrets | 1 |
| profiles | 1 | | |

## Tabelas VAZIAS — 108 de 169 (prova de feature dormente)

```
admission_ledger_windows, agent_discoveries, agent_healing_actions, agent_relay_tasks,
alarm_recurrence_episodes, alarm_schemes, alertmanager_silences_audit, api_usage_logs,
arm_disarm_states, camera_bandwidth_samples, camera_connectivity_preferences,
camera_credentials, camera_detection_rules, camera_events, camera_ingest_endpoints,
camera_io_ports, camera_patrol_stops, camera_patrols, camera_presets, camera_ptz_config,
camera_ptz_locks, camera_schedule_runs, camera_schedules, collab_entries, collab_matches,
collab_notification_reads, collab_notification_silences, csp_violation_reports,
detection_reviews, device_registration_audit, device_registrations, device_remote_commands,
dry_run_report_snapshots, dwell_sessions, edge_cache, event_alert_treatments,
event_detections, event_reviews, face_embeddings, face_recognition_configs,
firmware_fingerprint_events, glacier_stuck_alerts, heatmap_snapshots, idempotency_keys,
io_actuation_log, local_agents, maintenance_alert_dispatches, maintenance_dispatch_suppressions,
media_assets, media_forget_audit, model_thresholds, monitor_group_cameras, monitor_groups,
monitoring_center_accounts, monitoring_center_dispatches, motion_masks,
notification_dispatches, notification_recipients, nvr_recording_downloads, nvrs,
onvif_event_deliveries, onvif_event_subscriptions, preview_telemetry_events,
productivity_metric_preferences, ptz_connection_attempts, ptz_preflight_runs,
recording_configs, rtsp_preview_sessions, rtsp_revalidation_schedules, rule_executions,
storage_tiering_runs, stream_alert_thresholds, stream_health_checks, stream_recordings,
test_mode_sessions, test_mode_suppressions, timelapse_configs, timelapse_snapshots,
timelapse_videos, timeline_attestations, user_capability_grant_audit, user_capability_grants,
user_filter_preferences, vehicles, video_clips, wizard_telemetry,
+ 22 partições vazias de plate_detections_* e recognition_logs_*
```

## Toolchain

- `node_modules` **NÃO instalado**. Nenhum build, lint ou teste foi executado nesta auditoria.
- Qualquer afirmação sobre "compila" / "testes passam" é **proibida**.
