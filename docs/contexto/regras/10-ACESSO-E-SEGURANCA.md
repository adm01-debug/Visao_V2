# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `35b6e52d06` · branch `main` · 2026-11-13 02:36 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `banner`, `contentinfo`, `denied`, `granted`, `main`, `manager`, `member`, `navigation`, `operator`, `owner`, `region`, `role`, `user`, `viewer`

- Tabelas de perfil/permissão: `user_roles`, `organization_members`, `collab_memberships`
- Colunas de perfil: `registered_persons.role` (text), `user_roles.role` (app_role NOT NULL), `organization_members.role` (public.org_role NOT NULL DEFAULT 'member')
- Claims do JWT usados em políticas/funções: nenhum
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `collab_user_orgs`, `has_org_role`, `has_role`, `is_org_member`, `owns_plan_and_camera`

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `admission_ledger_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `admission_ledger_windows` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | — | — |
| `admission_reconcile_purge_runs` | forced | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `admission_reconcile_snapshots` | forced | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `agent_discoveries` | enabled | authenticated: auth.uid() = user_id | — | — | authenticated: auth.uid() = user_id |
| `agent_discoveries_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `agent_healing_actions` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | — | — | — |
| `agent_healing_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `agent_relay_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `agent_relay_tasks` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — | — |
| `alarm_recurrence_episodes` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | — | — | — |
| `alarm_recurrence_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `alarm_schemes` | enabled | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `alertmanager_silences_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | authenticated: false | authenticated: false |
| `alerts` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `analysis_history` | enabled | public: true<br>public: true<br>authenticated: auth.uid() = user_id | public: true<br>public: true<br>authenticated: auth.uid() = user_id | public: true<br>public: true<br>authenticated: auth.uid() = user_id | public: true<br>public: true<br>authenticated: auth.uid() = user_id |
| `analysis_sessions` | enabled | public: true<br>public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = analysis_sessions.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = analysis_sessions.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = analysis_sessions.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = analysis_sessions.camera_id AND cameras.user_id = auth.uid() ) |
| `api_usage_logs` | enabled | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') | — | — | — |
| `arm_disarm_states` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `audit_logs` | enabled | authenticated: (SELECT auth.uid()) = user_id OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) | service_role: true | — | — |
| `behavior_analyses` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `camera_bandwidth_hourly` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `camera_bandwidth_samples` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `camera_clock_skew_findings` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role)<br>authenticated: user_id IS NOT NULL AND user_id = auth.uid() | — | — | — |
| `camera_clock_skew_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `camera_connectivity_preferences` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `camera_credentials` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `camera_detection_rules` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) AND created_by = auth.uid() | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `camera_events` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `camera_health_state` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `camera_ingest_endpoints` | enabled | — | — | — | — |
| `camera_io_ports` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `camera_patrol_stops` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid | authenticated: EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid | authenticated: EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid | authenticated: EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid |
| `camera_patrols` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `camera_presets` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `camera_ptz_config` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `camera_ptz_locks` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.cameras c WHERE c.id = camera_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'ad | — | — | — |
| `camera_schedule_runs` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `camera_schedules` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `camera_snapshots` | enabled | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = camera_snapshots.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = camera_snapshots.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = camera_snapshots.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = camera_snapshots.camera_id AND cameras.user_id = auth.uid() ) |
| `camera_vault_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `camera_vault_coverage_alerts` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `cameras` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `collab_entries` | enabled | authenticated: owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())) | — | — | — |
| `collab_entry_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `collab_governance_audit` | enabled | authenticated: organization_id IN (SELECT public.collab_user_orgs(auth.uid())) OR EXISTS (SELECT 1 FROM public.collab_networks n WHERE n.id  | — | — | — |
| `collab_invitations` | enabled | authenticated: invited_org_id IN (SELECT public.collab_user_orgs(auth.uid())) OR EXISTS (SELECT 1 FROM public.collab_networks n WHERE n.id = | — | — | — |
| `collab_matches` | enabled | authenticated: reader_org_id IN (SELECT public.collab_user_orgs(auth.uid())) OR owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())) | — | — | — |
| `collab_memberships` | enabled | authenticated: organization_id IN (SELECT public.collab_user_orgs(auth.uid())) OR EXISTS ( SELECT 1 FROM public.collab_networks n WHERE n.id | — | — | — |
| `collab_network_secrets` | enabled | — | — | — | — |
| `collab_networks` | enabled | authenticated: owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())) OR EXISTS ( SELECT 1 FROM public.collab_memberships m WHERE m.ne | — | — | — |
| `collab_notification_purge_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `collab_notification_reads` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `collab_notification_silences` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `collab_notifications` | enabled | authenticated: organization_id IN (SELECT public.collab_user_orgs(auth.uid())) | — | — | — |
| `connectivity_resolution_telemetry` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | — | — |
| `continuous_analysis_configs` | enabled | public: true<br>public: true<br>authenticated: auth.uid() = created_by | public: true<br>public: true<br>authenticated: auth.uid() = created_by | public: true<br>public: true<br>authenticated: auth.uid() = created_by | public: true<br>public: true<br>authenticated: auth.uid() = created_by |
| `cron_watchdog_escalations` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | authenticated: public.has_role(auth.uid(), 'admin') | — |
| `cron_watchdog_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `csp_violation_reports` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `db_health_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `detection_reviews` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `device_registration_audit` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `device_registrations` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `device_remote_commands` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() AND requested_by = auth.uid() AND EXISTS ( SELECT 1 FROM public.device_registrations r WHERE r.id = regi | authenticated: user_id = auth.uid() AND status IN ('queued','awaiting_presence') | — |
| `dry_run_report_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role)<br>authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `dwell_sessions` | enabled | — | — | — | — |
| `edge_cache` | enabled | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `edge_function_error_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `event_alert_treatments` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | — | — | — |
| `event_alerts` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `event_detections` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `event_reviews` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.is_org_member(organization_id, auth.uid()) AND reviewer_id = auth.uid() | authenticated: reviewer_id = auth.uid() AND public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `evidence_exports` | enabled | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') | authenticated: user_id = auth.uid() | — | — |
| `face_embeddings` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `face_recognition_configs` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `firmware_fingerprint_events` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `glacier_stuck_alerts` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `heatmap_data` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = heatmap_data.camera_id AND cameras.user_id = auth.uid() ) | authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = heatmap_data.camera_id AND cameras.user_id = auth.uid() ) | — | — |
| `heatmap_snapshots` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — | authenticated: auth.uid() = user_id |
| `idempotency_keys` | enabled | authenticated, anon: false | authenticated, anon: false | authenticated, anon: false | authenticated, anon: false |
| `internal_cron_secrets` | enabled | — | — | — | — |
| `io_actuation_log` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `local_agents` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `maintenance_alert_dispatches` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `maintenance_alert_escalations` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `maintenance_alert_events` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `maintenance_dispatch_runs` | forced | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `maintenance_dispatch_suppressions` | forced | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false | anon, authenticated: false |
| `maintenance_suppression_purge_runs` | forced | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `media_assets` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') |
| `media_forget_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | — | — |
| `model_thresholds` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `monitor_group_cameras` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `monitor_groups` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `monitoring_center_accounts` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `monitoring_center_dispatches` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `motion_masks` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `notification_configs` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `notification_dispatches` | enabled | authenticated: auth.uid() = user_id | — | authenticated: auth.uid() = user_id | — |
| `notification_history` | enabled | public: true | public: true | public: true | public: true |
| `notification_recipients` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `notification_templates` | enabled | public: true | public: true | public: true | public: true |
| `nvr_recording_downloads` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `nvrs` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `onvif_event_deliveries` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `onvif_event_subscriptions` | enabled | authenticated: auth.uid() = user_id | — | — | — |
| `organization_members` | enabled | authenticated: public.is_org_member(organization_id, auth.uid()) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) | authenticated: public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) |
| `organizations` | enabled | authenticated: public.is_org_member(id, auth.uid()) | authenticated: created_by = auth.uid() | authenticated: public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) | authenticated: public.has_org_role(id, auth.uid(), ARRAY['owner']::public.org_role[]) |
| `panic_events` | enabled | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') | authenticated: auth.uid() = user_id |
| `partition_backlog_samples` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `partition_drain_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `partition_maintenance_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `partition_quarantine_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `plate_detections` | enabled | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id | authenticated: (SELECT auth.uid()) = user_id |
| `plate_detections_default` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_m2026_05` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_m2026_06` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_m2026_07` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_m2026_08` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2026_09` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2026_10` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2026_11` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2026_12` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2027_01` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `plate_detections_m2027_02` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_m2027_03` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `plate_detections_y2025_y2026_pre` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `ppe_configs` | enabled | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL |
| `ppe_violations` | enabled | public: true | public: true | public: true | — |
| `ppe_zones` | enabled | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL | public: auth.uid() = user_id OR user_id IS NULL |
| `preview_telemetry_events` | enabled | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | — | — |
| `productivity_metric_preferences` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `profiles` | não encontrado | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | sem RLS |
| `ptz_connection_attempts` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | — | — |
| `ptz_preflight_runs` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — | — |
| `query_telemetry` | não encontrado | sem RLS | authenticated: auth.uid() = user_id | sem RLS | sem RLS |
| `recognition_logs` | enabled | public: true<br>authenticated: (SELECT auth.uid()) = user_id | public: true<br>authenticated: (SELECT auth.uid()) = user_id | public: true<br>authenticated: (SELECT auth.uid()) = user_id | public: true<br>authenticated: (SELECT auth.uid()) = user_id |
| `recognition_logs_default` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_m2026_05` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_m2026_06` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_m2026_07` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_m2026_08` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2026_09` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2026_10` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2026_11` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2026_12` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2027_01` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `recognition_logs_m2027_02` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_m2027_03` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recognition_logs_y2025_y2026_pre` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `recording_configs` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `recording_sessions` | enabled | public: true | public: true | public: true | public: true |
| `registered_persons` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `registered_plates` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `root_cause_correlation_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `rtsp_preview_sessions` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `rtsp_revalidation_schedules` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `rule_executions` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `rule_violations` | enabled | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = rule_violations.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = rule_violations.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = rule_violations.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = rule_violations.camera_id AND cameras.user_id = auth.uid() ) |
| `rules` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `site_plan_placements` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() AND public.owns_plan_and_camera(plan_id, camera_id) | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `site_plans` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() |
| `storage_tiering_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `stream_alert_thresholds` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `stream_health_checks` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — | — |
| `stream_recordings` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `stream_restart_events` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id AND triggered_by = 'manual' | — | — |
| `stream_stats` | enabled | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = stream_stats.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = stream_stats.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = stream_stats.camera_id AND cameras.user_id = auth.uid() ) | public: true<br>authenticated: EXISTS ( SELECT 1 FROM public.cameras WHERE cameras.id = stream_stats.camera_id AND cameras.user_id = auth.uid() ) |
| `test_mode_sessions` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `test_mode_suppressions` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | — | — | — |
| `timelapse_configs` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `timelapse_snapshots` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — | authenticated: auth.uid() = user_id |
| `timelapse_videos` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `timeline_attestations` | enabled | authenticated: user_id = auth.uid() | authenticated: user_id = auth.uid() | — | — |
| `user_capability_grant_audit` | enabled | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `user_capability_grants` | enabled | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `user_filter_preferences` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `user_roles` | enabled | authenticated: user_id = (SELECT auth.uid()) OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) | authenticated: public.has_role(auth.uid(), 'admin') AND role <> 'admin'::app_role<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.has_role(auth.uid(), 'admin') AND role <> 'admin'::app_role<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) |
| `vehicles` | enabled | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `video_clips` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `wizard_telemetry` | enabled | authenticated: auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | — | — |
| `zone_events` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |
| `zones` | enabled | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id | public: true<br>authenticated: auth.uid() = user_id |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 291 arquivo(s)

- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/check-alarm-schemes.mjs`
- `scripts/check-collab-network.mjs`
- `scripts/check-command-sweep.mjs`
- `scripts/check-dwell-analytics.mjs`
- `scripts/check-ingest-endpoints.mjs`
- `scripts/check-maintenance-console.mjs`
- `scripts/check-monitoring-centers.mjs`
- `scripts/check-no-plain-rtsp.mjs`
- `scripts/check-remote-commands.mjs`
- `scripts/check-retention-alerts.mjs`
- `scripts/check-rls-exposure.mjs`
- `scripts/check-root-cause-correlation.mjs`
- `scripts/inventario/gerar-banco.mjs`
- `scripts/lint-migrations.mjs`
- `scripts/regras_negocio/generate.py`
- `scripts/seed-e2e-user.mjs`
- `scripts/seed-healing-ci-user.mjs`
- `scripts/seed-rules.mjs`
- `scripts/simulate-insightface-scenarios.mjs`
- `scripts/simulate-wave101-scenarios.mjs`
- `scripts/simulate-wave106-scenarios.mjs`
- `scripts/simulate-wave11-scenarios.mjs`
- `scripts/simulate-wave31-scenarios.mjs`
- `scripts/simulate-wave95-scenarios.mjs`
- `scripts/simulate-waves-44-52-scenarios.mjs`
- `scripts/supabase_snapshot/snapshot.py`
- `src/hooks/useCameraStreamUrl.ts`
- `src/hooks/useFirstSnapshot.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/errorAudit.ts`
- `supabase/functions/_shared/idempotency.ts`
- `supabase/functions/_shared/insightface-cache.ts`
- `supabase/functions/_shared/relayTransport.ts`
- `supabase/functions/_shared/replicate.ts`
- `supabase/functions/_shared/testMode.ts`
- `supabase/functions/admin-slow-queries/index.ts`
- `supabase/functions/admin-users/index.ts`
- `supabase/functions/agent-ingest/index.ts`
- `supabase/functions/agent-pair/index.ts`
- `supabase/functions/alertmanager-silence/index.ts`
- `supabase/functions/archive-warm-to-cold/index.ts`
- `supabase/functions/camera-credentials-vault/index.ts`
- `supabase/functions/camera-health-monitor/index.ts`
- `supabase/functions/camera-io-control/index.ts`
- `supabase/functions/camera-ptz-control/index.ts`
- `supabase/functions/connectivity-resolution-alert/index.ts`
- `supabase/functions/cron-watchdog-escalate/index.ts`
- `supabase/functions/cron-watchdog/index.ts`
- `supabase/functions/csp-anomaly-notify/index.ts`
- `supabase/functions/csp-report/index.ts`
- `supabase/functions/delete-my-account/index.ts`
- `supabase/functions/device-commands/index.ts`
- `supabase/functions/device-connect/index.ts`
- `supabase/functions/evidence-seal/index.ts`
- `supabase/functions/firmware-fingerprint/index.ts`
- `supabase/functions/forget-user-media/index.ts`
- `supabase/functions/glacier-stuck-monitor/index.ts`
- `supabase/functions/health/index.ts`
- `supabase/functions/ingest-auth/index.ts`
- `supabase/functions/insightface-migrate-batch/index.ts`
- `supabase/functions/maintenance-alerts-dispatch/index.ts`
- `supabase/functions/metrics-prometheus/index.ts`
- `supabase/functions/migrate-helper/index.ts`
- `supabase/functions/monitoring-center-dispatch/index.ts`
- `supabase/functions/nvr-recording-convert/index.ts`
- `supabase/functions/nvr-recording-download/index.ts`
- `supabase/functions/onvif-autodiscover/index.ts`
- `supabase/functions/onvif-event-puller/index.ts`
- `supabase/functions/preview-telemetry-alert/index.ts`
- `supabase/functions/process-automation-rules/index.ts`
- `supabase/functions/process-frame/index.ts`
- `supabase/functions/promote-hot-to-warm/index.ts`
- `supabase/functions/promote-test-executions/index.ts`
- `supabase/functions/ptz-backends-test/index.ts`
- `supabase/functions/ptz-onvif-discover/index.ts`
- `supabase/functions/ptz-presets-import/index.ts`
- `supabase/functions/public-api/index.ts`
- `supabase/functions/replay-rule-execution/index.ts`
- `supabase/functions/resolve-camera-url/index.ts`
- `supabase/functions/resolve-media-url/index.ts`
- `supabase/functions/rtsp-revalidate-scheduler/index.ts`
- `supabase/functions/run-retention/index.ts`
- `supabase/functions/storage-tiering-orchestrator/index.ts`
- `supabase/functions/stream-health-probe/index.ts`
- `supabase/functions/timeline-attest/index.ts`
- `supabase/functions/upload-media/index.ts`
- `supabase/functions/validate-rtsp-stream/criticalAlert.test.ts`
- `supabase/functions/validate-rtsp-stream/criticalAlert.ts`
- `supabase/functions/validate-rtsp-stream/index.ts`
- `supabase/functions/vault-coverage-watchdog/index.ts`
- `supabase/functions/watchdog-ack-sla-alert/index.ts`
- `supabase/migrations/20260405200047_03f0d3b4-c12d-422d-93f5-fe3c9cbed6ee.sql`
- `supabase/migrations/20260513172507_a273368b-18d4-44e8-a3d2-93256a18cab5.sql`
- `supabase/migrations/20260711153254_f49ea98f-d218-44f0-a8a0-333a3fdfd6bc.sql`
- `supabase/migrations/20260711154024_d2971199-bcf3-4346-96c5-c95fd392a634.sql`
- `supabase/migrations/20260711154040_fa178dc9-83d7-4019-b57b-682479520db6.sql`
- `supabase/migrations/20260712113637_28f97ee4-9c75-4f26-a709-8cb6387b21ac.sql`
- `supabase/migrations/20260712115534_dc9e1119-53ae-4e1a-b911-e7eab08363f3.sql`
- `supabase/migrations/20260712203101_5c17fa62-23c1-4193-9b97-ed9a520095bf.sql`
- `supabase/migrations/20260712203138_3cddfb9f-ab09-4a8d-8608-e320c7edb821.sql`
- `supabase/migrations/20260712212801_603c343a-8a17-41b8-8f2b-d505676a4903.sql`
- `supabase/migrations/20260712213046_43a31e7d-a0f8-4707-9437-7d3954408614.sql`
- `supabase/migrations/20260712223409_937d686b-e62c-4060-b38b-35350cfaf935.sql`
- `supabase/migrations/20260712223425_233f98e6-898e-47a9-a69c-fc33223a8c46.sql`
- `supabase/migrations/20260712223634_1ca1b12b-88de-4f83-be7b-0bbd1020bc1f.sql`
- `supabase/migrations/20260715190459_59ea3b1b-f1e4-4e28-b94c-9a4affe3eb0e.sql`
- `supabase/migrations/20260716174920_1b447383-93c3-4f30-a543-11fbde36b68e.sql`
- `supabase/migrations/20260716175946_c396bb4d-ce9c-4055-8f71-ab2625e0ba79.sql`
- `supabase/migrations/20260716180004_d98c8be0-8b21-47b8-8e2e-974f0e862644.sql`
- `supabase/migrations/20260716181225_8dc3d9c1-b327-4eef-ba7d-811feaa5de85.sql`
- `supabase/migrations/20260716181723_a1ed9d73-53f6-4f65-8eef-fb39aa838b07.sql`
- `supabase/migrations/20260716182217_2356b34a-750a-429b-8189-add8238cca58.sql`
- `supabase/migrations/20260716182343_92607bb5-d418-4259-9d74-08e8f6794f75.sql`
- `supabase/migrations/20260716184050_49cbb978-493d-4975-9007-30b007cca24c.sql`
- `supabase/migrations/20260716184250_c0c4fd91-0a51-463a-8d7c-c74d98b86582.sql`
- `supabase/migrations/20260716184312_12a115ff-d4d8-4d0c-b7f9-3f065d969956.sql`
- `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql`
- `supabase/migrations/20260717120044_b840472c-fb6c-4a22-868b-cabe20728353.sql`
- `supabase/migrations/20260717130857_f001ea1a-5845-4110-a336-57ee1f0eb3f8.sql`
- `supabase/migrations/20260717132043_a9103876-7f0d-4daa-aa58-cb52363fc345.sql`
- `supabase/migrations/20260717133548_c0aaa9c7-81bf-4b3e-b901-34680c898ef1.sql`
- `supabase/migrations/20260717134013_2180f304-b9ba-47c0-bb07-9d8ba9d29cfa.sql`
- `supabase/migrations/20260717134140_7d6f280e-61fc-4e57-9147-40c9b41b14e0.sql`
- `supabase/migrations/20260717134408_1757e6f5-afc0-4485-9d8b-18f0ce2edb24.sql`
- `supabase/migrations/20260717134533_11c99727-851c-4c78-b181-f028748a177d.sql`
- `supabase/migrations/20260717134808_b2d6ac76-0e82-4619-bce1-7cef48a9712d.sql`
- `supabase/migrations/20260717134947_e7eb3d6a-6f39-4d64-b719-1a0d5f88a1ce.sql`
- `supabase/migrations/20260717140703_8f71bd25-a41c-40b7-beb7-5f29f51a76ec.sql`
- `supabase/migrations/20260717140901_17080c93-3062-4b2f-8801-861060f97da9.sql`
- `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql`
- `supabase/migrations/20260717141308_384a707c-5f38-4c4d-8e0d-a6dc0ebf2d7e.sql`
- `supabase/migrations/20260717141440_2f4706ab-da62-41eb-b5fe-680ad297ae94.sql`
- `supabase/migrations/20260717142439_f533f877-1cfb-403b-b467-ff61102613c3.sql`
- `supabase/migrations/20260717142824_e4ac7123-0f10-4ab5-83f4-fbfa309c8202.sql`
- `supabase/migrations/20260717142952_7c6d9377-f249-4081-8ab8-96413de9413e.sql`
- `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql`
- `supabase/migrations/20260717173421_311e97e9-cfb9-40fc-aaca-4ec4f48f06b5.sql`
- `supabase/migrations/20260717180608_4ebc8010-394b-4ae3-af80-702fe4d3df89.sql`
- `supabase/migrations/20260717180751_fe61a643-d2f3-45ac-9acd-82cda1c53210.sql`
- `supabase/migrations/20260717181004_0335a608-fa99-480c-a117-244affa7768e.sql`
- `supabase/migrations/20260717181618_e8b3affb-cfb9-459e-8ff9-059db59637d9.sql`
- `supabase/migrations/20260717181650_517ade1e-9c92-4054-99c3-ecf856ee0659.sql`
- `supabase/migrations/20260717181929_3dcd298b-044d-4912-9b57-97f79ef7c2a8.sql`
- `supabase/migrations/20260717193527_950d98a8-9001-42b8-818e-dbee362a238d.sql`
- `supabase/migrations/20260717194825_76c71968-3018-4f7a-b3a1-d11c325795b0.sql`
- `supabase/migrations/20260717195647_fd7923b2-b028-4e12-811b-c6c3eb10baa4.sql`
- `supabase/migrations/20260717202732_09450288-1d61-4974-bc09-0cbab9b7d1bf.sql`
- `supabase/migrations/20260721181802_30486a8b-3816-4ce1-b40a-2acb3ea49a32.sql`
- … +141 (lista completa em `context.json`)

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `acknowledge_maintenance_alert`
- `acknowledgement_decay_selftest`
- `acquire_ptz_lock`
- `add_owner_on_org_create`
- `admission_backlog_assess`
- `admission_coverage`
- `admission_ledger_reconcile`
- `admission_ledger_selftest`
- `admission_orphan_trend`
- `admission_retention_selftest`
- `alarm_admission_selftest`
- `alarm_admit_event`
- `alarm_armed_state_selftest`
- `alarm_schedule_selftest`
- `alarm_scheme_selftest`
- `analyze_table`
- `apply_camera_setup`
- `arbitrate_agent_healing`
- `assess_alarm_recurrence`
- `assess_dispatch_deliverability`
- `audit_cameras_embedded_credentials`
- `audit_rls_coverage`
- `audit_role_changes`
- `authorize_ingest_publish`
- `auto_alert_on_blacklist`
- `auto_create_alert_on_violation`
- `backfill_envelope_encryption`
- `block_admission_ledger_mutation`
- `block_alarm_recurrence_mutation`
- `block_alert_treatment_mutation`
- `block_capability_audit_mutation`
- `block_device_audit_mutation`
- `block_dispatch_run_mutation`
- `block_dispatch_suppression_mutation`
- `block_io_actuation_log_mutation`
- `block_onvif_event_mutation`
- `block_reconcile_snapshot_mutation`
- `block_retention_run_mutation`
- `capture_db_health_snapshot`
- `check_csp_anomaly`
- `check_relay_purge_watchdog`
- `check_relay_reliability_and_alert`
- `claim_agent_relay_tasks`
- `claim_monitoring_center_dispatches`
- `cleanup_api_usage_logs`
- `cleanup_edge_cache`
- `cleanup_old_analysis_history`
- `cleanup_old_clips`
- `cleanup_old_data`
- `cleanup_old_recognition_logs`
- `cleanup_old_test_events`
- `cleanup_old_zone_events`
- `close_expired_test_sessions`
- `close_stale_dwell_sessions`
- `collab_clear_notification_silence`
- `collab_emit_notifications`
- `collab_expire_invitations`
- `collab_invite_org`
- `collab_mark_notifications_read`
- `collab_matches_snapshot`
- `collab_member_status`
- `collab_network_bootstrap`
- `collab_plate_hash`
- `collab_purge_entries`
- `collab_purge_notifications`
- `collab_remove_membership`
- `collab_respond_invite`
- `collab_revoke_invite`
- `collab_set_membership_status`
- `collab_set_notification_silence`
- `collab_unread_counts`
- `collab_user_orgs`
- `contact_id_for_event`
- `correlate_backlog_root_cause`
- `create_nvr_with_channels`
- `create_zone`
- `cron_watchdog_ack_metrics`
- `cron_watchdog_consecutive_problems`
- `cron_watchdog_escalations_ack_guard`
- `delete_user_data`
- `deliverability_alert_selftest`
- `detect_camera_clock_skew`
- `detect_stale_ingest_publishers`
- `device_remote_command_delivery_selftest`
- `device_remote_command_selftest`
- `device_remote_command_sweep_selftest`
- `dispatch_runs_selftest`
- `effective_app_role`
- `effective_capabilities`
- `enforce_device_registration_rules`
- `enforce_monitor_group_ownership`
- `enforce_monitor_group_quota`
- `enforce_monitor_group_slot_limit`
- `enqueue_monitoring_center_event`
- `enroll_device`
- `ensure_future_partitions`
- `envelope_encryption_stats`
- `escalate_stale_maintenance_alerts`
- `escalation_ack_frozen`
- `escalation_condition_persists`
- `escalation_decay_selftest`
- `escalation_profile_selftest`
- `evaluate_abandoned_episode_alerts`
- `evaluate_admission_backlog_alerts`
- `evaluate_admission_reconcile_alerts`
- `evaluate_admission_trend_alerts`
- `evaluate_and_restart_streams`
- `evaluate_blame_alerts`
- `evaluate_deliverability_alerts`
- `evaluate_device_silence_alerts`
- `evaluate_dwell_alerts`
- `evaluate_maintenance_alerts`
- `evaluate_relay_redelivery`
- `evaluate_retention_alerts`
- `evaluate_vehicle_recurrence`
- `execute_camera_schedules`
- `expire_agent_relay_tasks`
- `expire_device_remote_commands`
- `fanout_alert_notifications`
- `find_glacier_stuck_pending_alert`
- `finish_clip_recording`
- `get_api_usage_stats`
- `get_autovacuum_overrides`
- `get_bgwriter_stats`
- `get_blocking_chains`
- `get_blocking_locks`
- `get_camera_analysis_stats`
- `get_camera_stream_url`
- `get_camera_stream_url_v2`
- `get_clip_stats`
- `get_connection_saturation`
- `get_cron_job_runs`
- `get_csp_report_stats`
- `get_definer_functions_without_search_path`
- `get_disabled_triggers`
- `get_duplicate_indexes`
- `get_glacier_restore_status`
- `get_invalid_indexes`
- `get_long_running_sessions`
- `get_maintenance_alert_status`
- `get_maintenance_progress`
- `get_media_forget_audit`
- `get_missing_fk_indexes`
- `get_missing_updated_at_triggers`
- `get_nullable_foreign_keys`
- `get_operational_metrics`
- `get_partition_coverage`
- `get_partition_default_backlog`
- `get_partition_quarantine_summary`
- `get_permissive_rls_policies`
- `get_persons_by_list_type`
- `get_preview_telemetry_summary`
- `get_recognition_stats`
- `get_relay_agent_reliability`
- `get_replication_slot_status`
- `get_retention_overview`
- `get_seq_scan_hotspots`
- `get_sequence_exhaustion`
- `get_slow_queries`
- `get_stats_staleness`
- `get_storage_tier_stats`
- `get_storage_tiering_slo`
- `get_table_bloat_estimate`
- `get_table_bloat_stats`
- `get_table_cache_stats`
- `get_table_size_stats`
- `get_tables_without_pk`
- `get_temp_file_offenders`
- `get_temp_files_summary`
- `get_txid_wraparound_status`
- `get_unused_indexes`
- `get_unvalidated_constraints`
- `get_user_role`
- `get_zone_stats`
- `grant_capability`
- `guard_device_remote_command`
- `handle_new_user_role`
- `has_capability`
- `has_org_role`
- `has_role`
- `heal_local_agents`
- `healing_arbiter_invariants`
- `import_settings_backup`
- `invoke_onvif_event_puller`
- `is_org_member`
- `is_test_mode_active`
- `laundered_critical_count`
- `list_alarm_recurrence_series`
- `list_cron_jobs`
- `list_cron_jobs_service`
- `maintenance_suppression_ledger`
- `maintenance_suppression_selftest`
- `mark_clip_viewed`
- `mark_ingest_unpublish`
- `match_collab_plate`
- `mcp_exec`
- `mcp_exec_many`
- `monitoring_center_backoff_seconds`
- `monitoring_center_policy`
- `my_capabilities`
- `owns_plan_and_camera`
- `point_triggers_motion`
- `preview_success_alert`
- `process_alert_notification`
- `prune_connectivity_resolution_telemetry`
- `prune_cron_watchdog_escalations`
- `prune_cron_watchdog_runs`
- `prune_edge_function_error_audit`
- `prune_preview_telemetry_events`
- `purge_admission_ledger`
- `purge_admission_reconcile_snapshots`
- `purge_agent_discoveries`
- `purge_agent_relay_tasks`
- `purge_alarm_recurrence_episodes`
- `purge_bandwidth_samples`
- `purge_dispatch_suppressions`
- `purge_timelapse_snapshots`
- `reap_agent_relay_leases`
- `reconcile_abandoned_episodes`
- `reconcile_retention_selftest`
- `record_admission_reconcile_snapshot`
- `record_alarm_episode_close`
- `record_alarm_episode_open`
- `record_dwell_observation`
- `record_onvif_event`
- `record_zone_event`
- `register_person`
- `release_ptz_lock`
- `resolve_schedule_cameras`
- `retention_debut_selftest`
- `retention_routine_registry`
- `revoke_capability_grant`
- `revoke_collab_entry`
- `revoke_device`
- `rewrap_camera_vault_kek`
- `rotate_camera_dek`
- `rotate_camera_vault_key`
- `rotate_device_secret`
- `rule_eligible_io_port`
- `run_index_maintenance`
- `run_retention_cleanup`
- `run_selective_vacuum`
- `sample_partition_backlog`
- `set_camera_credentials`
- `set_camera_credentials_v2`
- `set_media_legal_hold`
- `settle_monitoring_center_dispatch`
- `share_collab_plate`
- `start_analysis_session`
- `start_clip_recording`
- `start_stream_recording`
- `stop_stream_recording`
- `suppression_retention_selftest`
- `sweep_device_remote_commands`
- `system_health`
- `terminate_db_session`
- `tick_timelapse_capture`
- `timeline_attestation_selftest`
- `toggle_clip_favorite`
- `treat_event_alert`
- `triage_default_quarantine`
- `undelivered_critical_count`
- `unwrap_dek`
- `update_camera_stream_status`
- `update_person_last_seen`
- `update_session_stats`
- `validate_armed_by_email`
- `validate_cdr_camera_org_consistency`
- `verify_agent_token`
- `wrap_dek`

