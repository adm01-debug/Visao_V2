# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `9e5387c9e1` · branch `main` · 2026-11-27 13:50 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `admission_ledger_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `admission_ledger_windows` | Onda 227/228 — livro-caixa das decisões de admissão por origem e janela. Append-only. | 12 colunas | migration |
| `admission_reconcile_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `admission_reconcile_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `agent_discoveries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `agent_discoveries_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `agent_healing_actions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `agent_healing_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `agent_relay_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `agent_relay_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `alarm_recurrence_episodes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `alarm_recurrence_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `alarm_schemes` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `alertmanager_silences_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `analysis_history` | Histórico de análises. Usar cleanup_old_analysis_history() para limpar dados antigos. Recomendação: Agendar limpeza de dados > 30 dias via cron job ou pg_cron. | 9 colunas | migration |
| `analysis_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `api_usage_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `arm_disarm_states` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `behavior_analyses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | types.ts |
| `camera_bandwidth_hourly` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `camera_bandwidth_samples` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `camera_clock_skew_findings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `camera_clock_skew_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `camera_connectivity_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `camera_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `camera_detection_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `camera_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `camera_health_state` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `camera_ingest_endpoints` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `camera_io_ports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `camera_patrol_stops` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `camera_patrols` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `camera_presets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `camera_ptz_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `camera_ptz_locks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `camera_schedule_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `camera_schedules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `camera_snapshots` | Capturas de tela das câmeras | 9 colunas | migration |
| `camera_vault_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `camera_vault_coverage_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | types.ts |
| `cameras` | _(sem COMMENT ON TABLE — significado não documentado)_ | 21 colunas | migration |
| `collab_entries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `collab_entry_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `collab_governance_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `collab_invitations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `collab_matches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `collab_memberships` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `collab_network_secrets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `collab_networks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `collab_notification_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `collab_notification_reads` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `collab_notification_silences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `collab_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `connectivity_resolution_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `continuous_analysis_configs` | Configurações de análise contínua por câmera | 20 colunas | migration |
| `cron_watchdog_escalations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `cron_watchdog_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `csp_violation_reports` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `db_health_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `detection_reviews` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `device_registration_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `device_registrations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `device_remote_commands` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `dry_run_report_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `dwell_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `edge_cache` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `edge_function_error_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `event_alert_treatments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `event_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `event_detections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `event_reviews` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `evidence_exports` | Manifestos selados de exportação probatória. Imutáveis por decisão: prova corrigida é prova adulterada. | 11 colunas | migration |
| `face_embeddings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `face_recognition_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `firmware_fingerprint_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `glacier_stuck_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `heatmap_data` | Dados granulares de mapa de calor | 7 colunas | migration |
| `heatmap_snapshots` | Snapshots agregados de mapa de calor | 13 colunas | migration |
| `idempotency_keys` | Tabela interna gerenciada apenas por funções administrativas/edge functions via service_role. Sem acesso via API pública. | 3 colunas | migration |
| `internal_cron_secrets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `io_actuation_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `local_agents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `maintenance_alert_dispatches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `maintenance_alert_escalations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `maintenance_alert_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `maintenance_dispatch_runs` | Onda 246 — livro append-only das execuções do despachante externo. Ausencia de linha nunca significa saude; significa que nao houve execucao registrada. | 13 colunas | migration |
| `maintenance_dispatch_suppressions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `maintenance_suppression_purge_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `media_assets` | Metadados de mídias das câmeras armazenadas em nuvem (tiered: hot/warm/cold) | 25 colunas | migration |
| `media_forget_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `model_thresholds` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `monitor_group_cameras` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `monitor_groups` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `monitoring_center_accounts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `monitoring_center_dispatches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 20 colunas | migration |
| `motion_masks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `notification_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `notification_dispatches` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `notification_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `notification_recipients` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `notification_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `nvr_recording_downloads` | _(sem COMMENT ON TABLE — significado não documentado)_ | 27 colunas | migration |
| `nvrs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `onvif_event_deliveries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `onvif_event_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `organization_members` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `organizations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `panic_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `partition_backlog_samples` | Onda 113: série temporal da contagem de linhas nas partições DEFAULT. A classificação de severidade e a projeção de saturação vivem em src/lib/partitionBacklogTrend.ts (fonte única de verdade); esta tabela guarda apenas o dado bruto. | 8 colunas | migration |
| `partition_drain_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `partition_maintenance_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `partition_quarantine_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `plate_detections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `plate_detections_default` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_05` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_06` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_07` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_08` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_09` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_11` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2026_12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2027_01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2027_02` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_m2027_03` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `plate_detections_y2025_y2026_pre` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | types.ts |
| `ppe_configs` | Configurações de detecção de EPI por câmera | 12 colunas | migration |
| `ppe_violations` | Registro de violações de uso de EPI | 12 colunas | migration |
| `ppe_zones` | Zonas que requerem uso de EPIs específicos | 11 colunas | migration |
| `preview_telemetry_events` | Eventos de ciclo de vida da prévia RTSP para o painel de observabilidade (VISÃO). | 20 colunas | migration |
| `productivity_metric_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | types.ts |
| `ptz_connection_attempts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `ptz_preflight_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `query_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `recognition_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `recognition_logs_default` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_05` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_06` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_07` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_08` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_09` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_10` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_11` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2026_12` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2027_01` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2027_02` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_m2027_03` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recognition_logs_y2025_y2026_pre` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | types.ts |
| `recording_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 15 colunas | migration |
| `recording_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `registered_persons` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `registered_plates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `root_cause_correlation_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `rtsp_preview_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `rtsp_revalidation_schedules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `rule_executions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `rule_violations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `site_plan_placements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `site_plans` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `storage_tiering_runs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `stream_alert_thresholds` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `stream_health_checks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `stream_recordings` | Gravações de streams de câmeras | 15 colunas | migration |
| `stream_restart_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `stream_stats` | Estatísticas de qualidade dos streams | 14 colunas | migration |
| `test_mode_sessions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `test_mode_suppressions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `timelapse_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `timelapse_snapshots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `timelapse_videos` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `timeline_attestations` | Onda 201: registro probatorio dos atestados de trajetoria. Append-only; colunas derivadas do documento em SQL. | 19 colunas | migration |
| `user_capability_grant_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `user_capability_grants` | Onda 150: deltas nominais de permissão sobre o piso do papel. Linha vencida ou revogada é prova histórica, nunca regra ativa. | 10 colunas | migration |
| `user_filter_preferences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `user_roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `vehicles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `video_clips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `wizard_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `zone_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `zones` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `rule_category` (enum) | security, safety, operations, access, analytics |  | banco |
| `rule_severity` (enum) | low, medium, high, critical |  | banco |
| `rule_action` (enum) | alert, notify, record, lockdown, dispatch, arm, disarm, panic, trigger_output |  | banco |
| `condition_type` (enum) | people_count, no_ppe, restricted_area, face_recognition, vehicle_detection, loitering, crowd_density, motion_detection, object_left, perimeter_breach, absence_detection, agglomeration_detection, anomaly_position, anomaly_speed, anomaly_displacement, scene_change, recurrent_vehicle |  | banco |
| `condition_operator` (enum) | greater_than, less_than, equals, not_equals, contains, between |  | banco |
| `camera_status` (enum) | online, offline, alert, warning |  | banco |
| `alert_type` (enum) | security, safety, operations, access, analytics, absence, agglomeration, anomaly, panic, arm_disarm, scene_change, camera_offline, recurrent_vehicle, qr_code_event |  | banco |
| `analysis_session_status` (enum) | idle, running, paused, error, stopped, scheduled |  | banco |
| `stream_protocol` (enum) | hls, webrtc, rtsp, mjpeg |  | banco |
| `stream_status` (enum) | disconnected, connecting, connected, playing, buffering, paused, error, reconnecting |  | banco |
| `app_role` (enum) | admin, manager, operator, viewer |  | banco |
| `org_role` (enum) | owner, admin, member, viewer |  | banco |
| `camera_event_type` (enum) | motion, person_detected, vehicle_detected, face_detected, plate_detected, zone_entry, zone_exit, loitering, tampering, offline, online, ppe_violation, behavior_anomaly, panic, manual |  | banco |
| `event_alert_severity` (enum) | low, medium, high, critical |  | banco |
| `event_alert_status` (enum) | open, acknowledged, resolved, dismissed |  | banco |
| `event_review_verdict` (enum) | true_positive, false_positive, false_negative, uncertain |  | banco |
| `alarm_resolution_code` (enum) | incident_confirmed, handled_on_site, no_action_needed, false_positive, duplicate, test |  | banco |
| `media_type` (enum) | snapshot, clip, continuous |  | banco |
| `notification_channel` (enum) | email, whatsapp |  | banco |
| `notification_dispatch_status` (enum) | pending, sent, skipped, failed |  | banco |
| `ppe_type` (enum) | helmet, vest, goggles, mask, gloves, boots, earmuffs, harness |  | banco |
| `restore_status` (enum) | none, in_progress, available, expired |  | banco |
| `retention_class` (enum) | standard, extended, forensic |  | banco |
| `storage_tier` (enum) | hot, warm, cold |  | banco |
| `AlertType` (TS) | security \| safety \| operations \| access \| analytics \| absence \| agglomeration \| anomaly \| panic \| arm_disarm \| scene_change \| camera_offline \| recurrent_vehicle \| qr_code_event |  | `src/components/AlertCard.tsx` |
| `AlertSeverity` (TS) | low \| medium \| high \| critical |  | `src/components/AlertCard.tsx` |
| `AlertType` (TS) | security \| safety \| operations \| access \| analytics |  | `src/components/AlertDetail.tsx` |
| `AlertSeverity` (TS) | low \| medium \| high \| critical |  | `src/components/AlertDetail.tsx` |
| `AlertType` (TS) | security \| safety \| operations \| access \| analytics |  | `src/components/AlertNotification.tsx` |
| `AlertSeverity` (TS) | low \| medium \| high \| critical |  | `src/components/AlertNotification.tsx` |
| `CameraLayout` (TS) | 2x2 \| 3x3 \| list |  | `src/components/CameraLayoutControls.tsx` |
| `PersonListType` (TS) | authorized \| vip \| blocked \| unknown |  | `src/components/PersonForm.tsx` |
| `TimelineItemStatus` (TS) | completed \| current \| pending \| error \| warning |  | `src/components/Timeline.tsx` |
| `ViewMode` (TS) | grid \| list \| timeline |  | `src/components/alerts/AlertTypes.ts` |
| `SortOption` (TS) | date-desc \| date-asc \| severity-desc \| severity-asc |  | `src/components/alerts/AlertTypes.ts` |
| `AlertType` (TS) | security \| safety \| operations \| access \| analytics \| absence \| agglomeration \| anomaly \| panic \| arm_disarm \| scene_change \| camera_offline \| recurrent_vehicle \| qr_code_event \| all |  | `src/components/alerts/alertFilterTypes.ts` |
| `AlertSeverity` (TS) | low \| medium \| high \| critical \| all |  | `src/components/alerts/alertFilterTypes.ts` |
| `DateRange` (TS) | all \| 1h \| 24h \| 7d \| 30d \| custom |  | `src/components/alerts/alertFilterTypes.ts` |
| `TypeFilter` (TS) | all \| analysis \| alert |  | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| `SeverityFilter` (TS) | all \| low \| medium \| high \| critical |  | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| `PTZ_PROTOCOLS` (TS) | 'onvif', 'hikvision', 'dahua', 'axis' |  | `src/components/cameras/addCameraSchema.ts` |
| `ViewMode` (TS) | grid-1x1 \| grid-2x2 \| grid-3x3 \| grid-4x4 \| list |  | `src/components/cameras/types.ts` |
| `CameraStatus` (TS) | online \| offline \| alert \| warning |  | `src/components/cameras/types.ts` |
| `AlertSortOption` (TS) | date-desc \| date-asc \| severity-desc \| severity-asc \| type |  | `src/components/dashboard/DashboardTypes.ts` |
| `ViewMode` (TS) | grid \| stream \| map \| analytics |  | `src/components/dashboard/DashboardTypes.ts` |
| `GridLayout` (TS) | 1x1 \| 2x2 \| 3x3 \| 4x4 \| list |  | `src/components/dashboard/DashboardTypes.ts` |
| `AlertSortOption` (TS) | date-desc \| date-asc \| severity-desc \| severity-asc \| type |  | `src/components/dashboard/types.ts` |
| `ViewMode` (TS) | cards \| streams \| hybrid |  | `src/components/dashboard/types.ts` |
| `ListType` (TS) | whitelist \| blacklist \| vip \| employee \| visitor \| contractor \| unknown |  | `src/components/face-recognition/faceRecognitionTypes.ts` |
| `PeriodFilter` (TS) | today \| yesterday \| 7d \| 30d |  | `src/components/journey/useJourneyData.ts` |
| `DAYS_OF_WEEK` (TS) | { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, |  | `src/components/notification-settings/types.ts` |
| `CHANNEL_OPTIONS` (TS) | { value: 'push', label: 'Push Browser', icon: 'Bell' as const }, { value: 'email', label: 'Email', icon: 'Mail' as const }, { value: 'sms', label: 'SMS/WhatsApp', icon: 'Phone' as const }, { value: 'webhook', label: 'Webhook', icon: 'Webhook' as const }, |  | `src/components/notification-settings/types.ts` |
| `ViewMode` (TS) | grid \| list |  | `src/components/people/types.ts` |
| `PtzAxis` (TS) | pan \| tilt \| zoom |  | `src/components/ptz/PtzAxisRangeVisualizer.tsx` |
| `PtzAxis` (TS) | pan \| tilt \| zoom |  | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `PreflightAxis` (TS) | pan \| tilt \| zoom |  | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `PreflightAxisLike` (TS) | pan \| tilt \| zoom |  | `src/components/ptz/ptzPreflightPdf.ts` |
| `PreflightPhaseId` (TS) | A \| B \| C |  | `src/components/ptz/ptzPreflightPdf.ts` |
| `PreflightOutcome` (TS) | ok \| deviation \| fail \| no-telemetry \| skipped |  | `src/components/ptz/ptzPreflightPdf.ts` |
| `PtzAxis` (TS) | pan \| tilt \| zoom |  | `src/components/ptz/lib/calibrationRules.ts` |
| `ObservedRangeError` (TS) | not_finite \| out_of_bounds \| min_ge_max |  | `src/components/ptz/lib/calibrationRules.ts` |
| `RiskSeverity` (TS) | critical \| high \| medium \| low |  | `src/components/scanner/detected-risks/types.ts` |
| `RiskType` (TS) | off_duty_presence \| loitering \| break_in_indicator \| perimeter_breach \| unknown_face |  | `src/components/scanner/detected-risks/types.ts` |
| `LogLevel` (TS) | info \| warning \| error \| critical |  | `src/components/security/SecurityTypes.ts` |
| `LogCategory` (TS) | auth \| access \| system \| camera \| alert \| config \| user |  | `src/components/security/SecurityTypes.ts` |
| `AccessStatus` (TS) | granted \| denied \| pending |  | `src/components/security/SecurityTypes.ts` |
| `ListType` (TS) | whitelist \| blacklist \| watchlist |  | `src/components/security/SecurityTypes.ts` |
| `SkeletonFallbackVariant` (TS) | page \| cards \| table \| filters \| inline |  | `src/components/skeletons/SkeletonFallback.tsx` |
| `EventType` (TS) | camera_online \| camera_offline \| alert_triggered \| alert_resolved \| person_detected \| person_recognized \| vehicle_detected \| zone_breach \| system_update \| user_action |  | `src/components/ui/EventTimeline.tsx` |
| `ToastType` (TS) | success \| error \| warning \| info |  | `src/components/ui/Notifications.tsx` |
| `DrawingMode` (TS) | select \| rectangle \| polygon \| line |  | `src/components/zone-editor/ZoneEditorTypes.ts` |
| `ZoneType` (TS) | restricted \| counting \| tripwire \| dwell \| occupancy \| parking \| queue \| safety \| custom |  | `src/components/zone-overlay/zoneOverlayTypes.ts` |
| `ZoneType` (TS) | restricted \| counting \| tripwire \| dwell \| occupancy \| parking \| queue \| safety \| custom |  | `src/components/zones/zonesConfig.ts` |
| `ModelSource` (TS) | cdn \| local |  | `src/config/models_config.ts` |
| `ZONE_COLORS` (TS) | CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.violet, 'hsl(330, 81%, 60%)', // pink CHART_COLORS.cyan, CHART_COLORS.orange, |  | `src/constants/chartColors.ts` |
| `MessageCategory` (TS) | SUCCESS \| ERROR \| VALIDATION \| INFO \| WARNING |  | `src/constants/messages.ts` |
| `ThemeMode` (TS) | dark \| light \| system |  | `src/contexts/ThemeProvider.tsx` |
| `ThemeVariant` (TS) | default \| soc \| midnight \| contrast \| industrial |  | `src/contexts/ThemeProvider.tsx` |
| `StreamProtocol` (TS) | hls \| webrtc \| rtsp |  | `src/hooks/useAnalysisStream.ts` |
| `ScheduleScope` (TS) | camera \| group \| all |  | `src/hooks/useCameraSchedules.ts` |
| `ScheduleAction` (TS) | arm \| disarm |  | `src/hooks/useCameraSchedules.ts` |
| `ScheduleStatus` (TS) | ok \| error \| skipped |  | `src/hooks/useCameraSchedules.ts` |
| `COLLAB_UNREAD_KEY` (TS) | 'collab', 'unread-counts' |  | `src/hooks/useCollabUnreadBadge.ts` |
| `ReviewVerdict` (TS) | true_positive \| false_positive \| false_negative \| uncertain |  | `src/hooks/useDetectionReviews.ts` |
| `SourceTable` (TS) | alerts \| recognition_logs \| plate_detections |  | `src/hooks/useDetectionReviews.ts` |
| `FaceMatchStatus` (TS) | known \| unknown \| blacklist \| vip |  | `src/hooks/useFaceAPI.ts` |
| `SnapshotStatus` (TS) | idle \| capturing \| done \| failed \| pending |  | `src/hooks/useFirstSnapshot.ts` |
| `FleetHealthState` (TS) | online \| degraded \| offline \| unknown |  | `src/hooks/useFleetHealthEndpoint.ts` |
| `AnalysisType` (TS) | security \| productivity \| safety |  | `src/hooks/useImageAnalysis.ts` |
| `MAINTENANCE_BADGE_KEY` (TS) | 'maintenance', 'open-count' |  | `src/hooks/useMaintenanceAlertBadge.ts` |
| `FilterScope` (TS) | alerts \| cameras \| people \| zones \| recordings \| recognition-logs \| analysis-history \| license-plate-history |  | `src/hooks/useManagedFilters.ts` |
| `MonitorLayout` (TS) | 1x1 \| 2x2 \| 3x3 \| 4x4 \| 1+5 \| 2+8 |  | `src/hooks/useMonitorGroups.ts` |
| `MaskMode` (TS) | include \| exclude |  | `src/hooks/useMotionMasks.ts` |
| `LayoutType` (TS) | 1x1 \| 2x2 \| 3x3 \| 4x4 |  | `src/hooks/useMultiCameraRecognition.ts` |
| `PtzCommand` (TS) | move \| stop \| zoom \| focus \| iris \| goto_preset \| save_preset \| delete_preset \| home \| test \| get_status \| absolute_move |  | `src/hooks/usePtzControl.ts` |
| `RelayHealthStatus` (TS) | unknown \| online \| stale \| offline \| missing |  | `src/hooks/useRelayAgentHealth.ts` |
| `ValidationSeverity` (TS) | info \| warn \| critical |  | `src/hooks/useRtspValidation.ts` |
| `TestModeScope` (TS) | all \| camera \| rule |  | `src/hooks/useTestMode.ts` |
| `AppRole` (TS) | admin \| manager \| operator \| viewer |  | `src/hooks/useUserRole.ts` |
| `RecordingState` (TS) | idle \| recording \| paused \| processing \| saving |  | `src/hooks/clip-recorder/types.ts` |
| `TriggerType` (TS) | manual \| rule \| motion \| alert \| scheduled |  | `src/hooks/clip-recorder/types.ts` |
| `StreamQuality` (TS) | auto \| low \| medium \| high |  | `src/hooks/global-streaming/streamingTypes.ts` |
| `StreamStatus` (TS) | idle \| connecting \| connected \| playing \| paused \| error \| offline |  | `src/hooks/global-streaming/streamingTypes.ts` |
| `TimeRange` (TS) | 1h \| 6h \| 12h \| 24h \| 7d \| 30d \| custom |  | `src/hooks/heatmap/heatmapTypes.ts` |
| `ModelType` (TS) | coco-ssd \| movenet \| blazeface |  | `src/hooks/ml-models/mlModelTypes.ts` |
| `BackendType` (TS) | webgl \| wasm \| cpu |  | `src/hooks/ml-models/mlModelTypes.ts` |
| `NotificationChannel` (TS) | push \| email \| whatsapp \| in_app \| sound |  | `src/hooks/notifications/notificationTypes.ts` |
| `NotificationSeverity` (TS) | low \| medium \| high \| critical |  | `src/hooks/notifications/notificationTypes.ts` |
| `NotificationStatus` (TS) | pending \| sent \| delivered \| failed \| read |  | `src/hooks/notifications/notificationTypes.ts` |
| `PPEType` (TS) | helmet \| vest \| gloves \| boots \| goggles \| mask \| earmuffs \| harness |  | `src/hooks/ppe/types.ts` |
| `PPEStatus` (TS) | detected \| missing \| unknown |  | `src/hooks/ppe/types.ts` |
| `AgentHealingSeverity` (TS) | ok \| warning \| critical |  | `src/lib/agentHealing.ts` |
| `AgentHealingAction` (TS) | none \| nudge \| restart \| escalate |  | `src/lib/agentHealing.ts` |
| `AdmissionAction` (TS) | nudge \| restart \| escalate |  | `src/lib/agentRestartBudget.ts` |
| `AdmissionSeverity` (TS) | warning \| critical |  | `src/lib/agentRestartBudget.ts` |
| `AdmissionOutcome` (TS) | admitted \| deferred \| suppressed |  | `src/lib/agentRestartBudget.ts` |
| … +255 linhas — lista completa em `context.json` | | | |

## Dados de referência (seed — planos, categorias, perfis fixos)

| Tabela | Colunas | Valores | Origem |
|---|---|---|---|
| `cameras` | `id, name, url, location, status` | `('00000000-0000-0000-0000-000000000001', 'Câmera Entrada', 'rtsp://demo/stream1', 'Entrada Principal', 'online'), ('00000000-0000-0000-0000-000000000002', 'Câmera Estacionamento', 'rtsp://demo/stream2', 'Estacionamento', 'online') ON CONFLICT (id) DO NOTHING` | `supabase/seed.sql` |
| `organizations` | `name, slug, created_by` | `('VISÃO Demo', 'visao-demo', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) RETURNING id INTO v_org_id` | `supabase/seed_gestao.sql` |
| `organization_members` | `organization_id, user_id, role` | `(v_org_id, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'owner') ON CONFLICT (organization_id, user_id) DO NOTHING` | `supabase/seed_gestao.sql` |
| `organizations` | `name, slug, created_by` | `('Convidada Alpha', 'convidada-alpha', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) RETURNING id INTO v_guest1` | `supabase/seed_gestao.sql` |
| `organizations` | `name, slug, created_by` | `('Convidada Beta', 'convidada-beta', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) RETURNING id INTO v_guest2` | `supabase/seed_gestao.sql` |
| `collab_invitations` | `network_id, invited_org_id, invited_by, status, ttl_days, expires_at, note` | `(v_net1, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 14, now() + interval '14 days', 'Compartilhar lista de placas restritas'), (v_net1, v_guest2, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'accepted', 14, now() + interval '14 days', 'Convite aceito na semana passada'), (v_net2, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 7, now() + interval '7 days …` | `supabase/seed_gestao.sql` |
| `site_plans` | `name, description, image_path, image_width, image_height, is_default, user_id` | `('Planta Térreo', 'Pavimento térreo — portaria, recepção e área externa', 'public/plans/ground-floor.png', 1920, 1080, true, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid), ('Planta 1º Andar','Primeiro andar — salas de reunião e operação', 'public/plans/first-floor.png', 1920, 1080, false, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid), ('Planta Galpão', 'Galpão logístico — docks e armazenagem', 'pu …` | `supabase/seed_gestao.sql` |
| `user_roles` | `user_id, role` | `('320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'admin') ON CONFLICT (user_id, role) DO NOTHING` | `supabase/seed_gestao.sql` |
| `organizations` | `name, slug, created_by` | `('VISÃO Demo', 'visao-demo', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) RETURNING id INTO v_org_id` | `supabase/seed_intelligence.sql` |
| `organization_members` | `organization_id, user_id, role` | `(v_org_id, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'owner') ON CONFLICT (organization_id, user_id) DO NOTHING` | `supabase/seed_intelligence.sql` |

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `installed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/main.tsx` |
| status | valor `saved` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/clip-recorder/CompactClipControls.tsx`<br>`compara:src/components/clip-recorder/FullClipControls.tsx` |
| status | valor `pass` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dev/MobileMenuChecklist.tsx` |
| status | valor `not_applicable` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/emap/TriageQueuePanel.tsx`<br>`escreve:src/lib/emap/triageSla.ts` |
| status | valor `expanded` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/ui/sidebar.tsx` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx` |
| status | valor `OPEN` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/resilience.ts` |
| status | valor `HALF_OPEN` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/resilience.ts` |
| status | valor `object` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/alarms/alarmAggregation.ts`<br>`compara:src/lib/alarms/alarmEpisodeBridge.ts` |
| status | valor `insufficient_evidence` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/devices/commandReliability.ts`<br>`escreve:src/lib/devices/commandReliability.ts` |
| status | valor `deaf` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/devices/commandReliability.ts` |
| status | valor `suspect` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/devices/commandReliability.ts` |
| status | valor `expected_silence` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `rejected_presence` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `awaiting_first_contact` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `enrollment_lapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `rotation_grace` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `silent_critical` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `silent_warn` para `state` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/devices/deviceSilence.ts` |
| status | valor `met` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/emap/shiftPerformance.ts` |
| status | valor `due_soon` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/emap/shiftPerformance.ts` |
| status | valor `half-open` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/_shared/circuitBreaker.ts` |
| status | valor `loading` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/AuthCallback.tsx`<br>`compara:src/components/WebcamCapture.tsx`<br>`compara:src/pages/AuthCallback.tsx` |
| status | valor `email-confirmed` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/AuthCallback.tsx` |
| status | valor `captured` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/WebcamCapture.tsx`<br>`compara:src/components/webcam/useWebcam.ts` |
| status | valor `succeeded` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/admin/CronJobRunsCard.tsx`<br>`compara:src/pages/OperationsPage.tsx`<br>`compara:supabase/functions/_shared/replicate.ts` |
| status | valor `rollback` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/cameras/CameraSetupWizard.tsx`<br>`escreve:src/components/cameras/CameraSetupWizard.tsx` |
| status | valor `starting` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/cameras/LivePreviewPlayer.tsx`<br>`compara:supabase/functions/_shared/replicate.ts`<br>`escreve:supabase/functions/_shared/replicate.ts` |
| status | valor `ended` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/cameras/LivePreviewPlayer.tsx` |
| status | valor `moving` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ptz/PtzCalibratedPresetsPanel.tsx`<br>`escreve:src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| status | valor `on_time` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/cronSchedule.ts` |
| status | valor `transport_error` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/evidence/exportRegistryView.ts`<br>`escreve:src/lib/evidence/exportRegistryView.ts` |
| status | valor `found` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/faces/attestationConference.ts`<br>`compara:src/pages/AttestationConferencePage.tsx`<br>`escreve:src/lib/faces/attestationConference.ts`<br>`escreve:src/pages/AttestationConferencePage.tsx` |
| status | valor `absent` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/faces/attestationConference.ts`<br>`escreve:src/pages/AttestationConferencePage.tsx` |
| status | valor `unavailable` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/lib/faces/attestationConference.ts`<br>`compara:src/pages/AttestationConferencePage.tsx`<br>`escreve:src/lib/faces/attestationConference.ts`<br>`escreve:src/pages/AttestationConferencePage.tsx` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/NvrDetailPage.tsx` |
| status | valor `CHANNEL_ERROR` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/NvrDetailPage.tsx` |
| status | valor `TIMED_OUT` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/NvrDetailPage.tsx` |
| status | valor `CLOSED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/NvrDetailPage.tsx` |
| status | valor `number` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/providers/QueryProvider.tsx` |
| status | valor `unhealthy` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:supabase/functions/health/index.ts`<br>`escreve:supabase/functions/health/index.ts` |
| status | valor `already_running` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/nvr-recording-convert/index.ts` |
| status | valor `restore_in_progress` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/resolve-media-url/index.ts` |
| status | valor `restore_initiated` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/resolve-media-url/index.ts` |
| status | valor `apply_camera_setup` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/cameras/CameraSetupWizard.tsx` |
| status | valor `overdue` para `stage` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/maintenance/RetentionOverviewCard.tsx`<br>`escreve:src/lib/retention/retentionDebut.ts` |
| status | valor `not_applicable` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/retention/retentionDebut.ts` |
| status | valor `no_anchor` para `stage` usado no código não existe em nenhum enum do banco/TS | `escreve:src/lib/retention/retentionDebut.ts` |
| status | valor `extend` para `phase` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/cameras/LivePreviewPlayer.tsx` |
| status | valor `converting` para `conversion_status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>`compara:supabase/functions/nvr-recording-convert/index.ts`<br>`escreve:supabase/functions/nvr-recording-convert/index.ts` |
| status | valor `detect` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ptz/PtzSetupWizard.tsx` |
| status | valor `presets` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ptz/PtzSetupWizard.tsx` |
| status | valor `limits` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ptz/PtzSetupWizard.tsx` |
| status | valor `review` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ptz/PtzSetupWizard.tsx` |
| status | valor `initial` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/SecurityMFAPanel.tsx` |
| status | valor `enrolling` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/SecurityMFAPanel.tsx` |
| status | valor `verified` para `step` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/security/SecurityMFAPanel.tsx` |
| coluna | coluna `is_active` usada no código não existe no schema de `cameras` |  |
| coluna | coluna `type` usada no código não existe no schema de `cameras` |  |
| coluna | coluna `training_photos` usada no código não existe no schema de `registered_persons` |  |
| coluna | coluna `storage_path` usada no código não existe no schema de `video_clips` |  |
| coluna | coluna `storage_bucket` usada no código não existe no schema de `media_assets` |  |
| coluna | coluna `storage_key` usada no código não existe no schema de `media_assets` |  |
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `avatars` usada no código não existe nas migrations/types do repo | `src/hooks/useAvatarUpload.ts` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `recordings` usada no código não existe nas migrations/types do repo | `supabase/functions/public-api/index.ts` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tabela` usada no código não existe nas migrations/types do repo | `scripts/inventario/gerar-banco.mjs`<br>`scripts/inventario/gerar-repo.mjs` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| rls | `behavior_analyses`: acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/behavior/useBehaviorAnalysis.ts` |
| rls | `camera_ingest_endpoints`: RLS ligado sem nenhuma política → só service_role acessa | `src/hooks/useCameraIngest.ts` |
| rls | `camera_vault_coverage_alerts`: acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/security/VaultAuditTimeline.tsx` |
| rls | `internal_cron_secrets`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `profiles`: acessada do front (2 arquivo(s)) sem RLS (não encontrado) | `src/hooks/useAvatarUpload.ts`<br>`src/pages/ProfilePage.tsx` |
| rls | `query_telemetry`: acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/lib/errorReporter.ts` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `tools-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `dashboard_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `demo` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/test_snapshot.py` |
| rpc | RPC `fixture_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `fn` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `ghost_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `is_admin` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `nome` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `pg_advisory_unlock` chamada mas não definida nas migrations/types | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| rpc | RPC `pg_try_advisory_lock` chamada mas não definida nas migrations/types | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| rpc | RPC `r1` chamada mas não definida nas migrations/types | `scripts/ai-context/cenarios.mjs` |
| rpc | RPC `runtime_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `tools_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `x` chamada mas não definida nas migrations/types | `scripts/inventario/gerar-rotas.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/inventario/gerar-banco.mjs` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/inventario/inventario.unit.mjs` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/regras_negocio/generate.py` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/components/nvr-downloads/NvrDownloadJobRow.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/components/testMode/TestModeDialog.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useFirstSnapshot.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useSitePlans.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useStorage.ts` |
| dinâmico | 5 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/clip-recorder/useClipStorage.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/lib/clipStorageUrls.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/_shared/storagePurge.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/forget-user-media/index.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/nvr-recording-convert/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/promote-hot-to-warm/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/resolve-media-url/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/upload-media/index.ts` |
| segurança | função `get_clip_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `toggle_clip_favorite` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `get_recognition_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `get_zone_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_zones.sql` |
| segurança | função `update_person_last_seen` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `cleanup_old_data` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/00001_consolidated_all_gaps.sql` |
| segurança | função `process_alert_notification` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/00003_notification_config.sql` |
| segurança | função `start_clip_recording` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `finish_clip_recording` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `mark_clip_viewed` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `cleanup_old_clips` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_clips.sql` |
| segurança | função `start_analysis_session` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_continuous_analysis.sql` |
| segurança | função `update_session_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_continuous_analysis.sql` |
| segurança | função `get_camera_analysis_stats` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_continuous_analysis.sql` |
| segurança | função `cleanup_old_analysis_history` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_continuous_analysis.sql` |
| segurança | função `auto_create_alert_on_violation` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_continuous_analysis.sql` |
| segurança | função `register_person` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `get_persons_by_list_type` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `cleanup_old_recognition_logs` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `auto_alert_on_blacklist` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_facial_recognition.sql` |
| segurança | função `update_camera_stream_status` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_streaming_support.sql` |
| segurança | função `start_stream_recording` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_streaming_support.sql` |
| segurança | função `stop_stream_recording` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_streaming_support.sql` |
| segurança | função `create_zone` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_zones.sql` |
| segurança | função `record_zone_event` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_zones.sql` |
| segurança | função `cleanup_old_zone_events` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20251219_zones.sql` |
| webhook | edge function `nvr-recording-download` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/nvr-recording-download/index.ts` |
| webhook | edge function `timeline-attest` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/timeline-attest/index.ts` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `recording_sessions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `rule_executions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `api_usage_logs.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `camera_health_state.last_state_change_at` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `rtsp_revalidation_schedules.last_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `wizard_telemetry.step` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `edge_function_error_audit.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ptz_connection_attempts.http_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `nvr_recording_downloads.conversion_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `ptz_preflight_runs.status_supported` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_default.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_05.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_06.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_07.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_08.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_09.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_10.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_11.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2026_12.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2027_01.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2027_02.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_m2027_03.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `plate_detections_y2025_y2026_pre.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 165/184 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `analysis_sessions`, `recording_configs`, `video_clips`, `registered_persons`, `face_recognition_configs`, `zones`, `zone_events`, `notification_configs`, `notification_history`, `notification_templates`, `rules`, `cameras` …
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