## Edge functions públicas (sem JWT — qualquer um chama)

- `health`
- `csp-anomaly-notify`
- `glacier-stuck-monitor`
- `metrics-prometheus`
- `stream-health-probe`
- `vault-coverage-watchdog`
- `preview-telemetry-alert`
- `watchdog-ack-sla-alert`
- `maintenance-alerts-dispatch`
- `migrate-helper`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /admin/api-usage | ProtectedRoute |  | `src/App.tsx` |
| /admin/csp-reports | ProtectedRoute |  | `src/App.tsx` |
| /agentes-locais | ProtectedRoute |  | `src/App.tsx` |
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |
| /automation-rules | ProtectedRoute |  | `src/App.tsx` |
| /busca-de-faces | ProtectedRoute |  | `src/App.tsx` |
| /conferencia-atestado | ProtectedRoute |  | `src/App.tsx` |
| /coverage | ProtectedRoute |  | `src/App.tsx` |
| /dispositivos | ProtectedRoute |  | `src/App.tsx` |
| /esquemas-de-alarme | ProtectedRoute |  | `src/App.tsx` |
| /manutencao | ProtectedRoute |  | `src/App.tsx` |
| /monitor/:cameraId | ProtectedRoute |  | `src/App.tsx` |
| /notification-settings | ProtectedRoute |  | `src/App.tsx` |
| /nvrs | ProtectedRoute |  | `src/App.tsx` |
| /nvrs/:id | ProtectedRoute |  | `src/App.tsx` |
| /operations | ProtectedRoute |  | `src/App.tsx` |
| /people | ProtectedRoute |  | `src/App.tsx` |
| /planta-baixa | ProtectedRoute |  | `src/App.tsx` |
| /rede-colaborativa | ProtectedRoute |  | `src/App.tsx` |
| /registro-probatorio | ProtectedRoute |  | `src/App.tsx` |
| /security | ProtectedRoute |  | `src/App.tsx` |
| /settings | ProtectedRoute |  | `src/App.tsx` |
| /stream-alert-thresholds | ProtectedRoute |  | `src/App.tsx` |
| /stream-settings | ProtectedRoute |  | `src/App.tsx` |
| /telegram-settings | ProtectedRoute |  | `src/App.tsx` |
| /test-mode | ProtectedRoute |  | `src/App.tsx` |
| /users | ProtectedRoute |  | `src/App.tsx` |

Guards usados: Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | authenticated | execute | `has_role`, `get_user_role`, `delete_user_data`, `get_operational_metrics`, `get_api_usage_stats`, `get_csp_report_stats`, `get_table_bloat_stats`, `get_long_running_sessions`, `get_blocking_locks`, `get_temp_file_offenders`, `get_temp_files_summary`, `get_table_bloat_estimate`, `get_txid_wraparound_status`, `acquire_ptz_lock`, `release_ptz_lock` … +81 |
| grant | authenticated | select | `api_usage_logs`, `csp_violation_reports`, `db_health_snapshots`, `storage_tiering_runs`, `glacier_stuck_alerts`, `alertmanager_silences_audit`, `camera_schedule_runs`, `camera_bandwidth_hourly`, `camera_vault_audit`, `camera_health_state`, `test_mode_suppressions`, `agent_relay_purge_runs`, `agent_discoveries_purge_runs`, `edge_function_error_audit`, `cron_watchdog_runs` … +53 |
| grant | authenticated | select, insert | `media_forget_audit`, `stream_health_checks`, `stream_restart_events`, `wizard_telemetry`, `preview_telemetry_events`, `connectivity_resolution_telemetry`, `firmware_fingerprint_events`, `ptz_connection_attempts`, `ptz_preflight_runs`, `evidence_exports`, `evidence_exports`, `device_remote_commands`, `timeline_attestations`, `admission_ledger_windows` |
| grant | authenticated | select, insert, delete | `timelapse_snapshots` |
| grant | authenticated | select, insert, update, delete | `plate_detections_m2026_08`, `plate_detections_m2026_09`, `plate_detections_m2026_10`, `recognition_logs_m2026_08`, `recognition_logs_m2026_09`, `recognition_logs_m2026_10`, `plate_detections_m2026_11`, `plate_detections_m2026_12`, `plate_detections_m2027_01`, `recognition_logs_m2026_11`, `recognition_logs_m2026_12`, `recognition_logs_m2027_01`, `organizations`, `organization_members`, `camera_events` … +42 |
| grant | authenticated | select, update | `notification_dispatches` |
| grant | authenticated, service_role | execute | `has_role`, `get_user_role`, `delete_user_data`, `replace_user_role`, `get_slow_queries`, `import_settings_backup`, `get_unused_indexes`, `get_missing_fk_indexes`, `get_table_cache_stats`, `get_duplicate_indexes`, `get_table_size_stats`, `get_stats_staleness`, `analyze_table`, `get_seq_scan_hotspots`, `get_bgwriter_stats` … +63 |
| grant | authenticated, service_role | select | `camera_vault_coverage_alerts` |
| grant | service_role | all | `idempotency_keys`, `plate_detections_m2026_08`, `plate_detections_m2026_09`, `plate_detections_m2026_10`, `recognition_logs_m2026_08`, `recognition_logs_m2026_09`, `recognition_logs_m2026_10`, `plate_detections_m2026_11`, `plate_detections_m2026_12`, `plate_detections_m2027_01`, `recognition_logs_m2026_11`, `recognition_logs_m2026_12`, `recognition_logs_m2027_01`, `organizations`, `organization_members` … +130 |
| grant | service_role | execute | `replace_user_role`, `run_retention_cleanup`, `is_org_member`, `has_org_role`, `add_owner_on_org_create`, `validate_cdr_camera_org_consistency`, `cleanup_edge_cache`, `run_retention_cleanup`, `cleanup_edge_cache`, `ensure_future_partitions`, `ensure_future_partitions`, `system_health`, `run_index_maintenance`, `cleanup_api_usage_logs`, `run_selective_vacuum` … +104 |
| grant | service_role | usage, select | `maintenance_dispatch_runs_id_seq` |
| revoke | PUBLIC | all | `cleanup_edge_cache`, `ensure_future_partitions`, `import_settings_backup`, `get_api_usage_stats`, `cleanup_api_usage_logs`, `get_temp_file_offenders`, `get_temp_files_summary`, `get_table_bloat_estimate`, `get_txid_wraparound_status`, `get_sequence_exhaustion`, `get_tables_without_pk`, `get_nullable_foreign_keys`, `get_autovacuum_overrides`, `get_unvalidated_constraints`, `get_permissive_rls_policies` … +63 |
| revoke | PUBLIC | execute | `has_role`, `get_user_role`, `delete_user_data`, `handle_new_user`, `handle_new_user_role`, `get_storage_tiering_slo`, `mcp_exec`, `mcp_exec_many` |
| revoke | PUBLIC, anon | all | `replace_user_role`, `get_operational_metrics`, `get_slow_queries`, `get_table_bloat_stats`, `get_long_running_sessions`, `get_blocking_locks`, `get_unused_indexes`, `get_missing_fk_indexes`, `get_table_cache_stats`, `get_duplicate_indexes`, `get_table_size_stats`, `get_stats_staleness`, `analyze_table`, `get_seq_scan_hotspots`, `get_bgwriter_stats` … +80 |
| revoke | PUBLIC, anon | execute | `has_role`, `get_user_role`, `delete_user_data`, `get_csp_report_stats`, `calculate_media_expiration`, `set_media_assets_updated_at` |
| revoke | PUBLIC, anon, authenticated | all | `idempotency_keys`, `validate_armed_by_email`, `handle_new_user`, `handle_new_user_role`, `audit_role_changes`, `delete_user_data`, `replace_user_role`, `run_retention_cleanup`, `run_retention_cleanup`, `cleanup_edge_cache`, `ensure_future_partitions`, `system_health`, `run_index_maintenance`, `run_selective_vacuum`, `tick_timelapse_capture` … +126 |
| revoke | PUBLIC, anon, authenticated | execute | `handle_new_user`, `handle_new_user_role`, `audit_role_changes`, `validate_armed_by_email`, `has_role`, `get_user_role`, `is_org_member`, `has_org_role`, `add_owner_on_org_create`, `validate_cdr_camera_org_consistency`, `check_csp_anomaly`, `capture_db_health_snapshot`, `execute_camera_schedules` |
| revoke | anon | all | `triage_default_quarantine`, `get_partition_quarantine_summary`, `maintenance_alert_dispatches`, `root_cause_correlation_runs`, `agent_healing_runs`, `agent_healing_actions`, `maintenance_alert_escalations`, `relay_lease_policy`, `relay_lease_policy`, `camera_ingest_endpoints`, `collab_notifications`, `collab_notification_reads`, `collab_notification_silences`, `maintenance_alert_events`, `maintenance_alert_escalations` … +59 |
| revoke | anon, PUBLIC | all | `camera_clock_skew_runs`, `camera_clock_skew_findings`, `partition_backlog_samples`, `monitoring_center_accounts`, `monitoring_center_dispatches`, `collab_retention_policy`, `collab_effective_retention_days` |
| revoke | anon, authenticated | all | `list_cron_jobs_service`, `correlate_backlog_root_cause`, `correlate_backlog_root_cause`, `reap_agent_relay_leases`, `reap_agent_relay_leases`, `camera_ingest_endpoints`, `effective_capabilities`, `has_capability`, `effective_app_role`, `enforce_monitor_group_quota`, `enforce_monitor_group_ownership`, `admission_reconcile_severity`, `admission_reconcile_cooldown`, `evaluate_admission_reconcile_alerts`, `maintenance_dispatch_runs` … +3 |
| revoke | anon, authenticated | execute | `mcp_exec`, `mcp_exec_many` |
| revoke | anon, authenticated, PUBLIC | all | `monitoring_center_accounts`, `monitoring_center_dispatches`, `collab_notification_purge_runs`, `collab_purge_notifications`, `collab_purge_notifications`, `admission_ledger_windows` |
| revoke | authenticated | all | `triage_default_quarantine`, `maintenance_alert_events`, `maintenance_alert_escalations`, `maintenance_alert_dispatches`, `evidence_exports`, `event_alert_treatments`, `alarm_recurrence_episodes`, `alarm_recurrence_purge_runs`, `purge_alarm_recurrence_episodes`, `device_registrations`, `device_registration_audit`, `device_remote_commands`, `expire_device_remote_commands`, `device_remote_command_selftest`, `device_remote_command_delivery_selftest` … +20 |
| revoke | authenticated | execute | `replace_user_role`, `get_slow_queries` |
| revoke | authenticated | insert, update, delete, truncate, references, trigger | `collab_notification_silences` |
| revoke | authenticated, anon | all | `collab_notifications`, `collab_notification_reads` |
| revoke | public | all | `evaluate_and_restart_streams`, `get_preview_telemetry_summary`, `claim_agent_relay_tasks`, `expire_agent_relay_tasks`, `expire_device_remote_commands`, `device_remote_command_selftest`, `device_remote_command_delivery_selftest` |
| revoke | public, anon | all | `treat_event_alert`, `record_alarm_episode_open`, `record_alarm_episode_close`, `assess_alarm_recurrence` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `behavior_analyses` | acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/behavior/useBehaviorAnalysis.ts` |
| `camera_ingest_endpoints` | RLS ligado sem nenhuma política → só service_role acessa | `src/hooks/useCameraIngest.ts` |
| `camera_vault_coverage_alerts` | acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/components/security/VaultAuditTimeline.tsx` |
| `internal_cron_secrets` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `profiles` | acessada do front (2 arquivo(s)) sem RLS (não encontrado) | `src/hooks/useAvatarUpload.ts`<br>`src/pages/ProfilePage.tsx` |
| `query_telemetry` | acessada do front (1 arquivo(s)) sem RLS (não encontrado) | `src/lib/errorReporter.ts` |

## Multi-tenancy

- Chave de tenant: **`organization_id`** presente em 12 tabela(s): `organization_members`, `camera_events`, `event_detections`, `event_alerts`, `event_reviews`, `camera_detection_rules`, `collab_memberships`, `collab_governance_audit`, `collab_notifications`, `collab_notification_silences`, `event_alert_treatments`, `alarm_recurrence_episodes`
- Cobertura: 7% das tabelas. Abaixo de 60% — isolamento provavelmente por usuário (auth.uid()) ou misto; não flagado por tabela.

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `registered_persons` | `is_active` |
| `zones` | `is_active` |
| `rules` | `is_active` |
| `registered_plates` | `is_active` |
| `ppe_zones` | `active` |
| `camera_patrols` | `is_active` |
| `media_assets` | `archived_at` |
| `notification_recipients` | `active` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `continuous_analysis_configs` | `created_at`, `created_by`, `updated_at` |
| `analysis_sessions` | `created_at`, `updated_at` |
| `analysis_history` | `created_at` |
| `recording_configs` | `created_at`, `updated_at` |
| `video_clips` | `created_at` |
| `registered_persons` | `created_at`, `updated_at` |
| `face_recognition_configs` | `created_at`, `updated_at` |
| `zones` | `created_at`, `updated_at` |
| `zone_events` | `created_at` |
| `notification_configs` | `created_at`, `updated_at` |
| `notification_history` | `created_at` |
| `notification_templates` | `created_at`, `updated_at` |
| `rules` | `created_at`, `updated_at` |
| `cameras` | `created_at`, `updated_at` |
| `alerts` | `created_at` |
| `recording_sessions` | `created_at`, `updated_at` |
| `rule_violations` | `created_at` |
| `stream_recordings` | `created_at` |
| `camera_snapshots` | `created_at` |
| `registered_plates` | `created_at`, `updated_at` |
| `ppe_zones` | `created_at`, `updated_at` |
| `ppe_violations` | `created_at` |
| `ppe_configs` | `created_at`, `updated_at` |
| `heatmap_data` | `created_at` |
| `heatmap_snapshots` | `created_at` |
| `rule_executions` | `created_at` |
| `vehicles` | `created_at`, `updated_at` |
| `arm_disarm_states` | `created_at`, `updated_at` |
| `panic_events` | `created_at` |
| `user_roles` | `created_at`, `updated_at` |
| `audit_logs` | `created_at` |
| `detection_reviews` | `created_at`, `updated_at` |
| `model_thresholds` | `created_at`, `updated_at` |
| `user_filter_preferences` | `created_at`, `updated_at` |
| `idempotency_keys` | `created_at` |
| `recognition_logs` | `created_at` |
| `plate_detections` | `created_at` |
| `organizations` | `created_at`, `created_by`, `updated_at` |
| `organization_members` | `created_at` |
| `camera_events` | `created_at`, `created_by` |
| `event_detections` | `created_at` |
| `event_alerts` | `created_at`, `updated_at` |
| `event_reviews` | `created_at`, `updated_at` |
| `camera_detection_rules` | `created_at`, `created_by`, `updated_at` |
| `face_embeddings` | `created_at`, `updated_at` |
| `edge_cache` | `created_at` |
| `query_telemetry` | `created_at` |
| `api_usage_logs` | `created_at` |
| `csp_violation_reports` | `created_at` |
| `camera_ptz_config` | `created_at`, `updated_at` |
| `camera_presets` | `created_at`, `updated_at` |
| `camera_patrols` | `created_at`, `updated_at` |
| `camera_patrol_stops` | `created_at` |
| `media_assets` | `created_at`, `updated_at` |
| `storage_tiering_runs` | `created_at` |
| `media_forget_audit` | `created_at` |
| `glacier_stuck_alerts` | `created_at` |
| `alertmanager_silences_audit` | `created_at` |
| `monitor_groups` | `created_at`, `updated_at` |
| `monitor_group_cameras` | `created_at` |
| `camera_schedules` | `created_at`, `updated_at` |
| `timelapse_configs` | `created_at`, `updated_at` |
| `timelapse_snapshots` | `created_at` |
| `timelapse_videos` | `created_at`, `updated_at` |
| `motion_masks` | `created_at`, `updated_at` |
| `stream_health_checks` | `created_at` |
| `stream_restart_events` | `created_at` |
| `camera_bandwidth_samples` | `created_at` |
| `camera_credentials` | `created_at`, `updated_at` |
| `camera_vault_audit` | `created_at` |
| `test_mode_sessions` | `created_at`, `created_by`, `updated_at` |
| `camera_health_state` | `created_at`, `updated_at` |
| `rtsp_revalidation_schedules` | `created_at`, `updated_at` |
| `stream_alert_thresholds` | `created_at`, `updated_at` |
| `test_mode_suppressions` | `created_at` |
| `wizard_telemetry` | `created_at` |
| `rtsp_preview_sessions` | `created_at`, `updated_at` |
| `dry_run_report_snapshots` | `created_at`, `updated_at` |
| `preview_telemetry_events` | `created_at` |
| `local_agents` | `created_at`, `updated_at` |
| `agent_discoveries` | `created_at`, `updated_at` |
| `agent_relay_tasks` | `created_at` |
| `agent_relay_purge_runs` | `created_at` |
| `agent_discoveries_purge_runs` | `created_at` |
| `edge_function_error_audit` | `created_at` |
| `connectivity_resolution_telemetry` | `created_at` |
| `camera_connectivity_preferences` | `created_at`, `updated_at` |
| `cron_watchdog_runs` | `created_at` |
| `cron_watchdog_escalations` | `created_at` |
| `nvrs` | `created_at`, `updated_at` |
| `firmware_fingerprint_events` | `created_at` |
| `ptz_connection_attempts` | `created_at` |
| `nvr_recording_downloads` | `created_at`, `updated_at` |
| `ptz_preflight_runs` | `created_at` |
| `notification_recipients` | `created_at`, `updated_at` |
| `notification_dispatches` | `created_at` |
| `productivity_metric_preferences` | `created_at`, `updated_at` |
| `partition_maintenance_runs` | `created_at`, `updated_at` |
| `partition_drain_runs` | `created_at`, `updated_at` |
| `partition_quarantine_runs` | `created_at`, `updated_at` |
| `maintenance_alert_events` | `created_at`, `updated_at` |
| `maintenance_alert_dispatches` | `created_at`, `updated_at` |
| `camera_clock_skew_runs` | `created_at`, `updated_at` |
| `camera_clock_skew_findings` | `created_at`, `updated_at` |
| `partition_backlog_samples` | `created_at`, `updated_at` |
| `agent_healing_runs` | `created_at` |
| `agent_healing_actions` | `created_at` |
| `root_cause_correlation_runs` | `created_at`, `updated_at` |
| `maintenance_alert_escalations` | `created_at`, `updated_at` |
| `camera_ingest_endpoints` | `created_at`, `updated_at` |
| `dwell_sessions` | `created_at`, `updated_at` |
| `monitoring_center_accounts` | `created_at`, `updated_at` |
| `monitoring_center_dispatches` | `created_at`, `updated_at` |
| `collab_networks` | `created_at`, `updated_at` |
| `collab_network_secrets` | `created_at` |
| `collab_memberships` | `created_at`, `updated_at` |
| `collab_entries` | `created_at`, `updated_at` |
| `collab_invitations` | `created_at`, `updated_at` |
| `collab_governance_audit` | `created_at` |
| `collab_notifications` | `created_at`, `updated_at` |
| `collab_notification_reads` | `created_at` |
| `collab_notification_silences` | `created_at`, `updated_at` |
| `collab_notification_purge_runs` | `created_at` |
| `collab_entry_purge_runs` | `created_at` |
| `user_capability_grants` | `created_at` |
| `user_capability_grant_audit` | `created_at` |
| `camera_io_ports` | `created_at`, `updated_at` |
| `io_actuation_log` | `created_at` |
| `onvif_event_subscriptions` | `created_at`, `updated_at` |
| `internal_cron_secrets` | `created_at` |
| `site_plans` | `created_at`, `updated_at` |
| `site_plan_placements` | `created_at`, `updated_at` |
| `event_alert_treatments` | `created_at` |
| `alarm_recurrence_episodes` | `created_at` |
| `alarm_recurrence_purge_runs` | `created_at` |
| `device_registrations` | `created_at`, `updated_at` |
| `device_registration_audit` | `created_at` |
| `device_remote_commands` | `created_at`, `updated_at` |
| `alarm_schemes` | `created_at`, `updated_at` |
| `admission_ledger_windows` | `created_at` |
| `admission_ledger_purge_runs` | `created_at` |
| `admission_reconcile_snapshots` | `created_at` |
| `admission_reconcile_purge_runs` | `created_at` |
| `maintenance_dispatch_suppressions` | `created_at` |
| `maintenance_suppression_purge_runs` | `created_at` |
| `maintenance_dispatch_runs` | `created_at` |
| `behavior_analyses` | `created_at` |
| `plate_detections_default` | `created_at` |
| `plate_detections_m2026_05` | `created_at` |
| `plate_detections_m2026_06` | `created_at` |
| `plate_detections_m2026_07` | `created_at` |
| `plate_detections_m2026_08` | `created_at` |
| `plate_detections_m2026_09` | `created_at` |
| `plate_detections_m2026_10` | `created_at` |
| `plate_detections_m2026_11` | `created_at` |
| `plate_detections_m2026_12` | `created_at` |
| `plate_detections_m2027_01` | `created_at` |
| `plate_detections_m2027_02` | `created_at` |
| `plate_detections_m2027_03` | `created_at` |
| `plate_detections_y2025_y2026_pre` | `created_at` |
| `profiles` | `created_at`, `updated_at` |
| `recognition_logs_default` | `created_at` |
| `recognition_logs_m2026_05` | `created_at` |
| `recognition_logs_m2026_06` | `created_at` |
| `recognition_logs_m2026_07` | `created_at` |
| `recognition_logs_m2026_08` | `created_at` |
| `recognition_logs_m2026_09` | `created_at` |
| `recognition_logs_m2026_10` | `created_at` |
| `recognition_logs_m2026_11` | `created_at` |
| `recognition_logs_m2026_12` | `created_at` |
| `recognition_logs_m2027_01` | `created_at` |
| `recognition_logs_m2027_02` | `created_at` |
| `recognition_logs_m2027_03` | `created_at` |
| `recognition_logs_y2025_y2026_pre` | `created_at` |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `cameras` | `latitude` |
| `cameras` | `longitude` |
| `panic_events` | `latitude` |
| `panic_events` | `longitude` |
| `audit_logs` | `ip_address` |
| `alertmanager_silences_audit` | `ip_address` |
| `notification_recipients` | `email` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `analysis_sessions` | `total_analyses` | `INTEGER` |
| `analysis_sessions` | `total_people_detected` | `INTEGER` |
| `dry_run_report_snapshots` | `total_events` | `INTEGER` |
| `dry_run_report_snapshots` | `total_notifying` | `INTEGER` |
| `dry_run_report_snapshots` | `total_suppressed` | `INTEGER` |
| `nvr_recording_downloads` | `total_bytes` | `BIGINT` |
| `partition_quarantine_runs` | `total_quarantined` | `integer` |
| `partition_quarantine_runs` | `total_drainable` | `integer` |
| `admission_ledger_windows` | `total` | `integer` |
| `admission_reconcile_snapshots` | `total_stock` | `bigint` |
| `camera_bandwidth_hourly` | `total_bytes` | `number` |
| `camera_vault_coverage_alerts` | `total` | `number` |
