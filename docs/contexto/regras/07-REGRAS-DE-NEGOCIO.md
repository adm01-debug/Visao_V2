# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `2e6ff99096` · branch `main` · 2026-11-26 18:38 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `06`)

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `continuous_analysis_configs` | Allow all on continuous_analysis_configs | ALL | public | permissive | `true` | `true` |
| `analysis_sessions` | Allow all on analysis_sessions | ALL | public | permissive | `true` | `true` |
| `analysis_history` | Allow all on analysis_history | ALL | public | permissive | `true` | `true` |
| `storage.objects` | Public read access for clips | SELECT | public | permissive | `bucket_id = 'clips'` |  |
| `storage.objects` | Authenticated upload for clips | INSERT | public | permissive |  | `bucket_id = 'clips'` |
| `storage.objects` | Authenticated update for clips | UPDATE | public | permissive | `bucket_id = 'clips'` |  |
| `storage.objects` | Authenticated delete for clips | DELETE | public | permissive | `bucket_id = 'clips'` |  |
| `storage.objects` | Public read access for face-photos | SELECT | public | permissive | `bucket_id = 'face-photos'` |  |
| `storage.objects` | Authenticated upload for face-photos | INSERT | public | permissive |  | `bucket_id = 'face-photos'` |
| `storage.objects` | Authenticated update for face-photos | UPDATE | public | permissive | `bucket_id = 'face-photos'` |  |
| `storage.objects` | Authenticated delete for face-photos | DELETE | public | permissive | `bucket_id = 'face-photos'` |  |
| `storage.objects` | Public read access for snapshots | SELECT | public | permissive | `bucket_id = 'snapshots'` |  |
| `storage.objects` | Authenticated upload for snapshots | INSERT | public | permissive |  | `bucket_id = 'snapshots'` |
| `storage.objects` | Authenticated delete for snapshots | DELETE | public | permissive | `bucket_id = 'snapshots'` |  |
| `storage.objects` | Authenticated access for analysis-results | ALL | public | permissive | `bucket_id = 'analysis-results' AND auth.role() = 'authenticated'` | `bucket_id = 'analysis-results' AND auth.role() = 'authenticated'` |
| `notification_configs` | Allow all on notification_configs | ALL | public | permissive | `true` | `true` |
| `notification_history` | Allow all on notification_history | ALL | public | permissive | `true` | `true` |
| `notification_templates` | Allow all on notification_templates | ALL | public | permissive | `true` | `true` |
| `rules` | Allow all operations on rules | ALL | public | permissive | `true` | `true` |
| `cameras` | Allow all operations on cameras | ALL | public | permissive | `true` | `true` |
| `alerts` | Allow all operations on alerts | ALL | public | permissive | `true` | `true` |
| `recording_configs` | Allow all on recording_configs | ALL | public | permissive | `true` | `true` |
| `video_clips` | Allow all on video_clips | ALL | public | permissive | `true` | `true` |
| `recording_sessions` | Allow all on recording_sessions | ALL | public | permissive | `true` | `true` |
| `continuous_analysis_configs` | Allow all operations on continuous_analysis_configs | ALL | public | permissive | `true` | `true` |
| `analysis_sessions` | Allow all operations on analysis_sessions | ALL | public | permissive | `true` | `true` |
| `analysis_history` | Allow all operations on analysis_history | ALL | public | permissive | `true` | `true` |
| `rule_violations` | Allow all operations on rule_violations | ALL | public | permissive | `true` | `true` |
| `registered_persons` | Allow all on registered_persons | ALL | public | permissive | `true` | `true` |
| `recognition_logs` | Allow all on recognition_logs | ALL | public | permissive | `true` | `true` |
| `face_recognition_configs` | Allow all on face_recognition_configs | ALL | public | permissive | `true` | `true` |
| `stream_recordings` | Allow all operations on stream_recordings | ALL | public | permissive | `true` | `true` |
| `stream_stats` | Allow all operations on stream_stats | ALL | public | permissive | `true` | `true` |
| `camera_snapshots` | Allow all operations on camera_snapshots | ALL | public | permissive | `true` | `true` |
| `zones` | Allow all on zones | ALL | public | permissive | `true` | `true` |
| `zone_events` | Allow all on zone_events | ALL | public | permissive | `true` | `true` |
| `ppe_zones` | Users can view own ppe_zones | SELECT | public | permissive | `auth.uid() = user_id OR user_id IS NULL` |  |
| `ppe_zones` | Users can insert own ppe_zones | INSERT | public | permissive |  | `auth.uid() = user_id OR user_id IS NULL` |
| `ppe_zones` | Users can update own ppe_zones | UPDATE | public | permissive | `auth.uid() = user_id OR user_id IS NULL` |  |
| `ppe_zones` | Users can delete own ppe_zones | DELETE | public | permissive | `auth.uid() = user_id OR user_id IS NULL` |  |
| `ppe_violations` | Anyone can view ppe_violations | SELECT | public | permissive | `true` |  |
| `ppe_violations` | System can insert ppe_violations | INSERT | public | permissive |  | `true` |
| `ppe_violations` | Users can update ppe_violations | UPDATE | public | permissive | `true` |  |
| `ppe_configs` | Users can manage own ppe_configs | ALL | public | permissive | `auth.uid() = user_id OR user_id IS NULL` |  |
| `storage.objects` | person_photos_select_own | SELECT | authenticated | permissive | `bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | person_photos_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `storage.objects` | person_photos_delete_own | DELETE | authenticated | permissive | `bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | recordings_select_own | SELECT | authenticated | permissive | `bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | recordings_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `storage.objects` | recordings_delete_own | DELETE | authenticated | permissive | `bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | heatmap_snapshots_select_own | SELECT | authenticated | permissive | `bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | heatmap_snapshots_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `storage.objects` | heatmap_snapshots_delete_own | DELETE | authenticated | permissive | `bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | camera_thumbnails_select_own | SELECT | authenticated | permissive | `bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | camera_thumbnails_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `storage.objects` | camera_thumbnails_delete_own | DELETE | authenticated | permissive | `bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `video_clips` | Users can delete their own clips | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `video_clips` | Users can insert their own clips | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `video_clips` | Users can update their own clips | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `video_clips` | Users can view their own clips | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `cameras` | Users can delete their own cameras | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `cameras` | Users can insert their own cameras | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `cameras` | Users can update their own cameras | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `cameras` | Users can view their own cameras | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_recordings` | Users can delete their own stream recordings | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_recordings` | Users can insert their own stream recordings | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `stream_recordings` | Users can update their own stream recordings | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_recordings` | Users can view their own stream recordings | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `rule_executions` | Users can delete their own rule executions | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `rule_executions` | Users can insert their own rule executions | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `rule_executions` | Users can update their own rule executions | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `rule_executions` | Users can view their own rule executions | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `zones` | Users can delete their own zones | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `zones` | Users can insert their own zones | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `zones` | Users can update their own zones | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `zones` | Users can view their own zones | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `analysis_history` | Users can delete their own analysis | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `analysis_history` | Users can insert their own analysis | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `analysis_history` | Users can update their own analysis history | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `analysis_history` | Users can view their own analysis | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `zone_events` | Users can delete their own zone events | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `zone_events` | Users can insert their own zone events | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `zone_events` | Users can update their own zone events | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `zone_events` | Users can view their own zone events | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `vehicles` | Users can delete their own vehicles | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `vehicles` | Users can insert their own vehicles | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `vehicles` | Users can update their own vehicles | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `vehicles` | Users can view their own vehicles | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `face_recognition_configs` | Users can delete their own face recognition configs | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `face_recognition_configs` | Users can insert their own face recognition configs | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `face_recognition_configs` | Users can update their own face recognition configs | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `face_recognition_configs` | Users can view their own face recognition configs | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `profiles` | Users can insert their own profile | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `profiles` | Users can update their own profile | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `profiles` | Users can view their own profile | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `alerts` | Users can delete their own alerts | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `alerts` | Users can insert their own alerts | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `alerts` | Users can update their own alerts | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `alerts` | Users can view their own alerts | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `heatmap_snapshots` | Users can delete their own heatmap snapshots | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `heatmap_snapshots` | Users can insert their own heatmap snapshots | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `heatmap_snapshots` | Users can view their own heatmap snapshots | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `arm_disarm_states` | Users can delete their own arm_disarm_states | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `arm_disarm_states` | Users can insert their own arm_disarm_states | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `arm_disarm_states` | Users can update their own arm_disarm_states | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `arm_disarm_states` | Users can view their own arm_disarm_states | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `notification_configs` | Users can delete their own notification configs | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `notification_configs` | Users can insert their own notification configs | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `notification_configs` | Users can update their own notification configs | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `notification_configs` | Users can view their own notification configs | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `panic_events` | Users can delete their own panic events | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `panic_events` | Users can insert their own panic events | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `panic_events` | Users can update their own panic events | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `panic_events` | Users can view their own panic events | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_persons` | Users can delete their own persons | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_persons` | Users can insert their own persons | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `registered_persons` | Users can update their own persons | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_persons` | Users can view their own persons | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_plates` | Users can delete their own plates | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_plates` | Users can insert their own plates | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `registered_plates` | Users can update their own plates | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `registered_plates` | Users can view their own plates | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `recording_configs` | Users can delete their own recording configs | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `recording_configs` | Users can insert their own recording configs | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `recording_configs` | Users can update their own recording configs | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `recording_configs` | Users can view their own recording configs | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `rules` | Users can delete their own rules | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `rules` | Users can insert their own rules | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `rules` | Users can update their own rules | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `rules` | Users can view their own rules | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `storage.objects` | avatars_insert_own | INSERT | authenticated | permissive |  | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `storage.objects` | person_photos_update_own | UPDATE | authenticated | permissive | `bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | recordings_update_own | UPDATE | authenticated | permissive | `bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | heatmap_snapshots_update_own | UPDATE | authenticated | permissive | `bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | camera_thumbnails_update_own | UPDATE | authenticated | permissive | `bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `storage.objects` | Authenticated users can view person-photos | SELECT | authenticated | permissive | `bucket_id = 'person-photos' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Authenticated users can view camera-thumbnails | SELECT | authenticated | permissive | `bucket_id = 'camera-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Authenticated users can view heatmap-snapshots | SELECT | authenticated | permissive | `bucket_id = 'heatmap-snapshots' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Authenticated users can view recordings | SELECT | authenticated | permissive | `bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Users can upload their own avatar | INSERT | authenticated | permissive |  | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` |
| `storage.objects` | Users can update their own avatar | UPDATE | authenticated | permissive | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Users can delete their own avatar | DELETE | authenticated | permissive | `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Users can view own avatars | SELECT | authenticated | permissive | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |  |
| `user_roles` | Admins can insert non-admin roles | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(), 'admin') AND role <> 'admin'::app_role` |
| `user_roles` | Admins can update to non-admin roles | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `role <> 'admin'::app_role` |
| `user_roles` | Admins can delete non-admin roles | DELETE | authenticated | permissive | `public.has_role(auth.uid(), 'admin') AND role <> 'admin'::app_role` |  |
| `user_roles` | Only admins can manage roles | INSERT | authenticated | restrictive |  | `public.has_role(auth.uid(), 'admin'::app_role)` |
| `user_roles` | Only admins can update roles | UPDATE | authenticated | restrictive | `public.has_role(auth.uid(), 'admin'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role)` |
| `user_roles` | Only admins can delete roles | DELETE | authenticated | restrictive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `detection_reviews` | Users can view their own detection reviews | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `detection_reviews` | Users can insert their own detection reviews | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `detection_reviews` | Users can update their own detection reviews | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `detection_reviews` | Users can delete their own detection reviews | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `model_thresholds` | Users can view their own model thresholds | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `model_thresholds` | Users can insert their own model thresholds | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `model_thresholds` | Users can update their own model thresholds | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `model_thresholds` | Users can delete their own model thresholds | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `user_filter_preferences` | Users can view their own filter preferences | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `user_filter_preferences` | Users can insert their own filter preferences | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `user_filter_preferences` | Users can update their own filter preferences | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `user_filter_preferences` | Users can delete their own filter preferences | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `idempotency_keys` | Deny all direct client access | ALL | authenticated, anon | permissive | `false` | `false` |
| `plate_detections_m2026_08` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `plate_detections_m2026_09` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `plate_detections_m2026_10` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2026_08` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2026_09` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2026_10` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `plate_detections_m2026_11` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `plate_detections_m2026_12` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `plate_detections_m2027_01` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2026_11` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2026_12` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `recognition_logs_m2027_01` | own_rows | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `audit_logs` | Users and admins can view audit logs | SELECT | authenticated | permissive | `(SELECT auth.uid()) = user_id OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))` |  |
| `user_roles` | Users and admins can view roles | SELECT | authenticated | permissive | `user_id = (SELECT auth.uid()) OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))` |  |
| `organizations` | org_select_members | SELECT | authenticated | permissive | `public.is_org_member(id, auth.uid())` |  |
| `organizations` | org_insert_self | INSERT | authenticated | permissive |  | `created_by = auth.uid()` |
| `organizations` | org_update_admins | UPDATE | authenticated | permissive | `public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` | `public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |
| `organizations` | org_delete_owner | DELETE | authenticated | permissive | `public.has_org_role(id, auth.uid(), ARRAY['owner']::public.org_role[])` |  |
| `organization_members` | orgm_select_members | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `organization_members` | orgm_insert_admins | INSERT | authenticated | permissive |  | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |
| `organization_members` | orgm_update_admins | UPDATE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |
| `organization_members` | orgm_delete_admins | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `camera_events` | cev_select | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `camera_events` | cev_insert | INSERT | authenticated | permissive |  | `public.is_org_member(organization_id, auth.uid())` |
| `camera_events` | cev_update_admins | UPDATE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` |
| `camera_events` | cev_delete_admins | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `event_detections` | edet_select | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `event_detections` | edet_insert | INSERT | authenticated | permissive |  | `public.is_org_member(organization_id, auth.uid())` |
| `event_detections` | edet_update | UPDATE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` |
| `event_detections` | edet_delete | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `event_alerts` | ealert_select | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `event_alerts` | ealert_insert | INSERT | authenticated | permissive |  | `public.is_org_member(organization_id, auth.uid())` |
| `event_alerts` | ealert_update | UPDATE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[])` |
| `event_alerts` | ealert_delete | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `event_reviews` | erev_select | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `event_reviews` | erev_insert_self | INSERT | authenticated | permissive |  | `public.is_org_member(organization_id, auth.uid()) AND reviewer_id = auth.uid()` |
| `event_reviews` | erev_update_self | UPDATE | authenticated | permissive | `reviewer_id = auth.uid() AND public.is_org_member(organization_id, auth.uid())` | `reviewer_id = auth.uid()` |
| `event_reviews` | erev_delete_admins | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `camera_detection_rules` | cdr_select | SELECT | authenticated | permissive | `public.is_org_member(organization_id, auth.uid())` |  |
| `camera_detection_rules` | cdr_insert_admins | INSERT | authenticated | permissive |  | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) AND created_by = auth.uid()` |
| `camera_detection_rules` | cdr_update_admins | UPDATE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |
| `camera_detection_rules` | cdr_delete_admins | DELETE | authenticated | permissive | `public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])` |  |
| `panic_events` | Admins and managers can view all panic events | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')` |  |
| `panic_events` | Admins and managers can update panic events | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')` |  |
| `face_embeddings` | Owners can view their embeddings | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')` |  |
| `face_embeddings` | Owners can insert embeddings | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `face_embeddings` | Owners can update embeddings | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `face_embeddings` | Owners can delete embeddings | DELETE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `edge_cache` | edge_cache deny all client access | ALL | anon, authenticated | permissive | `false` | `false` |
| `query_telemetry` | Users can insert their own telemetry | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `api_usage_logs` | users see own api logs | SELECT | authenticated | permissive | `user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')` |  |
| `csp_violation_reports` | Admins can view CSP reports | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `db_health_snapshots` | Admins can view db health snapshots | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `camera_ptz_config` | ptz_config_owner_or_admin_select | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_ptz_config` | ptz_config_owner_or_admin_insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_ptz_config` | ptz_config_owner_or_admin_update | UPDATE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_ptz_config` | ptz_config_owner_or_admin_delete | DELETE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_presets` | presets_owner_or_admin_select | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_presets` | presets_owner_or_admin_insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_presets` | presets_owner_or_admin_update | UPDATE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_presets` | presets_owner_or_admin_delete | DELETE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_patrols` | patrols_owner_or_admin_select | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_patrols` | patrols_owner_or_admin_insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_patrols` | patrols_owner_or_admin_update | UPDATE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_patrols` | patrols_owner_or_admin_delete | DELETE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `camera_patrol_stops` | patrol_stops_via_patrol_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `camera_patrol_stops` | patrol_stops_via_patrol_insert | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |
| `camera_patrol_stops` | patrol_stops_via_patrol_update | UPDATE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `camera_patrol_stops` | patrol_stops_via_patrol_delete | DELETE | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.camera_patrols p WHERE p.id = patrol_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `camera_ptz_locks` | ptz_locks_camera_visible_select | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.cameras c WHERE c.id = camera_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `media_assets` | Users select own media | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `media_assets` | Users insert own media | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `media_assets` | Users update own media | UPDATE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `media_assets` | Users delete own media | DELETE | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `storage_tiering_runs` | Admins view tiering runs | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `media_forget_audit` | Admins podem ver auditoria de esquecimento | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `media_forget_audit` | Service role insere auditoria | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(), 'admin')` |
| `glacier_stuck_alerts` | Admins can view glacier stuck alerts | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `alertmanager_silences_audit` | am_silences_audit_admin_read | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `alertmanager_silences_audit` | am_silences_audit_no_update | UPDATE | authenticated | permissive | `false` |  |
| `alertmanager_silences_audit` | am_silences_audit_no_delete | DELETE | authenticated | permissive | `false` |  |
| `monitor_groups` | mg_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `monitor_groups` | mg_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `monitor_groups` | mg_update_own | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `monitor_groups` | mg_delete_own | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `monitor_group_cameras` | mgc_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `monitor_group_cameras` | mgc_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `monitor_group_cameras` | mgc_update_own | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `monitor_group_cameras` | mgc_delete_own | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `camera_schedules` | cs_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `camera_schedules` | cs_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `camera_schedules` | cs_update_own | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `camera_schedules` | cs_delete_own | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `camera_schedule_runs` | csr_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_configs` | own configs select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_configs` | own configs insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `timelapse_configs` | own configs update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `timelapse_configs` | own configs delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_snapshots` | own snaps select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_snapshots` | own snaps insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `timelapse_snapshots` | own snaps delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_videos` | own videos select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `timelapse_videos` | own videos insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `timelapse_videos` | own videos update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `timelapse_videos` | own videos delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `motion_masks` | own masks select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `motion_masks` | own masks insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `motion_masks` | own masks update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `motion_masks` | own masks delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_health_checks` | hc_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_health_checks` | hc_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `stream_restart_events` | sre_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `stream_restart_events` | sre_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id AND triggered_by = 'manual'` |
| `camera_bandwidth_samples` | Owners manage bandwidth samples | ALL | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |
| `camera_credentials` | creds owner select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `camera_credentials` | creds owner insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `camera_credentials` | creds owner update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `camera_credentials` | creds owner delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `camera_vault_audit` | vault_audit_admin_read | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `test_mode_sessions` | Users manage own test sessions | ALL | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `camera_health_state` | Users read their own camera health | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `rtsp_revalidation_schedules` | rtsp_revalidation_owner_select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `rtsp_revalidation_schedules` | rtsp_revalidation_owner_insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `rtsp_revalidation_schedules` | rtsp_revalidation_owner_update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `rtsp_revalidation_schedules` | rtsp_revalidation_owner_delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `test_mode_suppressions` | Users view own test-mode suppressions | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `wizard_telemetry` | wizard_telemetry_self_insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `wizard_telemetry` | wizard_telemetry_self_select | SELECT | authenticated | permissive | `auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')` |  |
| `rtsp_preview_sessions` | own preview sessions select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `rtsp_preview_sessions` | own preview sessions insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `rtsp_preview_sessions` | own preview sessions update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `rtsp_preview_sessions` | own preview sessions delete | DELETE | authenticated | permissive | `auth.uid() = user_id` |  |
| `preview_telemetry_events` | preview_telemetry_insert_own | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `preview_telemetry_events` | preview_telemetry_select_own | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `preview_telemetry_events` | preview_telemetry_select_admin | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `local_agents` | own agents select | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `local_agents` | own agents insert | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `local_agents` | own agents update | UPDATE | authenticated | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| … +139 linhas — lista completa em `context.json` | | | | | | |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `continuous_analysis_configs` | `id` | PK; default gen_random_uuid() |
| `continuous_analysis_configs` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `continuous_analysis_configs` | `name` | default 'Análise |
| `continuous_analysis_configs` | `enabled` | default false |
| `continuous_analysis_configs` | `analysis_types` | default '{security}' |
| `continuous_analysis_configs` | `interval_ms` | default 5000; CHECK interval_ms >= 3000 |
| `continuous_analysis_configs` | `schedule_enabled` | default false |
| `continuous_analysis_configs` | `schedule_days` | default '{0 |
| `continuous_analysis_configs` | `alert_thresholds` | default '{ |
| `continuous_analysis_configs` | `save_history` | default true |
| `continuous_analysis_configs` | `max_history_size` | default 100 |
| `continuous_analysis_configs` | `create_alerts` | default true |
| `continuous_analysis_configs` | `rule_ids` | default '{}' |
| `continuous_analysis_configs` | `priority` | default 5; CHECK priority >= 1 AND priority <= 10 |
| `continuous_analysis_configs` | `created_at` | default now() |
| `continuous_analysis_configs` | `updated_at` | default now() |
| `continuous_analysis_configs` | `created_by` | FK → users.id |
| `continuous_analysis_configs` | `(tabela)` | CONSTRAINT unique_active_config_per_camera UNIQUE (camera_id) DEFERRABLE INITIALLY DEFERRED |
| `analysis_sessions` | `id` | PK; default gen_random_uuid() |
| `analysis_sessions` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `analysis_sessions` | `config_id` | FK → continuous_analysis_configs.id ON DELETE SET NULL |
| `analysis_sessions` | `status` | default 'idle' |
| `analysis_sessions` | `total_analyses` | default 0 |
| `analysis_sessions` | `successful_analyses` | default 0 |
| `analysis_sessions` | `failed_analyses` | default 0 |
| `analysis_sessions` | `alerts_generated` | default 0 |
| `analysis_sessions` | `total_people_detected` | default 0 |
| `analysis_sessions` | `avg_people_per_analysis` | default 0 |
| `analysis_sessions` | `avg_analysis_time_ms` | default 0 |
| `analysis_sessions` | `started_at` | default now() |
| `analysis_sessions` | `created_at` | default now() |
| `analysis_sessions` | `updated_at` | default now() |
| `analysis_history` | `id` | PK; default gen_random_uuid() |
| `analysis_history` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `analysis_history` | `user_id` | obrigatório |
| `analysis_history` | `timestamp` | default now() |
| `analysis_history` | `analysis_type` | obrigatório |
| `analysis_history` | `result` | default '{}' |
| `analysis_history` | `created_at` | default now() |
| `recording_configs` | `id` | PK; default gen_random_uuid() |
| `recording_configs` | `user_id` | obrigatório |
| `recording_configs` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `recording_configs` | `enabled` | default true |
| `recording_configs` | `quality` | default 'medium' |
| `recording_configs` | `format` | default 'webm' |
| `recording_configs` | `max_duration_seconds` | default 3600 |
| `recording_configs` | `max_file_size_mb` | default 500 |
| `recording_configs` | `retention_days` | default 30 |
| `recording_configs` | `record_on_motion` | default false |
| `recording_configs` | `record_on_alert` | default true |
| `recording_configs` | `pre_buffer_seconds` | default 5 |
| `recording_configs` | `post_buffer_seconds` | default 10 |
| `recording_configs` | `created_at` | default now() |
| `recording_configs` | `updated_at` | default now() |
| `recording_configs` | `(tabela)` | constraint rec_quality_valid CHECK (quality IN ('low','medium','high','ultra')) NOT VALID, ADD CONSTRAINT rec_format_valid CHECK (format IN ('webm','mp4','mkv')) NOT VALID, ADD CONSTRAINT rec_duration_range CHECK (max_duration_seconds BETWEEN 10 AND 86400) NOT VALID, ADD CONSTRAINT rec_filesize_rang … |
| `video_clips` | `id` | PK; default gen_random_uuid() |
| `video_clips` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `video_clips` | `user_id` | obrigatório |
| `video_clips` | `start_time` | obrigatório |
| `video_clips` | `status` | default 'recording' |
| `video_clips` | `created_at` | default now() |
| `video_clips` | `(tabela)` | constraint clips_status_valid CHECK (status IN ('recording','completed','failed','processing')) NOT VALID, ADD CONSTRAINT clips_duration_nonneg CHECK (duration IS NULL OR duration >= 0) NOT VALID, ADD CONSTRAINT clips_time_order CHECK (end_time IS NULL OR end_time >= start_time) NOT VALID |
| `registered_persons` | `id` | PK; default gen_random_uuid() |
| `registered_persons` | `user_id` | obrigatório |
| `registered_persons` | `name` | obrigatório |
| `registered_persons` | `is_active` | default true |
| `registered_persons` | `created_at` | default now() |
| `registered_persons` | `updated_at` | default now() |
| `registered_persons` | `list_type` | default 'none' |
| `registered_persons` | `encoding_version` | default 'face-api-128' |
| `registered_persons` | `(tabela)` | constraint persons_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID, ADD CONSTRAINT persons_list_type_valid CHECK (list_type IS NULL OR list_type IN ('none','whitelist','blacklist','vip')) NOT VALID |
| `face_recognition_configs` | `id` | PK; default gen_random_uuid() |
| `face_recognition_configs` | `user_id` | obrigatório |
| `face_recognition_configs` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `face_recognition_configs` | `enabled` | default true |
| `face_recognition_configs` | `match_threshold` | default 0.6 |
| `face_recognition_configs` | `min_face_quality` | default 0.5 |
| `face_recognition_configs` | `min_face_size` | default 80 |
| `face_recognition_configs` | `detect_multiple_faces` | default true |
| `face_recognition_configs` | `max_faces_per_frame` | default 10 |
| `face_recognition_configs` | `alert_on_unknown` | default false |
| `face_recognition_configs` | `save_unknown_faces` | default true |
| `face_recognition_configs` | `alert_cooldown` | default 60 |
| `face_recognition_configs` | `created_at` | default now() |
| `face_recognition_configs` | `updated_at` | default now() |
| `face_recognition_configs` | `provider` | default 'insightface' |
| `face_recognition_configs` | `arcface_threshold` | obrigatório |
| `face_recognition_configs` | `liveness_required` | obrigatório |
| `face_recognition_configs` | `liveness_threshold` | obrigatório |
| `face_recognition_configs` | `(tabela)` | constraint face_match_threshold_range CHECK (match_threshold BETWEEN 0 AND 1) NOT VALID, ADD CONSTRAINT face_quality_range CHECK (min_face_quality BETWEEN 0 AND 1) NOT VALID, ADD CONSTRAINT face_size_range CHECK (min_face_size BETWEEN 20 AND 2000) NOT VALID, ADD CONSTRAINT face_max_faces_range CHECK … |
| `zones` | `id` | PK; default gen_random_uuid() |
| `zones` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `zones` | `user_id` | obrigatório |
| `zones` | `name` | obrigatório |
| `zones` | `type` | default 'restricted' |
| `zones` | `points` | default '[]' |
| `zones` | `color` | default '#ff0000' |
| `zones` | `is_active` | default true |
| `zones` | `created_at` | default now() |
| `zones` | `updated_at` | default now() |
| `zones` | `(tabela)` | constraint zones_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID, ADD CONSTRAINT zones_type_valid CHECK (type IN ('restricted','counting','heatmap','entry','exit','safe')) NOT VALID |
| `zone_events` | `id` | PK; default gen_random_uuid() |
| `zone_events` | `zone_id` | FK → zones.id ON DELETE CASCADE |
| `zone_events` | `user_id` | obrigatório |
| `zone_events` | `event_type` | obrigatório |
| `zone_events` | `detected_objects` | default '[]' |
| `zone_events` | `timestamp` | default now() |
| `zone_events` | `created_at` | default now() |
| `zone_events` | `(tabela)` | constraint zone_events_type_not_blank CHECK (length(btrim(event_type)) > 0) NOT VALID, ADD CONSTRAINT zone_events_ts_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID |
| `notification_configs` | `id` | PK; default gen_random_uuid() |
| `notification_configs` | `user_id` | obrigatório |
| `notification_configs` | `name` | default 'Configuração |
| `notification_configs` | `enabled` | default true |
| `notification_configs` | `channels` | default '{}' |
| `notification_configs` | `email_recipients` | default '{}' |
| `notification_configs` | `phone_recipients` | default '{}' |
| `notification_configs` | `webhook_urls` | default '{}' |
| `notification_configs` | `severity_filter` | default '{"high" |
| `notification_configs` | `cooldown_minutes` | default 5 |
| `notification_configs` | `schedule_enabled` | default false |
| `notification_configs` | `schedule_start_time` | default '08:00' |
| `notification_configs` | `schedule_end_time` | default '22:00' |
| `notification_configs` | `schedule_days` | default '{1 |
| `notification_configs` | `created_at` | default now() |
| `notification_configs` | `updated_at` | default now() |
| `notification_configs` | `(tabela)` | constraint notif_cooldown_range CHECK (cooldown_minutes BETWEEN 0 AND 1440) NOT VALID, ADD CONSTRAINT notif_channels_valid CHECK ( channels <@ ARRAY['email','sms','webhook','push','telegram','whatsapp','slack']::text[] ) NOT VALID, ADD CONSTRAINT notif_severity_filter_valid CHECK ( severity_filter < … |
| `notification_history` | `id` | PK; default gen_random_uuid() |
| `notification_history` | `alert_id` | FK → alerts.id ON DELETE SET NULL |
| `notification_history` | `config_id` | FK → notification_configs.id ON DELETE SET NULL |
| `notification_history` | `channels_used` | obrigatório |
| `notification_history` | `results` | default '{}'::jsonb |
| `notification_history` | `success` | default false |
| `notification_history` | `created_at` | default now() |
| `notification_templates` | `id` | PK; default gen_random_uuid() |
| `notification_templates` | `name` | obrigatório |
| `notification_templates` | `channel` | obrigatório |
| `notification_templates` | `body_template` | obrigatório |
| `notification_templates` | `is_default` | default false |
| `notification_templates` | `enabled` | default true |
| `notification_templates` | `created_at` | default now() |
| `notification_templates` | `updated_at` | default now() |
| `rules` | `id` | PK; default gen_random_uuid() |
| `rules` | `name` | obrigatório |
| `rules` | `category` | default 'security' |
| `rules` | `severity` | default 'medium' |
| `rules` | `conditions` | default '[]'::jsonb |
| `rules` | `actions` | default '{}' |
| `rules` | `cameras` | default '{}' |
| `rules` | `is_active` | default true |
| `rules` | `created_at` | default now() |
| `rules` | `updated_at` | default now() |
| `rules` | `zone_id` | FK → zones.id ON DELETE SET NULL |
| `rules` | `schedule_tz` | obrigatório |
| `rules` | `user_id` | obrigatório |
| `rules` | `(tabela)` | constraint rules_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID |
| `cameras` | `id` | PK; default gen_random_uuid() |
| `cameras` | `name` | obrigatório |
| `cameras` | `location` | obrigatório |
| `cameras` | `status` | default 'offline' |
| `cameras` | `detected_people` | default 0 |
| `cameras` | `alerts_count` | default 0 |
| `cameras` | `created_at` | default now() |
| `cameras` | `updated_at` | default now() |
| `cameras` | `version` | default 1 |
| `cameras` | `ptz_capable` | default false |
| `cameras` | `nvr_id` | FK → nvrs.id ON DELETE CASCADE |
| `cameras` | `substream_enabled` | obrigatório |
| `cameras` | `user_id` | obrigatório |
| `cameras` | `(tabela)` | constraint cameras_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID, ADD CONSTRAINT cameras_location_not_blank CHECK (length(btrim(location)) > 0) NOT VALID, ADD CONSTRAINT cameras_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)) NOT VALID, ADD CONSTRAINT cameras_lon_range … |
| `alerts` | `id` | PK; default gen_random_uuid() |
| `alerts` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `alerts` | `camera_name` | obrigatório |
| `alerts` | `type` | default 'security' |
| `alerts` | `severity` | default 'medium' |
| `alerts` | `message` | obrigatório |
| `alerts` | `timestamp` | default now() |
| `alerts` | `is_read` | default false |
| `alerts` | `created_at` | default now() |
| `alerts` | `is_test` | default false |
| `alerts` | `user_id` | obrigatório |
| `alerts` | `(tabela)` | constraint alerts_message_not_blank CHECK (length(btrim(message)) > 0) NOT VALID |
| `alerts` | `(tabela)` | constraint alerts_camera_name_not_blank CHECK (length(btrim(camera_name)) > 0) NOT VALID |
| `alerts` | `(tabela)` | constraint alerts_timestamp_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID |
| `recording_sessions` | `id` | PK; default gen_random_uuid() |
| `recording_sessions` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `recording_sessions` | `config_id` | FK → recording_configs.id ON DELETE SET NULL |
| `recording_sessions` | `status` | default 'recording' |
| `recording_sessions` | `trigger` | default 'manual' |
| `recording_sessions` | `frame_count` | default 0 |
| `recording_sessions` | `current_duration` | default 0 |
| `recording_sessions` | `started_at` | default now() |
| `recording_sessions` | `created_at` | default now() |
| `recording_sessions` | `updated_at` | default now() |
| `rule_violations` | `id` | PK; default gen_random_uuid() |
| `rule_violations` | `analysis_id` | obrigatório; FK → analysis_history.id ON DELETE CASCADE |
| `rule_violations` | `rule_id` | obrigatório; FK → rules.id ON DELETE CASCADE |
| `rule_violations` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `rule_violations` | `conditions_evaluated` | obrigatório |
| `rule_violations` | `severity` | obrigatório; CHECK severity IN ('low', 'medium', 'high', 'critical') |
| `rule_violations` | `message` | obrigatório |
| `rule_violations` | `actions_taken` | default '{}' |
| `rule_violations` | `alert_id` | FK → alerts.id ON DELETE SET NULL |
| `rule_violations` | `created_at` | default now() |
| `stream_recordings` | `id` | PK; default gen_random_uuid() |
| `stream_recordings` | `user_id` | obrigatório |
| `stream_recordings` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `stream_recordings` | `file_size_bytes` | default 0 |
| `stream_recordings` | `duration_seconds` | default 0 |
| `stream_recordings` | `format` | default 'webm' |
| `stream_recordings` | `quality` | default 'medium' |
| `stream_recordings` | `started_at` | default now() |
| `stream_recordings` | `status` | default 'recording' |
| `stream_recordings` | `created_at` | default now() |
| `stream_recordings` | `(tabela)` | constraint stream_rec_format_valid CHECK (format IS NULL OR format IN ('webm','mp4','mkv')) NOT VALID, ADD CONSTRAINT stream_rec_quality_valid CHECK (quality IS NULL OR quality IN ('low','medium','high','ultra')) NOT VALID, ADD CONSTRAINT stream_rec_status_valid CHECK (status IN ('recording','comple … |
| `stream_stats` | `id` | PK; default gen_random_uuid() |
| `stream_stats` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `stream_stats` | `recorded_at` | default now() |
| `stream_stats` | `reconnect_attempts` | default 0 |
| `stream_stats` | `period_start` | obrigatório |
| `stream_stats` | `period_end` | obrigatório |
| `camera_snapshots` | `id` | PK; default gen_random_uuid() |
| `camera_snapshots` | `camera_id` | obrigatório; FK → cameras.id ON DELETE CASCADE |
| `camera_snapshots` | `trigger_type` | default 'manual'; CHECK trigger_type IN ('manual', 'scheduled', 'alert', 'motion', 'analysis') |
| `camera_snapshots` | `metadata` | default '{}' |
| `camera_snapshots` | `created_at` | default now() |
| `registered_plates` | `id` | PK; default gen_random_uuid() |
| `registered_plates` | `user_id` | obrigatório |
| `registered_plates` | `plate` | obrigatório |
| `registered_plates` | `vehicle_type` | default 'car' |
| `registered_plates` | `list_type` | default 'whitelist' |
| `registered_plates` | `is_active` | default true |
| `registered_plates` | `created_at` | default now() |
| `registered_plates` | `updated_at` | default now() |
| `registered_plates` | `(tabela)` | constraint plates_format_valid CHECK ( plate ~ '^[A-Z]{3}[0-9]{4}$' OR plate ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$' ) NOT VALID, ADD CONSTRAINT plates_list_type_valid CHECK (list_type IN ('whitelist','blacklist','vip','suspect')) NOT VALID, ADD CONSTRAINT plates_vehicle_type_valid CHECK ( vehicle_type IS … |
| `ppe_zones` | `id` | PK; default gen_random_uuid() |
| `ppe_zones` | `name` | obrigatório |
| `ppe_zones` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `ppe_zones` | `required_ppe` | default '{}' |
| `ppe_zones` | `alert_on_violation` | default true |
| `ppe_zones` | `grace_period_seconds` | default 5 |
| `ppe_zones` | `active` | default true |
| `ppe_zones` | `user_id` | FK → users.id |
| `ppe_zones` | `created_at` | default NOW() |
| `ppe_zones` | `updated_at` | default NOW() |
| `ppe_violations` | `id` | PK; default gen_random_uuid() |
| `ppe_violations` | `zone_id` | FK → ppe_zones.id ON DELETE CASCADE |
| `ppe_violations` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `ppe_violations` | `person_id` | FK → registered_persons.id ON DELETE SET NULL |
| `ppe_violations` | `missing_items` | default '{}' |
| `ppe_violations` | `confidence` | default 0 |
| `ppe_violations` | `acknowledged` | default false |
| `ppe_violations` | `acknowledged_by` | FK → users.id |
| `ppe_violations` | `metadata` | default '{}' |
| `ppe_violations` | `created_at` | default NOW() |
| `ppe_configs` | `id` | PK; default gen_random_uuid() |
| `ppe_configs` | `camera_id` | único; FK → cameras.id ON DELETE CASCADE |
| `ppe_configs` | `enabled` | default true |
| `ppe_configs` | `min_confidence` | default 0.60 |
| `ppe_configs` | `detection_interval_ms` | default 2000 |
| `ppe_configs` | `alert_on_violation` | default true |
| `ppe_configs` | `save_violations` | default true |
| `ppe_configs` | `grace_period_seconds` | default 5 |
| `ppe_configs` | `model_endpoint` | default '/api/ppe-detection' |
| `ppe_configs` | `user_id` | FK → users.id |
| `ppe_configs` | `created_at` | default NOW() |
| `ppe_configs` | `updated_at` | default NOW() |
| `heatmap_data` | `id` | PK; default gen_random_uuid() |
| `heatmap_data` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `heatmap_data` | `x` | obrigatório |
| `heatmap_data` | `y` | obrigatório |
| `heatmap_data` | `value` | default 1 |
| `heatmap_data` | `grid_size` | default 20 |
| `heatmap_data` | `created_at` | default NOW() |
| `heatmap_snapshots` | `id` | PK; default gen_random_uuid() |
| `heatmap_snapshots` | `user_id` | obrigatório |
| `heatmap_snapshots` | `camera_id` | FK → cameras.id ON DELETE CASCADE |
| `heatmap_snapshots` | `data_points` | default 0 |
| `heatmap_snapshots` | `max_intensity` | default 0 |
| `heatmap_snapshots` | `min_intensity` | default 0 |
| `heatmap_snapshots` | `avg_intensity` | default 0 |
| `heatmap_snapshots` | `resolution` | default '{"width": |
| `heatmap_snapshots` | `created_at` | default now() |
| `rule_executions` | `id` | PK; default gen_random_uuid() |
| `rule_executions` | `rule_id` | FK → rules.id ON DELETE CASCADE |
| `rule_executions` | `user_id` | obrigatório |
| `rule_executions` | `alert_id` | FK → alerts.id ON DELETE SET NULL |
| `rule_executions` | `triggered_at` | default now() |
| `rule_executions` | `actions_executed` | default '{}' |
| `rule_executions` | `status` | default 'success' |
| `rule_executions` | `created_at` | default now() |
| `rule_executions` | `is_test` | default false |
| `vehicles` | `id` | PK; default gen_random_uuid() |
| `vehicles` | `user_id` | obrigatório |
| `vehicles` | `plate` | obrigatório |
| `vehicles` | `type` | default 'whitelist' |
| `vehicles` | `created_at` | default now() |
| `vehicles` | `updated_at` | default now() |
| `vehicles` | `(tabela)` | constraint vehicles_plate_format CHECK ( plate ~ '^[A-Z]{3}[0-9]{4}$' OR plate ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$' ) NOT VALID, ADD CONSTRAINT vehicles_type_valid CHECK (type IN ('whitelist','blacklist','vip','suspect')) NOT VALID |
| `arm_disarm_states` | `id` | PK; default gen_random_uuid() |
| `arm_disarm_states` | `user_id` | obrigatório |
| … +1475 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| trigger_alert_notification | AFTER INSERT | `alerts` | `process_alert_notification` |  |
| update_cameras_updated_at | BEFORE UPDATE | `cameras` | `update_rules_updated_at` |  |
| update_video_clips_timestamp | BEFORE UPDATE | `video_clips` | `update_clips_updated_at` |  |
| update_recording_configs_timestamp | BEFORE UPDATE | `recording_configs` | `update_clips_updated_at` |  |
| update_recording_sessions_timestamp | BEFORE UPDATE | `recording_sessions` | `update_clips_updated_at` |  |
| update_continuous_analysis_configs_updated_at | BEFORE UPDATE | `continuous_analysis_configs` | `update_rules_updated_at` |  |
| update_analysis_sessions_updated_at | BEFORE UPDATE | `analysis_sessions` | `update_rules_updated_at` |  |
| auto_alert_on_rule_violation | AFTER INSERT | `rule_violations` | `auto_create_alert_on_violation` |  |
| update_registered_persons_timestamp | BEFORE UPDATE | `registered_persons` | `update_face_updated_at` |  |
| update_face_configs_timestamp | BEFORE UPDATE | `face_recognition_configs` | `update_face_updated_at` |  |
| trigger_auto_alert_blacklist | BEFORE INSERT | `recognition_logs` | `auto_alert_on_blacklist` |  |
| update_stream_recordings_updated_at | BEFORE UPDATE | `stream_recordings` | `update_rules_updated_at` |  |
| update_zones_timestamp | BEFORE UPDATE | `zones` | `update_zones_updated_at` |  |
| update_registered_plates_updated_at | BEFORE UPDATE | `registered_plates` | `update_rules_updated_at` |  |
| update_ppe_zones_updated_at | BEFORE UPDATE | `ppe_zones` | `update_updated_at_column` |  |
| update_ppe_configs_updated_at | BEFORE UPDATE | `ppe_configs` | `update_updated_at_column` |  |
| on_auth_user_created_assign_role | AFTER INSERT | `auth.users` | `handle_new_user_role` |  |
| update_user_roles_updated_at | BEFORE UPDATE | `user_roles` | `update_rules_updated_at` |  |
| trg_validate_armed_by_email | BEFORE INSERT OR UPDATE | `arm_disarm_states` | `validate_armed_by_email` |  |
| trg_audit_role_changes | AFTER INSERT OR UPDATE OR DELETE | `user_roles` | `audit_role_changes` |  |
| trg_audit_role_insert | AFTER INSERT | `user_roles` | `audit_role_changes` |  |
| trg_audit_role_update | AFTER UPDATE | `user_roles` | `audit_role_changes` |  |
| trg_audit_role_delete | AFTER DELETE | `user_roles` | `audit_role_changes` |  |
| trg_detection_reviews_updated_at | BEFORE UPDATE | `detection_reviews` | `update_updated_at_column` |  |
| trg_model_thresholds_updated_at | BEFORE UPDATE | `model_thresholds` | `update_updated_at_column` |  |
| update_user_filter_preferences_updated_at | BEFORE UPDATE | `user_filter_preferences` | `update_updated_at_column` |  |
| trg_cameras_bump_version | BEFORE UPDATE | `cameras` | `bump_version` |  |
| update_rules_updated_at | BEFORE UPDATE | `rules` | `update_rules_updated_at` |  |
| trg_audit_logs_no_update | BEFORE UPDATE | `audit_logs` | `prevent_audit_log_mutation` |  |
| trg_audit_logs_no_delete | BEFORE DELETE | `audit_logs` | `prevent_audit_log_mutation` |  |
| trg_normalize_plate | BEFORE INSERT OR UPDATE | `registered_plates` | `normalize_plate` |  |
| trg_normalize_vehicle_plate | BEFORE INSERT OR UPDATE | `vehicles` | `normalize_plate` |  |
| trg_org_owner | AFTER INSERT | `organizations` | `add_owner_on_org_create` |  |
| trg_org_updated | BEFORE UPDATE | `organizations` | `update_updated_at_column` |  |
| trg_ealert_updated | BEFORE UPDATE | `event_alerts` | `update_updated_at_column` |  |
| trg_erev_updated | BEFORE UPDATE | `event_reviews` | `update_updated_at_column` |  |
| trg_cdr_updated | BEFORE UPDATE | `camera_detection_rules` | `update_updated_at_column` |  |
| trg_face_embeddings_updated_at | BEFORE UPDATE | `face_embeddings` | `update_updated_at_column` |  |
| trg_ptz_config_updated_at | BEFORE UPDATE | `camera_ptz_config` | `update_updated_at_column` |  |
| trg_camera_presets_updated_at | BEFORE UPDATE | `camera_presets` | `update_updated_at_column` |  |
| trg_camera_patrols_updated_at | BEFORE UPDATE | `camera_patrols` | `update_updated_at_column` |  |
| trg_media_assets_updated_at | BEFORE UPDATE | `media_assets` | `set_media_assets_updated_at` |  |
| trg_block_media_forget_audit_upd | BEFORE UPDATE OR DELETE | `media_forget_audit` | `block_media_forget_audit_mutation` |  |
| trg_mg_updated_at | BEFORE UPDATE | `monitor_groups` | `update_updated_at_column` |  |
| trg_camera_schedules_updated_at | BEFORE UPDATE | `camera_schedules` | `update_updated_at_column` |  |
| trg_timelapse_configs_updated | BEFORE UPDATE | `timelapse_configs` | `update_updated_at_column` |  |
| trg_timelapse_videos_updated | BEFORE UPDATE | `timelapse_videos` | `update_updated_at_column` |  |
| trg_motion_masks_updated | BEFORE UPDATE | `motion_masks` | `update_updated_at_column` |  |
| trg_camera_credentials_updated_at | BEFORE UPDATE | `camera_credentials` | `update_updated_at_column` |  |
| trg_vault_audit_no_update | BEFORE UPDATE OR DELETE | `camera_vault_audit` | `prevent_vault_audit_mutation` |  |
| trg_test_sessions_updated_at | BEFORE UPDATE | `test_mode_sessions` | `tm_touch_updated_at` |  |
| trg_camera_health_state_updated_at | BEFORE UPDATE | `camera_health_state` | `update_updated_at_column` |  |
| trg_rtsp_reval_touch | BEFORE UPDATE | `rtsp_revalidation_schedules` | `tg_rtsp_reval_touch` |  |
| stream_alert_thresholds_updated_at | BEFORE UPDATE | `stream_alert_thresholds` | `update_updated_at_column` |  |
| update_dry_run_snapshots_updated_at | BEFORE UPDATE | `dry_run_report_snapshots` | `update_updated_at_column` |  |
| local_agents_updated_at | BEFORE UPDATE | `local_agents` | `tg_local_agents_updated_at` |  |
| agent_discoveries_updated_at | BEFORE UPDATE | `agent_discoveries` | `tg_local_agents_updated_at` |  |
| trg_camera_connectivity_preferences_updated | BEFORE UPDATE | `camera_connectivity_preferences` | `update_updated_at_column` |  |
| trg_cron_watchdog_escalations_ack_guard | BEFORE UPDATE | `cron_watchdog_escalations` | `cron_watchdog_escalations_ack_guard` |  |
| set_nvrs_updated_at | BEFORE UPDATE | `nvrs` | `update_updated_at_column` |  |
| trg_cap_ptz_limits_history | BEFORE INSERT OR UPDATE OF LIMITS_HISTORY | `camera_ptz_config` | `cap_ptz_limits_history` |  |
| update_nvr_recording_downloads_updated_at | BEFORE UPDATE | `nvr_recording_downloads` | `update_updated_at_column` |  |
| trg_notification_recipients_updated | BEFORE UPDATE | `notification_recipients` | `update_updated_at_column` |  |
| trg_event_alerts_fanout | AFTER INSERT | `event_alerts` | `fanout_alert_notifications` |  |
| update_productivity_metric_preferences_updated_at | BEFORE UPDATE | `productivity_metric_preferences` | `update_updated_at_column` |  |
| update_partition_maintenance_runs_updated_at | BEFORE UPDATE | `partition_maintenance_runs` | `update_updated_at_column` |  |
| update_partition_drain_runs_updated_at | BEFORE UPDATE | `partition_drain_runs` | `update_updated_at_column` |  |
| trg_partition_quarantine_runs_updated_at | BEFORE UPDATE | `partition_quarantine_runs` | `update_updated_at_column` |  |
| set_maintenance_alert_events_updated_at | BEFORE UPDATE | `maintenance_alert_events` | `update_updated_at_column` |  |
| set_maintenance_alert_dispatches_updated_at | BEFORE UPDATE | `maintenance_alert_dispatches` | `update_updated_at_column` |  |
| trg_camera_clock_skew_runs_updated_at | BEFORE UPDATE | `camera_clock_skew_runs` | `update_updated_at_column` |  |
| trg_camera_clock_skew_findings_updated_at | BEFORE UPDATE | `camera_clock_skew_findings` | `update_updated_at_column` |  |
| update_partition_backlog_samples_updated_at | BEFORE UPDATE | `partition_backlog_samples` | `update_updated_at_column` |  |
| update_rcc_runs_updated_at | BEFORE UPDATE | `root_cause_correlation_runs` | `update_updated_at_column` |  |
| set_maintenance_alert_escalations_updated_at | BEFORE UPDATE | `maintenance_alert_escalations` | `update_updated_at_column` |  |
| trg_touch_camera_ingest_endpoints | BEFORE UPDATE | `camera_ingest_endpoints` | `touch_camera_ingest_endpoints` |  |
| trg_touch_dwell_sessions | BEFORE UPDATE | `dwell_sessions` | `touch_dwell_sessions` |  |
| update_monitoring_center_accounts_updated_at | BEFORE UPDATE | `monitoring_center_accounts` | `update_updated_at_column` |  |
| update_monitoring_center_dispatches_updated_at | BEFORE UPDATE | `monitoring_center_dispatches` | `update_updated_at_column` |  |
| trg_collab_network_bootstrap | AFTER INSERT | `collab_networks` | `collab_network_bootstrap` |  |
| trg_collab_networks_updated | BEFORE UPDATE | `collab_networks` | `update_updated_at_column` |  |
| trg_collab_memberships_updated | BEFORE UPDATE | `collab_memberships` | `update_updated_at_column` |  |
| trg_collab_entries_updated | BEFORE UPDATE | `collab_entries` | `update_updated_at_column` |  |
| trg_collab_invitations_updated | BEFORE UPDATE | `collab_invitations` | `update_updated_at_column` |  |
| trg_collab_governance_audit_immutable | BEFORE UPDATE OR DELETE | `collab_governance_audit` | `collab_governance_audit_immutable` |  |
| trg_collab_notifications_updated | BEFORE UPDATE | `collab_notifications` | `update_updated_at_column` |  |
| trg_collab_governance_audit_notify | AFTER INSERT | `collab_governance_audit` | `collab_emit_notifications` |  |
| trg_collab_silences_updated | BEFORE UPDATE | `collab_notification_silences` | `update_updated_at_column` |  |
| trg_collab_silences_validate | BEFORE INSERT OR UPDATE | `collab_notification_silences` | `collab_silences_validate` |  |
| trg_collab_matches_snapshot | BEFORE INSERT OR UPDATE | `collab_matches` | `collab_matches_snapshot` |  |
| user_capability_grant_audit_immutable | BEFORE UPDATE OR DELETE | `user_capability_grant_audit` | `block_capability_audit_mutation` |  |
| trg_camera_io_ports_updated_at | BEFORE UPDATE | `camera_io_ports` | `update_updated_at_column` |  |
| trg_io_actuation_log_immutable | BEFORE UPDATE OR DELETE | `io_actuation_log` | `block_io_actuation_log_mutation` |  |
| trg_onvif_subs_updated_at | BEFORE UPDATE | `onvif_event_subscriptions` | `update_updated_at_column` |  |
| trg_onvif_events_immutable | BEFORE UPDATE OR DELETE | `onvif_event_deliveries` | `block_onvif_event_mutation` |  |
| evidence_exports_seal_before_insert | BEFORE INSERT | `evidence_exports` | `evidence_exports_seal` |  |
| evidence_exports_no_update | BEFORE UPDATE OR DELETE | `evidence_exports` | `block_evidence_export_mutation` |  |
| site_plans_set_updated_at | BEFORE UPDATE | `site_plans` | `update_updated_at_column` |  |
| site_plan_placements_set_updated_at | BEFORE UPDATE | `site_plan_placements` | `update_updated_at_column` |  |
| trg_alert_treatments_immutable | BEFORE UPDATE OR DELETE | `event_alert_treatments` | `block_alert_treatment_mutation` |  |
| trg_enforce_alert_transition | BEFORE UPDATE | `event_alerts` | `enforce_alert_transition` |  |
| trg_alarm_recurrence_guard | BEFORE UPDATE OR DELETE | `alarm_recurrence_episodes` | `block_alarm_recurrence_mutation` |  |
| trg_alarm_recurrence_purge_runs_immutable | BEFORE UPDATE OR DELETE | `alarm_recurrence_purge_runs` | `block_retention_run_mutation` |  |
| trg_mg_quota | BEFORE INSERT | `monitor_groups` | `enforce_monitor_group_quota` |  |
| trg_mgc_slot_limit | BEFORE INSERT OR UPDATE | `monitor_group_cameras` | `enforce_monitor_group_slot_limit` |  |
| trg_mgc_ownership | BEFORE INSERT OR UPDATE | `monitor_group_cameras` | `enforce_monitor_group_ownership` |  |
| trg_device_audit_immutable | BEFORE UPDATE OR DELETE | `device_registration_audit` | `block_device_audit_mutation` |  |
| trg_device_registration_rules | BEFORE INSERT OR UPDATE | `device_registrations` | `enforce_device_registration_rules` |  |
| trg_guard_device_remote_command | BEFORE INSERT OR UPDATE | `device_remote_commands` | `guard_device_remote_command` |  |
| trg_timeline_attestations_enforce | BEFORE INSERT | `timeline_attestations` | `enforce_timeline_attestation` |  |
| trg_timeline_attestations_immutable | BEFORE UPDATE OR DELETE | `timeline_attestations` | `block_timeline_attestation_mutation` |  |
| alarm_schemes_enforce_rules | BEFORE INSERT OR UPDATE | `alarm_schemes` | `enforce_alarm_scheme_rules` |  |
| admission_ledger_immutable | BEFORE UPDATE OR DELETE | `admission_ledger_windows` | `block_admission_ledger_mutation` |  |
| admission_purge_runs_immutable | BEFORE UPDATE OR DELETE | `admission_ledger_purge_runs` | `block_retention_run_mutation` |  |
| trg_block_reconcile_snapshot_mutation | BEFORE UPDATE OR DELETE | `admission_reconcile_snapshots` | `block_reconcile_snapshot_mutation` |  |
| reconcile_purge_runs_immutable | BEFORE UPDATE OR DELETE | `admission_reconcile_purge_runs` | `block_retention_run_mutation` |  |
| trg_block_dispatch_suppression_mutation | BEFORE UPDATE OR DELETE | `maintenance_dispatch_suppressions` | `block_dispatch_suppression_mutation` |  |
| trg_block_suppression_purge_run_mutation | BEFORE UPDATE OR DELETE | `maintenance_suppression_purge_runs` | `block_retention_run_mutation` |  |
| trg_block_dispatch_run_mutation | BEFORE UPDATE OR DELETE | `maintenance_dispatch_runs` | `block_dispatch_run_mutation` |  |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `finish_clip_recording` | Sessão não encontrada | `supabase/migrations/20251219_clips.sql` |
| `record_zone_event` | Zona não encontrada | `supabase/migrations/20251219_zones.sql` |
| `validate_armed_by_email` | armed_by_email must match the authenticated user email | `supabase/migrations/20260404192040_e64ccef0-0603-472b-a08a-c12bfe9282aa.sql` |
| `bump_version` | Conflito de concorrência detectado na tabela % (id: %). Versão esperada: %, recebida: % | `supabase/migrations/20260513172249_b9e44575-54ed-410c-862b-1f28baef9942.sql` |
| `delete_user_data` | Acesso negado. Você só pode excluir sua própria conta. | `supabase/migrations/20260513172507_a273368b-18d4-44e8-a3d2-93256a18cab5.sql` |
| `replace_user_role` | admin_id ausente | `supabase/migrations/20260712203138_3cddfb9f-ab09-4a8d-8608-e320c7edb821.sql` |
| `replace_user_role` | Acesso negado. Apenas administradores. | `supabase/migrations/20260712203138_3cddfb9f-ab09-4a8d-8608-e320c7edb821.sql` |
| `replace_user_role` | Não é possível alterar sua própria role | `supabase/migrations/20260712203138_3cddfb9f-ab09-4a8d-8608-e320c7edb821.sql` |
| `prevent_audit_log_mutation` | audit_logs é append-only: % não é permitido | `supabase/migrations/20260712212813_74233b9c-99ad-4bf8-b0b7-372e9871f105.sql` |
| `validate_cdr_camera_org_consistency` | Câmera % não encontrada | `supabase/migrations/20260715190446_73040798-50a9-4a11-b06f-b2b4a2918e0e.sql` |
| `validate_cdr_camera_org_consistency` | Câmera % não pertence à organização % | `supabase/migrations/20260715190446_73040798-50a9-4a11-b06f-b2b4a2918e0e.sql` |
| `run_index_maintenance` | Acesso negado. Apenas administradores. | `supabase/migrations/20260716184050_49cbb978-493d-4975-9007-30b007cca24c.sql` |
| `get_slow_queries` | Acesso negado. Apenas administradores. | `supabase/migrations/20260716184250_c0c4fd91-0a51-463a-8d7c-c74d98b86582.sql` |
| `get_api_usage_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `import_settings_backup` | Não autenticado | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `import_settings_backup` | strategy inválida: % | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `import_settings_backup` | schema_version inválida (esperado 1.0.0): % | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `import_settings_backup` | Backup excede limite de 2000 registros combinados | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `get_csp_report_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717131135_1a2d7173-1498-49fe-a856-7b15ae508702.sql` |
| `get_table_bloat_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717133548_c0aaa9c7-81bf-4b3e-b901-34680c898ef1.sql` |
| `run_selective_vacuum` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717133548_c0aaa9c7-81bf-4b3e-b901-34680c898ef1.sql` |
| `get_long_running_sessions` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717133732_3ab231b8-6a76-4397-ac14-fbb8dee4b5b2.sql` |
| `get_blocking_locks` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717133732_3ab231b8-6a76-4397-ac14-fbb8dee4b5b2.sql` |
| `get_unused_indexes` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134013_2180f304-b9ba-47c0-bb07-9d8ba9d29cfa.sql` |
| `get_missing_fk_indexes` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134140_7d6f280e-61fc-4e57-9147-40c9b41b14e0.sql` |
| `get_table_cache_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134408_1757e6f5-afc0-4485-9d8b-18f0ce2edb24.sql` |
| `get_table_size_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134808_b2d6ac76-0e82-4619-bce1-7cef48a9712d.sql` |
| `get_stats_staleness` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134947_e7eb3d6a-6f39-4d64-b719-1a0d5f88a1ce.sql` |
| `analyze_table` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717134947_e7eb3d6a-6f39-4d64-b719-1a0d5f88a1ce.sql` |
| `analyze_table` | Nome de tabela inválido | `supabase/migrations/20260717134947_e7eb3d6a-6f39-4d64-b719-1a0d5f88a1ce.sql` |
| `analyze_table` | Tabela public.% não encontrada | `supabase/migrations/20260717134947_e7eb3d6a-6f39-4d64-b719-1a0d5f88a1ce.sql` |
| `get_seq_scan_hotspots` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717140703_8f71bd25-a41c-40b7-beb7-5f29f51a76ec.sql` |
| `get_bgwriter_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717140901_17080c93-3062-4b2f-8801-861060f97da9.sql` |
| `terminate_db_session` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | PID inválido | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Não é possível encerrar a própria sessão | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | PID % não encontrado | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Proibido encerrar backend_type=%: apenas sessões de cliente | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Proibido encerrar sessão do usuário de sistema: % | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Sessão ativa há apenas %s (mínimo %s). Aguarde ou use _force=true. | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Idle in transaction há apenas %s (mínimo %s). Aguarde ou use _force=true. | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `terminate_db_session` | Sessão apenas idle (sem query em andamento). Use _force=true se realmente deseja terminar. | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `get_connection_saturation` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717141308_384a707c-5f38-4c4d-8e0d-a6dc0ebf2d7e.sql` |
| `get_maintenance_progress` | Acesso negado. Apenas administradores. | `supabase/migrations/20260717141440_2f4706ab-da62-41eb-b5fe-680ad297ae94.sql` |
| `get_temp_file_offenders` | access denied | `supabase/migrations/20260717141616_965dec2c-ebf7-462e-8861-7010223d1a9b.sql` |
| `get_temp_files_summary` | access denied | `supabase/migrations/20260717141616_965dec2c-ebf7-462e-8861-7010223d1a9b.sql` |
| `get_table_bloat_estimate` | access denied | `supabase/migrations/20260717141759_230184bb-1522-4088-aea6-92f1333caba3.sql` |
| `get_txid_wraparound_status` | access denied | `supabase/migrations/20260717142223_c6e927cc-aaaf-4c77-a72b-74e246c3745a.sql` |
| `get_replication_slot_status` | Access denied: admin role required | `supabase/migrations/20260717142439_f533f877-1cfb-403b-b467-ff61102613c3.sql` |
| `get_blocking_chains` | Access denied: admin role required | `supabase/migrations/20260717142824_e4ac7123-0f10-4ab5-83f4-fbfa309c8202.sql` |
| `audit_rls_coverage` | Access denied: admin role required | `supabase/migrations/20260717142952_7c6d9377-f249-4081-8ab8-96413de9413e.sql` |
| `acquire_ptz_lock` | Não autenticado | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `acquire_ptz_lock` | Papel insuficiente para operar PTZ | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `release_ptz_lock` | Não autenticado | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `get_sequence_exhaustion` | permission denied: admin role required | `supabase/migrations/20260717173421_311e97e9-cfb9-40fc-aaca-4ec4f48f06b5.sql` |
| `get_tables_without_pk` | access denied: admin role required | `supabase/migrations/20260717173608_a8c9f046-f5c4-4cea-96fc-59ae9e615624.sql` |
| `get_nullable_foreign_keys` | access denied: admin role required | `supabase/migrations/20260717173749_c52121bb-4bc1-4a7f-b316-bd2f4158fdeb.sql` |
| `get_autovacuum_overrides` | access denied: admin role required | `supabase/migrations/20260717174058_10e05f6e-caa2-424e-b1c8-9964d4e7c2f7.sql` |
| `get_unvalidated_constraints` | access denied: admin role required | `supabase/migrations/20260717174230_7c1fc17f-e36e-4bb8-9ec4-faa9f52068b0.sql` |
| `get_disabled_triggers` | access denied: admin role required | `supabase/migrations/20260717180608_4ebc8010-394b-4ae3-af80-702fe4d3df89.sql` |
| `get_definer_functions_without_search_path` | access denied: admin role required | `supabase/migrations/20260717181004_0335a608-fa99-480c-a117-244affa7768e.sql` |
| `get_duplicate_indexes` | access denied: admin role required | `supabase/migrations/20260717181650_517ade1e-9c92-4054-99c3-ecf856ee0659.sql` |
| `get_missing_updated_at_triggers` | Access denied: admin role required | `supabase/migrations/20260717181929_3dcd298b-044d-4912-9b57-97f79ef7c2a8.sql` |
| `get_invalid_indexes` | Acesso negado: apenas administradores | `supabase/migrations/20260717184326_114aca07-dff2-45f8-9bf2-a977c21a2d2c.sql` |
| `block_media_forget_audit_mutation` | media_forget_audit é imutável (LGPD) | `supabase/migrations/20260717195647_fd7923b2-b028-4e12-811b-c6c3eb10baa4.sql` |
| `set_media_legal_hold` | forbidden | `supabase/migrations/20260717202224_5e6a9ea3-91bb-44b2-848c-0eccf5c92578.sql` |
| `set_media_legal_hold` | reason_required | `supabase/migrations/20260717202224_5e6a9ea3-91bb-44b2-848c-0eccf5c92578.sql` |
| `set_media_legal_hold` | not_found | `supabase/migrations/20260717202224_5e6a9ea3-91bb-44b2-848c-0eccf5c92578.sql` |
| `get_media_forget_audit` | forbidden | `supabase/migrations/20260717202224_5e6a9ea3-91bb-44b2-848c-0eccf5c92578.sql` |
| `get_storage_tiering_slo` | access denied: admin role required | `supabase/migrations/20260721153427_4c65d494-000e-428b-ad81-afc4876f3be5.sql` |
| `validate_camera_substream` | substream_url excede 2048 caracteres | `supabase/migrations/20260721215717_e40aa8d5-24e4-4d6d-84c3-d24f98879216.sql` |
| `validate_camera_substream` | substream_protocol inválido: % | `supabase/migrations/20260721215717_e40aa8d5-24e4-4d6d-84c3-d24f98879216.sql` |
| `validate_camera_substream` | substream_enabled requer substream_url | `supabase/migrations/20260721215717_e40aa8d5-24e4-4d6d-84c3-d24f98879216.sql` |
| `set_camera_credentials` | invalid encryption key | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `set_camera_credentials` | camera not found | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `set_camera_credentials` | forbidden | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `get_camera_stream_url` | camera not found | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `get_camera_stream_url` | forbidden | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `get_camera_stream_url` | key mismatch | `supabase/migrations/20260722101516_03fe85ad-52d5-4daa-bf25-83d6ec8f4b26.sql` |
| `rotate_camera_vault_key` | keys must be >= 16 chars | `supabase/migrations/20260722103300_61f2ca71-8712-41c7-b360-672ed1415603.sql` |
| `rotate_camera_vault_key` | decrypt failed for credential %; aborting rotation | `supabase/migrations/20260722103300_61f2ca71-8712-41c7-b360-672ed1415603.sql` |
| `set_camera_credentials_v2` | kek_too_short | `supabase/migrations/20260722115002_545e3eb7-8dd6-4c31-b62a-32eb3c9cb443.sql` |
| `set_camera_credentials_v2` | camera_not_found | `supabase/migrations/20260722115002_545e3eb7-8dd6-4c31-b62a-32eb3c9cb443.sql` |
| `rewrap_camera_vault_kek` | new_kek_too_short | `supabase/migrations/20260722115002_545e3eb7-8dd6-4c31-b62a-32eb3c9cb443.sql` |
| `backfill_envelope_encryption` | kek_too_short | `supabase/migrations/20260722115002_545e3eb7-8dd6-4c31-b62a-32eb3c9cb443.sql` |
| `prevent_vault_audit_mutation` | camera_vault_audit is append-only | `supabase/migrations/20260722115754_fe922115-724f-4f62-b8a4-65d59f2020fb.sql` |
| `apply_camera_setup` | not_authenticated | `supabase/migrations/20260722203150_7b9c8d81-074f-47f2-b4f3-13a81a5e241c.sql` |
| `apply_camera_setup` | camera_not_found_or_forbidden | `supabase/migrations/20260722203150_7b9c8d81-074f-47f2-b4f3-13a81a5e241c.sql` |
| `get_preview_telemetry_summary` | forbidden | `supabase/migrations/20260723134311_1c97a958-bd22-4ef3-a8c7-6646897f464b.sql` |
| `get_cron_job_runs` | insufficient_privileges | `supabase/migrations/20260723162939_c4fdbe76-2ca2-469c-92f5-20920705b87b.sql` |
| `list_cron_jobs` | insufficient_privileges | `supabase/migrations/20260723163125_b62b4956-37df-4ab4-9288-e2d63becd664.sql` |
| `cron_watchdog_ack_metrics` | insufficient_privileges | `supabase/migrations/20260723165844_1f3f09a4-9967-481b-869c-cdaa0315a8b1.sql` |
| `create_nvr_with_channels` | unauthenticated | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `create_nvr_with_channels` | p_channel_urls must be jsonb array | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `create_nvr_with_channels` | at least one channel required | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `create_nvr_with_channels` | too many channels (max 64) | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `create_nvr_with_channels` | invalid channel number: % | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `create_nvr_with_channels` | invalid url for channel % | `supabase/migrations/20260723173347_2bbef37a-6711-406a-ba32-a9febe02b39f.sql` |
| `envelope_encryption_stats` | Acesso negado. Apenas administradores. | `supabase/migrations/20260726144906_12059980-8278-4c96-9a0a-eff6f93f3b5e.sql` |
| `cron_watchdog_consecutive_problems` | Acesso negado. Apenas administradores. | `supabase/migrations/20260726144906_12059980-8278-4c96-9a0a-eff6f93f3b5e.sql` |
| `preview_success_alert` | Acesso negado. Apenas administradores. | `supabase/migrations/20260726144906_12059980-8278-4c96-9a0a-eff6f93f3b5e.sql` |
| `get_permissive_rls_policies` | access denied: admin role required | `supabase/migrations/20260726151023_949c1004-b792-435d-89e6-9701091180d0.sql` |
| `get_partition_coverage` | acesso negado: requer papel admin | `supabase/migrations/20260726160312_a030319d-6cbf-4eda-8f72-534488c93caf.sql` |
| `get_partition_default_backlog` | acesso negado | `supabase/migrations/20260726161031_f6cd3ef5-c6e9-449d-a26e-275592a89a9a.sql` |
| `get_partition_quarantine_summary` | acesso restrito a administradores | `supabase/migrations/20260726161919_2dcc9663-b934-4550-8dee-e5a5bc153c1f.sql` |
| `get_maintenance_alert_status` | acesso restrito a administradores | `supabase/migrations/20260726162557_5a851bad-4c84-45f8-8c4e-faef1d9f61d2.sql` |
| `detect_camera_clock_skew` | apenas administradores podem executar detect_camera_clock_skew | `supabase/migrations/20260726164149_f062f0c7-a2e3-4192-8143-d20315b3671b.sql` |
| `sample_partition_backlog` | acesso negado: apenas administradores podem amostrar o backlog de partições | `supabase/migrations/20260726165123_bf1cbeb3-8556-483b-8157-dcb7fac91032.sql` |
| `acknowledge_maintenance_alert` | apenas administradores podem reconhecer alertas de manutencao | `supabase/migrations/20260726172747_7190253e-386d-4d99-a373-996787d3b767.sql` |
| `acknowledge_maintenance_alert` | alerta % nao encontrado | `supabase/migrations/20260726172747_7190253e-386d-4d99-a373-996787d3b767.sql` |
| `evaluate_relay_redelivery` | apenas administradores podem executar evaluate_relay_redelivery | `supabase/migrations/20260726182514_daa52b02-2cd7-469b-9ca2-1e3ac235b3b3.sql` |
| `collab_governance_audit_immutable` | collab_governance_audit is append-only (attempted %) | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `collab_set_membership_status` | not_network_owner | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `collab_set_membership_status` | membership_not_found | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `collab_set_membership_status` | owner_membership_immutable | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `collab_set_membership_status` | illegal_transition | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `collab_remove_membership` | not_network_owner | `supabase/migrations/20260726205221_6c93b00d-3154-4cd6-b5d5-f012fa2ee90a.sql` |
| `collab_remove_membership` | membership_not_found | `supabase/migrations/20260726205221_6c93b00d-3154-4cd6-b5d5-f012fa2ee90a.sql` |
| `collab_remove_membership` | owner_membership_immutable | `supabase/migrations/20260726205221_6c93b00d-3154-4cd6-b5d5-f012fa2ee90a.sql` |
| `collab_revoke_invite` | not_network_owner | `supabase/migrations/20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql` |
| `collab_revoke_invite` | not_network_owner | `supabase/migrations/20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql` |
| `collab_revoke_invite` | invite_not_pending | `supabase/migrations/20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql` |
| `collab_invite_org` | not_network_owner | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | target_is_owner | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | already_member | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | invite_already_pending | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | ttl_out_of_range | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | network_invite_quota | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | org_invite_quota | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | reinvite_cooldown | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_invite_org` | reinvite_cooldown | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `collab_respond_invite` | not_invited_org | `supabase/migrations/20260726205626_1ccf676a-76cb-43ae-be5c-072dc7bc1c07.sql` |
| `collab_respond_invite` | invite_expired | `supabase/migrations/20260726205626_1ccf676a-76cb-43ae-be5c-072dc7bc1c07.sql` |
| `collab_respond_invite` | invite_not_pending | `supabase/migrations/20260726205626_1ccf676a-76cb-43ae-be5c-072dc7bc1c07.sql` |
| `collab_mark_notifications_read` | collab_notifications:not_authenticated | `supabase/migrations/20260726211231_7178e6d5-c1d4-448f-afe8-dbb7dc7f7702.sql` |
| `collab_silences_validate` | collab_silence:silence_no_valid_kind | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_silences_validate` | collab_silence:silence_requires_deadline | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_silences_validate` | collab_silence:silence_deadline_too_far | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:not_authenticated | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:not_a_member | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:silence_no_valid_kind | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:silence_requires_deadline | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:silence_deadline_in_past | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_set_notification_silence` | collab_silence:silence_deadline_too_far | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `collab_clear_notification_silence` | collab_silence:not_authenticated | `supabase/migrations/20260726212442_5f3237a5-ac30-4a61-a5e6-c71cbaeb3a1b.sql` |
| `healing_arbiter_invariants` | forbidden | `supabase/migrations/20260726224034_977837ef-2fce-4bf0-8cd4-37b0340380e4.sql` |
| `block_capability_audit_mutation` | user_capability_grant_audit é imutável (tentativa de %) | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | não autenticado | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | actor_missing_capability | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | self_grant | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | invalid_effect | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | unknown_capability | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | reason_required | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | expiry_required | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | expiry_in_past | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | expiry_too_far | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | escalation | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | redundant_grant | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | ineffective_deny | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `grant_capability` | ineffective_deny | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `revoke_capability_grant` | não autenticado | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `revoke_capability_grant` | actor_missing_capability | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `revoke_capability_grant` | not_found | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `block_io_actuation_log_mutation` | io_actuation_log e imutavel: % nao permitido | `supabase/migrations/20260727212728_6ef1f88c-6b8c-43cb-aefe-2d8c78fe21d8.sql` |
| `block_onvif_event_mutation` | onvif_event_deliveries é append-only (tentativa de %) | `supabase/migrations/20260727214637_2f1be4d1-1fe0-41f2-95a0-a4d2ef9f6d4c.sql` |
| `evidence_canonical_segment` | segmento não é objeto | `supabase/migrations/20260727221631_af491bad-8bef-4e74-809f-0d5858cf529f.sql` |
| `evidence_canonical_segment` | segmento sem campo numérico % | `supabase/migrations/20260727221631_af491bad-8bef-4e74-809f-0d5858cf529f.sql` |
| `evidence_canonical_segment` | campo % não é inteiro (%) | `supabase/migrations/20260727221631_af491bad-8bef-4e74-809f-0d5858cf529f.sql` |
| `evidence_canonical_segment` | segmento sem campo textual % | `supabase/migrations/20260727221631_af491bad-8bef-4e74-809f-0d5858cf529f.sql` |
| `block_evidence_export_mutation` | evidence_exports é imutável: emita nova exportação em vez de editar (%). | `supabase/migrations/20260727221631_af491bad-8bef-4e74-809f-0d5858cf529f.sql` |
| `evidence_chain` | segments não é lista | `supabase/migrations/20260727221747_dc9cb65a-45de-49ab-a7e3-cdc7c57caef2.sql` |
| `evidence_exports_seal` | manifesto ausente ou malformado | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | versão de manifesto não suportada: % | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | selo (rootHash) ausente ou fora do formato | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | exportação sem autor não pode ser selada | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | manifesto sem exportId | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | veredito ausente ou desconhecido no manifesto | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | segments não é lista | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | corrente tem % elo(s) para % segmento(s) | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | corrente não confere a partir do segmento % (elo declarado % ≠ recalculado %) | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | autor do manifesto (%) difere do usuário autenticado | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `evidence_exports_seal` | exportação precisa de dono | `supabase/migrations/20260727221919_8ab315c0-208d-4b21-a759-627f995a5530.sql` |
| `enforce_alert_transition` | transição de alarme inválida: % -> % | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | encerramento de alarme exige autor | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | encerramento de alarme exige motivo | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | encerramento de alarme exige código de desfecho | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | código % não vale para resolução | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | código % não vale para descarte | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `enforce_alert_transition` | reconhecimento de alarme exige autor | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | autenticação obrigatória | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | alarme não encontrado | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | sem acesso a este alarme | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | reabertura exige perfil de administração | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | ação de tratativa desconhecida: % | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `treat_event_alert` | código de desfecho inválido: % | `supabase/migrations/20260728103928_b84bed79-1b05-48cb-bde5-1161fec57bbe.sql` |
| `block_alert_treatment_mutation` | event_alert_treatments é imutável (append-only) | `supabase/migrations/20260728104049_0318e907-5b12-4dda-a207-84b7ed93f53c.sql` |
| `block_alert_treatment_mutation` | event_alert_treatments é imutável (append-only) | `supabase/migrations/20260728104049_0318e907-5b12-4dda-a207-84b7ed93f53c.sql` |
| `record_alarm_episode_open` | autenticação obrigatória | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `record_alarm_episode_open` | sem acesso a esta organização | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `record_alarm_episode_open` | carimbo anterior ao último aceito | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `record_alarm_episode_close` | autenticação obrigatória | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `record_alarm_episode_close` | sem acesso a esta organização | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `assess_alarm_recurrence` | sem acesso a esta organização | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `list_alarm_recurrence_series` | sem acesso a esta organização | `supabase/migrations/20260728112448_c4e752d0-f6b4-442f-a23a-d2149d518cf9.sql` |
| `block_retention_run_mutation` | % é imutável (append-only) | `supabase/migrations/20260728113255_55a06d58-5b6e-46d8-9b28-3a9cb31930c2.sql` |
| `block_alarm_recurrence_mutation` | alarm_recurrence_episodes é imutável (append-only) | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | episódio aberto nunca é expurgado | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | episódio já encerrado não pode ser alterado | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | somente o encerramento do episódio pode ser gravado | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | atualização precisa encerrar o episódio | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | encerramento antes da abertura | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `block_alarm_recurrence_mutation` | procedência de encerramento desconhecida | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `reconcile_abandoned_episodes` | autenticação obrigatória | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `reconcile_abandoned_episodes` | sem permissão para reconciliar episódios | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |
| `enforce_monitor_group_quota` | Limite de 24 visualizações favoritas por usuário atingido | `supabase/migrations/20260728125024_0c5c72f7-58ba-4a01-bee7-adaf00b2b206.sql` |
| `enforce_monitor_group_slot_limit` | Grupo já contém o máximo de 32 câmeras | `supabase/migrations/20260728125024_0c5c72f7-58ba-4a01-bee7-adaf00b2b206.sql` |
| `enforce_monitor_group_ownership` | Slot não pertence ao dono do grupo de monitoramento | `supabase/migrations/20260728125024_0c5c72f7-58ba-4a01-bee7-adaf00b2b206.sql` |
| `block_device_audit_mutation` | device_registration_audit é imutável (append-only) | `supabase/migrations/20260728130721_101d2f32-8576-4a97-9e04-822f32a0a7d3.sql` |
| `enforce_device_registration_rules` | dispositivo revogado não pode ser reativado (%). | `supabase/migrations/20260728130721_101d2f32-8576-4a97-9e04-822f32a0a7d3.sql` |
| `enforce_device_registration_rules` | device_code é imutável | `supabase/migrations/20260728130721_101d2f32-8576-4a97-9e04-822f32a0a7d3.sql` |
| `enforce_device_registration_rules` | secret_version não pode retroceder (% -> %) | `supabase/migrations/20260728130721_101d2f32-8576-4a97-9e04-822f32a0a7d3.sql` |
| `enroll_device` | autenticação obrigatória | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `enroll_device` | rótulo do dispositivo é obrigatório | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `enroll_device` | prazo inválido | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `enroll_device` | não foi possível gerar código único | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `rotate_device_secret` | autenticação obrigatória | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `rotate_device_secret` | dispositivo não encontrado | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `rotate_device_secret` | dispositivo revogado não pode rotacionar segredo | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `revoke_device` | autenticação obrigatória | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `revoke_device` | dispositivo não encontrado | `supabase/migrations/20260728130810_c119f856-27e9-4491-8a30-9345abdc4291.sql` |
| `device_remote_command_selftest` | selftest-rollback % | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `device_remote_command_delivery_selftest` | selftest-rollback % | `supabase/migrations/20260728134817_cc353891-a3d5-42e2-bbf5-d37fdaf0d844.sql` |
| `guard_device_remote_command` | comando não pertence ao dono do registro | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | comando precisa de prazo futuro | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | prazo acima do teto de 30 minutos | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | comando nasce na fila, nunca já resolvido | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | comando nasce sem histórico de entrega | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | comando nasce sem autoria de encerramento | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | comando encerrado não muda de estado | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | campos de identidade do comando são imutáveis | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | contagem de entregas não regride | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | autoria de encerramento é imutável | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | transição inválida: % -> % | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | entrega exige carimbo de hora e contagem | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | laudo só existe sobre ordem entregue | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | varredura não inventa laudo do equipamento | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | laudo só existe sobre ordem entregue e com carimbo | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `guard_device_remote_command` | autoria do equipamento exige laudo carimbado | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `device_remote_command_sweep_selftest` | selftest-rollback % | `supabase/migrations/20260728141046_26d6d180-d01a-4ccc-b565-d1ab37165d59.sql` |
| `enforce_timeline_attestation` | documento_invalido: o atestado precisa ser um objeto JSON | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | formato_desconhecido: % | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | selo_divergente: coluna e documento discordam do rootHash | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | identificador_divergente: coluna e documento discordam do attestationId | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | veredito_forjado: documento declara % mas o conteudo produz % | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | janela_invertida: fim anterior ao inicio | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | resumo_divergente: stats.stays nao confere com a lista de permanencias | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_timeline_attestation` | resumo_divergente: confirmadas acima do total | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `block_timeline_attestation_mutation` | atestado_imutavel: registro probatorio nao pode ser alterado nem removido | `supabase/migrations/20260728161423_30d9e149-3627-49e4-85bf-a254dda65d41.sql` |
| `enforce_alarm_scheme_rules` | alarm_scheme_channel_budget_exceeded: % canais (exibidos + gravados) excedem o teto de 36 por evento | `supabase/migrations/20260728202332_b5122d9f-eb09-40ea-b6ce-0b3241356e68.sql` |
| `enforce_alarm_scheme_rules` | alarm_scheme_face_library_required: "Face reconhecida" exige exatamente uma biblioteca de faces | `supabase/migrations/20260728202332_b5122d9f-eb09-40ea-b6ce-0b3241356e68.sql` |
| `enforce_alarm_scheme_rules` | alarm_scheme_schedule_invalid: % | `supabase/migrations/20260728202332_b5122d9f-eb09-40ea-b6ce-0b3241356e68.sql` |
| `block_admission_ledger_mutation` | admission_ledger_windows é append-only (operação: %) | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `admission_reconcile_cooldown` | cadencia invalida para cooldown: % | `supabase/migrations/20260728220009_6f6f2266-2f7b-4c85-a1ba-77ef0c107960.sql` |
| `block_reconcile_snapshot_mutation` | admission_reconcile_snapshots é append-only (% recusado) | `supabase/migrations/20260728221148_d1e46a1a-e9cd-4bb8-a86d-875804100f02.sql` |
| `admission_orphan_trend` | apenas administradores podem ler a tendência de órfão | `supabase/migrations/20260728221148_d1e46a1a-e9cd-4bb8-a86d-875804100f02.sql` |
| `admission_trend_cooldown` | cadencia invalida para cooldown: % | `supabase/migrations/20260728221817_40ddd631-d738-47a4-a38d-75fa95a6ad6b.sql` |
| `block_dispatch_suppression_mutation` | maintenance_dispatch_suppressions e append-only (% recusado) | `supabase/migrations/20260729145038_6e687a03-21d4-4f28-8f18-f6fcf754b503.sql` |
| `maintenance_suppression_ledger` | apenas administradores podem ler a trilha de supressao | `supabase/migrations/20260729145038_6e687a03-21d4-4f28-8f18-f6fcf754b503.sql` |
| `maintenance_suppression_selftest` | apenas administradores | `supabase/migrations/20260729145038_6e687a03-21d4-4f28-8f18-f6fcf754b503.sql` |
| `get_retention_overview` | permission denied | `supabase/migrations/20260729153347_9020ec62-cc46-45df-876a-1b54dbd11d82.sql` |
| `block_dispatch_run_mutation` | maintenance_dispatch_runs e append-only (tentativa de %) | `supabase/migrations/20260729154724_c83ef0d3-2399-4478-a5d5-eecb43e63785.sql` |
| `deliverability_cooldown` | cadencia invalida para cooldown: % | `supabase/migrations/20260729155838_a9f41c5a-17d3-4ecd-9208-d1776d6ed4fe.sql` |
| `promise_window_minutes` | cadência inválida para janela de promessa: % | `supabase/migrations/20260729160626_a67d96e8-a2c2-42bd-9d5a-dd7e1edb9bf6.sql` |
| `acknowledgement_decay_selftest` | rollback-proposital | `supabase/migrations/20260729160727_f182a1bd-79c7-4399-81e4-4143c7bb00b2.sql` |
| `escalation_decay_selftest` | rollback-selftest | `supabase/migrations/20260729161919_00bc1ea4-b469-4a82-8c5e-ec1a06bcbcad.sql` |
| `_migrate_read_sql` | read_only_violation: only SELECT/WITH allowed | `supabase/migrations/20260731144805_38b87846-b2f6-4a1d-b598-592a1bee9de6.sql` |
| `_migrate_read_sql` | multi_statement_not_allowed | `supabase/migrations/20260731144805_38b87846-b2f6-4a1d-b598-592a1bee9de6.sql` |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `analysis_sessions` | `status` | `idle`, `running`, `paused`, `error`, `stopped`, `scheduled` | `idle` |
| `video_clips` | `status` | `completed`, `failed`, `processing`, `recording` | `recording` |
| `cameras` | `status` | `online`, `offline`, `alert`, `warning` | `offline` |
| `recording_sessions` | `status` | **livre (sem enum/CHECK)** | `recording` |
| `stream_recordings` | `status` | `high`, `low`, `medium`, `mkv`, `mp4`, `recording`, `ultra`, `webm` | `recording` |
| `stream_stats` | `connection_status` | `disconnected`, `connecting`, `connected`, `playing`, `buffering`, `paused`, `error`, `reconnecting` |  |
| `rule_executions` | `status` | **livre (sem enum/CHECK)** | `success` |
| `arm_disarm_states` | `state` | `armed`, `disarmed`, `scheduled` | `disarmed` |
| `plate_detections` | `status` | **livre (sem enum/CHECK)** | `unknown` |
| `event_alerts` | `status` | `open`, `acknowledged`, `resolved`, `dismissed` | `open` |
| `api_usage_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `media_assets` | `restore_status` | `none`, `in_progress`, `available`, `expired` | `none` |
| `storage_tiering_runs` | `status` | `failed`, `noop`, `skipped_cb`, `skipped_lock`, `started`, `success`, `timeout` |  |
| `alertmanager_silences_audit` | `status` | `error`, `ok` |  |
| `camera_schedules` | `last_status` | `error`, `ok`, `skipped` |  |
| `camera_schedule_runs` | `status` | `error`, `ok`, `skipped` |  |
| `timelapse_videos` | `status` | `failed`, `pending`, `ready`, `rendering`, `skipped` | `pending` |
| `stream_health_checks` | `status` | `fail`, `ok` |  |
| `camera_health_state` | `state` | `degraded`, `offline`, `online`, `unknown` | `unknown` |
| `camera_health_state` | `last_state_change_at` | **livre (sem enum/CHECK)** | `now` |
| `rtsp_revalidation_schedules` | `last_status` | **livre (sem enum/CHECK)** |  |
| `wizard_telemetry` | `step` | **livre (sem enum/CHECK)** |  |
| `local_agents` | `status` | `active`, `revoked` | `active` |
| `agent_relay_tasks` | `status` | `done`, `expired`, `failed`, `in_progress`, `pending` | `pending` |
| `edge_function_error_audit` | `http_status` | **livre (sem enum/CHECK)** |  |
| `ptz_connection_attempts` | `http_status` | **livre (sem enum/CHECK)** | `0` |
| `nvr_recording_downloads` | `status` | `canceled`, `completed`, `downloading`, `failed`, `listing`, `pending` | `pending` |
| `nvr_recording_downloads` | `conversion_status` | **livre (sem enum/CHECK)** |  |
| `ptz_preflight_runs` | `status_supported` | **livre (sem enum/CHECK)** | `false` |
| `notification_dispatches` | `status` | `pending`, `sent`, `skipped`, `failed` | `pending` |
| `maintenance_alert_dispatches` | `status` | `failed`, `sent`, `skipped` |  |
| `camera_ingest_endpoints` | `status` | `idle`, `pending`, `publishing`, `revoked` | `pending` |
| `monitoring_center_dispatches` | `status` | `claimed`, `delivered`, `expired`, `failed`, `pending` | `pending` |
| `collab_memberships` | `status` | `active`, `pending`, `suspended` | `pending` |
| `collab_invitations` | `status` | `accepted`, `declined`, `expired`, `pending`, `revoked` | `pending` |
| `camera_io_ports` | `idle_state` | `closed`, `open` | `open` |
| `camera_io_ports` | `last_state` | `active`, `inactive`, `unknown` |  |
| `onvif_event_subscriptions` | `status` | `active`, `backoff`, `pending`, `retired` | `pending` |
| `event_alert_treatments` | `from_status` | `open`, `acknowledged`, `resolved`, `dismissed` |  |
| `event_alert_treatments` | `to_status` | `open`, `acknowledged`, `resolved`, `dismissed` |  |
| `device_registrations` | `status` | `active`, `pending`, `revoked` | `pending` |
| `device_remote_commands` | `status` | `awaiting_presence`, `cancelled`, `completed`, `delivered`, `expired`, `failed`, `queued` | `queued` |
| `plate_detections_default` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_05` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_06` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_07` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_08` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_09` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_10` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_11` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2026_12` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2027_01` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2027_02` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_m2027_03` | `status` | **livre (sem enum/CHECK)** |  |
| `plate_detections_y2025_y2026_pre` | `status` | **livre (sem enum/CHECK)** |  |

### E.2 Mapas de transição declarados no código

- **transition** (`src/components/ui/AnimatedTransition.tsx`):
  ```ts
  duration: 0.35, ease: [0.4, 0, 0.2, 1]
  ```
- **crossfadeTransition** (`src/components/ui/PageTransition.tsx`):
  ```ts
  duration: 0.3, ease: [0.22, 1, 0.36, 1],
  ```
- **reducedTransition** (`src/components/ui/PageTransition.tsx`):
  ```ts
  duration: 0.15, ease: 'easeOut',
  ```
- **CSS_TRANSITIONS** (`src/constants/animations.ts`):
  ```ts
  all: `all ${ANIMATION_DURATION.normal}ms ${ANIMATION_EASING.easeInOut}`, opacity: `opacity ${ANIMATION_DURATION.fast}ms ${ANIMATION_EASING.easeOut}`, transform: `transform ${ANIMATION_DURATION.normal}ms ${ANIMATION_EASING.spring}`,
  ```
- **TRANSITION_DURATION** (`src/constants/transitions.ts`):
  ```ts
  instant: '0ms', fast: '100ms', normal: '200ms', slow: '300ms', slower: '500ms',
  ```
- **TRANSITION_TIMING** (`src/constants/transitions.ts`):
  ```ts
  linear: 'linear', ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  ```
- **TRANSITIONS** (`src/constants/transitions.ts`):
  ```ts
  default: `all ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.easeInOut}`, fast: `all ${TRANSITION_DURATION.fast} ${TRANSITION_TIMING.easeOut}`, slow: `all ${TRANSITION_DURATION.slow} ${TRANSITION_TIMING.easeInOut}`, opacity: `opacity ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.easeOut}`, transform: `transform ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.spring}`, colors: `background-color ${TRANSITION_DURATION.normal}, border-color ${TRANSITION_DURATION.normal}, color ${TRANSITION_DURATION.normal}`,
  ```
- **ALLOWED_FILE_TYPES** (`src/hooks/useStorage.ts`):
  ```ts
  IMAGES: ['image/jpeg', 'image/png', 'image/webp'], DOCUMENTS: [ 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ], VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
  ```
- **nextState** (`src/lib/emap/statusAlertPolicy.ts`):
  ```ts
  primed: state.primed, cameras
  ```
- **ALLOWED_MIME** (`supabase/functions/upload-media/index.ts`):
  ```ts
  snapshot: /^image\/(jpeg|png|webp)$/, clip: /^video\/(mp4|webm)$/, continuous: /^video\/(mp2t|mp4)$/,
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `DISMISS_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `REMOVE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `SKIP_WAITING` | compara | `public/sw.js` |
| `type` | `SW_UPDATED` | compara, escreve | `public/sw.js`<br>`src/main.tsx` |
| `type` | `SYNC_ACTIONS` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `SYNC_ALERTS` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `UPDATE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `abandoned_object` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `absence_detection` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `access` | compara, escreve | `src/components/dashboard/EventSimulator.tsx`<br>`src/pages/EvaluationPage.tsx`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `ack` | compara, escreve | `src/components/admin/CronStaleWatcher.tsx` |
| `type` | `activity-feed` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `after_hours_movement` | escreve | `src/data/mockRules.ts` |
| `type` | `agglomeration_detection` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `alert` | compara, escreve | `src/components/AnalysisHistoryPanel.tsx`<br>`src/components/EventTimeline.tsx`<br>`src/components/VideoPlayer.tsx`<br>`src/hooks/useRealtimeAnalysisHistory.ts`<br>`src/types/events.d.ts` |
| `type` | `alerts` | compara, escreve | `src/components/ReportsPanel.tsx`<br>`src/components/settings/SystemSettingsTab.tsx`<br>`src/components/settings/useSettingsData.ts` |
| `type` | `alerts-chart` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `alerts-list` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `all` | compara, escreve | `src/components/AlertFilters.tsx`<br>`src/components/alerts/AlertTypes.ts`<br>`src/components/alerts/alertFilterTypes.ts`<br>`src/components/alerts/filterAlerts.ts`<br>`src/components/dashboard/DashboardAlerts.tsx`<br>… +1 |
| `type` | `always` | escreve | `src/types/rules.ts` |
| `type` | `analysis` | compara, escreve | `src/components/AnalysisHistoryPanel.tsx`<br>`src/hooks/useRealtimeAnalysisHistory.ts` |
| `type` | `analytics` | compara | `src/components/ReportsPanel.tsx`<br>`src/pages/EvaluationPage.tsx` |
| `type` | `animationend` | compara | `src/components/dev/MobileMenuChecklist.tsx` |
| `type` | `anomaly` | escreve | `src/components/dashboard/EventSimulator.tsx` |
| `type` | `anomaly_displacement` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `anomaly_position` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `anomaly_speed` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `audio_detection` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `blacklist` | compara | `src/components/license-plate/PlateRegistrationForm.tsx`<br>`src/components/license-plate/VehiclesTab.tsx` |
| `type` | `bluetooth` | escreve | `src/hooks/useNetworkState.ts`<br>`src/types/browser-apis.d.ts` |
| `type` | `camera` | escreve | `src/types/events.d.ts` |
| `type` | `camera-map` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `camera_offline` | escreve | `supabase/functions/camera-health-monitor/index.ts` |
| `type` | `cameras` | compara | `src/components/ReportsPanel.tsx` |
| `type` | `cameras-grid` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `checkbox` | compara | `src/hooks/useForm.ts` |
| `type` | `close-request` | compara, escreve | `src/hooks/useDetachedMonitors.ts`<br>`src/lib/views/detachedMonitor.ts`<br>`src/pages/DetachedMonitorPage.tsx` |
| `type` | `closed` | compara, escreve | `src/hooks/useDetachedMonitors.ts`<br>`src/lib/views/detachedMonitor.ts`<br>`src/pages/DetachedMonitorPage.tsx` |
| `type` | `counting` | compara, escreve | `src/components/ZoneOverlay.tsx`<br>`src/components/zones/ZoneCard.tsx`<br>`src/components/zones/ZoneEditorSheet.tsx`<br>`src/components/zones/zonesConfig.ts`<br>`src/pages/zones/hooks/useZonesState.ts` |
| `type` | `create` | compara, escreve | `src/hooks/useOfflineSync.ts`<br>`src/lib/offlineStorage.ts` |
| `type` | `crowd_density` | compara, escreve | `src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `csp-violation` | compara, escreve | `supabase/functions/csp-report/index.ts` |
| `type` | `danger` | compara, escreve | `src/components/sidebar/components/CategoryStatusIndicator.tsx`<br>`src/components/sidebar/components/nav/CollapsedCategory.tsx`<br>`src/components/ui/ModalProvider.tsx` |
| `type` | `delete` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `device_disconnected` | compara, escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `disk_error` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `disk_full` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `dwell` | compara, escreve | `src/components/ZoneOverlay.tsx`<br>`src/components/zones/ZoneCard.tsx`<br>`src/components/zones/zonesConfig.ts` |
| `type` | `email_confirmation` | compara | `src/components/AuthCallback.tsx` |
| `type` | `external_alarm` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `face` | compara, escreve | `src/components/DetectionOverlay.tsx`<br>`src/components/ImageAnalysis.tsx` |
| `type` | `face_detected` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `face_recognition` | compara, escreve | `src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `face_recognized` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `face_unrecognized` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `heartbeat` | compara, escreve | `src/hooks/useDetachedMonitors.ts`<br>`src/lib/views/detachedMonitor.ts`<br>`src/pages/DetachedMonitorPage.tsx` |
| `type` | `history` | compara, escreve | `src/components/settings/SystemSettingsTab.tsx`<br>`src/components/settings/useSettingsData.ts` |
| `type` | `idle` | compara, escreve | `src/components/journey/useJourneyData.ts`<br>`src/pages/CollaboratorFlowMapPage.tsx`<br>`src/pages/collaborator-flow/flowTypes.ts` |
| `type` | `idle_time` | escreve | `src/data/mockRules.ts` |
| `type` | `image_url` | escreve | `supabase/functions/analyze-image/index.ts`<br>`supabase/functions/analyze-license-plate/index.ts`<br>`supabase/functions/compare-faces/index.ts`<br>`supabase/functions/detect-behavior/index.ts`<br>`supabase/functions/detect-faces/index.ts`<br>… +2 |
| `type` | `info` | compara, escreve | `src/components/sidebar/components/nav/CollapsedCategory.tsx`<br>`src/components/ui/NotificationCenter.tsx` |
| `type` | `intrusion` | compara, escreve | `src/components/AlertTrendsChart.tsx`<br>`src/data/mockData.ts`<br>`src/lib/alarms/alarmScheme.ts` |
| `type` | `intrusion_ai` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `json_object` | escreve | `supabase/functions/analyze-image/index.ts`<br>`supabase/functions/compare-faces/index.ts`<br>`supabase/functions/detect-behavior/index.ts`<br>`supabase/functions/detect-faces/index.ts`<br>`supabase/functions/generate-face-encoding/index.ts`<br>… +1 |
| `type` | `layout-shift` | escreve | `src/lib/clsMonitor.ts` |
| `type` | `loitering` | compara, escreve | `src/data/mockRules.ts`<br>`src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `missing_object` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `motion` | compara, escreve | `src/components/EventTimeline.tsx`<br>`src/components/VideoPlayer.tsx` |
| `type` | `motion_detection` | compara, escreve | `src/components/automation/RuleFormDialog.tsx`<br>`src/data/ruleTemplates.ts`<br>`src/lib/alarms/alarmScheme.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `multi` | compara | `src/components/ui/bottom-sheet/FilterBottomSheet.tsx` |
| `type` | `neutral` | compara, escreve | `src/components/sidebar/components/AnimatedCategoryIcon.tsx`<br>`src/components/sidebar/components/nav/CategoryItem.tsx`<br>`src/components/sidebar/components/nav/CollapsedCategory.tsx` |
| `type` | `no_ppe` | compara, escreve | `src/data/mockRules.ts`<br>`src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `object_left` | compara, escreve | `src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `occupancy` | compara, escreve | `src/components/ZoneOverlay.tsx`<br>`src/components/zones/ZoneCard.tsx`<br>`src/components/zones/zonesConfig.ts` |
| `type` | `offline` | compara, escreve | `supabase/functions/camera-health-monitor/index.ts` |
| `type` | `operations` | escreve | `src/components/dashboard/EventSimulator.tsx`<br>`src/hooks/analysis/useThresholdChecker.ts` |
| `type` | `panic` | compara | `src/components/AlertCard.tsx` |
| `type` | `parking` | escreve | `src/components/zones/zonesConfig.ts` |
| `type` | `people-count` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `people_count` | compara, escreve | `src/components/RuleEditor.tsx`<br>`src/data/mockRules.ts`<br>`src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `perimeter_breach` | compara, escreve | `src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `person` | compara, escreve | `src/components/EventTimeline.tsx`<br>`src/components/ImageAnalysis.tsx`<br>`src/components/VideoPlayer.tsx`<br>`src/components/video-player/types.ts`<br>`src/hooks/useImageAnalysis.ts`<br>… +2 |
| `type` | `plate` | compara | `src/components/ImageAnalysis.tsx` |
| `type` | `plate_allowed` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `plate_denied` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `plate_read` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `productive` | compara, escreve | `src/components/journey/ZoneBreakdown.tsx`<br>`src/components/journey/useJourneyData.ts`<br>`src/pages/CollaboratorFlowMapPage.tsx`<br>`src/pages/collaborator-flow/flowTypes.ts` |
| `type` | `productivity` | compara, escreve | `src/components/AlertTrendsChart.tsx`<br>`src/data/mockData.ts` |
| `type` | `quick-actions` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `range` | compara | `src/components/ui/bottom-sheet/FilterBottomSheet.tsx` |
| `type` | `recognition` | compara | `src/components/ReportsPanel.tsx` |
| `type` | `recovery` | compara | `src/components/AuthCallback.tsx` |
| `type` | `recurrent_vehicle` | escreve | `src/data/ruleTemplates.ts` |
| `type` | `resource` | escreve | `src/lib/perfMetrics.ts` |
| `type` | `restricted` | compara, escreve, filtra | `src/components/zones/ZoneCard.tsx`<br>`src/components/zones/zonesConfig.ts`<br>`src/hooks/zone-detection/useZoneEventCreator.ts`<br>`src/pages/CollaboratorFlowMapPage.tsx`<br>`src/pages/zones/hooks/useZonesState.ts`<br>… +1 |
| `type` | `restricted_area` | compara, escreve | `src/data/mockRules.ts`<br>`src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `safe` | filtra | `supabase/functions/process-frame/index.ts` |
| `type` | `safety` | compara, escreve | `src/components/AlertTrendsChart.tsx`<br>`src/components/cameras/CameraSetupWizard.tsx`<br>`src/components/dashboard/EventSimulator.tsx`<br>`src/components/zones/ZoneCard.tsx`<br>`src/components/zones/zonesConfig.ts`<br>… +4 |
| `type` | `scene_change` | escreve | `src/data/ruleTemplates.ts`<br>`src/lib/alarms/alarmScheme.ts` |
| `type` | `security` | compara, escreve | `src/components/AlertNotification.tsx`<br>`src/components/AlertTrendsChart.tsx`<br>`src/components/EventTimeline.tsx`<br>`src/components/dashboard/EventSimulator.tsx`<br>`src/components/notification-settings/useNotificationConfig.ts`<br>… +8 |
| `type` | `seek` | escreve | `src/types/file-system-access.d.ts` |
| `type` | `signup` | compara | `src/components/AuthCallback.tsx` |
| `type` | `single` | compara, escreve | `src/components/ui/bottom-sheet/FilterBottomSheet.tsx` |
| `type` | `spring` | escreve | `src/components/BottomNavigation.tsx`<br>`src/components/settings/GeneralSettingsTab.tsx`<br>`src/components/sidebar/components/AnimatedCategoryIcon.tsx`<br>`src/components/sidebar/components/CategoryStatusIndicator.tsx`<br>`src/components/sidebar/components/nav/CategoryItem.tsx`<br>… +13 |
| `type` | `stats-overview` | compara, escreve | `src/components/widgets/WidgetRenderer.stories.tsx`<br>`src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `stream_critical` | escreve | `supabase/functions/validate-rtsp-stream/criticalAlert.ts` |
| `type` | `string` | compara | `public/sw.js`<br>`src/lib/alarms/alarmScheme.ts` |
| `type` | `success` | compara, escreve | `src/components/sidebar/components/nav/CollapsedCategory.tsx`<br>`src/components/sidebar/config/categories.ts`<br>`src/components/sidebar/types.ts`<br>`src/contexts/NotificationContext.tsx`<br>`src/stores/notificationStore.ts` |
| `type` | `suggestion` | escreve | `eslint-rules/no-hardcoded-colors.js` |
| `type` | `summary` | compara, escreve | `src/components/ReportsPanel.tsx`<br>`src/lib/pdfGenerator.ts`<br>`src/lib/streamQualityReport.ts`<br>`src/pages/WeeklyReportPage.tsx` |
| `type` | `system-health` | compara, escreve | `src/components/widgets/WidgetRenderer.tsx`<br>`src/types/widgets.ts` |
| `type` | `table` | compara, escreve | `src/components/ReportsPanel.tsx`<br>`src/lib/pdfGenerator.ts`<br>`src/lib/streamQualityReport.ts`<br>`src/pages/WeeklyReportPage.tsx` |
| `type` | `tampering` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `test` | escreve | `src/hooks/useNotifications.ts` |
| `type` | `text` | compara, escreve | `src/components/ReportsPanel.tsx`<br>`src/lib/pdfGenerator.ts`<br>`src/lib/streamQualityReport.ts`<br>`supabase/functions/analyze-image/index.ts`<br>`supabase/functions/analyze-license-plate/index.ts`<br>… +5 |
| `type` | `tipo` | escreve | `src/pages/AlertsPage.tsx` |
| `type` | `transit` | escreve | `src/pages/collaborator-flow/flowTypes.ts` |
| `type` | `tripwire` | compara, escreve | `src/components/zones/ZoneCard.tsx`<br>`src/components/zones/zonesConfig.ts`<br>`src/lib/alarms/alarmScheme.ts`<br>`src/pages/zones/hooks/useZonesState.ts` |
| `type` | `tripwire_ai` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `truncate` | escreve | `src/types/file-system-access.d.ts` |
| `type` | `udp4` | escreve | `agent/src/discover.ts` |
| `type` | `unauthorized_access` | escreve | `src/data/mockRules.ts` |
| `type` | `update` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `vehicle` | compara | `src/components/ImageAnalysis.tsx` |
| `type` | `vehicle_detection` | compara, escreve | `src/data/ruleTemplates.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `type` | `video` | compara, escreve | `src/components/thumbnail/Thumbnail.tsx`<br>`src/stores/mediaStore.ts`<br>`src/stores/recordingStore.ts` |
| `type` | `video_loss` | escreve | `src/lib/alarms/alarmScheme.ts` |
| `type` | `visitor` | compara | `src/components/license-plate/PlateRegistrationForm.tsx` |
| `type` | `warning` | compara | `src/components/sidebar/components/nav/CollapsedCategory.tsx` |
| `type` | `whitelist` | compara | `src/components/license-plate/PlateRegistrationForm.tsx`<br>`src/components/license-plate/VehiclesTab.tsx` |
| `type` | `window` | escreve | `public/sw.js` |
| `type` | `write` | escreve | `src/types/file-system-access.d.ts` |
| `type` | `zones` | compara, escreve | `src/components/settings/SystemSettingsTab.tsx`<br>`src/components/settings/useSettingsData.ts` |
| `state` | `HALF_OPEN` | compara | `src/lib/resilience.ts` |
| `state` | `OPEN` | compara | `src/lib/resilience.ts` |
| `state` | `active` | compara, escreve | `src/components/admin/AlertmanagerSilencesCard.tsx`<br>`src/components/admin/SessionWatchdogCard.tsx`<br>`src/components/permissions/CapabilityGrantsCard.tsx`<br>`src/lib/alarms/alarmAggregation.ts` |
| `state` | `armed` | compara, escreve | `src/components/ArmDisarmControl.tsx`<br>`src/components/alarms/ArmedNowBadge.tsx`<br>`src/hooks/useArmDisarm.ts`<br>`src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts`<br>… +1 |
| `state` | `armed_degraded` | compara | `src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts` |
| `state` | `at_risk` | compara | `src/components/maintenance/MaintenanceAlertsCard.tsx`<br>`src/lib/maintenance/ownerAging.ts` |
| `state` | `awaiting_first_contact` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `breached` | compara | `src/components/maintenance/MaintenanceAlertsCard.tsx`<br>`src/lib/emap/shiftPerformance.ts`<br>`src/lib/emap/triageEscalation.ts`<br>`src/lib/maintenance/ownerAging.ts` |
| `state` | `checking` | compara, escreve | `src/components/evidence/EvidenceExportsTable.tsx`<br>`src/lib/evidence/exportRegistryView.ts` |
| `state` | `clear` | compara | `src/lib/alarms/alarmAggregation.ts` |
| `state` | `clock_anomaly` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `closed` | compara, escreve | `src/components/dev/MobileMenuChecklist.tsx`<br>`supabase/functions/_shared/circuitBreaker.ts` |
| `state` | `collapsed` | compara | `src/components/ui/sidebar.tsx` |
| `state` | `deaf` | compara | `src/lib/devices/commandReliability.ts` |
| `state` | `degraded` | compara | `src/components/admin/CameraHealthCard.tsx`<br>`src/pages/CameraFleetHealthPage.tsx` |
| `state` | `disarmed` | escreve | `src/hooks/useArmDisarm.ts`<br>`src/pages/NvrDetailPage.tsx` |
| `state` | `due_soon` | compara | `src/lib/emap/shiftPerformance.ts` |
| `state` | `enrollment_lapsed` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `escalation_breaks` | compara | `src/lib/maintenance/conditionSilence.ts` |
| `state` | `expanded` | escreve | `src/components/ui/sidebar.tsx` |
| `state` | `expected_silence` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `expired` | compara, escreve | `src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `state` | `fail` | compara | `src/components/dev/MobileMenuChecklist.tsx` |
| `state` | `failing` | compara | `src/lib/devices/commandReliability.ts` |
| `state` | `granted` | escreve | `src/types/browser-apis.d.ts` |
| `state` | `half-open` | compara | `supabase/functions/_shared/circuitBreaker.ts` |
| `state` | `healthy` | compara | `src/lib/devices/commandReliability.ts` |
| `state` | `honored` | compara, escreve | `src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `state` | `idle` | compara, escreve | `src/components/clip-recorder/CompactClipControls.tsx`<br>`src/components/clip-recorder/FullClipControls.tsx`<br>`src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts`<br>`src/lib/maintenance/ownerAging.ts` |
| `state` | `inactive` | compara | `src/components/ClipRecorderControls.tsx` |
| `state` | `indeterminate` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `state` | `inoperative` | compara, escreve | `src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts`<br>`src/lib/alarms/eventAdmission.ts` |
| `state` | `installed` | compara | `src/main.tsx` |
| `state` | `insufficient_evidence` | compara, escreve | `src/lib/devices/commandReliability.ts` |
| `state` | `intact` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `state` | `late` | compara | `src/lib/emap/shiftPerformance.ts` |
| `state` | `met` | compara | `src/lib/emap/shiftPerformance.ts` |
| `state` | `missing` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `state` | `none` | compara, escreve | `src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `state` | `not_applicable` | compara, escreve | `src/components/emap/TriageQueuePanel.tsx`<br>`src/lib/emap/triageSla.ts` |
| `state` | `object` | compara | `src/lib/alarms/alarmAggregation.ts`<br>`src/lib/alarms/alarmEpisodeBridge.ts` |
| `state` | `off` | compara, escreve | `src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts` |
| `state` | `offline` | compara | `src/components/admin/CameraHealthCard.tsx`<br>`src/pages/CameraFleetHealthPage.tsx` |
| `state` | `ok` | compara, escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `online` | compara, escreve | `src/components/admin/CameraHealthCard.tsx`<br>`src/pages/CameraFleetHealthPage.tsx`<br>`supabase/functions/camera-health-monitor/index.ts` |
| `state` | `open` | compara | `src/components/dev/MobileMenuChecklist.tsx`<br>`src/components/maintenance/ChronicSeriesCard.tsx`<br>`supabase/functions/_shared/circuitBreaker.ts` |
| `state` | `pass` | compara | `src/components/dev/MobileMenuChecklist.tsx` |
| `state` | `paused` | compara | `src/components/ClipRecorderControls.tsx`<br>`src/components/clip-recorder/CompactClipControls.tsx`<br>`src/components/clip-recorder/FullClipControls.tsx` |
| `state` | `pending` | compara, escreve | `src/components/dev/MobileMenuChecklist.tsx`<br>`src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `state` | `processing` | compara | `src/components/clip-recorder/CompactClipControls.tsx`<br>`src/components/clip-recorder/FullClipControls.tsx` |
| `state` | `quiet` | compara | `src/components/maintenance/ChronicSeriesCard.tsx` |
| `state` | `recording` | compara | `src/components/ClipRecorderControls.tsx`<br>`src/components/clip-recorder/CompactClipControls.tsx`<br>`src/components/clip-recorder/FullClipControls.tsx` |
| `state` | `rejected_presence` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `rotation_grace` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `saved` | compara | `src/components/clip-recorder/CompactClipControls.tsx`<br>`src/components/clip-recorder/FullClipControls.tsx` |
| `state` | `scheduled` | compara | `src/components/ArmDisarmControl.tsx` |
| `state` | `settling` | compara | `src/components/maintenance/ChronicSeriesCard.tsx` |
| `state` | `silenced` | compara | `src/components/maintenance/MaintenanceAlertsCard.tsx`<br>`src/lib/maintenance/conditionSilence.ts` |
| `state` | `silent_critical` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `silent_warn` | escreve | `src/lib/devices/deviceSilence.ts` |
| `state` | `string` | compara | `src/lib/emap/triageSla.ts` |
| `state` | `suspect` | compara | `src/lib/devices/commandReliability.ts` |
| `state` | `suspended` | compara | `src/lib/alertSounds.ts` |
| `state` | `tampered` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `state` | `unknown` | compara, escreve | `src/components/maintenance/ChronicSeriesCard.tsx`<br>`src/lib/alarms/alarmAggregation.ts`<br>`src/lib/alarms/armedNow.ts`<br>`src/lib/alarms/armedRoster.ts`<br>`src/lib/alarms/chronicSeriesBoard.ts`<br>… +1 |
| `state` | `unverified` | escreve | `src/lib/evidence/exportRegistryView.ts` |
| `state` | `void_aggravated` | compara, escreve | `src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `state` | `void_unattributed` | compara, escreve | `src/lib/maintenance/acknowledgementDecay.ts`<br>`src/lib/maintenance/escalationAckGate.ts` |
| `status` | `CHANNEL_ERROR` | compara | `src/pages/NvrDetailPage.tsx` |
| `status` | `CLOSED` | compara | `src/pages/NvrDetailPage.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/pages/NvrDetailPage.tsx` |
| `status` | `TIMED_OUT` | compara | `src/pages/NvrDetailPage.tsx` |
| `status` | `absent` | escreve | `src/lib/faces/attestationConference.ts`<br>`src/pages/AttestationConferencePage.tsx` |
| `status` | `acknowledged` | compara, escreve | `src/components/maintenance/MaintenanceAlertsCard.tsx`<br>`supabase/functions/public-api/index.ts` |
| `status` | `active` | compara, escreve | `src/components/PersonCard.tsx`<br>`src/components/collab/CollabMembersCard.tsx`<br>`src/hooks/useCollabGovernance.ts`<br>`src/hooks/useDeviceRegistrations.ts`<br>`src/lib/agentHealing.ts`<br>… +6 |
| `status` | `alert` | compara, escreve | `src/components/CameraMap.tsx`<br>`src/components/Dashboard.tsx`<br>`src/components/GlobalSearch.tsx`<br>`src/components/ReportsPanel.tsx`<br>`src/components/StatusIndicator.tsx`<br>… +14 |
| `status` | `already_running` | escreve | `supabase/functions/nvr-recording-convert/index.ts` |
| `status` | `authorized` | compara, escreve | `src/components/ALPRDashboard.tsx`<br>`src/components/alpr/ALPRVehicleHistory.tsx`<br>`src/components/license-plate/PlateDetectionList.tsx`<br>`src/hooks/plate-detections/plateDetectionTypes.ts`<br>`src/hooks/usePlateDetections.ts` |
| `status` | `awaiting_presence` | compara | `src/components/devices/RemoteCommandPanel.tsx`<br>`src/lib/devices/remoteCommandDelivery.ts`<br>`supabase/functions/_shared/remoteCommandDelivery.ts` |
| `status` | `backoff` | escreve | `supabase/functions/onvif-event-puller/index.ts` |
| `status` | `blacklist` | compara | `src/components/ALPRDashboard.tsx`<br>`src/components/alpr/ALPRVehicleHistory.tsx`<br>`src/components/license-plate/PlateDetectionList.tsx`<br>`src/hooks/useFaceRecognitionAlerts.ts`<br>`src/hooks/usePlateDetections.ts` |
| `status` | `blocked` | compara | `src/components/PersonCard.tsx`<br>`src/components/person-card/PersonCardCompact.tsx` |
| `status` | `broken` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `status` | `buffering` | compara | `src/components/VideoStreamPlayer.tsx` |
| `status` | `canceled` | compara, escreve | `src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>`src/pages/NvrDownloadHistoryPage.tsx`<br>`supabase/functions/nvr-recording-download/index.ts` |
| `status` | `cancelled` | compara, escreve | `src/hooks/useRemoteCommand.ts`<br>`src/lib/devices/commandReliability.ts` |
| `status` | `captured` | compara | `src/components/WebcamCapture.tsx`<br>`src/components/webcam/useWebcam.ts` |
| `status` | `capturing` | compara | `src/components/cameras/AddCameraDialog.tsx` |
| `status` | `checking` | compara, escreve | `src/hooks/useEvidenceExports.ts`<br>`src/lib/evidence/exportRegistryView.ts` |
| `status` | `completed` | compara, escreve, filtra | `src/components/devices/RemoteCommandPanel.tsx`<br>`src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>`src/hooks/clip-recorder/useClipStorage.ts`<br>`src/hooks/useCommandReliability.ts`<br>`src/hooks/useRecording.ts`<br>… +4 |
| `status` | `connected` | escreve | `src/hooks/video-stream/useHLSConnection.ts` |
| `status` | `connecting` | compara | `src/components/VideoStreamPlayer.tsx` |
| `status` | `covered` | compara, escreve | `src/lib/alarms/admissionLedger.ts`<br>`src/lib/alarms/admissionLedgerRows.ts` |
| `status` | `critical` | compara | `src/pages/GoalsAlertsPage.tsx` |
| `status` | `delivered` | compara, escreve, filtra | `src/components/devices/RemoteCommandPanel.tsx`<br>`src/lib/devices/commandSweep.ts`<br>`src/lib/devices/remoteCommandDelivery.ts`<br>`src/lib/integrations/monitoringCenter.ts`<br>`supabase/functions/_shared/remoteCommandDelivery.ts`<br>… +1 |
| `status` | `denied` | compara | `src/components/security/AccessEventsList.tsx`<br>`src/pages/SecurityPage.tsx` |
| `status` | `detected` | compara | `src/components/ppe/PPERealtimeTab.tsx`<br>`src/hooks/usePPEDetection.ts` |
| `status` | `disconnected` | compara, escreve | `src/components/VideoStreamPlayer.tsx`<br>`src/hooks/video-stream/useStreamState.ts` |
| `status` | `done` | compara, escreve | `src/components/cameras/AddCameraDialog.tsx`<br>`src/hooks/useFirstSnapshot.ts`<br>`src/lib/relayVerdict.ts`<br>`supabase/functions/_shared/relayTransport.ts`<br>`supabase/functions/onvif-autodiscover/index.ts` |
| `status` | `downloading` | compara, escreve | `src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>`supabase/functions/nvr-recording-download/index.ts` |
| `status` | `email-confirmed` | compara | `src/components/AuthCallback.tsx` |
| `status` | `ended` | compara | `src/components/cameras/LivePreviewPlayer.tsx` |
| `status` | `error` | compara, escreve | `src/components/AuthCallback.tsx`<br>`src/components/VideoStreamPlayer.tsx`<br>`src/components/WebcamCapture.tsx`<br>`src/components/cameras/LivePreviewPlayer.tsx`<br>`src/components/cameras/RtspVariantBenchmarkCard.tsx`<br>… +7 |
| `status` | `expired` | compara, escreve | `src/lib/devices/commandReliability.ts`<br>`src/lib/integrations/monitoringCenter.ts`<br>`src/lib/relayVerdict.ts`<br>`supabase/functions/_shared/relayTransport.ts`<br>`supabase/functions/device-commands/index.ts`<br>… +1 |
| `status` | `fail` | compara, escreve | `src/components/local-agents/RelayCameraTestCard.tsx`<br>`src/hooks/useStreamHealth.ts`<br>`src/pages/CameraStatusPage.tsx`<br>`supabase/functions/camera-health-monitor/index.ts`<br>`supabase/functions/stream-health-probe/index.ts` |
| `status` | `failed` | compara, escreve | `src/components/admin/CronJobRunsCard.tsx`<br>`src/components/admin/MaintenanceDispatchCard.tsx`<br>`src/components/admin/MaintenanceEscalationCard.tsx`<br>`src/components/devices/RemoteCommandPanel.tsx`<br>`src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>… +13 |
| `status` | `found` | compara, escreve | `src/lib/faces/attestationConference.ts`<br>`src/pages/AttestationConferencePage.tsx` |
| `status` | `gap` | compara, escreve | `src/components/alarms/AdmissionCoverageCard.tsx`<br>`src/lib/alarms/admissionLedger.ts`<br>`src/lib/alarms/admissionLedgerRows.ts` |
| `status` | `granted` | compara | `src/components/security/AccessEventsList.tsx`<br>`src/pages/SecurityPage.tsx` |
| `status` | `healthy` | escreve | `supabase/functions/public-api/index.ts` |
| `status` | `idle` | compara, escreve | `src/components/cameras/LivePreviewPlayer.tsx`<br>`src/components/ptz/PtzCalibratedPresetsPanel.tsx`<br>`src/hooks/useContinuousAnalysis.ts` |
| `status` | `in_progress` | compara, filtra | `src/lib/relayLease.ts`<br>`supabase/functions/agent-ingest/index.ts` |
| `status` | `inconsistent` | compara, escreve | `src/lib/alarms/admissionPurgeHistory.ts` |
| `status` | `known` | compara, escreve | `src/hooks/useFaceRecognitionAlerts.ts` |
| `status` | `listing` | compara | `src/components/nvr-downloads/NvrDownloadJobRow.tsx` |
| `status` | `loading` | compara | `src/components/AuthCallback.tsx`<br>`src/components/WebcamCapture.tsx`<br>`src/pages/AuthCallback.tsx` |
| `status` | `missing` | compara, escreve | `src/components/ppe/PPERealtimeTab.tsx`<br>`src/hooks/usePPEDetection.ts`<br>`src/hooks/useRelayAgentHealth.ts`<br>`src/lib/evidence/exportRegistryView.ts` |
| `status` | `moving` | compara, escreve | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| `status` | `never` | compara, escreve | `src/lib/cronSchedule.ts`<br>`src/pages/OperationsPage.tsx` |
| `status` | `no_data` | compara, escreve | `src/components/alarms/AdmissionCoverageCard.tsx`<br>`src/lib/alarms/admissionLedger.ts` |
| `status` | `no_result` | compara | `src/lib/vision/processorContract.ts` |
| `status` | `noop` | escreve | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| `status` | `number` | compara | `src/providers/QueryProvider.tsx` |
| `status` | `offline` | compara, escreve | `src/components/CameraMap.tsx`<br>`src/components/Dashboard.tsx`<br>`src/components/GlobalSearch.tsx`<br>`src/components/ReportsPanel.tsx`<br>`src/components/StatusIndicator.tsx`<br>… +13 |
| `status` | `ok` | compara, escreve | `src/components/cameras/CameraTestHistoryCard.tsx`<br>`src/components/local-agents/RelayCameraTestCard.tsx`<br>`src/components/ptz/PtzCalibratedPresetsPanel.tsx`<br>`src/hooks/useStreamHealth.ts`<br>`src/lib/evidence/exportRegistryView.ts`<br>… +7 |
| `status` | `on_time` | escreve | `src/lib/cronSchedule.ts` |
| `status` | `on_track` | compara, escreve | `src/pages/GoalsAlertsPage.tsx`<br>`src/pages/goals-alerts/CollaboratorKPICard.tsx`<br>`src/pages/goals-alerts/goalsTypes.ts` |
| `status` | `online` | compara, escreve | `src/components/CameraCard.tsx`<br>`src/components/CameraMap.tsx`<br>`src/components/CameraModal.tsx`<br>`src/components/Dashboard.tsx`<br>`src/components/GlobalSearch.tsx`<br>… +22 |
| `status` | `open` | compara, escreve | `src/components/maintenance/MaintenanceAlertsCard.tsx`<br>`src/lib/maintenance/maintenanceConsoleView.ts`<br>`src/lib/maintenance/ownerAging.ts`<br>`src/lib/maintenance/ownerFilter.ts`<br>`supabase/functions/process-frame/index.ts` |
| `status` | `paused` | escreve | `src/hooks/useContinuousAnalysis.ts`<br>`src/hooks/useVideoStream.ts`<br>`src/hooks/video-stream/useStreamControls.ts` |
| `status` | `pending` | compara, escreve, filtra | `src/components/cameras/AddCameraDialog.tsx`<br>`src/components/nvr-downloads/NvrDownloadJobRow.tsx`<br>`src/hooks/useCameraIngest.ts`<br>`src/hooks/useDeviceSilence.ts`<br>`src/hooks/useFirstSnapshot.ts`<br>… +13 |
| `status` | `playing` | compara, escreve | `src/components/VideoStreamPlayer.tsx`<br>`src/components/cameras/LivePreviewPlayer.tsx`<br>`src/hooks/useVideoStream.ts`<br>`src/hooks/video-stream/useStreamControls.ts` |
| `status` | `processing` | compara | `supabase/functions/_shared/replicate.ts` |
| `status` | `queued` | compara | `src/components/devices/RemoteCommandPanel.tsx` |
| `status` | `read` | compara, escreve | `src/hooks/useNotifications.ts` |
| `status` | `ready` | compara, escreve | `src/components/WebcamCapture.tsx`<br>`src/pages/TimelapsePage.tsx`<br>`supabase/functions/resolve-media-url/index.ts` |
| `status` | `recording` | compara, escreve | `src/hooks/useRecording.ts`<br>`src/types/streaming.ts`<br>`supabase/functions/process-automation-rules/index.ts` |
| `status` | `restore_in_progress` | escreve | `supabase/functions/resolve-media-url/index.ts` |
| `status` | `restore_initiated` | escreve | `supabase/functions/resolve-media-url/index.ts` |
| `status` | `retired` | compara, escreve, filtra | `src/lib/devices/pullPointLease.ts`<br>`supabase/functions/_shared/pullPointLease.ts`<br>`supabase/functions/onvif-event-puller/index.ts` |
| `status` | `revoked` | compara, escreve | `src/components/cameras/CameraIngestPushCard.tsx`<br>`src/hooks/useCameraIngest.ts`<br>`src/lib/agentHealing.ts`<br>`src/lib/devices/deviceEnrollment.ts`<br>`src/lib/devices/deviceSilence.ts`<br>… +4 |
| `status` | `rollback` | compara, escreve | `src/components/cameras/CameraSetupWizard.tsx` |
| `status` | `running` | compara, escreve | `src/components/local-agents/RelayCameraTestCard.tsx`<br>`src/hooks/useContinuousAnalysis.ts` |
| `status` | `saving` | compara, escreve | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| `status` | `scheduled` | escreve | `src/hooks/useContinuousAnalysis.ts` |
| `status` | `sent` | compara, escreve, filtra | `src/components/admin/MaintenanceEscalationCard.tsx`<br>`src/hooks/useMaintenanceConsole.ts`<br>`src/lib/maintenance/conditionSilence.ts`<br>`src/pages/IncidentNotificationsPage.tsx`<br>`supabase/functions/_shared/maintenanceDispatchPolicy.ts`<br>… +1 |
| `status` | `skipped` | escreve | `supabase/functions/nvr-recording-convert/index.ts` |
| `status` | `skipped_cb` | escreve | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| `status` | `skipped_lock` | escreve | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| `status` | `stale` | compara | `src/components/admin/CronStaleBadge.tsx`<br>`src/components/admin/CronStaleWatcher.tsx`<br>`src/pages/OperationsPage.tsx` |
| `status` | `started` | escreve | `supabase/functions/nvr-recording-convert/index.ts` |
| `status` | `starting` | compara, escreve | `src/components/cameras/LivePreviewPlayer.tsx`<br>`supabase/functions/_shared/replicate.ts` |
| `status` | `stopped` | escreve | `src/hooks/useContinuousAnalysis.ts` |
| `status` | `string` | compara | `src/lib/alarms/alarmTreatment.ts` |
| `status` | `succeeded` | compara | `src/components/admin/CronJobRunsCard.tsx`<br>`src/pages/OperationsPage.tsx`<br>`supabase/functions/_shared/replicate.ts` |
| `status` | `success` | compara, escreve | `src/components/AuthCallback.tsx`<br>`src/components/cameras/CameraSetupWizard.tsx`<br>`src/components/cameras/RtspVariantBenchmarkCard.tsx`<br>`src/hooks/useRuleExecutions.ts`<br>`src/pages/AuthCallback.tsx`<br>… +1 |
| `status` | `suspended` | compara, escreve | `src/components/collab/CollabMembersCard.tsx`<br>`src/lib/collab/collabGovernanceView.ts` |
| `status` | `timeout` | compara | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| `status` | `transport_error` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `status` | `unauthorized` | compara | `src/components/ALPRDashboard.tsx`<br>`src/components/alpr/ALPRVehicleHistory.tsx`<br>`src/components/license-plate/PlateDetectionList.tsx` |
| `status` | `unavailable` | compara, escreve | `src/lib/faces/attestationConference.ts`<br>`src/pages/AttestationConferencePage.tsx` |
| `status` | `unhealthy` | compara, escreve | `supabase/functions/health/index.ts` |
| `status` | `unknown` | compara, escreve | `src/components/ALPRDashboard.tsx`<br>`src/components/ptz/RelayHealthWatchdog.tsx`<br>`src/hooks/ppe/usePPELocalML.ts`<br>`src/hooks/useFaceRecognitionAlerts.ts`<br>`src/hooks/useRelayAgentHealth.ts`<br>… +3 |
| `status` | `unreadable` | compara, escreve | `src/lib/alarms/admissionPurgeHistory.ts` |
| `status` | `unverified` | compara, escreve | `src/lib/evidence/exportRegistryView.ts` |
| `status` | `valid` | compara, escreve | `src/components/maintenance/AdmissionPurgeHistoryCard.tsx`<br>`src/lib/alarms/admissionBacklogAlert.ts`<br>`src/lib/alarms/admissionOrphanTrend.ts`<br>`src/lib/alarms/admissionPurgeHistory.ts`<br>`src/lib/alarms/admissionReconciliation.ts` |
| … +45 linhas — lista completa em `context.json` | | | |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| rule_category | `security`, `safety`, `operations`, `access`, `analytics` | banco |
| rule_severity | `low`, `medium`, `high`, `critical` | banco |
| rule_action | `alert`, `notify`, `record`, `lockdown`, `dispatch`, `arm`, `disarm`, `panic`, `trigger_output` | banco |
| condition_type | `people_count`, `no_ppe`, `restricted_area`, `face_recognition`, `vehicle_detection`, `loitering`, `crowd_density`, `motion_detection`, `object_left`, `perimeter_breach`, `absence_detection`, `agglomeration_detection`, `anomaly_position`, `anomaly_speed`, `anomaly_displacement`, `scene_change`, `recurrent_vehicle` | banco |
| condition_operator | `greater_than`, `less_than`, `equals`, `not_equals`, `contains`, `between` | banco |
| camera_status | `online`, `offline`, `alert`, `warning` | banco |
| alert_type | `security`, `safety`, `operations`, `access`, `analytics`, `absence`, `agglomeration`, `anomaly`, `panic`, `arm_disarm`, `scene_change`, `camera_offline`, `recurrent_vehicle`, `qr_code_event` | banco |
| analysis_session_status | `idle`, `running`, `paused`, `error`, `stopped`, `scheduled` | banco |
| stream_protocol | `hls`, `webrtc`, `rtsp`, `mjpeg` | banco |
| stream_status | `disconnected`, `connecting`, `connected`, `playing`, `buffering`, `paused`, `error`, `reconnecting` | banco |
| app_role | `admin`, `manager`, `operator`, `viewer` | banco |
| org_role | `owner`, `admin`, `member`, `viewer` | banco |
| camera_event_type | `motion`, `person_detected`, `vehicle_detected`, `face_detected`, `plate_detected`, `zone_entry`, `zone_exit`, `loitering`, `tampering`, `offline`, `online`, `ppe_violation`, `behavior_anomaly`, `panic`, `manual` | banco |
| event_alert_severity | `low`, `medium`, `high`, `critical` | banco |
| event_alert_status | `open`, `acknowledged`, `resolved`, `dismissed` | banco |
| event_review_verdict | `true_positive`, `false_positive`, `false_negative`, `uncertain` | banco |
| alarm_resolution_code | `incident_confirmed`, `handled_on_site`, `no_action_needed`, `false_positive`, `duplicate`, `test` | banco |
| media_type | `snapshot`, `clip`, `continuous` | banco |
| notification_channel | `email`, `whatsapp` | banco |
| notification_dispatch_status | `pending`, `sent`, `skipped`, `failed` | banco |
| ppe_type | `helmet`, `vest`, `goggles`, `mask`, `gloves`, `boots`, `earmuffs`, `harness` | banco |
| restore_status | `none`, `in_progress`, `available`, `expired` | banco |
| retention_class | `standard`, `extended`, `forensic` | banco |
| storage_tier | `hot`, `warm`, `cold` | banco |
| AlertType | security \| safety \| operations \| access \| analytics \| absence \| agglomeration \| anomaly \| panic \| arm_disarm \| scene_change \| camera_offline \| recurrent_vehicle \| qr_code_event | `src/components/AlertCard.tsx` |
| AlertSeverity | low \| medium \| high \| critical | `src/components/AlertCard.tsx` |
| AlertType | security \| safety \| operations \| access \| analytics | `src/components/AlertDetail.tsx` |
| AlertSeverity | low \| medium \| high \| critical | `src/components/AlertDetail.tsx` |
| AlertType | security \| safety \| operations \| access \| analytics | `src/components/AlertNotification.tsx` |
| AlertSeverity | low \| medium \| high \| critical | `src/components/AlertNotification.tsx` |
| CameraLayout | 2x2 \| 3x3 \| list | `src/components/CameraLayoutControls.tsx` |
| PersonListType | authorized \| vip \| blocked \| unknown | `src/components/PersonForm.tsx` |
| TimelineItemStatus | completed \| current \| pending \| error \| warning | `src/components/Timeline.tsx` |
| ViewMode | grid \| list \| timeline | `src/components/alerts/AlertTypes.ts` |
| SortOption | date-desc \| date-asc \| severity-desc \| severity-asc | `src/components/alerts/AlertTypes.ts` |
| AlertType | security \| safety \| operations \| access \| analytics \| absence \| agglomeration \| anomaly \| panic \| arm_disarm \| scene_change \| camera_offline \| recurrent_vehicle \| qr_code_event \| all | `src/components/alerts/alertFilterTypes.ts` |
| AlertSeverity | low \| medium \| high \| critical \| all | `src/components/alerts/alertFilterTypes.ts` |
| DateRange | all \| 1h \| 24h \| 7d \| 30d \| custom | `src/components/alerts/alertFilterTypes.ts` |
| TypeFilter | all \| analysis \| alert | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| SeverityFilter | all \| low \| medium \| high \| critical | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| PTZ_PROTOCOLS | 'onvif', 'hikvision', 'dahua', 'axis' | `src/components/cameras/addCameraSchema.ts` |
| ViewMode | grid-1x1 \| grid-2x2 \| grid-3x3 \| grid-4x4 \| list | `src/components/cameras/types.ts` |
| CameraStatus | online \| offline \| alert \| warning | `src/components/cameras/types.ts` |
| AlertSortOption | date-desc \| date-asc \| severity-desc \| severity-asc \| type | `src/components/dashboard/DashboardTypes.ts` |
| ViewMode | grid \| stream \| map \| analytics | `src/components/dashboard/DashboardTypes.ts` |
| GridLayout | 1x1 \| 2x2 \| 3x3 \| 4x4 \| list | `src/components/dashboard/DashboardTypes.ts` |
| AlertSortOption | date-desc \| date-asc \| severity-desc \| severity-asc \| type | `src/components/dashboard/types.ts` |
| ViewMode | cards \| streams \| hybrid | `src/components/dashboard/types.ts` |
| ListType | whitelist \| blacklist \| vip \| employee \| visitor \| contractor \| unknown | `src/components/face-recognition/faceRecognitionTypes.ts` |
| PeriodFilter | today \| yesterday \| 7d \| 30d | `src/components/journey/useJourneyData.ts` |
| DAYS_OF_WEEK | { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, | `src/components/notification-settings/types.ts` |
| CHANNEL_OPTIONS | { value: 'push', label: 'Push Browser', icon: 'Bell' as const }, { value: 'email', label: 'Email', icon: 'Mail' as const }, { value: 'sms', label: 'SMS/WhatsApp', icon: 'Phone' as const }, { value: 'webhook', label: 'Webhook', icon: 'Webhook' as const }, | `src/components/notification-settings/types.ts` |
| ViewMode | grid \| list | `src/components/people/types.ts` |
| PtzAxis | pan \| tilt \| zoom | `src/components/ptz/PtzAxisRangeVisualizer.tsx` |
| PtzAxis | pan \| tilt \| zoom | `src/components/ptz/PtzCalibrationPanel.tsx` |
| PreflightAxis | pan \| tilt \| zoom | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| PreflightAxisLike | pan \| tilt \| zoom | `src/components/ptz/ptzPreflightPdf.ts` |
| PreflightPhaseId | A \| B \| C | `src/components/ptz/ptzPreflightPdf.ts` |
| PreflightOutcome | ok \| deviation \| fail \| no-telemetry \| skipped | `src/components/ptz/ptzPreflightPdf.ts` |
| PtzAxis | pan \| tilt \| zoom | `src/components/ptz/lib/calibrationRules.ts` |
| ObservedRangeError | not_finite \| out_of_bounds \| min_ge_max | `src/components/ptz/lib/calibrationRules.ts` |
| RiskSeverity | critical \| high \| medium \| low | `src/components/scanner/detected-risks/types.ts` |
| RiskType | off_duty_presence \| loitering \| break_in_indicator \| perimeter_breach \| unknown_face | `src/components/scanner/detected-risks/types.ts` |
| LogLevel | info \| warning \| error \| critical | `src/components/security/SecurityTypes.ts` |
| LogCategory | auth \| access \| system \| camera \| alert \| config \| user | `src/components/security/SecurityTypes.ts` |
| AccessStatus | granted \| denied \| pending | `src/components/security/SecurityTypes.ts` |
| ListType | whitelist \| blacklist \| watchlist | `src/components/security/SecurityTypes.ts` |
| SkeletonFallbackVariant | page \| cards \| table \| filters \| inline | `src/components/skeletons/SkeletonFallback.tsx` |
| EventType | camera_online \| camera_offline \| alert_triggered \| alert_resolved \| person_detected \| person_recognized \| vehicle_detected \| zone_breach \| system_update \| user_action | `src/components/ui/EventTimeline.tsx` |
| ToastType | success \| error \| warning \| info | `src/components/ui/Notifications.tsx` |
| DrawingMode | select \| rectangle \| polygon \| line | `src/components/zone-editor/ZoneEditorTypes.ts` |
| ZoneType | restricted \| counting \| tripwire \| dwell \| occupancy \| parking \| queue \| safety \| custom | `src/components/zone-overlay/zoneOverlayTypes.ts` |
| ZoneType | restricted \| counting \| tripwire \| dwell \| occupancy \| parking \| queue \| safety \| custom | `src/components/zones/zonesConfig.ts` |
| ModelSource | cdn \| local | `src/config/models_config.ts` |
| ZONE_COLORS | CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.violet, 'hsl(330, 81%, 60%)', // pink CHART_COLORS.cyan, CHART_COLORS.orange, | `src/constants/chartColors.ts` |
| MessageCategory | SUCCESS \| ERROR \| VALIDATION \| INFO \| WARNING | `src/constants/messages.ts` |
| ThemeMode | dark \| light \| system | `src/contexts/ThemeProvider.tsx` |
| ThemeVariant | default \| soc \| midnight \| contrast \| industrial | `src/contexts/ThemeProvider.tsx` |
| StreamProtocol | hls \| webrtc \| rtsp | `src/hooks/useAnalysisStream.ts` |
| ScheduleScope | camera \| group \| all | `src/hooks/useCameraSchedules.ts` |
| ScheduleAction | arm \| disarm | `src/hooks/useCameraSchedules.ts` |
| ScheduleStatus | ok \| error \| skipped | `src/hooks/useCameraSchedules.ts` |
| COLLAB_UNREAD_KEY | 'collab', 'unread-counts' | `src/hooks/useCollabUnreadBadge.ts` |
| ReviewVerdict | true_positive \| false_positive \| false_negative \| uncertain | `src/hooks/useDetectionReviews.ts` |
| SourceTable | alerts \| recognition_logs \| plate_detections | `src/hooks/useDetectionReviews.ts` |
| FaceMatchStatus | known \| unknown \| blacklist \| vip | `src/hooks/useFaceAPI.ts` |
| SnapshotStatus | idle \| capturing \| done \| failed \| pending | `src/hooks/useFirstSnapshot.ts` |
| FleetHealthState | online \| degraded \| offline \| unknown | `src/hooks/useFleetHealthEndpoint.ts` |
| AnalysisType | security \| productivity \| safety | `src/hooks/useImageAnalysis.ts` |
| MAINTENANCE_BADGE_KEY | 'maintenance', 'open-count' | `src/hooks/useMaintenanceAlertBadge.ts` |
| FilterScope | alerts \| cameras \| people \| zones \| recordings \| recognition-logs \| analysis-history \| license-plate-history | `src/hooks/useManagedFilters.ts` |
| MonitorLayout | 1x1 \| 2x2 \| 3x3 \| 4x4 \| 1+5 \| 2+8 | `src/hooks/useMonitorGroups.ts` |
| MaskMode | include \| exclude | `src/hooks/useMotionMasks.ts` |
| LayoutType | 1x1 \| 2x2 \| 3x3 \| 4x4 | `src/hooks/useMultiCameraRecognition.ts` |
| PtzCommand | move \| stop \| zoom \| focus \| iris \| goto_preset \| save_preset \| delete_preset \| home \| test \| get_status \| absolute_move | `src/hooks/usePtzControl.ts` |
| RelayHealthStatus | unknown \| online \| stale \| offline \| missing | `src/hooks/useRelayAgentHealth.ts` |
| ValidationSeverity | info \| warn \| critical | `src/hooks/useRtspValidation.ts` |
| TestModeScope | all \| camera \| rule | `src/hooks/useTestMode.ts` |
| AppRole | admin \| manager \| operator \| viewer | `src/hooks/useUserRole.ts` |
| RecordingState | idle \| recording \| paused \| processing \| saving | `src/hooks/clip-recorder/types.ts` |
| TriggerType | manual \| rule \| motion \| alert \| scheduled | `src/hooks/clip-recorder/types.ts` |
| StreamQuality | auto \| low \| medium \| high | `src/hooks/global-streaming/streamingTypes.ts` |
| StreamStatus | idle \| connecting \| connected \| playing \| paused \| error \| offline | `src/hooks/global-streaming/streamingTypes.ts` |
| TimeRange | 1h \| 6h \| 12h \| 24h \| 7d \| 30d \| custom | `src/hooks/heatmap/heatmapTypes.ts` |
| ModelType | coco-ssd \| movenet \| blazeface | `src/hooks/ml-models/mlModelTypes.ts` |
| BackendType | webgl \| wasm \| cpu | `src/hooks/ml-models/mlModelTypes.ts` |
| NotificationChannel | push \| email \| whatsapp \| in_app \| sound | `src/hooks/notifications/notificationTypes.ts` |
| NotificationSeverity | low \| medium \| high \| critical | `src/hooks/notifications/notificationTypes.ts` |
| NotificationStatus | pending \| sent \| delivered \| failed \| read | `src/hooks/notifications/notificationTypes.ts` |
| PPEType | helmet \| vest \| gloves \| boots \| goggles \| mask \| earmuffs \| harness | `src/hooks/ppe/types.ts` |
| PPEStatus | detected \| missing \| unknown | `src/hooks/ppe/types.ts` |
| AgentHealingSeverity | ok \| warning \| critical | `src/lib/agentHealing.ts` |
| AgentHealingAction | none \| nudge \| restart \| escalate | `src/lib/agentHealing.ts` |
| AdmissionAction | nudge \| restart \| escalate | `src/lib/agentRestartBudget.ts` |
| AdmissionSeverity | warning \| critical | `src/lib/agentRestartBudget.ts` |
| AdmissionOutcome | admitted \| deferred \| suppressed | `src/lib/agentRestartBudget.ts` |
| AlertSeverity | low \| medium \| high \| critical | `src/lib/alertSounds.ts` |
| ToneType | sine \| square \| triangle \| sawtooth | `src/lib/alertSounds.ts` |
| NotificationPermissionStatus | granted \| denied \| default | `src/lib/browserNotifications.ts` |
| ObjectClass | person \| vehicle \| plate \| face \| ppe \| other | `src/lib/clipRetention.ts` |
| ClockSkewSeverity | insufficient_data \| ok \| warning \| critical | `src/lib/clockSkew.ts` |
| ClockSkewDirection | none \| ahead \| behind | `src/lib/clockSkew.ts` |
| TRACKED_ROUTES | '/dashboard', '/cameras', '/alerts', '/people' | `src/lib/clsMonitor.ts` |
| ConnectivityChosenPath | relay \| vpn \| port_forward \| cancelled | `src/lib/connectivityTelemetry.ts` |
| CameraConnectivityPath | relay \| vpn \| port_forward \| direct | `src/lib/connectivityTelemetry.ts` |
| EscalationAnchorMode | row \| streak | `src/lib/escalationProfiles.ts` |
| FirmwareEvidenceKind | magic \| string \| onvif | `src/lib/firmwareDetector.ts` |
| LivePreviewErrorCode | invalid_rtsp_url \| unauthorized \| rate_limited \| session_create_failed \| session_not_found \| max_duration_exceeded \| extend_failed \| mediamtx_pull_failed \| mediamtx_unreachable \| hls_timeout \| connection_dropped \| unknown_action \| invalid_json \| start_failed \| extend_failed_client \| unknown | `src/lib/livePreviewErrors.ts` |
| LogLevel | debug \| info \| warn \| error \| fatal | `src/lib/logger.ts` |
| MaintenanceSeverity | warning \| critical | `src/lib/maintenanceEscalation.ts` |
| MaintenanceSeverity | warning \| critical | `src/lib/maintenanceSourceAlerts.ts` |
| MaintenanceSourceRoutine | camera_clock_skew \| partition_backlog_trend | `src/lib/maintenanceSourceAlerts.ts` |
| OnvifWsdl | device \| media_v10 \| media_v20 \| ptz_v20 \| imaging_v20 \| events \| analytics_v20 \| deviceIO \| replay \| search \| recording \| thermal \| accesscontrol | `src/lib/onvifProfiles.ts` |
| OnvifProbeType | dn:NetworkVideoTransmitter \| tds:Device | `src/lib/onvifProfiles.ts` |
| BacklogSeverity | ok \| warning \| critical | `src/lib/partitionBacklogTrend.ts` |
| PreviewEventType | started \| extended \| stopped \| failed | `src/lib/previewTelemetry.ts` |
| PRODUCTIVITY_EVENT_TYPES | 'alerts', 'panic', 'recognitions' | `src/lib/productivityConfig.ts` |
| PRODUCTIVITY_SEVERITIES | 'low', 'medium', 'high', 'critical' | `src/lib/productivityConfig.ts` |
| WEEKDAY_LABEL | 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb' | `src/lib/productivityConfig.ts` |
| LeaseAction | keep \| requeue \| expire | `src/lib/relayLease.ts` |
| RedeliverySeverity | none \| warning \| critical | `src/lib/relayRedeliveryHealth.ts` |
| ExpiryReason | task_expired_unfair_window \| task_expired_unclaimed \| task_expired_no_response | `src/lib/relayTaskWindow.ts` |
| CorrelationVerdict | no_backlog \| attributed \| partial \| unexplained \| insufficient_data | `src/lib/rootCauseCorrelation.ts` |
| CulpritConfidence | low \| medium \| high | `src/lib/rootCauseCorrelation.ts` |
| RtspBrand | hikvision \| dahua \| intelbras \| usecam \| xiongmai \| generica | `src/lib/rtspTemplates.ts` |
| BenchmarkStatus | success \| warn \| failed \| error | `src/lib/rtspVariantBenchmark.ts` |
| SkeletonFailureMode | off \| all \| cameras \| alerts \| zones | `src/lib/skeletonFailureFlag.ts` |
| ObjectClass | person \| vehicle \| plate \| face \| ppe \| other | `src/lib/snapshotAnnotator.ts` |
| TemplateId | intrusion \| loitering \| perimeter_violation \| abandoned_object \| restricted_zone \| ppe_monitoring \| alpr_dwell \| queue_length \| occupancy_limit | `src/lib/wizardTemplateRecommendation.ts` |
| ARBITER_INVARIANT_KEYS | 'observe_action_allowed', 'observe_never_carries_task', 'arbiter_not_client_executable', 'run_summary_counts_observed', | `src/lib/agents/arbiterInvariants.ts` |
| HealingTrailAction | nudge \| restart \| escalate \| defer \| suppress \| observe | `src/lib/agents/healingTrail.ts` |
| HealingTrailSeverity | ok \| warning \| critical | `src/lib/agents/healingTrail.ts` |
| HealingTrailTone | neutral \| info \| warning \| destructive | `src/lib/agents/healingTrail.ts` |
| HealingTrailRule | external_root_cause_veto \| external_cause_explains_redelivery \| external_cause_non_invasive \| liveness_downgrade \| redelivery_only_critical \| redelivery_only_warning \| escalation_exhausted \| breaker_suppressed \| budget_deferred \| ladder_kept \| unknown | `src/lib/agents/healingTrail.ts` |
| MaintenanceSeverity | warning \| critical | `src/lib/alarms/admissionBacklogAlert.ts` |
| BacklogVerdict | no_data \| clear \| spike \| persistent \| growing | `src/lib/alarms/admissionBacklogAlert.ts` |
| CoverageStatus | covered \| gap \| no_data | `src/lib/alarms/admissionLedger.ts` |
| MalformedReason | blank_source \| bad_window \| bad_totals \| unknown_reason \| unbalanced | `src/lib/alarms/admissionLedgerRows.ts` |
| OrphanAlertSeverity | warning \| critical | `src/lib/alarms/admissionOrphanAlert.ts` |
| OrphanTrendVerdict | no_history \| clear \| emerging \| resolving \| persistent \| growing | `src/lib/alarms/admissionOrphanTrend.ts` |
| PurgeRowStatus | valid \| inconsistent \| unreadable | `src/lib/alarms/admissionPurgeHistory.ts` |
| PurgeHealth | ok \| backlog \| backlog_growing \| late \| stalled \| contested \| never_ran \| unknown | `src/lib/alarms/admissionPurgeHistory.ts` |
| ReconcileVerdict | indeterminate \| no_run \| reconciled \| settling \| unaccounted | `src/lib/alarms/admissionReconciliation.ts` |
| ReconcileSeverity | none \| warning \| critical | `src/lib/alarms/admissionReconciliation.ts` |
| RetentionOutcome | delete \| keep \| quarantine \| defer | `src/lib/alarms/admissionRetention.ts` |
| TrendAlertSeverity | warning \| critical | `src/lib/alarms/admissionTrendAlert.ts` |
| SourceState | active \| clear \| unknown | `src/lib/alarms/alarmAggregation.ts` |
| AlarmTransition | none \| opened \| rearmed \| closed | `src/lib/alarms/alarmAggregation.ts` |
| IgnoreReason | rule_disabled \| rule_inoperative \| unknown_source \| out_of_schedule \| stale_report \| invalid_report | `src/lib/alarms/alarmAggregation.ts` |
| RuleHealth | ok \| inconsistent \| inoperative \| disabled | `src/lib/alarms/alarmAggregation.ts` |
| RecurrenceSeverity | low \| medium \| high \| critical | `src/lib/alarms/alarmRecurrence.ts` |
| RecurrenceClass | isolated \| recurrent \| chronic | `src/lib/alarms/alarmRecurrence.ts` |
| NoticeMode | notify \| summarize \| escalate | `src/lib/alarms/alarmRecurrence.ts` |
| RecurrenceIgnoreReason | invalid_input \| already_open \| not_open \| stale_record \| negative_duration | `src/lib/alarms/alarmRecurrence.ts` |
| ScheduleIssueCode | invalid_start \| invalid_end \| degenerate_period \| too_many_periods \| overlapping_periods | `src/lib/alarms/alarmScheduleForm.ts` |
| WEEKDAY_LABELS | 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', | `src/lib/alarms/alarmScheduleForm.ts` |
| AlarmEventType | motion_detection \| tampering \| video_loss \| disk_full \| disk_error \| device_disconnected \| external_alarm \| abandoned_object \| missing_object \| tripwire \| intrusion \| scene_change \| audio_detection \| face_detected \| face_recognized \| face_unrecognized \| plate_read \| plate_allowed \| plate_denied \| tripwire_ai \| intrusion_ai | `src/lib/alarms/alarmScheme.ts` |
| AlarmActionKind | display_live \| record \| snapshot \| sound \| email \| webhook \| ptz_preset \| relay_output | `src/lib/alarms/alarmScheme.ts` |
| SchemeIssueCode | name_missing \| name_too_long \| unknown_event_type \| no_sources \| sources_partially_missing \| all_sources_missing \| no_actions \| actions_partially_missing \| all_actions_missing \| action_without_target \| channel_budget_exceeded \| face_library_missing \| face_library_ambiguous \| face_library_foreign \| face_library_not_applicable \| schedule_periods_truncated \| schedule_period_invalid \| disconnect_threshold_out_of_range | `src/lib/alarms/alarmScheme.ts` |
| IssueSeverity | blocking \| degrading | `src/lib/alarms/alarmScheme.ts` |
| SchemeHealth | ok \| inconsistent \| inoperative | `src/lib/alarms/alarmScheme.ts` |
| DisconnectCause | manual \| network \| device \| unknown | `src/lib/alarms/alarmScheme.ts` |
| AdmissionRefusalCode | blocking_issues \| stored_channel_budget_exceeded \| schedule_invalid | `src/lib/alarms/alarmSchemeForm.ts` |
| AlarmStatus | open \| acknowledged \| resolved \| dismissed | `src/lib/alarms/alarmTreatment.ts` |
| AlarmAction | acknowledge \| resolve \| dismiss \| reopen | `src/lib/alarms/alarmTreatment.ts` |
| AlarmResolutionCode | incident_confirmed \| handled_on_site \| no_action_needed \| false_positive \| duplicate \| test | `src/lib/alarms/alarmTreatment.ts` |
| TreatmentRejection | illegal_transition \| missing_actor \| missing_note \| note_too_long \| invalid_code \| code_not_allowed_for_action \| unknown_status | `src/lib/alarms/alarmTreatment.ts` |
| ArmedState | armed \| armed_degraded \| idle \| off \| inoperative \| unknown | `src/lib/alarms/armedNow.ts` |
| ArmedFilter | all \| armed \| attention \| off | `src/lib/alarms/armedRoster.ts` |
| SeriesState | open \| settling \| quiet \| unknown | `src/lib/alarms/chronicSeriesBoard.ts` |
| SeriesDiscardReason | invalid_row \| empty_key \| duplicate_key \| invalid_counts | `src/lib/alarms/chronicSeriesBoard.ts` |
| DeliveryFailure | retryable \| permanent | `src/lib/alarms/episodeCommandQueue.ts` |
| AdmissionReason | admitted \| admitted_degraded \| indeterminate \| out_of_window \| inoperative \| disabled \| source_missing \| no_scheme | `src/lib/alarms/eventAdmission.ts` |
| SnapshotOutcome | delete \| keep \| anchor \| quarantine \| defer | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| SNAPSHOT_VERDICTS | 'reconciled', 'settling', 'no_run', 'unaccounted', 'indeterminate', | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| DwellAction | opened \| extended \| ignored_out_of_order | `src/lib/analytics/dwellTracker.ts` |
| DwellRejection | missing_track_key \| low_confidence | `src/lib/analytics/dwellTracker.ts` |
| InviteStatus | pending \| accepted \| declined \| revoked \| expired | `src/lib/collab/collabGovernance.ts` |
| MembershipStatus | pending \| active \| suspended | `src/lib/collab/collabGovernance.ts` |
| GovernanceAction | invite_created \| invite_accepted \| invite_declined \| invite_revoked \| invite_expired \| membership_suspended \| membership_reinstated \| membership_removed | `src/lib/collab/collabGovernance.ts` |
| InviteRejection | not_network_owner \| target_is_owner \| already_member \| invite_already_pending \| ttl_out_of_range \| network_invite_quota \| org_invite_quota \| reinvite_cooldown | `src/lib/collab/collabGovernance.ts` |
| RespondRejection | not_invited_org \| invite_not_pending \| invite_expired | `src/lib/collab/collabGovernance.ts` |
| MembershipRejection | not_network_owner \| membership_not_found \| owner_membership_immutable \| illegal_transition | `src/lib/collab/collabGovernance.ts` |
| InviteTone | pending \| positive \| neutral \| negative | `src/lib/collab/collabGovernanceView.ts` |
| CollabNavTone | default \| warning \| destructive | `src/lib/collab/collabNavBadge.ts` |
| MembershipStatus | pending \| active \| suspended | `src/lib/collab/collabNetwork.ts` |
| PlateRejection | empty \| bad_length \| bad_format | `src/lib/collab/collabNetwork.ts` |
| ShareRejection | invalid_plate \| member_not_active \| severity_out_of_range \| ttl_out_of_range \| quota_exceeded | `src/lib/collab/collabNetwork.ts` |
| MatchRejection | invalid_plate \| low_confidence \| member_not_active \| reciprocity_required \| no_match \| own_entry \| entry_revoked \| entry_expired \| cooldown | `src/lib/collab/collabNetwork.ts` |
| SilenceVerdict | silenced \| not_silenced_kind \| not_silenceable \| silence_expired \| no_preference | `src/lib/collab/collabNotificationSilencing.ts` |
| SilenceRejection | silence_requires_deadline \| silence_deadline_in_past \| silence_deadline_too_far \| silence_no_valid_kind | `src/lib/collab/collabNotificationSilencing.ts` |
| CollabNotificationKind | invite_received \| invite_accepted \| invite_declined \| invite_revoked \| invite_expired \| membership_suspended \| membership_reinstated \| membership_removed | `src/lib/collab/collabNotifications.ts` |
| CollabAudience | owner_org \| counterpart_org | `src/lib/collab/collabNotifications.ts` |
| CollabNotificationSeverity | info \| attention \| critical | `src/lib/collab/collabNotifications.ts` |
| TerminalStatus | completed \| failed \| expired \| cancelled | `src/lib/devices/commandReliability.ts` |
| DeviceStatus | pending \| active \| revoked | `src/lib/devices/deviceEnrollment.ts` |
| AuthOutcome | accepted \| denied | `src/lib/devices/deviceEnrollment.ts` |
| AuthReason | ok_current \| ok_grace \| unknown_device \| malformed_code \| revoked \| expired \| not_activated \| grace_window_closed \| bad_secret \| clock_anomaly | `src/lib/devices/deviceEnrollment.ts` |
| DeviceSilenceSeverity | warning \| critical | `src/lib/devices/deviceSilence.ts` |
| IoDirection | input \| output | `src/lib/devices/ioSafety.ts` |
| IoOutputMode | monostable \| bistable | `src/lib/devices/ioSafety.ts` |
| IoPortState | active \| inactive \| unknown | `src/lib/devices/ioSafety.ts` |
| IoCommandKind | pulse \| set_active \| set_inactive | `src/lib/devices/ioSafety.ts` |
| IoRefusalReason | unknown_port \| missing_capability \| port_disabled \| not_an_output \| duration_too_short \| duration_too_long \| hold_not_supported \| too_soon \| already_in_state | `src/lib/devices/ioSafety.ts` |
| FailureKind | transport \| auth \| config \| device \| none | `src/lib/devices/pathFailover.ts` |
| FailoverReason | preferred_healthy \| preferred_quarantined \| promoted_by_evidence \| preferred_not_configured \| no_path_configured | `src/lib/devices/pathFailover.ts` |
| CONNECTIVITY_PATHS | 'direct', 'port_forward', 'vpn', 'relay' | `src/lib/devices/pathFailover.ts` |
| PullPointStatus | pending \| active \| backoff \| retired | `src/lib/devices/pullPointLease.ts` |
| PullPointAction | create \| pull \| renew \| recreate \| wait \| retire | `src/lib/devices/pullPointLease.ts` |
| PullPointReason | no_subscription \| lease_expired \| lease_near_expiry \| lease_healthy \| backoff_pending \| camera_disabled \| permanent_failure \| retired | `src/lib/devices/pullPointLease.ts` |
| AdmissionDecision | admit \| defer \| reject \| replay | `src/lib/devices/remoteCommandAdmission.ts` |
| REMOTE_COMMANDS | 'osd.open', 'osd.apply', 'clock.sync', 'config.read', 'stream.restart', 'device.reboot', | `src/lib/devices/remoteCommandAdmission.ts` |
| CommandStatus | queued \| awaiting_presence \| delivered \| completed \| failed \| expired \| cancelled | `src/lib/devices/remoteCommandDelivery.ts` |
| PollReason | first_delivery \| presence_proved \| lease_expired \| deadline_passed \| delivery_exhausted \| lease_active \| already_settled \| behind_head | `src/lib/devices/remoteCommandDelivery.ts` |
| ReportedOutcome | completed \| failed | `src/lib/devices/remoteCommandDelivery.ts` |
| AttentionBand | fresh \| sustained \| prolonged | `src/lib/emap/attentionClock.ts` |
| MapMarkerStatus | alert \| offline \| warning \| online \| unknown | `src/lib/emap/floorPlanGeometry.ts` |
| PlanStep | next \| previous | `src/lib/emap/planNavigator.ts` |
| ShiftClosureReason | normalized \| acknowledged \| removed | `src/lib/emap/shiftHandoff.ts` |
| SuppressionReason | not_primed \| improved \| cooldown \| flapping \| folded_into_burst | `src/lib/emap/statusAlertPolicy.ts` |
| EscalationLevel | none \| operator \| supervisor \| management | `src/lib/emap/triageEscalation.ts` |
| DossierBuildErrorCode | missing_manifest \| missing_issuer \| invalid_issued_at | `src/lib/evidence/custodyDossier.ts` |
| DossierParseErrorCode | invalid_json \| not_a_dossier \| unsupported_version \| unsupported_algorithm \| foreign_genesis \| malformed_manifest | `src/lib/evidence/custodyDossier.ts` |
| DossierIntegrity | intact \| inconsistent_verdict \| tampered | `src/lib/evidence/custodyDossier.ts` |
| DossierTone | positive \| warning \| critical | `src/lib/evidence/custodyDossier.ts` |
| TransformationKind | watermark \| transcode \| redaction \| trim \| concat | `src/lib/evidence/custodyManifest.ts` |
| CustodyVerdictLevel | admissible \| weakened \| broken | `src/lib/evidence/custodyManifest.ts` |
| CustodyReasonCode | empty_export \| unattributed_export \| unhashed_segment \| invalid_hash_format \| invalid_timestamp \| inverted_segment \| undeclared_transformation \| declared_without_alteration \| zero_byte_segment \| timeline_gap \| timeline_overlap \| non_monotonic_order \| clock_skew \| partial_coverage \| duplicate_segment | `src/lib/evidence/custodyManifest.ts` |
| IntegrityState | unverified \| checking \| intact \| tampered \| missing \| indeterminate | `src/lib/evidence/exportRegistryView.ts` |
| Tone | neutral \| positive \| warning \| critical | `src/lib/evidence/exportRegistryView.ts` |
| BatchCoverage | full \| partial \| none | `src/lib/faces/attestationBatch.ts` |
| ConferenceTone | critical \| warning \| neutral \| positive | `src/lib/faces/attestationConference.ts` |
| FaceSearchRejection | window_missing \| window_inverted \| window_in_future \| window_too_long \| similarity_out_of_range \| age_range_inverted \| too_many_cameras | `src/lib/faces/faceSearch.ts` |
| FaceTimelineRejection | window_invalid \| window_too_long_for_step \| step_unknown | `src/lib/faces/faceTimeline.ts` |
| ZOOM_STEPS_MS | 24 * 60 * 60 * 1000, 6 * 60 * 60 * 1000, 60 * 60 * 1000, 15 * 60 * 1000, 5 * 60 * 1000, 60 * 1000, | `src/lib/faces/faceTimeline.ts` |
| StayConfidence | confirmed \| unconfirmed | `src/lib/faces/personTimeline.ts` |
| TransitFlag | confirmed \| unconfirmed \| co_presence_conflict | `src/lib/faces/personTimeline.ts` |
| ReferenceMatchRejection | query_embedding_missing \| query_embedding_degenerate \| threshold_out_of_range \| empty_gallery | `src/lib/faces/referenceMatch.ts` |
| AttestationCaveatCode | co_presence_conflict \| unconfirmed_stay \| open_stay \| blind_gap \| excluded_unverified \| excluded_spoof_suspect \| excluded_unidentified \| truncated_result \| subject_mismatch \| no_observation \| single_camera | `src/lib/faces/timelineAttestation.ts` |
| IngestHealth | healthy \| silent \| never_published \| revoked \| not_push | `src/lib/ingest/streamIngest.ts` |
| INGEST_PROTOCOLS | 'rtsp_pull', 'rtmp_push', 'srt_push' | `src/lib/ingest/streamIngest.ts` |
| INGEST_STATUSES | 'pending', 'publishing', 'idle', 'revoked' | `src/lib/ingest/streamIngest.ts` |
| InsightFaceModel | arcface_r100_v1 \| arcface_glintr100 \| face-api-128 | `src/lib/insightface/types.ts` |
| ContactIdQualifier | E \| R | `src/lib/integrations/monitoringCenter.ts` |
| DispatchStatus | pending \| claimed \| delivered \| failed \| expired | `src/lib/integrations/monitoringCenter.ts` |
| MONITORING_PROVIDERS | 'sigma', 'moni', 'commbox', 'sia_dc09' | `src/lib/integrations/monitoringCenter.ts` |
| AlertSeverity | warning \| critical | `src/lib/maintenance/acknowledgementDecay.ts` |
| AcknowledgementState | none \| pending \| honored \| expired \| void_aggravated \| void_unattributed | `src/lib/maintenance/acknowledgementDecay.ts` |
| ChannelSilenceState | silenced \| escalation_breaks \| expired | `src/lib/maintenance/conditionSilence.ts` |
| SILENCE_CHANNELS | 'telegram', 'email' | `src/lib/maintenance/conditionSilence.ts` |
| DeliverabilityAlertSeverity | warning \| critical | `src/lib/maintenance/deliverabilityAlert.ts` |
| DispatchPunctuality | fresh \| late \| stalled \| unknown | `src/lib/maintenance/dispatchDeliverability.ts` |
| DispatchDelivery | delivering \| degraded \| failing \| muted \| idle \| unreadable \| unknown | `src/lib/maintenance/dispatchDeliverability.ts` |
| DeliverabilityHealth | ok \| warning \| unknown \| critical | `src/lib/maintenance/dispatchDeliverability.ts` |
| MaintenanceAlertStatus | open \| acknowledged | `src/lib/maintenance/maintenanceConsoleView.ts` |
| NavBadgeVariant | default \| destructive \| warning \| success | `src/lib/maintenance/maintenanceNavBadge.ts` |
| MaintenanceOwner | field_tech \| network_ops \| registry_admin \| platform \| triage | `src/lib/maintenance/maintenanceOwner.ts` |
| OwnerSlaState | idle \| on_track \| at_risk \| breached | `src/lib/maintenance/ownerAging.ts` |
| OwnerFilterKey | all \| unrouted | `src/lib/maintenance/ownerFilter.ts` |
| ConditionVerdict | light \| moderate \| heavy \| starved | `src/lib/maintenance/suppressionLedger.ts` |
| SUPPRESSION_CHANNELS | 'telegram', 'email' | `src/lib/maintenance/suppressionLedger.ts` |
| SuppressionOutcome | delete \| keep \| anchor \| quarantine \| defer | `src/lib/maintenance/suppressionRetention.ts` |
| SuppressionRefusal | bad_now \| bad_retention_days \| bad_batch_cap \| bad_anchor_keep | `src/lib/maintenance/suppressionRetention.ts` |
| RETENTION_CHANNELS | 'telegram', 'email' | `src/lib/maintenance/suppressionRetention.ts` |
| BottomNavTone | neutral \| success \| warning \| danger | `src/lib/navigation/bottomNavBadge.ts` |
| AppRole | admin \| manager \| operator \| viewer | `src/lib/permissions/capabilities.ts` |
| CapabilityGrantEffect | grant \| deny | `src/lib/permissions/capabilities.ts` |
| CAPABILITIES | 'cameras.view', 'cameras.manage', 'cameras.ptz.control', 'cameras.ptz.calibrate', 'cameras.control_io', 'recordings.view', 'recordings.export', 'recordings.delete', 'alerts.view', 'alerts.acknowledge', 'alerts.dispatch', 'maintenance.view', 'maintenance.acknowledge', 'collab.view', 'collab.govern', … | `src/lib/permissions/capabilities.ts` |
| RevokeRejection | actor_missing_capability \| not_found \| self_revoke | `src/lib/permissions/grantConsole.ts` |
| GrantRowState | active \| expired \| revoked | `src/lib/permissions/grantConsole.ts` |
| ProvenanceCaveatCode | no_reading \| unknown_provenance \| llm_in_evidence \| llm_only \| uncorroborated_model \| single_source \| confidence_without_provenance | `src/lib/provenance/readingProvenance.ts` |
| PROVENANCE_TIERS | /** Confirmação explícita de um operador identificado. */ 'human', /** Medição do próprio equipamento (ANPR embarcado, evento ONVIF, I/O físico). */ 'sensor', /** Modelo determinístico nosso (embedding facial, detector, OCR clássico). */ 'model', /** Modelo generativo (visão-linguagem). Descreve; nã … | `src/lib/provenance/readingProvenance.ts` |
| PurgeOutcome | clean \| truncated \| abandoned_backlog | `src/lib/retention/alarmRecurrenceRetention.ts` |
| BridgeVerdict | insufficient_data \| healthy \| tolerated \| draining \| growing \| stuck | `src/lib/retention/episodeBridgeWatch.ts` |
| SkipReason | still_active \| unreadable_clock \| over_batch_limit | `src/lib/retention/episodeReconciliation.ts` |
| MaintenanceSeverity | warning \| critical | `src/lib/retention/retentionAlerts.ts` |
| RetentionHealth | ok \| warn \| stalled \| pending_first_run \| never | `src/lib/retention/retentionRegistry.ts` |
| MonitorLayout | 1x1 \| 2x2 \| 3x3 \| 4x4 \| 1+5 \| 2+8 | `src/lib/views/favoriteViewRestore.ts` |
| ConsumerHealth | idle \| flowing \| backlogged \| starved | `src/lib/vision/frameBus.ts` |
| CadenceAction | skip \| track \| identify | `src/lib/vision/inferenceCadence.ts` |
| … +69 linhas — lista completa em `context.json` | | |

## F. Validações de entrada

### F.1 Schemas Zod

- **personSchema** (`src/components/PersonForm.tsx`, z.object):
  ```ts
  { name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'), listType: z.enum(['authorized', 'vip', 'blocked', 'unknown']), department: z.string().max(50).optional(), role: z.string().max(50).optional(), notes: z.string().max(500).optional(), isActive: z.boolean(), }
  ```
- **nvrFormSchema** (`src/components/cameras/AddNvrDialog.tsx`, z.object):
  ```ts
  { name: z.string().trim().min(2, 'Nome obrigatório').max(80), location: z.string().trim().max(120).optional().or(z.literal('')), brand: z.enum(['usecam', 'hikvision', 'dahua', 'intelbras', 'xiongmai', 'generica']), templateId: z.string().min(1, 'Escolha um template'), host: z.string().trim().min(3, 'IP/host obrigatório').max(253), port: z.coerce.number().int().min(1).max(65535), channels: z.coerce.number().int().min(1).max(64), username: z.string().trim().max(128).optional().or(z.literal('')), password: z.string().max(256).optional().or(z.literal('')), }
  ```
- **ptzConfigSchema** (`src/components/cameras/addCameraSchema.ts`, z.object):
  ```ts
  { protocol: z.enum(PTZ_PROTOCOLS).default('onvif'), endpoint: z .string() .trim() .min(3, 'Endpoint obrigatório (IP ou host)') .max(255) .regex(HOST_REGEX, 'Use apenas IP ou hostname, sem barras'), port: z.coerce.number().int().min(1).max(65535).default(80), channel: z.coerce.number().int().min(1).max(64).default(1), username: z.string().trim().min(1, 'Usuário PTZ obrigatório').max(128), password: z.string().min(1, 'Senha PTZ obrigatória').max(256), default_speed: z.coerce.number().min(0.1).max(1).default(0.5), }
  ```
- **addCameraSchema** (`src/components/cameras/addCameraSchema.ts`, z.object, encadeia superRefine):
  ```ts
  { name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80), location: z.string().trim().max(120).optional().or(z.literal('')), brand: z.enum(['hikvision', 'dahua', 'intelbras', 'generica']).default('generica'), rtspUrl: z .string() .trim() .min(8, 'URL RTSP obrigatória') .max(2048) .regex(RTSP_REGEX, 'Deve começar com rtsp:// ou rtsps://'), substreamUrl: z .string() .trim() .max(2048) .regex(RTSP_REGEX, 'Deve começar com rtsp:// ou rtsps://') .optional() .or(z.literal('')), username: z.string().trim().max(128).optional().or(z.literal('')), password: z.string().max(256).optional().or(z.literal('')), ptzEnabled: z.boolean().default(false), ptzConfig: ptzConfigSchema.optional(), }
  ```
  - Regras cruzadas (refine): “Usuário obrigatório quando não está embutido na URL”
- **metricSchema** (`src/lib/coverageSchema.ts`, z.object, encadeia catch):
  ```ts
  { pct: z.number().finite().min(0).max(100).catch(0), total: z.number().int().nonnegative().catch(0), covered: z.number().int().nonnegative().catch(0), skipped: z.number().int().nonnegative().catch(0), }
  ```
- **totalsSchema** (`src/lib/coverageSchema.ts`, z.object, encadeia catch):
  ```ts
  { statements: metricSchema, branches: metricSchema, functions: metricSchema, lines: metricSchema, }
  ```
- **fileEntrySchema** (`src/lib/coverageSchema.ts`, z.object):
  ```ts
  { path: z.string().min(1), statements: metricSchema, branches: metricSchema, functions: metricSchema, lines: metricSchema, }
  ```
- **safeFilesSchema** (`src/lib/coverageSchema.ts`, z.array, encadeia catch, transform):
  ```ts
  z.unknown()
  ```
- **alertSchema** (`src/lib/coverageSchema.ts`, z.object, encadeia optional):
  ```ts
  { threshold: z.number().finite().nonnegative().catch(2), delta: z.number().finite().nullable().catch(null), dropExceeded: z.boolean().catch(false), previousPct: z.number().finite().min(0).max(100).nullable().catch(null), previousGeneratedAt: z.string().nullable().catch(null), }
  ```
- **coverageReportSchema** (`src/lib/coverageSchema.ts`, z.object, encadeia catch):
  ```ts
  { generatedAt: z .string() .min(1) .catch(() => new Date().toISOString()), totals: totalsSchema, files: safeFilesSchema, alert: alertSchema, }
  ```
- **personFormSchema** (`src/lib/schemas.ts`, z.object):
  ```ts
  { name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'), department: z.string().max(100, 'Departamento muito longo').optional().default(''), role: z.string().max(100, 'Cargo muito longo').optional().default(''), is_active: z.boolean().default(true), list_type: z.enum(['none', 'whitelist', 'blacklist', 'visitor']).default('none'), notes: z.string().max(500, 'Observações muito longas').optional().default(''), }
  ```
- **plateRegistrationSchema** (`src/lib/schemas.ts`, z.object):
  ```ts
  { plate: z .string() .min(7, 'Placa deve ter 7 caracteres') .max(7, 'Placa deve ter 7 caracteres') .regex(plateRegex, 'Formato inválido. Use ABC1D23 ou ABC1234'), owner_name: z.string().max(100).optional().default(''), vehicle_type: z.string().max(50).optional().default('car'), color: z.string().max(30).optional().default(''), notes: z.string().max(500).optional().default(''), list_type: z.enum(['whitelist', 'blacklist', 'visitor']).default('whitelist'), }
  ```
- **cameraFormSchema** (`src/lib/schemas.ts`, z.object):
  ```ts
  { name: z.string().min(2, 'Nome obrigatório').max(100), location: z.string().min(2, 'Localização obrigatória').max(200), stream_url: z.string().url('URL inválida').optional().or(z.literal('')), latitude: z.number().min(-90).max(90).optional().nullable(), longitude: z.number().min(-180).max(180).optional().nullable(), }
  ```
- **ruleFormSchema** (`src/lib/schemas.ts`, z.object):
  ```ts
  { name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100), description: z.string().max(500).optional().default(''), severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'), category: z.enum(['security', 'safety', 'operations', 'access', 'analytics']).default('security'), is_active: z.boolean().default(true), }
  ```
- **emailSchema** (`src/pages/Auth.tsx`, z.string):
  ```ts
  
  ```
- **passwordSchema** (`src/pages/Auth.tsx`, z.string):
  ```ts
  
  ```
- **nameSchema** (`src/pages/Auth.tsx`, z.string, encadeia optional):
  ```ts
  
  ```
- **imageString** (`supabase/functions/_shared/insightface-schemas.ts`, z.string):
  ```ts
  
  ```
- **DetectSchema** (`supabase/functions/_shared/insightface-schemas.ts`, z.object):
  ```ts
  { image: imageString, max_faces: z.number().int().min(1).max(50).optional(), }
  ```
- **EncodeSchema** (`supabase/functions/_shared/insightface-schemas.ts`, z.object):
  ```ts
  { image: imageString, align: z.boolean().optional(), }
  ```
- **AnalyzeSchema** (`supabase/functions/_shared/insightface-schemas.ts`, z.object):
  ```ts
  { image: imageString, }
  ```
- **LivenessSchema** (`supabase/functions/_shared/insightface-schemas.ts`, z.object):
  ```ts
  { image: imageString, threshold: z.number().min(0.5).max(0.99).optional(), }
  ```
- **MigrateBatchSchema** (`supabase/functions/_shared/insightface-schemas.ts`, z.object):
  ```ts
  { batch_size: z.number().int().min(1).max(50).optional(), dry_run: z.boolean().optional(), }
  ```
- **uuid** (`supabase/functions/_shared/publicApiSchemas.ts`, z.string):
  ```ts
  
  ```
- **isoDate** (`supabase/functions/_shared/publicApiSchemas.ts`, z.string, encadeia optional):
  ```ts
  
  ```
- **armDisarmSchema** (`supabase/functions/_shared/publicApiSchemas.ts`, z.object):
  ```ts
  { reason: z.string().trim().min(1).max(500).optional(), scheduled_until: isoDate, }
  ```
- **acknowledgeAlertSchema** (`supabase/functions/_shared/publicApiSchemas.ts`, z.object):
  ```ts
  { note: z.string().trim().max(1000).optional(), }
  ```
- **panicSchema** (`supabase/functions/_shared/publicApiSchemas.ts`, z.object):
  ```ts
  { camera_id: uuid.optional(), latitude: z.number().gte(-90).lte(90).optional(), longitude: z.number().gte(-180).lte(180).optional(), message: z.string().trim().max(500).optional(), }
  ```
- **clipUrlQuerySchema** (`supabase/functions/_shared/publicApiSchemas.ts`, z.object):
  ```ts
  { ttl: z.coerce.number().int().min(60).max(604800).default(3600), }
  ```
- **eventsSummaryQuerySchema** (`supabase/functions/_shared/publicApiSchemas.ts`, z.object):
  ```ts
  { from: isoDate, to: isoDate, group_by: z.enum(['day', 'hour', 'camera', 'severity']).default('day'), }
  ```
- **uuidSchema** (`supabase/functions/_shared/validation.ts`, z.string):
  ```ts
  
  ```
- **imageBase64Schema** (`supabase/functions/_shared/validation.ts`, z.string, encadeia refine):
  ```ts
  
  ```
  - Regras cruzadas (refine): “) ? val.split(”
- **analyzeImageSchema** (`supabase/functions/_shared/validation.ts`, z.object, encadeia refine):
  ```ts
  { imageUrl: z.string().url().optional(), imageBase64: imageBase64Schema.optional(), analysisType: z.enum(['security', 'productivity', 'safety']).default('security'), }
  ```
  - Regras cruzadas (refine): “Either imageUrl or imageBase64 is required”
- **analyzeLicensePlateSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { image: imageBase64Schema, }
  ```
- **detectFacesSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { imageBase64: imageBase64Schema, minConfidence: z.number().min(0).max(1).default(0.5), maxFaces: z.number().int().min(1).max(50).default(10), returnLandmarks: z.boolean().default(false), }
  ```
- **compareFacesSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { sourceImage: imageBase64Schema, targetImage: imageBase64Schema, threshold: z.number().min(0).max(1).default(0.6), }
  ```
- **detectBehaviorSchema** (`supabase/functions/_shared/validation.ts`, z.object, encadeia refine):
  ```ts
  { imageUrl: z.string().url().optional(), imageBase64: imageBase64Schema.optional(), cameraId: z.string().uuid().optional(), cameraName: z.string().max(255).optional(), }
  ```
  - Regras cruzadas (refine): “Either imageUrl or imageBase64 is required”
- **generateFaceEncodingSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { imageBase64: imageBase64Schema, personId: z.string().uuid().optional(), }
  ```
- **testContextSchema** (`supabase/functions/_shared/validation.ts`, z.object, encadeia optional):
  ```ts
  { userId: z.string().uuid().optional(), cameraId: z.string().uuid().optional(), ruleId: z.string().uuid().optional(), }
  ```
- **sendTelegramSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { botToken: z.string().min(10, 'botToken is required'), chatId: z.string().min(1, 'chatId is required'), message: z.string().min(1).max(4096, 'Message too long'), parseMode: z.enum(['HTML', 'Markdown']).default('HTML'), photo: z.string().optional(), testContext: testContextSchema, }
  ```
- **sendAlertNotificationSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { alertId: z.string().min(1, 'alertId is required'), type: z.string().min(1), severity: z.enum(['low', 'medium', 'high', 'critical']), message: z.string().min(1).max(2000), cameraName: z.string().min(1).max(255), timestamp: z.string(), snapshotUrl: z.string().url().optional(), channels: z.array(z.enum(['email', 'telegram', 'whatsapp', 'webhook', 'push'])).min(1), recipients: z .object({ emails: z.array(z.string().email()).optional(), phones: z.array(z.string()).optional(), webhookUrls: z.array(z.string().url()).optional(), }) .optional(), telegram: z .object({ botToken: z.string().min(10), chatId: z.string().min(1), }) .optional(), testContext: testContextSchema, }
  ```
- **pointSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { x: z.number(), y: z.number() }
  ```
- **boundingBoxSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(), }
  ```
- **processAutomationRulesSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { alert: z.object({ id: z.string().min(1), type: z.string(), severity: z.string(), message: z.string(), camera_id: z.string().nullable(), camera_name: z.string(), timestamp: z.string(), user_id: z.string().uuid(), }), detection: z .object({ bounding_box: boundingBoxSchema.nullish(), point: pointSchema.nullish(), }) .nullish(), testContext: testContextSchema, }
  ```
- **adminUsersUpdateRoleSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { user_id: z.string().uuid('user_id must be a valid UUID'), new_role: z.enum(['admin', 'manager', 'operator', 'viewer']), }
  ```
- **uuid** (`supabase/functions/_shared/webhookSchemas.ts`, z.string):
  ```ts
  
  ```
- **isoDatetime** (`supabase/functions/_shared/webhookSchemas.ts`, z.string):
  ```ts
  
  ```
- **IngestAuthSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { action: z.enum(['publish', 'unpublish'], { errorMap: () => ({ message: 'action deve ser "publish" ou "unpublish"' }), }), stream_key: z .string() .min(1, 'stream_key é obrigatório') .regex(/^[a-f0-9]{32,64}$/, 'stream_key deve ser hex de 32-64 caracteres'), protocol: z .enum(['rtmp_push', 'srt_push'], { errorMap: () => ({ message: 'protocol deve ser "rtmp_push" ou "srt_push"' }), }) .optional(), client_ip: z.string().max(64, 'client_ip excede 64 caracteres').optional(), }
  ```
- **IngestAuthSchemaV2** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { action: z.enum(['publish', 'unpublish'], { errorMap: () => ({ message: 'action deve ser "publish" ou "unpublish"' }), }), stream_key: z .string() .min(1, 'stream_key é obrigatório') .regex(/^[a-f0-9]{32,64}$/, 'stream_key deve ser hex de 32-64 caracteres'), protocol: z .enum(['rtmp_push', 'srt_push'], { errorMap: () => ({ message: 'protocol deve ser "rtmp_push" ou "srt_push"' }), }) .optional(), client_ip: z.string().max(64, 'client_ip excede 64 caracteres').optional(), session_id: uuid.optional(), // z.record(keySchema, valueSchema) — keys 1-64 chars, values max 256 chars. // superRefine enforces key count since z.record has no .max() on entries. metadata: z .record(z.string().min(1).max(64), z.string().max(256)) .optional() .superRefine((val, ctx) => { if (val !== undefined && Object.k …
  ```
  - Regras cruzadas (refine): “metadata não pode ter mais de 10 chaves”
- **CspReportLegacyBodySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { 'csp-report': z.record(z.unknown()).optional(), }
  ```
- **CspReportingApiItemSchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { type: z.string().min(1), body: z.record(z.unknown()), age: z.number().optional(), url: z.string().optional(), user_agent: z.string().optional(), }
  ```
- **CspReportingApiArraySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.array):
  ```ts
  CspReportingApiItemSchema
  ```
- **AgentHeartbeatSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { agent_version: z .string() .min(1, 'agent_version não pode ser vazio') .max(40, 'agent_version excede 40 caracteres') .optional(), network_cidr: z.string().max(60, 'network_cidr excede 60 caracteres').optional(), }
  ```
- **AgentHeartbeatSchemaV2** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { agent_version: z .string() .min(1, 'agent_version não pode ser vazio') .max(40, 'agent_version excede 40 caracteres') .optional(), network_cidr: z.string().max(60, 'network_cidr excede 60 caracteres').optional(), capabilities: z.array(z.string().min(1).max(64)).max(50).optional(), region: z.string().max(64).optional(), }
  ```
- **DiscoveryItemSchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { host: z.string().min(1, 'host é obrigatório').max(253, 'host excede 253 caracteres'), // .finite() rejects NaN and Infinity which sneak through bare z.number() port: z .number() .int('port deve ser inteiro') .finite() .min(1, 'port mínimo 1') .max(65535, 'port máximo 65535'), manufacturer: z.string().min(1).max(100).nullish(), model: z.string().min(1).max(100).nullish(), firmware: z.string().min(1).max(100).nullish(), onvif_endpoint: z.string().url('onvif_endpoint deve ser URL válida').nullish(), rtsp_primary: z.string().min(1).max(512).nullish(), rtsp_substream: z.string().min(1).max(512).nullish(), ptz_capable: z.boolean().nullish(), discovered_at: isoDatetime.nullish(), raw: z.unknown().optional(), }
  ```
- **AgentDiscoveriesSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { discoveries: z .array(DiscoveryItemSchema) .min(1, 'discoveries deve ter ao menos 1 item') .max(128, 'discoveries excede o limite de 128 itens'), }
  ```
- **AgentDiscoveriesSchemaV2** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { discoveries: z .array(DiscoveryItemSchema) .min(1, 'discoveries deve ter ao menos 1 item') .max(128, 'discoveries excede o limite de 128 itens'), source: z.enum(['onvif', 'mdns', 'manual']).optional(), scan_duration_ms: z.number().int().finite().min(0).optional(), }
  ```
- **AgentRelayPollSchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { max: z.number().int().finite().min(1).max(8).optional(), }
  ```
- **AgentRelayCompleteSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { task_id: z.string().min(1, 'task_id é obrigatório').max(128), response: z.unknown().optional(), error: z .string() .min(1, 'error não pode ser vazio') .max(500, 'error excede 500 caracteres') .optional(), }
  ```
- **AgentRelayCompleteSchemaV2** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { task_id: z.string().min(1, 'task_id é obrigatório').max(128), response: z.unknown().optional(), error: z .string() .min(1, 'error não pode ser vazio') .max(500, 'error excede 500 caracteres') .optional(), // Bounded to signed 32-bit range to avoid DB integer overflow. exit_code: z.number().int().finite().min(-2_147_483_648).max(2_147_483_647).optional(), duration_ms: z.number().int().finite().min(0).optional(), }
  ```
- **CspAnomalyNotifySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  {}
  ```
- **StreamHealthProbeQuerySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { limit: z.coerce.number().int().min(1).max(200).optional(), }
  ```
- **PreviewTelemetryAlertQuerySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { window: z.coerce.number().int().finite().min(1).max(1440).optional(), min: z.coerce.number().int().finite().min(1).max(100000).optional(), threshold: z.coerce.number().finite().min(0).max(1).optional(), }
  ```
- **ConnectivityResolutionAlertQuerySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { window: z.coerce.number().int().finite().min(1).max(1440).optional(), min: z.coerce.number().int().finite().min(1).max(100000).optional(), threshold: z.coerce.number().finite().min(0).max(1).optional(), }
  ```
- **VaultCoverageWatchdogQuerySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  {}
  ```
- **WatchdogAckSlaAlertSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { force: z.boolean().optional(), // Upper bounds guard against PostgreSQL int4 overflow (max 2,147,483,647). // Practical ceiling: 10080 minutes = 7 days, beyond which SLA values are nonsensical. min_ack: z.number().int().finite().min(0).max(10080).optional(), min_esc: z.number().int().finite().min(0).max(10080).optional(), mtta_cap_min: z.number().int().finite().min(0).max(10080).optional(), }
  ```
- **WatchdogAckSlaAlertQuerySchema** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { force: z.string().optional(), min_ack: z.coerce.number().int().finite().min(0).max(10080).optional(), min_esc: z.coerce.number().int().finite().min(0).max(10080).optional(), mtta_cap_min: z.coerce.number().int().finite().min(0).max(10080).optional(), }
  ```
- **MonitoringCenterDispatchSchemaV1** (`supabase/functions/_shared/webhookSchemas.ts`, z.object):
  ```ts
  { limit: z.number().int().finite().min(1).max(100).optional(), }
  ```
- **bodySchema** (`supabase/functions/camera-credentials-vault/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ z.object({ action: z.literal('store'), camera_id: z.string().uuid(), stream_url: z.string().min(4).max(2048), }), z.object({ action: z.literal('reveal'), camera_id: z.string().uuid() }), z.object({ action: z.literal('audit') }), z.object({ action: z.literal('migrate_batch'), limit: z.number().int().min(1).max(200).default(50), }), z.object({ action: z.literal('rotate_key'), new_key: z.string().min(16).max(512) }), z.object({ action: z.literal('rotate_dek'), camera_id: z.string().uuid() }), z.object({ action: z.literal('rewrap_kek'), new_kek: z.string().min(16).max(512), from_version: z.number().int().min(0).max(255).default(1), to_version: z.number().int().min(1).max(255), limit: z.number().int().min(1).max(1000).default(200), }), z.object({ action: z.literal('backfill_envelope …
  ```
- **bodySchema** (`supabase/functions/promote-test-executions/index.ts`, z.object, encadeia refine):
  ```ts
  { executionIds: z.array(z.string().uuid()).max(500).optional(), sessionId: z.string().uuid().optional(), }
  ```
  - Regras cruzadas (refine): “Informe executionIds ou sessionId”
- **bodySchema** (`supabase/functions/resolve-camera-url/index.ts`, z.object):
  ```ts
  { camera_id: z.string().uuid(), purpose: z.enum(['ptz', 'health', 'restart', 'bandwidth', 'recording']), }
  ```
- **bodySchema** (`supabase/functions/validate-rtsp-stream/index.ts`, z.union):
  ```ts
  [ z.object({ camera_id: z.string().uuid(), target: z.enum(['primary', 'substream']).default('primary'), samples: z.number().int().min(1).max(10).default(5), }), z.object({ rtsp_url: z .string() .min(8) .max(2048) .regex(/^rtsps?:\/\//i), samples: z.number().int().min(1).max(10).default(5), }), ]
  ```

### F.2 react-hook-form (register/rules)

| Campo | Regras | Arquivo |
|---|---|---|
| `ptzConfig.port` | `valueAsNumber: true` | `src/components/cameras/AddCameraDialog.tsx` |
| `ptzConfig.channel` | `valueAsNumber: true` | `src/components/cameras/AddCameraDialog.tsx` |

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `latitude` | type=number, step=any | `src/components/CameraModal.tsx` |
| `longitude` | type=number, step=any | `src/components/CameraModal.tsx` |
| `person-photo` | accept=image/* | `src/components/PersonForm.tsx` |
| `botToken` | type=password | `src/components/TelegramConfig.tsx` |
| `silence-duration` | type=number, min=5, max=1440 | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| `forget-batch` | type=number, min=1, max=500 | `src/components/admin/ForgetUserMediaCard.tsx` |
| `pa-window` | type=number, min=1, max=72 | `src/components/admin/PreviewAlertStatusCard.tsx` |
| `pa-min` | min, type=number, min=1, min | `src/components/admin/PreviewAlertStatusCard.tsx` |
| `pa-threshold` | type=number, min=1, max=100 | `src/components/admin/PreviewAlertStatusCard.tsx` |
| `scheme-name` | max | `src/components/alarms/AlarmSchemeFormDialog.tsx` |
| `add-cam-onvif-port` | pattern=[0-9]* | `src/components/cameras/AddCameraDialog.tsx` |
| `add-cam-user` | disabled=embedded | `src/components/cameras/AddCameraDialog.tsx` |
| `add-cam-pass` | disabled=embedded | `src/components/cameras/AddCameraDialog.tsx` |
| `ptz-port` | type=number, min=1, max=65535 | `src/components/cameras/AddCameraDialog.tsx` |
| `ptz-channel` | type=number, min=1, max=64 | `src/components/cameras/AddCameraDialog.tsx` |
| `nvr-port` | type=number, min=1, max=65535 | `src/components/cameras/AddNvrDialog.tsx` |
| `nvr-channels` | type=number, min=1, max=64 | `src/components/cameras/AddNvrDialog.tsx` |
| `nvr-pass` | type=password | `src/components/cameras/AddNvrDialog.tsx` |
| `ingest-url` | readOnly | `src/components/cameras/CameraIngestPushCard.tsx` |
| `ingest-key` | readOnly | `src/components/cameras/CameraIngestPushCard.tsx` |
| `public-port` | type=number, min=1, max=65535 | `src/components/cameras/PrivateHostBlockedWizard.tsx` |
| `collab-invite-ttl` | type=number, min=1, max=POLICY.maxInviteTtlDays | `src/components/collab/CollabInvitesCard.tsx` |
| `collab-invite-note` | max | `src/components/collab/CollabInvitesCard.tsx` |
| `plan-file` | accept=ACCEPTED.join( | `src/components/emap/UploadPlanDialog.tsx` |
| `face-search-from` | type=datetime-local | `src/components/faces/FaceSearchFilters.tsx` |
| `face-search-to` | type=datetime-local | `src/components/faces/FaceSearchFilters.tsx` |
| `face-search-age-min` | min | `src/components/faces/FaceSearchFilters.tsx` |
| `face-search-age-max` | max | `src/components/faces/FaceSearchFilters.tsx` |
| `mask-sens` | min=0, max=100 | `src/components/motion/MotionMaskEditor.tsx` |
| `nvr-port` | type=number, min=1, max=65535 | `src/components/nvr-downloads/NvrCredentialsDialog.tsx` |
| `nvr-pass` | type=password | `src/components/nvr-downloads/NvrCredentialsDialog.tsx` |
| `photo` | accept=image/jpeg,image/png,image/webp | `src/components/people/PersonFormDialog.tsx` |
| `preset-number` | type=number, min=1, max=32 | `src/components/ptz/PtzSetupWizard.tsx` |
| `preset-name` | max | `src/components/ptz/PtzSetupWizard.tsx` |
| `sch-hour` | type=number, min=0, max=23 | `src/components/schedules/ScheduleForm.tsx` |
| `sch-min` | min, type=number, min=0, max=59, min | `src/components/schedules/ScheduleForm.tsx` |
| `email` | type=email, disabled | `src/pages/ProfilePage.tsx` |
| `threshold` | type=number, min=1, max=20 | `src/pages/StreamAlertThresholdsPage.tsx` |
| `cooldown` | type=number, min=1, max=1440 | `src/pages/StreamAlertThresholdsPage.tsx` |
| `latency` | type=number, min=50, max=10000 | `src/pages/StreamAlertThresholdsPage.tsx` |
| `jitter` | type=number, min=5, max=5000 | `src/pages/StreamAlertThresholdsPage.tsx` |
| `loss` | type=number, min=0, max=100 | `src/pages/StreamAlertThresholdsPage.tsx` |
| `tl-start` | type=number, min=0, max=23 | `src/pages/TimelapsePage.tsx` |
| `tl-end` | type=number, min=1, max=24 | `src/pages/TimelapsePage.tsx` |
| `tl-int` | type=number, min=1, max=120 | `src/pages/TimelapsePage.tsx` |
| `tl-fps` | type=number, min=5, max=60 | `src/pages/TimelapsePage.tsx` |
| `tl-ret` | type=number, min=1, max=365 | `src/pages/TimelapsePage.tsx` |
| `login-email` | type=email | `src/pages/auth/AuthForms.tsx` |
| `register-email` | type=email | `src/pages/auth/AuthForms.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

_nenhum item encontrado_

### G.2 Views (consultas derivadas)

| View | SELECT |
|---|---|
| `cameras_streaming_status` | `SELECT c.id, c.name, c.location, c.status, c.stream_url, c.stream_protocol, c.stream_status, c.fps, c.resolution, c.last_frame_at, (SELECT COUNT(*) FROM public.analysis_sessions WHERE camera_id = c.id AND status = 'running') as active_analyses, (SELECT COUNT(*) FROM public.zones WHERE camera_id = c. …` |
| `face_recognition_dashboard` | `SELECT c.id as camera_id, c.name as camera_name, COUNT(rl.id) as total_recognitions, COUNT(rl.id) FILTER (WHERE rl.is_known) as known_count, COUNT(rl.id) FILTER (WHERE NOT rl.is_known) as unknown_count, COUNT(rl.id) FILTER (WHERE rl.alert_generated) as alerts_count, MAX(rl.created_at) as last_recogn …` |
| `zones_dashboard` | `SELECT z.id, z.name, z.type, z.color, z.enabled, c.name as camera_name, COUNT(ze.id) FILTER (WHERE ze.created_at >= now() - INTERVAL '24 hours') as events_24h, COUNT(ze.id) FILTER (WHERE ze.alert_generated AND ze.created_at >= now() - INTERVAL '24 hours') as alerts_24h, MAX(ze.created_at) as last_ev …` |
| `notifications_dashboard` | `SELECT nc.id, nc.name, nc.enabled, nc.channels, nc.severity_filter, array_length(nc.email_recipients, 1) as email_count, array_length(nc.phone_recipients, 1) as phone_count, nc.last_notification_at, ( SELECT COUNT(*) FROM public.notification_history nh WHERE nh.config_id = nc.id AND nh.created_at >= …` |
| `clips_dashboard` | `SELECT c.id as camera_id, c.name as camera_name, c.location as camera_location, COUNT(vc.id) as total_clips, COUNT(vc.id) FILTER (WHERE vc.trigger = 'alert') as alert_clips, COUNT(vc.id) FILTER (WHERE vc.trigger = 'manual') as manual_clips, COALESCE(SUM(vc.duration), 0) as total_duration, COALESCE(S …` |
| `analysis_dashboard` | `SELECT c.id as camera_id, c.name as camera_name, c.location as camera_location, c.status as camera_status, s.id as session_id, s.status as session_status, s.total_analyses, s.alerts_generated as session_alerts, s.started_at as session_started, s.last_analysis_at, h.analysis_type as last_analysis_typ …` |
| `most_seen_persons` | `SELECT p.id, p.name, p.photo_url, p.list_type, p.company, p.recognition_count, p.last_seen_at, p.last_seen_camera_name FROM public.registered_persons p WHERE p.status = 'active' ORDER BY p.recognition_count DESC LIMIT 20` |
| `camera_bandwidth_hourly` | `SELECT camera_id, user_id, date_trunc('hour', sampled_at) AS hour_bucket, SUM(bytes_received) AS total_bytes, AVG(bitrate_kbps)::NUMERIC(10,2) AS avg_bitrate_kbps, MAX(bitrate_kbps)::NUMERIC(10,2) AS peak_bitrate_kbps, COUNT(*) AS sample_count FROM public.camera_bandwidth_samples GROUP BY camera_id, …` |
| `camera_vault_coverage_alerts` | `WITH stats AS ( SELECT COUNT(*)::INT AS total, COUNT(*) FILTER (WHERE dek_wrapped IS NOT NULL)::INT AS enveloped, COUNT(*) FILTER (WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL)::INT AS legacy, MIN(wrapped_at) FILTER (WHERE dek_wrapped IS NOT NULL) AS oldest_wrap FROM public.camera_cr …` |

### G.3 Funções de cálculo/decisão no código

- **validateMatchers(input)** — `reports/simulations/_wave26_helpers.cjs`
  ```
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'matchers_required' }; if (input.length > MAX_MATCHERS) return { ok: false, error: 'too_many_matchers' }; const out = []; let hasNarrowing = false; for (const raw of input) { if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_matcher' }; const m = raw; const name = typeof m.name === 'string' ? m.name.trim() : ''; const value = typeof m.value === 'string' ? m.value : ''; const isRegex = m.isRegex === …
  ```
- **apply(optionId: string)** — `src/components/alarms/CatalogSelector.tsx`
  ```
  const next = mode === 'single' ? selectSingle(view.selected, optionId) : toggleSelection(view.selected, optionId); onChange(idsToText(next));
  ```
- **generateMockBehavior(cameraName: string)** — `src/components/behavior/useBehaviorAnalysis.ts`
  ```
  const seed = cameraName.length + new Date().getMinutes(); const peopleCount = 6 + (seed % 12); const productivityScore = 55 + ((seed * 7) % 40); const patternCount = 1 + (seed % 3); const patterns: BehavioralPattern[] = Array.from({ length: patternCount }, (_, i) => { const typeIdx = (seed + i) % MOCK_PATTERN_TYPES.length; const locIdx = (seed * 3 + i) % MOCK_LOCATIONS.length; return { pattern_type: MOCK_PATTERN_TYPES[typeIdx]!, confidence: 0.6 + ((seed * (i + 1)) % 35) / 100, severity: (['low', …
  ```
- **apply()** — `src/components/cameras/AddCameraDialog.tsx`
  ```
  const { primary, substream } = renderTemplate(selectedTemplate, { host, port, channel }); form.setValue('rtspUrl', primary, { shouldValidate: true, shouldDirty: true }); form.setValue('substreamUrl', substream ?? '', { shouldValidate: true, shouldDirty: true }); rtspValidation.reset(); substreamValidation.reset(); toast.success('URLs preenchidas pelo template.', { description: 'Ajuste manualmente se sua câmera usa caminho diferente.', });
  ```
- **runValidation(target: 'primary' | 'substream')** — `src/components/cameras/CameraTestHistoryCard.tsx`
  ```
  try { const r = await validate({ mode: 'camera', cameraId, target }); setValidation(r); if (target === 'primary') setLastPrimary(r); else setLastSubstream(r); toast.success(`Validação ${target} concluída: ${r.score.toUpperCase()}`); refetch(); refetchHealth(); } catch (e) { toast.error(`Falha: ${(e as Error).message}`); }
  ```
- **apply(m: FirmwareMatch)** — `src/components/cameras/FirmwareAutodetectCard.tsx`
  ```
  onApply({ brandId: m.brandId, templateId: m.templates[0], profileId: m.profileId, defaultPorts: m.defaultPorts, displayName: m.displayName, score: m.score, }); toast.success(`Sugestão aplicada: ${m.displayName}`);
  ```
- **computeBoxes()** — `src/components/debug/CLSShiftOverlay.tsx`
  ```
  const top = getTopLiveSources(5); return top .map((s, i) => { const r = s.element.getBoundingClientRect(); return { key: `${i}-${s.selector}-${s.timestamp}`, rect: { top: r.top, left: r.left, width: r.width, height: r.height }, selector: s.selector, value: s.value, rank: i, }; }) .filter((b) => b.rect.width > 0 && b.rect.height > 0);
  ```
- **recompute()** — `src/components/debug/CLSShiftOverlay.tsx`
  ```
  cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setBoxes(computeBoxes()));
  ```
- **computePhaseTimeout(sweepMs?: number | null)** — `src/components/ptz/preflightTimeout.ts`
  ```
  const MIN = 4_000; const MAX = 20_000; const FALLBACK = 12_000; if (!sweepMs || !Number.isFinite(sweepMs) || sweepMs <= 0) return FALLBACK; return Math.min(MAX, Math.max(MIN, Math.round(sweepMs * 1.5)));
  ```
- **generatePtzPreflightPdf(input: PreflightPdfInput)** — `src/components/ptz/ptzPreflightPdf.ts`
  ```
  const { jsPDF } = await import('jspdf'); const autoTableModule = await import('jspdf-autotable'); const autoTable = (autoTableModule.default ?? autoTableModule) as ( doc: unknown, options: Record<string, unknown> ) => void; const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const generatedAt = input.generatedAt ?? new Date(); const stamp = generatedAt.toLocaleString('pt-BR'); // Cabeçalho doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Relatório de Pré-voo PTZ', 40, 50); doc.s …
  ```
- **computeRecaptureRequired(validation: ValidationMap, threshold: number = RECAPTURE_THRESHOLD_PCT)** — `src/components/ptz/lib/calibrationRules.ts`
  ```
  const pick = (a: PtzAxis): boolean => { const v = validation[a]; return !!v && v.error_pct > threshold; }; return { pan: pick('pan'), tilt: pick('tilt'), zoom: pick('zoom') };
  ```
- **validateObservedRange(min: number, max: number, bounds: readonly [number, number])** — `src/components/ptz/lib/calibrationRules.ts`
  ```
  if (!Number.isFinite(min) || !Number.isFinite(max)) { return { ok: false, error: 'not_finite' }; } const [lo, hi] = bounds; if (min < lo || max > hi) { return { ok: false, error: 'out_of_bounds' }; } if (min >= max) { return { ok: false, error: 'min_ge_max' }; } return { ok: true };
  ```
- **calculateArrowPoints(from: Point, to: Point)** — `src/components/zone-editor/ZoneEditorTypes.ts`
  ```
  const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2; const angle = Math.atan2(to.y - from.y, to.x - from.x); const arrowSize = 1.5; const p1x = midX + arrowSize * Math.cos(angle); const p1y = midY + arrowSize * Math.sin(angle); const p2x = midX + arrowSize * Math.cos(angle + 2.5); const p2y = midY + arrowSize * Math.sin(angle + 2.5); const p3x = midX + arrowSize * Math.cos(angle - 2.5); const p3y = midY + arrowSize * Math.sin(angle - 2.5); return `${p1x}%,${p1y}% ${p2x}%,${p2y}% $ …
  ```
- **validateEnv()** — `src/config/env.ts`
  ```
  const missing: string[] = []; for (const envVar of requiredEnvVars) { if (!import.meta.env[envVar]) { missing.push(envVar); } } if (missing.length > 0) { if (import.meta.env.DEV) { // Missing env vars validation - silent in production } return false; } return true;
  ```
- **formatCurrency(value: number)** — `src/config/locale.ts`
  ```
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: numberConfig.currency, minimumFractionDigits: numberConfig.minimumFractionDigits, maximumFractionDigits: numberConfig.maximumFractionDigits, }).format(value);
  ```
- **validateEmail(email: string)** — `src/constants/validation.ts`
  ```
  VALIDATION.EMAIL_REGEX.test(email);
  ```
- **validatePassword(password: string)** — `src/constants/validation.ts`
  ```
  
  ```
- **generateStreamKey()** — `src/hooks/useCameraIngest.ts`
  ```
  const bytes = crypto.getRandomValues(new Uint8Array(32)); return Array.from(bytes) .map((b) => b.toString(16).padStart(2, '0')) .join('');
  ```
- **validateScheduleInput(s: ScheduleInput)** — `src/hooks/useCameraSchedules.ts`
  ```
  if (!s.name || !s.name.trim()) return 'Nome é obrigatório'; if (!CRON_RE.test(s.cron_expression)) return 'Expressão CRON inválida (5 campos)'; if (s.scope === 'camera' && !s.camera_id) return 'Selecione a câmera'; if (s.scope === 'group' && !s.group_id) return 'Selecione o grupo'; if (s.scope === 'all' && (s.camera_id || s.group_id)) return 'Escopo "todas" não aceita câmera/grupo'; return null;
  ```
- **invalidate()** — `src/hooks/useCollabGovernance.ts`
  ```
  void queryClient.invalidateQueries({ queryKey: ['collab', 'invitations', networkId] }); void queryClient.invalidateQueries({ queryKey: ['collab', 'memberships', networkId] });
  ```
- **invalidate()** — `src/hooks/useCollabSilence.ts`
  ```
  void queryClient.invalidateQueries({ queryKey: ['collab', 'silence'] }); void queryClient.invalidateQueries({ queryKey: ['collab', 'notifications'] });
  ```
- **validateMask(i: MotionMaskInput)** — `src/hooks/useMotionMasks.ts`
  ```
  if (!i.name?.trim()) return 'Nome é obrigatório'; if (!i.camera_id) return 'Câmera é obrigatória'; if (!Array.isArray(i.polygon) || i.polygon.length < 3) return 'Desenhe pelo menos 3 pontos'; const bad = i.polygon.some( (p) => !Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1 ); if (bad) return 'Pontos precisam estar entre 0 e 1'; return null;
  ```
- **analysisToTimeline(row: Tables<'analysis_history'>)** — `src/hooks/useRealtimeAnalysisHistory.ts`
  ```
  return { id: row.id, type: 'analysis', timestamp: row.timestamp, title: formatAnalysisType(row.analysis_type), description: summarizeResult(row.result), analysisType: row.analysis_type, confidence: row.confidence, };
  ```
- **validateTimelapseInput(i: TimelapseConfigInput)** — `src/hooks/useTimelapse.ts`
  ```
  if (!i.camera_id) return 'Selecione uma câmera'; if (i.capture_interval_minutes < 1 || i.capture_interval_minutes > 120) return 'Intervalo deve estar entre 1 e 120 minutos'; if (i.start_hour < 0 || i.start_hour > 23) return 'Hora inicial inválida'; if (i.end_hour < 1 || i.end_hour > 24) return 'Hora final inválida'; if (i.start_hour >= i.end_hour) return 'Hora inicial deve ser menor que a final'; if (i.fps < 5 || i.fps > 60) return 'FPS deve estar entre 5 e 60'; if (i.retention_days < 1 || i.ret …
  ```
- **round1(value: number)** — `src/lib/agentHealing.ts`
  ```
  return Math.round(value * 10) / 10;
  ```
- **computeDeafRatio(relay: AgentRelayStats, thresholds: AgentHealingThresholds = DEFAULT_AGENT_HEALING_THRESHOLDS)** — `src/lib/agentHealing.ts`
  ```
  const total = relay.done + relay.failed + relay.expired; if (total < thresholds.minTasksForRatio) return null; return (relay.failed + relay.expired) / total;
  ```
- **computeExpiryDate(clip: ClipMetadata, policy: RetentionPolicy)** — `src/lib/clipRetention.ts`
  ```
  if (clip.critical && policy.keepCritical) return null; // nunca expira const days = resolveRetentionDays(policy, clip.objectClass); if (days === 0) return null; // 0 = manter indefinidamente por configuração explícita const created = clip.createdAt instanceof Date ? clip.createdAt : new Date(clip.createdAt); return new Date(created.getTime() + days * 86_400_000);
  ```
- **validatePolicy(policy: RetentionPolicy)** — `src/lib/clipRetention.ts`
  ```
  const errs: string[] = []; if (!Number.isInteger(policy.defaultDays) || policy.defaultDays < 0) { errs.push('defaultDays deve ser inteiro >= 0'); } if (policy.perObject) { for (const [k, v] of Object.entries(policy.perObject)) { if (v !== null && v !== undefined && (!Number.isInteger(v) || v < 0)) errs.push(`perObject.${k} deve ser inteiro >= 0`); } } return errs;
  ```
- **validateFileSignature(file: File, expectedType: string)** — `src/lib/file-validation.ts`
  ```
  const signatures = MAGIC_BYTES[expectedType]; if (!signatures) return true; return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => { const result = reader.result; if (!(result instanceof ArrayBuffer)) { resolve(false); return; } const arr = new Uint8Array(result).subarray(0, 4); let header = ''; for (const byte of arr) { const hex = byte.toString(16).toUpperCase(); header += hex.padStart(2, '0'); } if (expectedType === 'image/webp') { resolve(header.startsWit …
  ```
- **generateRequestId()** — `src/lib/logger.ts`
  ```
  requestIdCounter += 1; return `req_${Date.now()}_${requestIdCounter}`;
  ```
- **shouldLog(level: LogLevel)** — `src/lib/logger.ts`
  ```
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
  ```
- **round1(value: number)** — `src/lib/maintenanceEscalation.ts`
  ```
  return Math.round(value * 10) / 10;
  ```
- **roundHours(hours: number)** — `src/lib/maintenanceSourceAlerts.ts`
  ```
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1);
  ```
- **scanForOffenders()** — `src/lib/mobileNavGuard.ts`
  ```
  const main = document.querySelector('main'); if (!main) return []; const offenders: OffenderInfo[] = []; const candidates = main.querySelectorAll('div, section, article, aside, ul, ol'); candidates.forEach((el) => { if (reported.has(el)) return; if (el.hasAttribute(SCROLL_OWNER_ATTR)) return; // scroll oficial do app if (hasOptOut(el)) return; if (!isScrollContainer(el)) return; const padding = getEffectiveBottomPadding(el); if (padding >= MIN_BOTTOM_PADDING_PX) return; reported.add(el); offende …
  ```
- **generatePDFReport(data: ReportData)** — `src/lib/pdfGenerator.ts`
  ```
  const JsPDF = await loadJsPDF(); const doc = new JsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 15; let yPosition: number; // Header doc.setFillColor(...COLORS.primary); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.text('VISÃO', margin, 20); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Sistema de …
  ```
- **rankResults(items: BenchmarkVariantResult[])** — `src/lib/rtspVariantBenchmark.ts`
  ```
  const sorted = [...items].sort((a, b) => { if (a.status !== b.status) { const order: Record<BenchmarkStatus, number> = { success: 0, warn: 1, failed: 2, error: 3 }; return order[a.status] - order[b.status]; } const sa = a.score ? SCORE_ORDER[a.score] : 3; const sb = b.score ? SCORE_ORDER[b.score] : 3; if (sa !== sb) return sa - sb; const la = a.lossPct ?? Infinity; const lb = b.lossPct ?? Infinity; if (la !== lb) return la - lb; const ma = a.avgLatencyMs ?? Infinity; const mb = b.avgLatencyMs ?? …
  ```
- **validateOne(rtspUrl: string, ctx: BenchmarkContext)** — `src/lib/rtspVariantBenchmark.ts`
  ```
  error: string
  ```
- **shouldSimulateSkeletonFailure(scope: 'cameras' | 'alerts' | 'zones' | 'global')** — `src/lib/skeletonFailureFlag.ts`
  ```
  const mode = getSkeletonFailureMode(); if (mode === 'off') return false; if (mode === 'all') return true; if (scope === 'global') return false; return mode === scope;
  ```
- **scoreLabel(s?: string | null)** — `src/lib/streamQualityReport.ts`
  ```
  
  ```
- **generateAndDownloadStreamReport(input: StreamReportInput)** — `src/lib/streamQualityReport.ts`
  ```
  const data = await buildStreamQualityReport(input); const doc = await generatePDFReport(data); const safeName = input.camera.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase(); downloadPDF(doc, `relatorio_stream_${safeName}`);
  ```
- **applyCameraSetup(cameraId: string, zones: WizardZoneInput[], rules: WizardRuleInput[])** — `src/lib/wizardClient.ts`
  ```
  ok: boolean; camera_id: string; zone_ids: string[]; rule_ids: string[]; from_cache?: boolean;
  ```
- **validatePolygon(points: Point[])** — `src/lib/zoneGeometry.ts`
  ```
  const errors: string[] = []; const cleaned = dedupVertices(points); if (cleaned.length < 3) errors.push('Polígono precisa de pelo menos 3 vértices distintos'); if (cleaned.length >= 3) { const area = polygonArea(cleaned); if (area < MIN_AREA) errors.push('Área do polígono é muito pequena'); if (hasSelfIntersection(cleaned)) errors.push('Polígono não pode se auto-cruzar'); } return { ok: errors.length === 0, errors, cleaned };
  ```
- **ledgerIsBalanced(ledger: AdmissionLedger)** — `src/lib/alarms/admissionLedger.ts`
  ```
  const sum = ADMISSION_REASONS.reduce((acc, r) => acc + (ledger.counts[r] ?? 0), 0); const admittedSum = (ledger.counts.admitted ?? 0) + (ledger.counts.admitted_degraded ?? 0); const perSource = ledger.bySource.reduce((acc, s) => acc + s.total, 0); return sum === ledger.total && admittedSum === ledger.admitted && perSource === ledger.total;
  ```
- **planIsBalanced(plan: RetentionPlan)** — `src/lib/alarms/admissionRetention.ts`
  ```
  return plan.deleted + plan.kept + plan.quarantined + plan.deferred === plan.examined;
  ```
- **applySourceReport(rule: AlarmRule, state: EpisodeState, report: SourceReport, options: { tzOffsetMinutes?: number } = {})** — `src/lib/alarms/alarmAggregation.ts`
  ```
  const base: EpisodeState = state && typeof state === 'object' ? clone(state) : emptyEpisode(); const diagnosis = diagnoseRule(rule); const effective = diagnosis.effectiveSourceIds; if (diagnosis.health === 'disabled') return ignore('rule_disabled', base, effective); if (diagnosis.health === 'inoperative') return ignore('rule_inoperative', base, effective); if ( !report || typeof report.sourceId !== 'string' || (report.state !== 'active' && report.state !== 'clear') || !isClock(report.at) ) { ret …
  ```
- **applyOpen(ledger: RecurrenceLedger, seriesKey: string, at: number, severity: RecurrenceSeverity, cfg?: Partial<RecurrenceConfig> |)** — `src/lib/alarms/alarmEpisodeBridge.ts`
  ```
  const mutation = openEpisode(ledger, { at, severity }, cfg); if (mutation.ignored !== null) { return skip(mutation.ledger, 'ledger_rejected', mutation.ignored); } return { ledger: mutation.ledger, commands: [{ kind: 'open', seriesKey, at, severity }], skipped: null, rejected: null, };
  ```
- **applyClose(ledger: RecurrenceLedger, seriesKey: string, at: number, cfg?: Partial<RecurrenceConfig> | null)** — `src/lib/alarms/alarmEpisodeBridge.ts`
  ```
  const mutation = closeEpisode(ledger, { at }, cfg); if (mutation.ignored !== null) { return skip(mutation.ledger, 'ledger_rejected', mutation.ignored); } return { ledger: mutation.ledger, commands: [{ kind: 'close', seriesKey, at }], skipped: null, rejected: null, };
  ```
- **scoreOf(klass: RecurrenceClass, mode: NoticeMode, severity: RecurrenceSeverity | null, episodes: number, chatter: number)** — `src/lib/alarms/chronicSeriesBoard.ts`
  ```
  
  ```
- **applyDwellObservation(open: DwellSessionState | null, observation: DwellObservation)** — `src/lib/analytics/dwellTracker.ts`
  ```
  if (!observation.trackKey || observation.trackKey.trim().length === 0) { return { ok: false, reason: 'missing_track_key' }; } if (observation.confidence < DWELL_POLICY.minConfidence) { return { ok: false, reason: 'low_confidence' }; } const fresh: DwellSessionState = { startedAt: observation.observedAt, lastSeenAt: observation.observedAt, detections: 1, peakConfidence: observation.confidence, }; if (!open) return { ok: true, action: 'opened', session: fresh }; if (observation.observedAt <= open. …
  ```
- **shouldAlertDwell(session: DwellSessionState, thresholdSeconds?: number)** — `src/lib/analytics/dwellTracker.ts`
  ```
  const threshold = Math.max( thresholdSeconds ?? DWELL_POLICY.minDwellSeconds, DWELL_POLICY.minDwellSeconds ); return session.detections >= DWELL_POLICY.minDetections && dwellSeconds(session) >= threshold;
  ```
- **canTransitionInvite(from: InviteStatus, to: InviteStatus)** — `src/lib/collab/collabGovernance.ts`
  ```
  
  ```
- **canTransitionMembership(from: MembershipStatus, to: MembershipStatus)** — `src/lib/collab/collabGovernance.ts`
  ```
  
  ```
- **shouldRevokeEntriesOnChange(action: GovernanceAction)** — `src/lib/collab/collabGovernance.ts`
  ```
  
  ```
- **membershipIsOperational(status: MembershipStatus | null)** — `src/lib/collab/collabGovernance.ts`
  ```
  
  ```
- **round(value: number)** — `src/lib/devices/deviceSilence.ts`
  ```
  Math.round(value);
  ```
- **shouldAutoRelease(port: Pick<IoPortConfig, 'direction' | 'lastState' | 'activeSinceMs'>, nowMs: number, maxHoldMs: number = MAX_HOLD_MS)** — `src/lib/devices/ioSafety.ts`
  ```
  if (port.direction !== 'output') return false; if (port.lastState !== 'active') return false; if (port.activeSinceMs === null || port.activeSinceMs === undefined) return false; return nowMs - port.activeSinceMs >= maxHoldMs;
  ```
- **applyAttempt(evidence: PathEvidence, outcome: { succeeded: boolean; failureKind?: FailureKind }, nowMs: number)** — `src/lib/devices/pathFailover.ts`
  ```
  const attempts = evidence.attempts + 1; if (outcome.succeeded) { return { attempts, successes: evidence.successes + 1, consecutiveTransportFailures: 0, lastTransportFailureAtMs: evidence.lastTransportFailureAtMs, lastFailureKind: 'none', }; } const kind: FailureKind = outcome.failureKind ?? 'transport'; const blames = blamesPath(kind); return { attempts, successes: evidence.successes, consecutiveTransportFailures: blames ? evidence.consecutiveTransportFailures + 1 : evidence.consecutiveTransport …
  ```
- **rankAttention(ledger: AttentionLedger, now: number)** — `src/lib/emap/attentionClock.ts`
  ```
  return Object.values(ledger) .slice() .sort((a, b) => { const bySeverity = severityRank(a.status) - severityRank(b.status); if (bySeverity !== 0) return bySeverity; const byAge = attentionAge(b, now) - attentionAge(a, now); if (byAge !== 0) return byAge; return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0; });
  ```
- **rankOf(item: PlanNavItem)** — `src/lib/emap/attentionRouter.ts`
  ```
  severityRank(item.worst);
  ```
- **severityRank(status: MapMarkerStatus)** — `src/lib/emap/floorPlanGeometry.ts`
  ```
  const index = STATUS_SEVERITY.indexOf(status); return index === -1 ? STATUS_SEVERITY.indexOf('unknown') : index;
  ```
- **severityRank(status: MapMarkerStatus)** — `src/lib/emap/markerPulse.ts`
  ```
  const index = SEVERITY.indexOf(status); return index === -1 ? SEVERITY.indexOf('unknown') : index;
  ```
- **severityRank(status: MapMarkerStatus)** — `src/lib/emap/markerStatusStream.ts`
  ```
  const index = SEVERITY.indexOf(status); return index === -1 ? SEVERITY.indexOf('unknown') : index;
  ```
- **applyStatusEvent(ledger: StatusLedger, event: StatusEvent)** — `src/lib/emap/markerStatusStream.ts`
  ```
  if (typeof event?.cameraId !== 'string' || event.cameraId.length === 0) { return { ledger, outcome: 'invalid' }; } if (!isFiniteNumber(event.observedAt)) { return { ledger, outcome: 'invalid' }; } const incoming = toMarkerStatus(event.status); const current = ledger[event.cameraId]; if (!current) { return { ledger: { ...ledger, [event.cameraId]: { status: incoming, observedAt: event.observedAt } }, outcome: 'applied', }; } if (event.observedAt < current.observedAt) { return { ledger, outcome: 's …
  ```
- **applyStatusEvents(ledger: StatusLedger, events: readonly StatusEvent[])** — `src/lib/emap/markerStatusStream.ts`
  ```
  return events.reduce<StatusLedger>( (accumulated, event) => applyStatusEvent(accumulated, event).ledger, ledger );
  ```
- **emptyTotals()** — `src/lib/emap/shiftHandoff.ts`
  ```
  normalized: 0, acknowledged: 0, removed: 0
  ```
- **sanitizeTotals(raw: unknown)** — `src/lib/emap/shiftJournalStore.ts`
  ```
  if (!isRecord(raw)) return null; const totals: ShiftTotals = { normalized: 0, acknowledged: 0, removed: 0 }; for (const reason of REASONS) { const value = raw[reason]; if (!isCount(value)) return null; totals[reason] = Math.floor(value); } return totals;
  ```
- **severityRank(status: MapMarkerStatus)** — `src/lib/emap/statusAlertPolicy.ts`
  ```
  const index = SEVERITY.indexOf(status); return index === -1 ? SEVERITY.indexOf('unknown') : index;
  ```
- **escalationRank(level: EscalationLevel)** — `src/lib/emap/triageEscalation.ts`
  ```
  const index = ESCALATION_ORDER.indexOf(level); return index < 0 ? 0 : index;
  ```
- **emptyTotals()** — `src/lib/emap/triageQueue.ts`
  ```
  total: 0, open: 0, acknowledged: 0, promoted: 0, offPlan: 0, byBand: { fresh: 0, sustained: 0, prolonged: 0 }, byPlan: [],
  ```
- **computeRootHash(manifest: CustodyManifest, hashFn: HashFn = sha256Hex)** — `src/lib/evidence/custodyManifest.ts`
  ```
  return hashText( manifestBody( { exportId: manifest.exportId, cameraId: manifest.cameraId, requestedBy: manifest.requestedBy, requestedFromUtc: manifest.requestedFromUtc, requestedToUtc: manifest.requestedToUtc, segments: manifest.segments, transformations: manifest.transformations, pixelsAltered: manifest.pixelsAltered, generatedAtUtc: manifest.generatedAtUtc, systemVersion: manifest.systemVersion, }, manifest.assessment, manifest.chain ), hashFn );
  ```
- **severityRank(outcome: ConferenceOutcome)** — `src/lib/faces/attestationConference.ts`
  ```
  return ORDER.indexOf(outcome);
  ```
- **score(d)** — `src/lib/faces/referenceMatch.ts`
  ```
  entry: GalleryEntry; similarity: number | null
  ```
- **computeStats(timeline: PersonTimeline)** — `src/lib/faces/timelineAttestation.ts`
  ```
  let confirmedDwellMs = 0; let openFloorMs = 0; let confirmedStays = 0; for (const stay of timeline.stays) { if (stay.confidence === 'confirmed') confirmedStays += 1; if (stay.openAtEdge) openFloorMs += stay.durationMs; else if (stay.confidence === 'confirmed') confirmedDwellMs += stay.durationMs; } return { stays: timeline.stays.length, confirmedStays, camerasVisited: timeline.camerasVisited, confirmedDwellMs, openFloorMs, excludedReadings: timeline.excluded.unverified + timeline.excluded.spoofS …
  ```
- **recomputeVerdictFromDocument(attestation: TimelineAttestation)** — `src/lib/faces/timelineAttestation.ts`
  ```
  const codes = attestation.caveats.filter((c) => c.count > 0).map((c) => c.code); if (codes.some((c) => CONTESTING.has(c))) return 'contested'; if (attestation.stays.length === 0) return 'inconclusive'; if (codes.some((c) => WEAKENING.has(c))) return 'partial'; return 'corroborated';
  ```
- **roundKeepingSign(value: number)** — `src/lib/maintenance/ownerAging.ts`
  ```
  const rounded = Math.round(value * 10) / 10; if (value > 0 && rounded <= 0) return 0.1; if (value <= 0 && rounded > 0) return 0; return rounded;
  ```
- **computeOwnerAging(key: OwnerFilterKey, rows: readonly MaintenanceAlertView[])** — `src/lib/maintenance/ownerAging.ts`
  ```
  const open = rows.filter((row) => row.status === 'open'); if (open.length === 0) return { key, ...IDLE_BASE }; let oldest = 0; let tightest = Number.POSITIVE_INFINITY; let breached = 0; let atRisk = 0; let worst: OwnerSlaState = 'on_track'; for (const row of open) { const sla = slaFor(key, row.severity); const age = Number.isFinite(row.ageMinutes) ? Math.max(0, row.ageMinutes) : 0; const state = alertSlaState(age, sla); if (age > oldest) oldest = age; tightest = Math.min(tightest, sla - age); if …
  ```
- **bucketRank(bucket: OwnerBucket)** — `src/lib/maintenance/ownerFilter.ts`
  ```
  if (bucket.key === 'all') return -1; if (bucket.key === 'unrouted') return Number.MAX_SAFE_INTEGER; return 0;
  ```
- **applyOwnerFilter(rows: readonly MaintenanceAlertView[], key: OwnerFilterKey)** — `src/lib/maintenance/ownerFilter.ts`
  ```
  if (key === 'all') return rows; return rows.filter((row) => ownerKeyOf(row) === key);
  ```
- **shouldRenderNavBadge(badge: NavBadgeValue)** — `src/lib/navigation/navBadge.ts`
  ```
  if (badge === undefined || badge === null) return false; if (typeof badge === 'number') return Number.isFinite(badge) && badge > 0; return badge.trim().length > 0;
  ```
- **applyHeartbeat(registry: DetachedRegistry, beat: { cameraId: string; windowName: string; at: number })** — `src/lib/views/detachedMonitor.ts`
  ```
  const current = registry[beat.cameraId]; // Batida de uma janela que não é mais a titular é ignorada: evita que uma // janela órfã sequestre o registro da janela vigente. if (current && current.windowName !== beat.windowName) return registry; return { ...registry, [beat.cameraId]: { cameraId: beat.cameraId, windowName: beat.windowName, openedAt: current?.openedAt ?? beat.at, lastHeartbeatAt: Math.max(current?.lastHeartbeatAt ?? beat.at, beat.at), }, };
  ```
- **applyClosed(registry: DetachedRegistry, cameraId: string)** — `src/lib/views/detachedMonitor.ts`
  ```
  if (!registry[cameraId]) return registry; const next = { ...registry }; delete next[cameraId]; return next;
  ```
- **healthRank(health: CameraHealth)** — `src/lib/vision/pipelineFleet.ts`
  ```
  return HEALTH_RANK[health];
  ```
- **pressureRank(pressure: CameraPressure)** — `src/lib/vision/pipelineFleet.ts`
  ```
  return PRESSURE_RANK[pressure];
  ```
- **boxIsValid(box: RawDetection['box'])** — `src/lib/vision/processorContract.ts`
  ```
  if (box === undefined) return true; const values = [box.x, box.y, box.w, box.h]; if (!values.every(isFiniteNumber)) return false; if (box.w <= 0 || box.h <= 0) return false; return box.x >= 0 && box.y >= 0 && box.x + box.w <= 1.000001 && box.y + box.h <= 1.000001;
  ```
- **validateForm(isSignUp: boolean)** — `src/pages/Auth.tsx`
  ```
  const e: Record<string, string> = {}; const er = emailSchema.safeParse(email); if (!er.success) e.email = er.error.issues[0]?.message ?? 'Email inválido'; const pr = passwordSchema.safeParse(password); if (!pr.success) e.password = pr.error.issues[0]?.message ?? 'Senha inválida'; if (isSignUp && fullName) { const nr = nameSchema.safeParse(fullName); if (!nr.success) e.fullName = nr.error.issues[0]?.message ?? 'Nome inválido'; } // Block weak/leaked passwords on signup if (isSignUp && !e.password …
  ```
- **generateProductivityData(_persons: Array<{ id: string; name: string; department: string | null }>)** — `src/pages/ProductivityDashboardPage.tsx`
  ```
  return [];
  ```
- **generateKPIs(id: string, name: string, dept: string | null, goals: KPIGoal[])** — `src/pages/goals-alerts/goalsTypes.ts`
  ```
  // Sem dados reais de activity_logs: current = 0 para metas "higher" (nada medido = desvio máximo) // e current = 0 para metas "lower" (zero pausas = dentro da meta). Isso evita falso positivo 100%. const kpis = goals .filter((g) => g.enabled) .map((g) => { const current = 0; const deviation = g.direction === 'higher' ? (g.target > 0 ? 100 : 0) : 0; let status: 'on_track' | 'warning' | 'critical' = 'on_track'; if (deviation > g.alertThreshold) status = 'critical'; else if (deviation > g.alertThr …
  ```
- **generateBlobSASQueryParameters(options: Record<string, unknown>, credential: unknown)** — `src/types/optional-deps.d.ts`
  ```
  toString(): string
  ```
- **calculateSimilarity(encoding1: number[], encoding2: number[])** — `src/types/faceRecognition/helpers.ts`
  ```
  if (encoding1.length !== encoding2.length) return 0; let sumSquares = 0; for (let i = 0; i < encoding1.length; i++) { sumSquares += Math.pow((encoding1[i] ?? 0) - (encoding2[i] ?? 0), 2); } const distance = Math.sqrt(sumSquares); return Math.max(0, 1 - distance / 1.5);
  ```
- **calculatePolygonArea(points: Point[])** — `src/types/zones/helpers.ts`
  ```
  let area = 0; const n = points.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n; const pi = points[i]!, pj = points[j]!; area += pi.x * pj.y - pj.x * pi.y; } return Math.abs(area / 2);
  ```
- **generateZoneColor()** — `src/types/zones/helpers.ts`
  ```
  return ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)] ?? ZONE_COLORS[0];
  ```
- **validationError422(message: string, fields: FieldError[], cors: Record<string, string> = {}, version: ContractVersion = 'v1')** — `supabase/functions/_shared/contractValidation.ts`
  ```
  const body: ValidationErrorBody = { code: 'VALIDATION_ERROR', message, fields, contract_version: version, }; return new Response(JSON.stringify(body), { status: 422, headers: { ...cors, 'Content-Type': 'application/json' }, });
  ```
- **computeRootHash(manifest: CustodyManifest, hashFn: HashFn = sha256Hex)** — `supabase/functions/_shared/custodyManifest.ts`
  ```
  return hashText( manifestBody( { exportId: manifest.exportId, cameraId: manifest.cameraId, requestedBy: manifest.requestedBy, requestedFromUtc: manifest.requestedFromUtc, requestedToUtc: manifest.requestedToUtc, segments: manifest.segments, transformations: manifest.transformations, pixelsAltered: manifest.pixelsAltered, generatedAtUtc: manifest.generatedAtUtc, systemVersion: manifest.systemVersion, }, manifest.assessment, manifest.chain ), hashFn );
  ```
- **shouldAutoRelease(port: Pick<IoPortConfig, 'direction' | 'lastState' | 'activeSinceMs'>, nowMs: number, maxHoldMs: number = MAX_HOLD_MS)** — `supabase/functions/_shared/ioSafety.ts`
  ```
  if (port.direction !== 'output') return false; if (port.lastState !== 'active') return false; if (port.activeSinceMs === null || port.activeSinceMs === undefined) return false; return nowMs - port.activeSinceMs >= maxHoldMs;
  ```
- **shouldLog(level: LogLevel)** — `supabase/functions/_shared/logger.ts`
  ```
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']; return levels.indexOf(level) >= levels.indexOf(this.level);
  ```
- **validatePathBody(body: unknown)** — `supabase/functions/_shared/mediamtxPath.ts`
  ```
  if (body === null || typeof body !== 'object' || Array.isArray(body)) { return { ok: false, reason: 'body-not-object' }; } const clean: Record<string, unknown> = Object.create(null); for (const key of Object.keys(body as Record<string, unknown>)) { if (DANGEROUS_KEYS.has(key)) return { ok: false, reason: `dangerous-key:${key}` }; if (RUN_ON.test(key)) return { ok: false, reason: `forbidden-exec-field:${key}` }; if (!ALLOWED_FIELDS.has(key)) return { ok: false, reason: `unknown-field:${key}` }; c …
  ```
- **computeStats(timeline: PersonTimeline)** — `supabase/functions/_shared/timelineAttestation.ts`
  ```
  let confirmedDwellMs = 0; let openFloorMs = 0; let confirmedStays = 0; for (const stay of timeline.stays) { if (stay.confidence === 'confirmed') confirmedStays += 1; if (stay.openAtEdge) openFloorMs += stay.durationMs; else if (stay.confidence === 'confirmed') confirmedDwellMs += stay.durationMs; } return { stays: timeline.stays.length, confirmedStays, camerasVisited: timeline.camerasVisited, confirmedDwellMs, openFloorMs, excludedReadings: timeline.excluded.unverified + timeline.excluded.spoofS …
  ```
- **recomputeVerdictFromDocument(attestation: TimelineAttestation)** — `supabase/functions/_shared/timelineAttestation.ts`
  ```
  const codes = attestation.caveats.filter((c) => c.count > 0).map((c) => c.code); if (codes.some((c) => CONTESTING.has(c))) return 'contested'; if (attestation.stays.length === 0) return 'inconclusive'; if (codes.some((c) => WEAKENING.has(c))) return 'partial'; return 'corroborated';
  ```
- **generateToken()** — `supabase/functions/agent-pair/index.ts`
  ```
  const bytes = crypto.getRandomValues(new Uint8Array(32)); return Array.from(bytes) .map((b) => b.toString(16).padStart(2, '0')) .join('');
  ```
- **validateMatchers(input: unknown)** — `supabase/functions/alertmanager-silence/index.ts`
  ```
  ok: true; matchers: Matcher[]
  ```
- **applyLimits(command: PtzCommand, params: NonNullable<PtzPayload['params']>, limits: Limits)** — `supabase/functions/camera-ptz-control/index.ts`
  ```
  params: NonNullable<PtzPayload['params']>; adjusted: AdjustedMap
  ```
- **validateReplayPayload(body: ReplayPayload | null | undefined)** — `supabase/functions/replay-rule-execution/validation.ts`
  ```
  ok: true; value: ValidatedReplay
  ```
- **invokeValidate(cameraId: string, userId: string, target: 'primary' | 'substream')** — `supabase/functions/rtsp-revalidate-scheduler/index.ts`
  ```
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-rtsp-stream`, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', 'x-internal-invoke': '1', 'x-internal-user-id': userId, }, body: JSON.stringify({ camera_id: cameraId, target, samples: 3 }), }); const body = await res.json().catch(() => ({})); return { ok: res.ok, status: res.status, score: (body as { score?: string }).score ?? null };
  ```
- **computeScore(i: { ok: boolean; latencyAvg: number; jitter: number; lossPct: number; })** — `supabase/functions/validate-rtsp-stream/suggestions.ts`
  ```
  if (!i.ok) return 'critical'; if (i.lossPct > 20 || i.jitter > 150 || i.latencyAvg > 800) return 'critical'; if (i.lossPct > 0 || i.jitter > 50 || i.latencyAvg > 300) return 'warn'; return 'ok';
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `-23.5505 + index * 0.0005,` | `src/components/CameraMap.tsx` |
| `-46.6333 + index * 0.001,` | `src/components/CameraMap.tsx` |
| `border-radius: 50%;` | `src/components/CameraMap.tsx` |
| `viewBox={`0 0 ${size} ${size * 0.85}`}` | `src/components/Gauge.tsx` |
| `else if (recent < prev * 0.8) trend = 'down';` | `src/components/HeatmapVisualization.tsx` |
| `Math.max(0, num + Math.sin(i * 1.2) * (num * 0.15) + (i - 3) * (num * 0.03))` | `src/components/StatsCard.tsx` |
| `0%, 100% {` | `src/components/TourHighlight.tsx` |
| `50% {` | `src/components/TourHighlight.tsx` |
| `{lowCache} abaixo de 95%` | `src/components/admin/TableCacheStatsCard.tsx` |
| `100% sinaliza over-indexing.` | `src/components/admin/TableSizeStatsCard.tsx` |
| `d={getArcPath(segment.startAngle, segment.angle, size * 0.25, size * 0.45)}` | `src/components/analytics/DonutChart.tsx` |
| `backgroundColor: `hsl(var(--destructive) / ${Math.max(intensity * 0.8, 0.1)})`,` | `src/components/analytics/HourlyHeatmap.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/cameras/EnhancedCameraGrid.tsx` |
| `+3% vs ontem` | `src/components/dashboard/DashboardAlerts.tsx` |
| `minutes: Math.round(totalMin * 0.1),` | `src/components/journey/useJourneyData.ts` |
| `minutes: Math.round(totalMin * 0.25),` | `src/components/journey/useJourneyData.ts` |
| `minutes: Math.round(totalMin * 0.4),` | `src/components/journey/useJourneyData.ts` |
| `{ zoneName: 'Estacionamento', minutes: Math.round(totalMin * 0.1), type: 'idle' },` | `src/components/journey/useJourneyData.ts` |
| `{ zoneName: 'Refeitório', minutes: Math.round(totalMin * 0.15), type: 'idle' },` | `src/components/journey/useJourneyData.ts` |
| `rateRef.current = rateRef.current > 0 ? rateRef.current * 0.6 + instant * 0.4 : instant;` | `src/components/nvr-downloads/NvrDownloadJobRow.tsx` |
| `// Usa 30% do range disponível na direção escolhida (mín 0.10, máx 0.40).` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `Math.abs(pLast - p0) > STALL_EPSILON * range * 0.5` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `await ptz.zoom(dir * 0.6, 4);` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `await ptz.zoom(direction * 0.6, 4);` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `axis === 'pan' ? { pan: direction * 0.6, tilt: 0 } : { pan: 0, tilt: direction * 0.6 };` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `const SAT_EPS = (hi - lo) * 0.01; // 1% do range` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `const params = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `const targetDelta = Math.max(0.1, Math.min(0.4, available * 0.3));` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `if (axis === 'zoom') await ptz.zoom(dir * 0.6, 4);` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `if (mv === false && Math.abs(pLast - p0) > STALL_EPSILON * range * 0.5) break;` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `const knobRadius = size * 0.18;` | `src/components/ptz/PtzJoystick.tsx` |
| `r={radius * 0.65}` | `src/components/ptz/PtzJoystick.tsx` |
| `/** Desvio máximo tolerado antes de sinalizar "desvio" (10% do range). */` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `const p = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `if (axis === 'zoom') await ptz.zoom(dir * 0.6, APPROACH_SPEED);` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `const p = axis === 'pan' ? { pan: dir * 0.6, tilt: 0 } : { pan: 0, tilt: dir * 0.6 };` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `if (axis === 'zoom') await ptz.zoom(dir * 0.6, APPROACH_SPEED);` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `transition={{ delay: index * 0.05, duration: 0.3 }}` | `src/components/settings/GeneralSettingsTab.tsx` |
| `superior a 99.8% (LFW benchmark).` | `src/components/settings/InsightFaceMigrationBanner.tsx` |
| `delay: index * 0.04,` | `src/components/sidebar/components/nav/CategoryItem.tsx` |
| `if (info.velocity.y > 500 \|\| info.offset.y > getSnapHeight(0) * 0.5) {` | `src/components/ui/BottomSheet.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/ui/CameraFocusMode.tsx` |
| `transition={{ duration: 0.2, delay: index * 0.03 }}` | `src/components/ui/DataTable.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/ui/EventTimeline.tsx` |
| `transition={{ delay: index * 0.05, duration: 0.3 }}` | `src/components/ui/EventTimeline.tsx` |
| `* 100% da API pública e o mesmo comportamento visual.` | `src/components/ui/LoadingState.tsx` |
| `transition: { delay: i * 0.05, duration: 0.3 },` | `src/components/ui/LoadingState.tsx` |
| `transition={{ delay: i * 0.05, duration: 0.5 }}` | `src/components/ui/LoadingState.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/ui/NotificationCenter.tsx` |
| `setPullDistance(Math.min(diff * 0.5, threshold * 1.5));` | `src/components/ui/mobile/PullToRefresh.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/widgets/WidgetCatalog.tsx` |
| `--foreground: 0 0% 0%; --background: 0 0% 100%; --primary: 0 0% 0%; --border: 0 0% 0%;` | `src/contexts/a11y/styles.ts` |
| `--foreground: 0 0% 100%; --background: 0 0% 0%; --primary: 0 0% 100%; --border: 0 0% 100%;` | `src/contexts/a11y/styles.ts` |
| `if (cellValue > heatmapData.maxValue * 0.8) {` | `src/hooks/useHeatmap.tsx` |
| `items.filter((i) => i.status === 'detected').length >= requiredPPE.length * 0.5;` | `src/hooks/usePPEDetection.ts` |
| `* julgar 1 tarefa expirada como 100% de surdez geraria reinícios espúrios.` | `src/lib/agentHealing.ts` |
| `// 15% por varredura: numa frota de 60, no máximo 9 reinícios a cada 10 min.` | `src/lib/agentRestartBudget.ts` |
| `// 40% da frota muda ⇒ a causa é do ambiente, não dos agentes.` | `src/lib/agentRestartBudget.ts` |
| `await playBeep(config.frequency, 200, config.volume * 0.85, config.tone);` | `src/lib/alertSounds.ts` |
| `// Função pura + tipos. Sem I/O, sem estado. Testável 100%.` | `src/lib/clipRetention.ts` |
| `* 100% client/edge-safe. Sem I/O, sem dependências externas.` | `src/lib/firmwareDetector.ts` |
| `* 100% client/edge-safe: sem I/O, sem dependências. Cada assinatura define` | `src/lib/firmwareFingerprints.ts` |
| `* A biblioteca é 100% client/edge-safe: sem I/O, sem dependências externas.` | `src/lib/onvifProfiles.ts` |
| `* desse outlier e projetaria saturação falsa; a mediana ignora até ~29% de pontos` | `src/lib/partitionBacklogTrend.ts` |
| `* tem taxa de 50% — e não significa absolutamente nada. Usar a proporção crua` | `src/lib/relayRedeliveryHealth.ts` |
| `* atribuição — declarar "culpado encontrado" quando 70% do backlog vem de outra` | `src/lib/rootCauseCorrelation.ts` |
| `* resíduo da DEFAULT é 82% do bucket `pre_2000`". Três verdades soltas que o` | `src/lib/rootCauseCorrelation.ts` |
| `// larga que a janela de backlog produziria atribuição > 100%.` | `src/lib/rootCauseCorrelation.ts` |
| `* A biblioteca é 100% client-side (estática, sem fetch) e não altera schema/DB.` | `src/lib/rtspTemplates.ts` |
| `const MIN_AREA = 0.0001; // 0.01% da imagem normalizada` | `src/lib/zoneGeometry.ts` |
| `* O corte usa o **piso do intervalo de Wilson a 95%** — a mesma régua já` | `src/lib/devices/commandReliability.ts` |
| `* Piso do intervalo de Wilson a 95% (z = 1.96).` | `src/lib/devices/commandReliability.ts` |
| `* ordens não sejam tratados como 66% de doença estabelecida.` | `src/lib/devices/commandReliability.ts` |
| `/** Piso de Wilson 95% da taxa de silêncio — a régua da decisão. */` | `src/lib/devices/commandReliability.ts` |
| `* A promoção exige piso de Wilson 95% superior ao do preferido por uma margem` | `src/lib/devices/pathFailover.ts` |
| `/** Piso de Wilson 95% da taxa de sucesso observada. */` | `src/lib/devices/pathFailover.ts` |
| `* empréstimos longos; o piso de 45 s cobre empréstimos curtos, em que 30% de` | `src/lib/devices/pullPointLease.ts` |
| `* min, com tremor de ±20% derivado por FNV-1a do identificador da assinatura` | `src/lib/devices/pullPointLease.ts` |
| `* quando não houve atendimento concluído. Nunca 0 ms, nunca 100%.` | `src/lib/emap/shiftPerformance.ts` |
| `* `null` quando ainda não há atendimento concluído — nunca fingimos 100%.` | `src/lib/emap/triageSla.ts` |
| `* valor entre 20% do orçamento e `dueSoonFloorMs`, para que o aviso chegue` | `src/lib/emap/triageSla.ts` |
| `return Math.min(budgetMs * 0.2, floor);` | `src/lib/emap/triageSla.ts` |
| `* (≥75% do prazo) → `breached` (prazo estourado). Três nomes cabem num` | `src/lib/maintenance/ownerAging.ts` |
| `/** Quantos abertos estão em risco (≥75% do prazo) sem ter estourado. */` | `src/lib/maintenance/ownerAging.ts` |
| `* F3 — Confiabilidade sem desfecho é desconhecida (`null`), nunca 100%.` | `src/lib/vision/pipelineFleet.ts` |
| `* e por quê**. Sem isso, uma câmera que descarta 90% dos frames por` | `src/lib/vision/pipelineMetrics.ts` |
| `// Score 0..100 pondera 70% sucesso + 30% latência (<300ms ideal, >1500ms zero)` | `src/pages/CameraStatusPage.tsx` |
| `const score = Math.round(successRate * 70 + latScore * 0.3);` | `src/pages/CameraStatusPage.tsx` |
| `transition={{ delay: i * 0.03 }}` | `src/pages/CollaboratorFlowMapPage.tsx` |
| `<span>10% (tolerante)</span>` | `src/pages/evaluation/ThresholdCard.tsx` |
| `<span>10% (↑ falsos positivos)</span>` | `src/pages/evaluation/ThresholdCard.tsx` |
| `<span>99% (sensível)</span>` | `src/pages/evaluation/ThresholdCard.tsx` |
| `<span>99% (↑ falsos negativos)</span>` | `src/pages/evaluation/ThresholdCard.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/pages/goals-alerts/CollaboratorKPICard.tsx` |
| `// e current = 0 para metas "lower" (zero pausas = dentro da meta). Isso evita falso positivo 100%.` | `src/pages/goals-alerts/goalsTypes.ts` |
| `else if (deviation > g.alertThreshold * 0.5) status = 'warning';` | `src/pages/goals-alerts/goalsTypes.ts` |
| `* empréstimos longos; o piso de 45 s cobre empréstimos curtos, em que 30% de` | `supabase/functions/_shared/pullPointLease.ts` |
| `* min, com tremor de ±20% derivado por FNV-1a do identificador da assinatura` | `supabase/functions/_shared/pullPointLease.ts` |
| `* exponential backoff (300ms base, ×3, +25% jitter). Total budget` | `supabase/functions/_shared/replicate.ts` |
| `const jitter = base * 0.25 * Math.random();` | `supabase/functions/_shared/replicate.ts` |
| `const jitter = delay * 0.2 * Math.random();` | `supabase/functions/_shared/retry.ts` |
| `const val = Math.sin(seed * (i + 1)) * Math.cos(i * 0.1);` | `supabase/functions/generate-face-encoding/index.ts` |
| `* Cache hit rate on continuous camera feeds: ~90% → ~10× cost reduction.` | `supabase/functions/insightface-encode/index.ts` |
| `const p95 = ls[Math.min(ls.length - 1, Math.floor(ls.length * 0.95))];` | `supabase/functions/validate-rtsp-stream/rtspClient.ts` |
| `// 429 é sinal esperado em burst; falha só se ultrapassar 20% do total.` | `tests/load/k6-camera-previews.js` |
| `http_req_duration: ['p(95)<500'], // 95% das requisições devem ser < 500ms` | `tests/load/k6-load-test.js` |
| `http_req_failed: ['rate<0.01'], // Menos de 1% de falhas` | `tests/load/k6-load-test.js` |
| `* - Circuit breaker se >20% de falhas em 5min.` | `workers/media-uploader/index.mjs` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `WS_DISCOVERY_ADDR` | `'239.255.255.250'` | `agent/src/discover.ts` |
| `WS_DISCOVERY_PORT` | `3702` | `agent/src/discover.ts` |
| `AGENT_VERSION` | `'1.0.0'` | `agent/src/index.ts` |
| `MIN_MINUTES` | `5` | `reports/simulations/_wave26_helpers.cjs` |
| `MAX_HISTORY` | `8` | `src/components/SearchInput.tsx` |
| `DEFAULT_JOB` | `'connectivity-resolution-alert-hourly'` | `src/components/admin/CronJobRunsCard.tsx` |
| `THRESHOLD` | `3` | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| `BACKLOG_ALERT_THRESHOLD` | `50` | `src/components/admin/PartitionDrainCard.tsx` |
| `QUARANTINE_ALERT_THRESHOLD` | `10` | `src/components/admin/PartitionQuarantineCard.tsx` |
| `CRITICAL_STREAK_ALERT_THRESHOLD` | `2` | `src/components/cameras/CameraTestHistoryCard.tsx` |
| `LIVE_PREVIEW_DEFAULT_SECONDS` | `60` | `src/components/cameras/LivePreviewPlayer.tsx` |
| `LIVE_PREVIEW_EXTEND_SECONDS` | `60` | `src/components/cameras/LivePreviewPlayer.tsx` |
| `LIVE_PREVIEW_MAX_EXTENSIONS` | `3` | `src/components/cameras/LivePreviewPlayer.tsx` |
| `LIVE_PREVIEW_HLS_TIMEOUT_MS` | `10` | `src/components/cameras/LivePreviewPlayer.tsx` |
| `DAY_MS` | `86` | `src/components/collab/CollabSilenceControl.tsx` |
| `CONE_RADIUS_RATIO` | `0.14` | `src/components/emap/FloorPlanCanvas.tsx` |
| `MAX_BYTES` | `12` | `src/components/emap/UploadPlanDialog.tsx` |
| `CONCURRENCY` | `4` | `src/components/local-agents/RelayCameraTestCard.tsx` |
| `STALE_THRESHOLD_MS` | `36` | `src/components/local-agents/RelayPurgeHistoryCard.tsx` |
| `DAY_MS` | `86` | `src/components/permissions/CapabilityGrantsCard.tsx` |
| `HEIGHT` | `40` | `src/components/ptz/PtzAxisRangeVisualizer.tsx` |
| `PAD_X` | `4` | `src/components/ptz/PtzAxisRangeVisualizer.tsx` |
| `FULL_SWEEP_MS` | `8000` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `POLL_INTERVAL_MS` | `200` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `MEASURE_TIMEOUT_MS` | `15` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `STALL_EPSILON` | `0.005` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `STALL_CONFIRM_SAMPLES` | `3` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `RECAPTURE_THRESHOLD_PCT` | `10` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `CALIBRATION_EXPORT_VERSION` | `1` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `POLL_INTERVAL_MS` | `200` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `TARGET_TOLERANCE` | `0.02` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `DEVIATION_WARN` | `0.1` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `APPROACH_SPEED` | `3` | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| `MAX_HISTORY` | `30` | `src/components/ptz/PtzLiveStatusPanel.tsx` |
| `POLL_INTERVAL_MS` | `200` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `TARGET_TOLERANCE` | `0.02` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `DEVIATION_WARN` | `0.1` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `APPROACH_SPEED` | `3` | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| `SPEED` | `0.6` | `src/components/ptz/QuickPtzBar.tsx` |
| `DIRECT` | `'__direct__'` | `src/components/ptz/RelayAgentSelector.tsx` |
| `MIN` | `4` | `src/components/ptz/preflightTimeout.ts` |
| `MAX` | `20` | `src/components/ptz/preflightTimeout.ts` |
| `FALLBACK` | `12` | `src/components/ptz/preflightTimeout.ts` |
| `RECAPTURE_THRESHOLD_PCT` | `10` | `src/components/ptz/lib/calibrationRules.ts` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `'16rem'` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `'18rem'` | `src/components/ui/sidebar.tsx` |
| `LOCALE` | `'pt-BR'` | `src/config/locale.ts` |
| `TIMEZONE` | `'America/Sao_Paulo'` | `src/config/locale.ts` |
| `APP_VERSION` | `'1.0.0'` | `src/constants/app.ts` |
| `API_TIMEOUT` | `30000` | `src/constants/app.ts` |
| `REFRESH_INTERVAL` | `5000` | `src/constants/app.ts` |
| `MAX_CAMERAS` | `16` | `src/constants/app.ts` |
| `MAX_ZONES` | `50` | `src/constants/app.ts` |
| `MAX_RULES` | `100` | `src/constants/app.ts` |
| `DEFAULT_LANGUAGE` | `'pt-BR'` | `src/constants/app.ts` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/use-mobile.tsx` |
| `TOAST_LIMIT` | `1` | `src/hooks/use-toast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/use-toast.ts` |
| `FETCH_LIMIT` | `30` | `src/hooks/useAdmissionPurgeHistory.ts` |
| `RETENTION_DAYS` | `365` | `src/hooks/useAdmissionReconcile.ts` |
| `DRAIN_INTERVAL_MS` | `3` | `src/hooks/useAlarmRecurrenceQueue.ts` |
| `CLS_THRESHOLD` | `0.1` | `src/hooks/useCLSAlert.ts` |
| `PAGE_SIZE` | `50` | `src/hooks/useCollabNotifications.ts` |
| `RELIABILITY_WINDOW_MS` | `30` | `src/hooks/useCommandReliability.ts` |
| `ZOOM_MIN` | `1` | `src/hooks/useDigitalZoom.ts` |
| `ZOOM_MAX` | `8` | `src/hooks/useDigitalZoom.ts` |
| `RUN_SAMPLE` | `24` | `src/hooks/useDispatchDeliverability.ts` |
| `SUPPRESSION_WINDOW_HOURS` | `168` | `src/hooks/useDispatchSuppressions.ts` |
| `LIST_LIMIT` | `200` | `src/hooks/useEvidenceExports.ts` |
| `MAX_ROWS` | `500` | `src/hooks/useFaceSearch.ts` |
| `CLIENT_MAX_BYTES` | `2` | `src/hooks/useFirmwareDetection.ts` |
| `BUCKET` | `'camera-snapshots'` | `src/hooks/useFirstSnapshot.ts` |
| `BUFFER_SECONDS` | `60` | `src/hooks/useFrameBuffer.ts` |
| `MAX_FRAMES_PER_CAMERA` | `120` | `src/hooks/useFrameBuffer.ts` |
| `DEFAULT_BEFORE` | `30` | `src/hooks/useFrameBuffer.ts` |
| `DEFAULT_AFTER` | `30` | `src/hooks/useFrameBuffer.ts` |
| `SYNC_DEBOUNCE_MS` | `800` | `src/hooks/useManagedFilters.ts` |
| `UNDO_WINDOW_MS` | `10000` | `src/hooks/useManagedFilters.ts` |
| `PROXY_FN` | `'mediamtx-proxy'` | `src/hooks/useMediaMTX.ts` |
| `MAX_RETRIES` | `3` | `src/hooks/useOfflineSync.ts` |
| `MAX_ITEMS` | `50` | `src/hooks/useRealtimeAnalysisHistory.ts` |
| `MAX_GALLERY` | `2000` | `src/hooks/useReferenceFaceMatch.ts` |
| `ONLINE_WINDOW_SEC` | `120` | `src/hooks/useRelayAgentHealth.ts` |
| `STALE_WINDOW_SEC` | `300` | `src/hooks/useRelayAgentHealth.ts` |
| `BUCKET` | `'site-plans'` | `src/hooks/useSitePlans.ts` |
| `DEFAULT_MAX_SIZE` | `5` | `src/hooks/useStorage.ts` |
| `DEFAULT_CACHE_CONTROL` | `'3600'` | `src/hooks/useStorage.ts` |
| `DEFAULT_TITLE` | `'VIS-O'` | `src/hooks/useTitle.ts` |
| `BUCKET` | `'camera-clips'` | `src/hooks/clip-recorder/useClipStorage.ts` |
| `ALERT_COOLDOWN_MS` | `30000` | `src/hooks/plate-detections/plateDetectionTypes.ts` |
| `RESULT` | `'lovable-preview-auth:result'` | `src/integrations/supabase/previewAuthStorage.ts` |
| `TIMEOUT` | `2000` | `src/integrations/supabase/previewAuthStorage.ts` |
| `RETRY_DELAY` | `250` | `src/integrations/supabase/previewAuthStorage.ts` |
| `MINUTE_MS` | `60` | `src/lib/agentHealing.ts` |
| `POLL_INTERVAL_MS` | `5` | `src/lib/buildVersion.ts` |
| `RELOAD_FLAG` | `'visao-build-reload-once'` | `src/lib/buildVersion.ts` |
| `BUCKET` | `'camera-clips'` | `src/lib/clipStorageUrls.ts` |
| `FLUSH_INTERVAL_MS` | `10` | `src/lib/errorReporter.ts` |
| `MAX_QUEUE_SIZE` | `20` | `src/lib/errorReporter.ts` |
| `DEDUP_WINDOW_MS` | `30` | `src/lib/errorReporter.ts` |
| `MINUTE` | `1` | `src/lib/escalationProfiles.ts` |
| `HOUR` | `60` | `src/lib/escalationProfiles.ts` |
| `DAY` | `24` | `src/lib/escalationProfiles.ts` |
| `CHUNK` | `128` | `src/lib/firmwareDetector.ts` |
| `STRONG_STRING_WEIGHT` | `0.35` | `src/lib/firmwareDetector.ts` |
| `WEAK_STRING_WEIGHT` | `0.1` | `src/lib/firmwareDetector.ts` |
| `MAGIC_WEIGHT` | `0.4` | `src/lib/firmwareDetector.ts` |
| `ONVIF_STRONG_WEIGHT` | `0.5` | `src/lib/firmwareDetector.ts` |
| `MINUTE_MS` | `60` | `src/lib/maintenanceEscalation.ts` |
| `HOUR_MS` | `3` | `src/lib/maintenanceSourceAlerts.ts` |
| `MOBILE_BREAKPOINT_PX` | `768` | `src/lib/mobileNavGuard.ts` |
| `MIN_BOTTOM_PADDING_PX` | `64` | `src/lib/mobileNavGuard.ts` |
| `SCROLL_OWNER_ATTR` | `'data-app-scroll'` | `src/lib/mobileNavGuard.ts` |
| `OPT_OUT_ATTR` | `'data-allow-no-mobile-nav-padding'` | `src/lib/mobileNavGuard.ts` |
| `MAX_ENTRIES` | `500` | `src/lib/navigationCLSLog.ts` |
| `DB_VERSION` | `2` | `src/lib/offlineStorage.ts` |
| `HOUR_MS` | `3` | `src/lib/partitionBacklogTrend.ts` |
| `RING_MAX` | `200` | `src/lib/perfMetrics.ts` |
| `WILSON_Z` | `1.959963984540054` | `src/lib/relayRedeliveryHealth.ts` |
| `HOUR_MS` | `3` | `src/lib/rootCauseCorrelation.ts` |
| `EPSILON` | `1` | `src/lib/zoneGeometry.ts` |
| `MIN_AREA` | `0.0001` | `src/lib/zoneGeometry.ts` |
| `ADMISSION_BACKLOG_JOB` | `'ledger_purge'` | `src/lib/alarms/admissionBacklogAlert.ts` |
| `ADMISSION_BACKLOG_LABEL` | `'Expurgo do livro de admissão'` | `src/lib/alarms/admissionBacklogAlert.ts` |
| `PERSIST_RUNS` | `3` | `src/lib/alarms/admissionBacklogAlert.ts` |
| `COOLDOWN_FLOOR_MINUTES` | `60` | `src/lib/alarms/admissionBacklogAlert.ts` |
| `COOLDOWN_CEILING_MINUTES` | `1440` | `src/lib/alarms/admissionBacklogAlert.ts` |
| `OTHER_BUCKET` | `'__other__'` | `src/lib/alarms/admissionLedger.ts` |
| `DEFAULT_MAX_SOURCES` | `200` | `src/lib/alarms/admissionLedger.ts` |
| `ADMISSION_RECONCILE_JOB` | `'ledger_stock'` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `RECONCILE_CADENCE_MINUTES` | `24` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `COOLDOWN_FLOOR_MINUTES` | `60` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `COOLDOWN_CEILING_MINUTES` | `1440` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `BENIGN_RACE_REASON` | `'inventario_anterior_a_execucao'` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `DEFAULT_LABEL` | `'Conciliação do livro de admissão'` | `src/lib/alarms/admissionOrphanAlert.ts` |
| `PERSIST_SAMPLES` | `3` | `src/lib/alarms/admissionOrphanTrend.ts` |
| `DEFAULT_WINDOW` | `14` | `src/lib/alarms/admissionOrphanTrend.ts` |
| `PURGE_CADENCE_MINUTES` | `24` | `src/lib/alarms/admissionPurgeHistory.ts` |
| `LATE_FACTOR` | `2` | `src/lib/alarms/admissionPurgeHistory.ts` |
| `STALLED_FACTOR` | `4` | `src/lib/alarms/admissionPurgeHistory.ts` |
| `TREND_WINDOW` | `3` | `src/lib/alarms/admissionPurgeHistory.ts` |
| `RETENTION_DAYS_MIN` | `30` | `src/lib/alarms/admissionRetention.ts` |
| `RETENTION_DAYS_MAX` | `3650` | `src/lib/alarms/admissionRetention.ts` |
| `RETENTION_DAYS_DEFAULT` | `365` | `src/lib/alarms/admissionRetention.ts` |
| `BATCH_CAP_MIN` | `1` | `src/lib/alarms/admissionRetention.ts` |
| `BATCH_CAP_MAX` | `500` | `src/lib/alarms/admissionRetention.ts` |
| `BATCH_CAP_DEFAULT` | `50` | `src/lib/alarms/admissionRetention.ts` |
| `MS_PER_DAY` | `86` | `src/lib/alarms/admissionRetention.ts` |
| `ADMISSION_TREND_JOB` | `'ledger_stock'` | `src/lib/alarms/admissionTrendAlert.ts` |
| `TREND_CADENCE_MINUTES` | `24` | `src/lib/alarms/admissionTrendAlert.ts` |
| `COOLDOWN_FLOOR_MINUTES` | `60` | `src/lib/alarms/admissionTrendAlert.ts` |
| `COOLDOWN_CEILING_MINUTES` | `1440` | `src/lib/alarms/admissionTrendAlert.ts` |
| `MAX_PERIODS_PER_DAY` | `6` | `src/lib/alarms/alarmAggregation.ts` |
| `MINUTES_PER_DAY` | `1440` | `src/lib/alarms/alarmAggregation.ts` |
| `MAX_EVENT_CHANNELS` | `36` | `src/lib/alarms/alarmScheme.ts` |
| `DISCONNECT_THRESHOLD_DEFAULT_S` | `180` | `src/lib/alarms/alarmScheme.ts` |
| `DISCONNECT_THRESHOLD_MIN_S` | `30` | `src/lib/alarms/alarmScheme.ts` |
| `DISCONNECT_THRESHOLD_MAX_S` | `3600` | `src/lib/alarms/alarmScheme.ts` |
| `MIN_NOTE_LENGTH` | `3` | `src/lib/alarms/alarmTreatment.ts` |
| `MAX_NOTE_LENGTH` | `2000` | `src/lib/alarms/alarmTreatment.ts` |
| `DEFAULT_LIMIT` | `25` | `src/lib/alarms/chronicSeriesBoard.ts` |
| `QUEUE_SCHEMA_VERSION` | `1` | `src/lib/alarms/episodeCommandQueue.ts` |
| `SNAPSHOT_RETENTION_DAYS_MIN` | `90` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `SNAPSHOT_RETENTION_DAYS_MAX` | `3650` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `SNAPSHOT_RETENTION_DAYS_DEFAULT` | `730` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `SNAPSHOT_BATCH_CAP_MIN` | `1` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `SNAPSHOT_BATCH_CAP_MAX` | `100` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `SNAPSHOT_BATCH_CAP_DEFAULT` | `10` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `ANCHOR_KEEP` | `7` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `MS_PER_DAY` | `86` | `src/lib/alarms/reconcileSnapshotRetention.ts` |
| `STALE_ACTIONABLE_HOURS` | `24` | `src/lib/collab/collabNavBadge.ts` |
| `DAY_MS` | `86` | `src/lib/collab/collabNotificationSilencing.ts` |
| `MIN_SAMPLE` | `5` | `src/lib/devices/commandReliability.ts` |
| `SUSPECT_THRESHOLD` | `0.2` | `src/lib/devices/commandReliability.ts` |
| `DEAF_THRESHOLD` | `0.5` | `src/lib/devices/commandReliability.ts` |
| `HYSTERESIS` | `0.05` | `src/lib/devices/commandReliability.ts` |
| `ROTATION_GRACE_MS` | `5` | `src/lib/devices/deviceEnrollment.ts` |
| `ENROLLMENT_TTL_MS` | `24` | `src/lib/devices/deviceEnrollment.ts` |
| `DEVICE_CODE_LENGTH` | `12` | `src/lib/devices/deviceEnrollment.ts` |
| `HEARTBEAT_MINUTES` | `15` | `src/lib/devices/deviceSilence.ts` |
| `WARN_FACTOR` | `3` | `src/lib/devices/deviceSilence.ts` |
| `CRITICAL_FACTOR` | `8` | `src/lib/devices/deviceSilence.ts` |
| `ROTATION_GRACE_MINUTES` | `10` | `src/lib/devices/deviceSilence.ts` |
| `DENIAL_WINDOW_MINUTES` | `60` | `src/lib/devices/deviceSilence.ts` |
| `CLOCK_SKEW_TOLERANCE_MINUTES` | `2` | `src/lib/devices/deviceSilence.ts` |
| `MINUTE` | `60` | `src/lib/devices/deviceSilence.ts` |
| `MIN_PULSE_MS` | `100` | `src/lib/devices/ioSafety.ts` |
| `MAX_PULSE_MS` | `60` | `src/lib/devices/ioSafety.ts` |
| `MAX_HOLD_MS` | `3` | `src/lib/devices/ioSafety.ts` |
| `ABSOLUTE_MIN_INTERVAL_MS` | `250` | `src/lib/devices/ioSafety.ts` |
| `RENEW_FLOOR_MS` | `45` | `src/lib/devices/pullPointLease.ts` |
| `RENEW_FRACTION` | `0.3` | `src/lib/devices/pullPointLease.ts` |
| `BACKOFF_BASE_MS` | `5` | `src/lib/devices/pullPointLease.ts` |
| `BACKOFF_CAP_MS` | `300` | `src/lib/devices/pullPointLease.ts` |
| `BACKOFF_JITTER` | `0.2` | `src/lib/devices/pullPointLease.ts` |
| `MIN_LEASE_MS` | `60` | `src/lib/devices/pullPointLease.ts` |
| `MAX_LEASE_MS` | `600` | `src/lib/devices/pullPointLease.ts` |
| `MAX_TTL_MINUTES` | `30` | `src/lib/devices/remoteCommandAdmission.ts` |
| `MIN_TTL_MINUTES` | `1` | `src/lib/devices/remoteCommandAdmission.ts` |
| `IDEMPOTENCY_WINDOW_MINUTES` | `10` | `src/lib/devices/remoteCommandAdmission.ts` |
| `DELIVERY_LEASE_MS` | `60` | `src/lib/devices/remoteCommandDelivery.ts` |
| `MAX_DELIVERY_ATTEMPTS` | `3` | `src/lib/devices/remoteCommandDelivery.ts` |
| `MAX_SHORTCUTS` | `9` | `src/lib/emap/planNavigator.ts` |
| `FLAPPING_THRESHOLD` | `3` | `src/lib/emap/shiftHandoff.ts` |
| `SHIFT_STATE_SCHEMA_VERSION` | `1` | `src/lib/emap/shiftJournalStore.ts` |
| `ACK_SCHEMA_VERSION` | `1` | `src/lib/emap/triageAck.ts` |
| `DOSSIER_FORMAT` | `'visao.custody.dossier'` | `src/lib/evidence/custodyDossier.ts` |
| `DOSSIER_VERSION` | `1` | `src/lib/evidence/custodyDossier.ts` |
| `DOSSIER_ALGORITHM` | `'SHA-256'` | `src/lib/evidence/custodyDossier.ts` |
| `GAP_TOLERANCE_MS` | `1` | `src/lib/evidence/custodyManifest.ts` |
| `OVERLAP_TOLERANCE_MS` | `1` | `src/lib/evidence/custodyManifest.ts` |
| `CLOCK_SKEW_TOLERANCE_MS` | `5` | `src/lib/evidence/custodyManifest.ts` |
| `MIN_COVERAGE_RATIO` | `0.98` | `src/lib/evidence/custodyManifest.ts` |
| `DOSSIER_FORMAT` | `'visao.timeline.dossier'` | `src/lib/faces/attestationBatch.ts` |
| `CANDIDATE_MARGIN` | `0.1` | `src/lib/faces/faceSearch.ts` |
| `LIVENESS_FLOOR` | `0.5` | `src/lib/faces/faceSearch.ts` |
| `MAX_WINDOW_DAYS` | `31` | `src/lib/faces/faceSearch.ts` |
| `MIN_SIMILARITY` | `0.3` | `src/lib/faces/faceSearch.ts` |
| `MAX_SIMILARITY` | `0.99` | `src/lib/faces/faceSearch.ts` |
| `MAX_CAMERAS` | `64` | `src/lib/faces/faceSearch.ts` |
| `UNKNOWN_ATTRIBUTE_POLICY` | `'exclude'` | `src/lib/faces/faceSearch.ts` |
| `DAY_MS` | `24` | `src/lib/faces/faceSearch.ts` |
| `MAX_BUCKETS` | `480` | `src/lib/faces/faceTimeline.ts` |
| `SESSION_GAP_MS` | `5` | `src/lib/faces/personTimeline.ts` |
| `EDGE_TOLERANCE_MS` | `60` | `src/lib/faces/personTimeline.ts` |
| `MIN_TRANSIT_MS` | `0` | `src/lib/faces/personTimeline.ts` |
| `MAX_STAYS` | `200` | `src/lib/faces/personTimeline.ts` |
| `DEFAULT_MATCH_THRESHOLD` | `0.5` | `src/lib/faces/referenceMatch.ts` |
| `REFERENCE_CANDIDATE_MARGIN` | `0.1` | `src/lib/faces/referenceMatch.ts` |
| `AMBIGUITY_MARGIN` | `0.05` | `src/lib/faces/referenceMatch.ts` |
| `REFERENCE_LIVENESS_FLOOR` | `0.5` | `src/lib/faces/referenceMatch.ts` |
| `MIN_MATCH_THRESHOLD` | `0.3` | `src/lib/faces/referenceMatch.ts` |
| `MAX_MATCH_THRESHOLD` | `0.99` | `src/lib/faces/referenceMatch.ts` |
| `MAX_MATCHES` | `25` | `src/lib/faces/referenceMatch.ts` |
| `ATTESTATION_FORMAT` | `'visao.timeline.attestation'` | `src/lib/faces/timelineAttestation.ts` |
| `ATTESTATION_VERSION` | `1` | `src/lib/faces/timelineAttestation.ts` |
| `ATTESTATION_ALGORITHM` | `'SHA-256'` | `src/lib/faces/timelineAttestation.ts` |
| `PROMISE_FLOOR_MINUTES` | `30` | `src/lib/maintenance/acknowledgementDecay.ts` |
| `PROMISE_CEILING_MINUTES` | `1440` | `src/lib/maintenance/acknowledgementDecay.ts` |
| `MINUTE_MS` | `60` | `src/lib/maintenance/conditionSilence.ts` |
| `DELIVERABILITY_JOB` | `'maintenance_alerts_dispatch'` | `src/lib/maintenance/deliverabilityAlert.ts` |
| `COOLDOWN_FLOOR_MINUTES` | `60` | `src/lib/maintenance/deliverabilityAlert.ts` |
| `COOLDOWN_CEILING_MINUTES` | `1440` | `src/lib/maintenance/deliverabilityAlert.ts` |
| `DEFAULT_LABEL` | `'Despacho externo de manutenção'` | `src/lib/maintenance/deliverabilityAlert.ts` |
| `DISPATCH_CADENCE_MINUTES` | `60` | `src/lib/maintenance/dispatchDeliverability.ts` |
| `GRACE_MINUTES` | `15` | `src/lib/maintenance/dispatchDeliverability.ts` |
| `MS_PER_MINUTE` | `60` | `src/lib/maintenance/dispatchDeliverability.ts` |
| `MINUTE_MS` | `60` | `src/lib/maintenance/maintenanceConsoleView.ts` |
| `AT_RISK_FRACTION` | `0.75` | `src/lib/maintenance/ownerAging.ts` |
| `SUPPRESSION_ROW_CAP` | `2000` | `src/lib/maintenance/suppressionLedger.ts` |
| `SUPPRESSION_RETENTION_DAYS_MIN` | `30` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_RETENTION_DAYS_MAX` | `730` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_RETENTION_DAYS_DEFAULT` | `90` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_BATCH_CAP_MIN` | `1` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_BATCH_CAP_MAX` | `100` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_BATCH_CAP_DEFAULT` | `20` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_ANCHOR_MIN` | `1` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_ANCHOR_MAX` | `1` | `src/lib/maintenance/suppressionRetention.ts` |
| `SUPPRESSION_ANCHOR_DEFAULT` | `3` | `src/lib/maintenance/suppressionRetention.ts` |
| `MS_PER_DAY` | `86` | `src/lib/maintenance/suppressionRetention.ts` |
| `MAX_WINDOW_MINUTES` | `43` | `src/lib/maintenance/suppressionRetention.ts` |
| `NAV_BADGE_MAX` | `99` | `src/lib/navigation/navBadge.ts` |
| `MAX_GRANT_DAYS` | `90` | `src/lib/permissions/grantConsole.ts` |
| `MIN_REASON_LENGTH` | `8` | `src/lib/permissions/grantConsole.ts` |
| `CLOSED_RETENTION_DAYS` | `365` | `src/lib/retention/alarmRecurrenceRetention.ts` |
| `ABANDONED_OPEN_DAYS` | `30` | `src/lib/retention/alarmRecurrenceRetention.ts` |
| `MAX_DELETE_PER_RUN` | `5000` | `src/lib/retention/alarmRecurrenceRetention.ts` |
| `MIN_SAMPLES` | `3` | `src/lib/retention/episodeBridgeWatch.ts` |
| `TREND_WINDOW_HOURS` | `72` | `src/lib/retention/episodeBridgeWatch.ts` |
| `NOISE_FLOOR` | `3` | `src/lib/retention/episodeBridgeWatch.ts` |
| `WARN_GROWTH` | `5` | `src/lib/retention/episodeBridgeWatch.ts` |
| `CRITICAL_GROWTH` | `20` | `src/lib/retention/episodeBridgeWatch.ts` |
| `ABSOLUTE_CRITICAL_FLOOR` | `100` | `src/lib/retention/episodeBridgeWatch.ts` |
| `ABANDONED_OPEN_DAYS` | `30` | `src/lib/retention/episodeReconciliation.ts` |
| `MAX_RECONCILE_PER_RUN` | `500` | `src/lib/retention/episodeReconciliation.ts` |
| `DAY_MS` | `86` | `src/lib/retention/episodeReconciliation.ts` |
| `COOLDOWN_FLOOR_MINUTES` | `60` | `src/lib/retention/retentionAlerts.ts` |
| `COOLDOWN_CEILING_MINUTES` | `360` | `src/lib/retention/retentionAlerts.ts` |
| `MS_PER_MINUTE` | `60` | `src/lib/retention/retentionDebut.ts` |
| `GRACE_MINUTES` | `15` | `src/lib/retention/retentionRegistry.ts` |
| `WARN_CADENCE_FACTOR` | `2` | `src/lib/retention/retentionRegistry.ts` |
| `STALLED_CADENCE_FACTOR` | `4` | `src/lib/retention/retentionRegistry.ts` |
| `DEBUT_CADENCE_FACTOR` | `1` | `src/lib/retention/retentionRegistry.ts` |
| `MAX_DETACHED_WINDOWS` | `6` | `src/lib/views/detachedMonitor.ts` |
| `HEARTBEAT_TIMEOUT_MS` | `15` | `src/lib/views/detachedMonitor.ts` |
| `HEARTBEAT_INTERVAL_MS` | `4` | `src/lib/views/detachedMonitor.ts` |
| `DETACHED_CHANNEL` | `'visao:detached-monitors'` | `src/lib/views/detachedMonitor.ts` |
| `MAX_SLOT_INDEX` | `31` | `src/lib/views/favoriteViewRestore.ts` |
| `MAX_FAVORITE_VIEWS` | `24` | `src/lib/views/favoriteViewRestore.ts` |
| `DEFAULT_MAX_CASCADE` | `4` | `src/lib/vision/pipelineCycle.ts` |
| `DEFAULT_FACE_THRESHOLD` | `0.62` | `src/lib/vision/processors/index.ts` |
| `AGENT_ONLINE_THRESHOLD_MS` | `5` | `src/pages/LocalAgentsPage.tsx` |
| `ITEMS_PER_PAGE` | `20` | `src/pages/RecognitionLogsPage.tsx` |
| `SCOPE_DEFAULT` | `'__default__'` | `src/pages/StreamAlertThresholdsPage.tsx` |
| `MAX_CAMERAS` | `4` | `src/pages/SyncPlaybackPage.tsx` |
| `ALL` | `'__all__'` | `src/pages/TestModePage.tsx` |
| `CONCURRENCY` | `3` | `src/pages/TestModePage.tsx` |
| `GAP_TOLERANCE_MS` | `1` | `supabase/functions/_shared/custodyManifest.ts` |
| `OVERLAP_TOLERANCE_MS` | `1` | `supabase/functions/_shared/custodyManifest.ts` |
| … +123 linhas — lista completa em `context.json` | | |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `timeout: 10000,` | `playwright.config.ts` |
| `timeout: 120000,` | `playwright.config.ts` |
| `timeout: 60000,` | `playwright.config.ts` |
| `await new Promise((r) => setTimeout(r, 2000));` | `agent/src/relay.ts` |
| `await new Promise((r) => setTimeout(r, 3000));` | `agent/src/relay.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/App.tsx` |
| `setTimeout(() => { requestNotificationPermission(); }, 5000);` | `src/main.tsx` |
| `const date = subDays(new Date(), 6 - i);` | `src/components/ALPRDashboard.tsx` |
| `: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);` | `src/components/AlertTrendsChart.tsx` |
| `? new Date(interval.getTime() + 60 * 60 * 1000)` | `src/components/AlertTrendsChart.tsx` |
| `start: subDays(now, 30),` | `src/components/AlertTrendsChart.tsx` |
| `start: subDays(now, 7),` | `src/components/AlertTrendsChart.tsx` |
| `start: subHours(now, 24),` | `src/components/AlertTrendsChart.tsx` |
| `if (isOpen) setTimeout(clearNewFlags, 2000);` | `src/components/AnalysisHistoryPanel.tsx` |
| `timeoutRef.current = setTimeout(() => navigate(redirectTo), 1500);` | `src/components/AuthCallback.tsx` |
| `timeoutRef.current = setTimeout(() => { navigate(redirectTo); onSuccess?.(); }, 2000);` | `src/components/AuthCallback.tsx` |
| `(e) => new Date(e.timestamp) > subHours(new Date(), 1)` | `src/components/HeatmapVisualization.tsx` |
| `return t > subHours(new Date(), 2) && t <= subHours(new Date(), 1);` | `src/components/HeatmapVisualization.tsx` |
| `startDate = subDays(new Date(), 7);` | `src/components/HeatmapVisualization.tsx` |
| `startDate = subHours(new Date(), 1);` | `src/components/HeatmapVisualization.tsx` |
| `startDate = subHours(new Date(), 24);` | `src/components/HeatmapVisualization.tsx` |
| `startDate = subHours(new Date(), 6);` | `src/components/HeatmapVisualization.tsx` |
| `{ timeout: 2000 }` | `src/components/IdleRoutePrefetcher.tsx` |
| `const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 7), end: new Date() });` | `src/components/ReportsPanel.tsx` |
| `await new Promise((resolve) => setTimeout(resolve, 2000));` | `src/components/StreamConfigPanel.tsx` |
| `controlsTimeoutRef.current = setTimeout(() => { if (state.isPlaying) setControlsVisible(false); }, 3000);` | `src/components/VideoStreamPlayer.tsx` |
| `await new Promise((r) => setTimeout(r, 1500));` | `src/components/admin/CameraHealthCard.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/CspAnomalyBadge.tsx` |
| `setTimeout(() => setCopied(null), 1500);` | `src/components/admin/DuplicateIndexesCard.tsx` |
| `if (alertDate < subDays(now, 30)) return false;` | `src/components/alerts/filterAlerts.ts` |
| `if (alertDate < subDays(now, 7)) return false;` | `src/components/alerts/filterAlerts.ts` |
| `if (alertDate < subHours(now, 1)) return false;` | `src/components/alerts/filterAlerts.ts` |
| `if (alertDate < subHours(now, 24)) return false;` | `src/components/alerts/filterAlerts.ts` |
| `setTimeout(() => setIsLoading(false), 1000);` | `src/components/cameras/EnhancedCameraGrid.tsx` |
| `const stop = window.setTimeout(() => window.clearInterval(interval), 8000);` | `src/components/debug/CLSShiftOverlay.tsx` |
| `window.setTimeout(() => setCopied(false), 2500);` | `src/components/emap/ShiftHandoffCard.tsx` |
| `const [from, setFrom] = useState(() => toLocalInput(now - 24 * 60 * 60 * 1000));` | `src/components/faces/FaceSearchFilters.tsx` |
| `return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };` | `src/components/journey/useJourneyData.ts` |
| `return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };` | `src/components/journey/useJourneyData.ts` |
| `return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };` | `src/components/journey/useJourneyData.ts` |
| `const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000; // 36h — cron diário + folga` | `src/components/local-agents/RelayPurgeHistoryCard.tsx` |
| `setTimeout(() => { setRecaptureStage('idle'); setRecaptureProgress(0); }, 1200);` | `src/components/ptz/PtzCalibrationPanel.tsx` |
| `setTimeout(() => URL.revokeObjectURL(url), 5000);` | `src/components/ptz/ptzPreflightPdf.ts` |
| `const t = setTimeout(() => setShowControls(false), 3000);` | `src/components/ui/CameraFocusMode.tsx` |
| `const sevenDaysAgo = subDays(today, 6);` | `src/components/widgets/AlertsChartWidget.tsx` |
| `timeout: 30000,` | `src/config/api.ts` |
| `export const API_TIMEOUT = 30000;` | `src/constants/app.ts` |
| `start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),` | `src/contexts/AnalyticsContext.tsx` |
| `setTimeout(() => { setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id)); }, 5000);` | `src/contexts/accessibility.tsx` |
| `timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),` | `src/data/mockData.ts` |
| `createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),` | `src/data/mockRules.ts` |
| `createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),` | `src/data/mockRules.ts` |
| `createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),` | `src/data/mockRules.ts` |
| `createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),` | `src/data/mockRules.ts` |
| `createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),` | `src/data/mockRules.ts` |
| `updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),` | `src/data/mockRules.ts` |
| `updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),` | `src/data/mockRules.ts` |
| `updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),` | `src/data/mockRules.ts` |
| `updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),` | `src/data/mockRules.ts` |
| `updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),` | `src/data/mockRules.ts` |
| `await new Promise((r) => setTimeout(r, 1000));` | `src/hooks/useCamera.ts` |
| `export function useClipboard(timeout = 2000): UseClipboardReturn {` | `src/hooks/useClipboard.ts` |
| `export const RELIABILITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;` | `src/hooks/useCommandReliability.ts` |
| `const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();` | `src/hooks/useMaintenanceConsole.ts` |
| `5 * 60 * 1000` | `src/hooks/useOfflineSync.ts` |
| `const timer = setTimeout(() => { setIsActive(true); }, 1500);` | `src/hooks/useOnboardingTour.ts` |
| `navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })` | `src/hooks/usePanicButton.ts` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/useRealtimeAnalysisHistory.ts` |
| `const t = setTimeout(run, 1000);` | `src/hooks/useStreamFaceDetection.ts` |
| `maxAge: 3600000,` | `src/hooks/heatmap/heatmapTypes.ts` |
| `const TIMEOUT = 2000;` | `src/integrations/supabase/previewAuthStorage.ts` |
| `setTimeout(() => { document.body.removeChild(announcement); }, 1000);` | `src/lib/accessibility.ts` |
| `setTimeout(() => notification.close(), 10000);` | `src/lib/browserNotifications.ts` |
| `const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min` | `src/lib/buildVersion.ts` |
| `setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);` | `src/lib/clipStorageUrls.ts` |
| `return { nextRun: n, freshnessMs: 2 * 24 * 60 * 60_000 };` | `src/lib/cronSchedule.ts` |
| `return { nextRun: n, freshnessMs: 2 * 31 * 24 * 60 * 60_000 };` | `src/lib/cronSchedule.ts` |
| `return { nextRun: n, freshnessMs: 2 * 60 * 60_000 };` | `src/lib/cronSchedule.ts` |
| `window.setTimeout(finish, 5000);` | `src/lib/mobileNavGuard.ts` |
| `export const ENROLLMENT_TTL_MS = 24 * 60 * 60_000;` | `src/lib/devices/deviceEnrollment.ts` |
| `clockSkewToleranceMs: 5 * 60 * 1000,` | `src/lib/emap/shiftJournalStore.ts` |
| `maxShiftMs: 12 * 60 * 60 * 1000,` | `src/lib/emap/shiftJournalStore.ts` |
| `cooldown: 0,` | `src/lib/emap/suppressionLedger.ts` |
| `clockSkewToleranceMs: 5 * 60 * 1000,` | `src/lib/emap/triageAck.ts` |
| `ttlMs: 4 * 60 * 60 * 1000,` | `src/lib/emap/triageAck.ts` |
| `alert: 2 * 60 * 1000,` | `src/lib/emap/triageSla.ts` |
| `offline: 5 * 60 * 1000,` | `src/lib/emap/triageSla.ts` |
| `unknown: 15 * 60 * 1000,` | `src/lib/emap/triageSla.ts` |
| `warning: 10 * 60 * 1000,` | `src/lib/emap/triageSla.ts` |
| `const DAY_MS = 24 * 60 * 60 * 1000;` | `src/lib/faces/faceSearch.ts` |
| `15 * 60 * 1000,` | `src/lib/faces/faceTimeline.ts` |
| `24 * 60 * 60 * 1000,` | `src/lib/faces/faceTimeline.ts` |
| `5 * 60 * 1000,` | `src/lib/faces/faceTimeline.ts` |
| `6 * 60 * 60 * 1000,` | `src/lib/faces/faceTimeline.ts` |
| `60 * 60 * 1000,` | `src/lib/faces/faceTimeline.ts` |
| `if (stepMs >= 24 * 60 * 60 * 1000) return '1 dia';` | `src/lib/faces/faceTimeline.ts` |
| `if (stepMs >= 60 * 60 * 1000) return `${Math.round(stepMs / (60 * 60 * 1000))} h`;` | `src/lib/faces/faceTimeline.ts` |
| `export const SESSION_GAP_MS = 5 * 60 * 1000;` | `src/lib/faces/personTimeline.ts` |
| `export const MAX_GRANT_MS = MAX_GRANT_DAYS * 24 * 60 * 60 * 1000;` | `src/lib/permissions/grantConsole.ts` |
| `await new Promise((r) => setTimeout(r, 1500));` | `src/pages/CameraFleetHealthPage.tsx` |
| `const bucketMs = hours <= 24 ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;` | `src/pages/EventAlertsDashboardPage.tsx` |
| `const start = now - hours * 60 * 60 * 1000;` | `src/pages/EventAlertsDashboardPage.tsx` |
| `const AGENT_ONLINE_THRESHOLD_MS = 5 * 60 * 1000;` | `src/pages/LocalAgentsPage.tsx` |
| `const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));` | `src/pages/NvrDownloadHistoryPage.tsx` |
| `() => new Date(Date.now() - 60 * 60 * 1000)` | `src/pages/NvrDownloadsPage.tsx` |
| `.gte('start_time', startOfDay(subDays(now, 1)).toISOString())` | `src/pages/RecordingsPage.tsx` |
| `query = query.gte('start_time', subDays(now, 30).toISOString());` | `src/pages/RecordingsPage.tsx` |
| `query = query.gte('start_time', subDays(now, 7).toISOString());` | `src/pages/RecordingsPage.tsx` |
| `gcTime: 5 * 60 * 1000,` | `src/providers/QueryProvider.tsx` |
| `clipUrl(id: string, ttl = 3600) {` | `src/sdk/visao-api-client.ts` |
| `(v_net1, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 14, now() + interval '14 days', 'Compartilhar lista de placas restritas'),` | `supabase/seed_gestao.sql` |
| `(v_net1, v_guest2, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'accepted', 14, now() + interval '14 days', 'Convite aceito na semana passada'),` | `supabase/seed_gestao.sql` |
| `(v_net2, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 7, now() + interval '7 days', 'Compartilhar eventos de aglomeração');` | `supabase/seed_gestao.sql` |
| `now() - (random() * interval '24 hours'),` | `supabase/seed_gestao.sql` |
| `(SELECT count(*) FROM public.event_alerts WHERE created_at > now() - interval '30 days') AS event_alerts_30d,` | `supabase/seed_intelligence.sql` |
| `CASE WHEN u.resolved THEN now() - (random() * interval '7 days') ELSE NULL END,` | `supabase/seed_intelligence.sql` |
| `now() - (random() * interval '14 days')` | `supabase/seed_intelligence.sql` |
| `now() - (random() * interval '30 days')` | `supabase/seed_intelligence.sql` |
| `now() - (random() * interval '30 days'),` | `supabase/seed_intelligence.sql` |
| `(SELECT count(*) FROM public.ppe_violations WHERE created_at > now() - interval '24 hours') AS violations_24h;` | `supabase/seed_ppe.sql` |
| `export const ENROLLMENT_TTL_MS = 24 * 60 * 60_000;` | `supabase/functions/_shared/deviceEnrollment.ts` |
| `export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;` | `supabase/functions/_shared/evidenceSealRequest.ts` |
| `export const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;` | `supabase/functions/_shared/evidenceSealRequest.ts` |
| `timeout: 0,` | `supabase/functions/_shared/networkError.ts` |
| `const DEDUP_MS = 60 * 60 * 1000; // 1h` | `supabase/functions/connectivity-resolution-alert/index.ts` |
| `const DEDUP_MS = 60 * 60 * 1000; // 1h por job` | `supabase/functions/cron-watchdog/index.ts` |
| `const DEDUP_MS = 2 * 60 * 60 * 1000; // 2h` | `supabase/functions/cron-watchdog-escalate/index.ts` |
| `.gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())` | `supabase/functions/csp-anomaly-notify/index.ts` |
| `{ maxRequests: 5, windowMs: 60 * 60 * 1000 },` | `supabase/functions/delete-my-account/index.ts` |
| `await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));` | `supabase/functions/nvr-recording-download/index.ts` |
| `const DEDUP_MS = 60 * 60 * 1000; // 1h` | `supabase/functions/preview-telemetry-alert/index.ts` |
| `const since = new Date(at.getTime() - 10 * 60 * 1000).toISOString();` | `supabase/functions/process-frame/index.ts` |
| `const DEDUP_MS = 6 * 60 * 60 * 1000; // 6h` | `supabase/functions/watchdog-ack-sla-alert/index.ts` |
| `WHERE created_at < now() - interval '180 days'` | `supabase/migrations/20260712213046_43a31e7d-a0f8-4707-9437-7d3954408614.sql` |
| `WHERE created_at < now() - interval '30 days';` | `supabase/migrations/20260712213046_43a31e7d-a0f8-4707-9437-7d3954408614.sql` |
| `WHERE created_at < now() - interval '7 days';` | `supabase/migrations/20260712213046_43a31e7d-a0f8-4707-9437-7d3954408614.sql` |
| `ADD CONSTRAINT alerts_timestamp_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID;` | `supabase/migrations/20260712213651_8bf83f51-4cb4-42bf-b69f-5292da8ea237.sql` |
| `ADD CONSTRAINT zone_events_ts_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID;` | `supabase/migrations/20260712214758_a7d4387d-0378-46cc-b753-0eea63436721.sql` |
| `DELETE FROM public.idempotency_keys WHERE created_at < now() - interval '7 days';` | `supabase/migrations/20260716175946_c396bb4d-ce9c-4055-8f71-ab2625e0ba79.sql` |
| `DELETE FROM public.query_telemetry WHERE created_at < now() - interval '30 days';` | `supabase/migrations/20260716175946_c396bb4d-ce9c-4055-8f71-ab2625e0ba79.sql` |
| `WHERE created_at < now() - interval '180 days'` | `supabase/migrations/20260716175946_c396bb4d-ce9c-4055-8f71-ab2625e0ba79.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260716180919_0effa1a0-2cef-4be0-90e1-e24482afaffe.sql` |
| `end_d := (start_d + interval '1 month')::date;` | `supabase/migrations/20260716181225_8dc3d9c1-b327-4eef-ba7d-811feaa5de85.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260716181506_9c143275-174e-44c9-a779-ed7d414224e4.sql` |
| `AND jrd.start_time > now() - interval '7 days') AS failed_7d,` | `supabase/migrations/20260716181506_9c143275-174e-44c9-a779-ed7d414224e4.sql` |
| `DELETE FROM public.api_usage_logs WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql` |
| `DELETE FROM public.api_usage_logs WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260717115419_16aad66e-691b-44e9-8ea4-6102e686496e.sql` |
| `DELETE FROM public.idempotency_keys WHERE created_at < now() - interval '7 days';` | `supabase/migrations/20260717115419_16aad66e-691b-44e9-8ea4-6102e686496e.sql` |
| `DELETE FROM public.query_telemetry WHERE created_at < now() - interval '30 days';` | `supabase/migrations/20260717115419_16aad66e-691b-44e9-8ea4-6102e686496e.sql` |
| `WHERE created_at < now() - interval '180 days'` | `supabase/migrations/20260717115419_16aad66e-691b-44e9-8ea4-6102e686496e.sql` |
| `AND created_at <= now() - interval '1 hour';` | `supabase/migrations/20260717131325_8693bbee-57b5-4645-875e-83bd1681f913.sql` |
| `WHERE created_at > now() - interval '1 hour'` | `supabase/migrations/20260717131325_8693bbee-57b5-4645-875e-83bd1681f913.sql` |
| `WHERE created_at > now() - interval '1 hour';` | `supabase/migrations/20260717131325_8693bbee-57b5-4645-875e-83bd1681f913.sql` |
| `WHERE created_at > now() - interval '25 hours'` | `supabase/migrations/20260717131325_8693bbee-57b5-4645-875e-83bd1681f913.sql` |
| `WHERE captured_at < now() - interval '30 days';` | `supabase/migrations/20260717132043_a9103876-7f0d-4daa-aa58-cb52363fc345.sql` |
| `AND state_change < now() - interval '5 minutes'` | `supabase/migrations/20260717141308_384a707c-5f38-4c4d-8e0d-a6dc0ebf2d7e.sql` |
| `expires_at timestamptz NOT NULL DEFAULT now() + interval '10 seconds'` | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `(m.restore_status::text = 'in_progress' AND m.restore_requested_at < now() - interval '12 hours') AS is_stuck` | `supabase/migrations/20260717202431_1f77f20d-674e-41c0-a045-6b6bc2e001ba.sql` |
| `(m.restore_status::text = 'in_progress' AND m.restore_requested_at < now() - interval '12 hours') DESC,` | `supabase/migrations/20260717202431_1f77f20d-674e-41c0-a045-6b6bc2e001ba.sql` |
| `AND created_at > now() - interval '15 minutes'` | `supabase/migrations/20260721224954_defe3350-72e4-4a38-95ca-2a165a0b0fca.sql` |
| `DELETE FROM public.stream_health_checks WHERE created_at < now() - interval '7 days';` | `supabase/migrations/20260721224954_defe3350-72e4-4a38-95ca-2a165a0b0fca.sql` |
| `expires_at timestamptz not null default (now() + interval '60 seconds')` | `supabase/migrations/20260723145152_9bbd7a68-c09c-447b-9540-99c0061aa372.sql` |
| `WHERE t.created_at >= now() - interval '30 minutes'` | `supabase/migrations/20260723151433_06e2e954-1fc2-40a6-b731-68809c507e57.sql` |
| `AND expires_at < now() - interval '1 hour'` | `supabase/migrations/20260723151542_7896555a-0955-468f-8280-b381fad151c0.sql` |
| `AND expires_at < now() - interval '1 hour'` | `supabase/migrations/20260723151848_a11cba0b-0835-49a1-9ea3-6c934ecdc7e9.sql` |
| `AND created_at > now() - interval '12 hours'` | `supabase/migrations/20260723152212_f1fb73ae-411a-4be8-bb9c-7dc8e7dd67a5.sql` |
| `COALESCE(sum(deleted_count) FILTER (WHERE executed_at > now() - interval '30 days'), 0) AS deleted_30d,` | `supabase/migrations/20260723152414_6e26ced3-b39c-49ea-ad49-85968f101beb.sql` |
| `WHEN now() - u.last_run < interval '30 hours' THEN 'ok'` | `supabase/migrations/20260723152414_6e26ced3-b39c-49ea-ad49-85968f101beb.sql` |
| `WHEN now() - u.last_run < interval '48 hours' THEN 'warn'` | `supabase/migrations/20260723152414_6e26ced3-b39c-49ea-ad49-85968f101beb.sql` |
| `count(*) FILTER (WHERE executed_at > now() - interval '30 days') AS runs_30d,` | `supabase/migrations/20260723152414_6e26ced3-b39c-49ea-ad49-85968f101beb.sql` |
| `WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260723161917_4505e8bc-1c27-4209-9193-62f3ec9033c6.sql` |
| `COUNT(*) FILTER (WHERE lower(r.status) = 'failed' AND r.start_time > now() - interval '24 hours') AS fails,` | `supabase/migrations/20260723163125_b62b4956-37df-4ab4-9288-e2d63becd664.sql` |
| `COUNT(*) FILTER (WHERE lower(r.status) = 'succeeded' AND r.start_time > now() - interval '24 hours') AS succs` | `supabase/migrations/20260723163125_b62b4956-37df-4ab4-9288-e2d63becd664.sql` |
| `WHERE r.start_time > now() - interval '24 hours'` | `supabase/migrations/20260723163125_b62b4956-37df-4ab4-9288-e2d63becd664.sql` |
| `COUNT(*) FILTER (WHERE lower(r.status) = 'failed' AND r.start_time > now() - interval '24 hours') AS fails,` | `supabase/migrations/20260723163313_603353a9-5961-4ca9-8eed-7c5c420a7213.sql` |
| `COUNT(*) FILTER (WHERE lower(r.status) = 'succeeded' AND r.start_time > now() - interval '24 hours') AS succs` | `supabase/migrations/20260723163313_603353a9-5961-4ca9-8eed-7c5c420a7213.sql` |
| `WHERE r.start_time > now() - interval '24 hours'` | `supabase/migrations/20260723163313_603353a9-5961-4ca9-8eed-7c5c420a7213.sql` |
| `DELETE FROM public.cron_watchdog_runs WHERE ran_at < now() - interval '30 days';` | `supabase/migrations/20260723163456_93aea3f6-3451-4a78-a44c-bb1fdb30fb0e.sql` |
| `SELECT '24h'::text AS label, now() - interval '24 hours' AS since` | `supabase/migrations/20260723165844_1f3f09a4-9967-481b-869c-cdaa0315a8b1.sql` |
| `SELECT '7d'::text, now() - interval '7 days'` | `supabase/migrations/20260723165844_1f3f09a4-9967-481b-869c-cdaa0315a8b1.sql` |
| `end_d := (start_d + interval '1 month')::date;` | `supabase/migrations/20260726155453_2303799f-6bd6-4f20-bb53-4fae1d384640.sql` |
| `end_d := (start_d + interval '1 month')::date;` | `supabase/migrations/20260726160312_a030319d-6cbf-4eda-8f72-534488c93caf.sql` |
| `end_d := (start_d + interval '1 month')::date;` | `supabase/migrations/20260726161031_f6cd3ef5-c6e9-449d-a26e-275592a89a9a.sql` |
| `key_col, target_month, key_col, (target_month + interval '1 month')::date,` | `supabase/migrations/20260726161031_f6cd3ef5-c6e9-449d-a26e-275592a89a9a.sql` |
| `part_name, parent, target_month, (target_month + interval '1 month')::date` | `supabase/migrations/20260726161031_f6cd3ef5-c6e9-449d-a26e-275592a89a9a.sql` |
| `key_col, target_month, key_col, (target_month + interval '1 month')::date,` | `supabase/migrations/20260726161239_27f9cf0b-0b1a-46ed-8088-d0f8f4989c8e.sql` |
| `part_name, parent, target_month, (target_month + interval '1 month')::date` | `supabase/migrations/20260726161239_27f9cf0b-0b1a-46ed-8088-d0f8f4989c8e.sql` |
| `WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260726162557_5a851bad-4c84-45f8-8c4e-faef1d9f61d2.sql` |
| `DELETE FROM public.camera_clock_skew_runs WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726164045_4f752cdc-864d-4d6e-9af1-01bb6bd4ace1.sql` |
| `future_edge := now() + interval '30 days';` | `supabase/migrations/20260726164045_4f752cdc-864d-4d6e-9af1-01bb6bd4ace1.sql` |
| `DELETE FROM public.camera_clock_skew_runs WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726164149_f062f0c7-a2e3-4192-8143-d20315b3671b.sql` |
| `future_edge := now() + interval '30 days';` | `supabase/migrations/20260726164149_f062f0c7-a2e3-4192-8143-d20315b3671b.sql` |
| `WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260726165931_3f5ee341-c304-4048-8282-cac690623f86.sql` |
| `AND r.created_at > now() - interval '1 hour'` | `supabase/migrations/20260726170712_7387281b-5d67-4c52-843a-809f062cf42c.sql` |
| `DELETE FROM public.agent_healing_actions WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260726170712_7387281b-5d67-4c52-843a-809f062cf42c.sql` |
| `DELETE FROM public.agent_healing_runs WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726170712_7387281b-5d67-4c52-843a-809f062cf42c.sql` |
| `now() + interval '5 minutes')` | `supabase/migrations/20260726170712_7387281b-5d67-4c52-843a-809f062cf42c.sql` |
| `WHERE k.detected_at >= now() - interval '7 days'` | `supabase/migrations/20260726171536_0c67e895-1d6a-4abb-ac82-5c5b62aefce7.sql` |
| `WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726171536_0c67e895-1d6a-4abb-ac82-5c5b62aefce7.sql` |
| `WHERE k.detected_at >= now() - interval '7 days'` | `supabase/migrations/20260726171624_cc78edd8-1e2a-46ec-a7fe-f6e1cd22e432.sql` |
| `WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726171624_cc78edd8-1e2a-46ec-a7fe-f6e1cd22e432.sql` |
| `AND r.created_at > now() - interval '1 hour'` | `supabase/migrations/20260726174136_1d187722-8a65-44f1-be47-05bfb41f4082.sql` |
| `DELETE FROM public.agent_healing_actions WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260726174136_1d187722-8a65-44f1-be47-05bfb41f4082.sql` |
| `DELETE FROM public.agent_healing_runs WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726174136_1d187722-8a65-44f1-be47-05bfb41f4082.sql` |
| `now() + make_interval(secs => jitter_s) + interval '5 minutes')` | `supabase/migrations/20260726174136_1d187722-8a65-44f1-be47-05bfb41f4082.sql` |
| `WHEN (expires_at - scheduled_at) < interval '60 seconds'` | `supabase/migrations/20260726175106_6b377269-2791-42fd-8b30-6f15fe181cc6.sql` |
| `max_window constant interval := interval '3600 seconds'; -- maxWindowSeconds` | `supabase/migrations/20260726175106_6b377269-2791-42fd-8b30-6f15fe181cc6.sql` |
| `min_window constant interval := interval '60 seconds'; -- minWindowSeconds` | `supabase/migrations/20260726175106_6b377269-2791-42fd-8b30-6f15fe181cc6.sql` |
| `IF w1 < interval '60 seconds' THEN` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `IF w2 > interval '3600 seconds' THEN` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '10 days')` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '100 seconds', now());` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `VALUES (ag, usr, 'http_request', '{}'::jsonb, now() + interval '540 seconds', now() + interval '30 seconds')` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `VALUES (ag, usr, 'http_request', '{}'::jsonb, now() - interval '600 seconds',` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `VALUES (ag, usr, 'http_request', '{}'::jsonb, now() - interval '600 seconds', now() - interval '10 seconds')` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `now() - interval '10 seconds', now() - interval '300 seconds', 'in_progress')` | `supabase/migrations/20260726175403_321c6589-c61c-48a8-8791-f15c0327f2e2.sql` |
| `AND (r.expires_at - r.scheduled_at) >= interval '60 seconds'` | `supabase/migrations/20260726180230_306911b1-f1ec-4f32-b0d6-08fa1bf91670.sql` |
| `CASE WHEN (expires_at - scheduled_at) < interval '60 seconds'` | `supabase/migrations/20260726181324_3fd8d72f-6f5f-41a7-87f9-df7b83a7d54d.sql` |
| `WHERE t.created_at >= now() - interval '30 minutes'` | `supabase/migrations/20260726181324_3fd8d72f-6f5f-41a7-87f9-df7b83a7d54d.sql` |
| `AND (r.expires_at - r.scheduled_at) >= interval '60 seconds'` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `AND e.created_at > now() - interval '2 hours'` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `AND e.created_at > now() - interval '6 hours'` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `AND r.created_at > now() - interval '1 hour'` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `DELETE FROM public.agent_healing_actions WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `DELETE FROM public.agent_healing_runs WHERE ran_at < now() - interval '90 days';` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `now() + make_interval(secs => jitter_s) + interval '5 minutes')` | `supabase/migrations/20260726185310_b2676b93-7251-468c-87ab-31bcd7bc73c5.sql` |
| `IF v_last_decline IS NOT NULL AND now() - v_last_decline < interval '86400 seconds'` | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `IF v_last_revoke IS NOT NULL AND now() - v_last_revoke < interval '3600 seconds'` | `supabase/migrations/20260726204821_b4180d0a-9586-4123-9321-8a19ab12edb9.sql` |
| `IF v_last_decline IS NOT NULL AND v_now - v_last_decline < interval '86400 seconds'` | `supabase/migrations/20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql` |
| `IF v_last_revoke IS NOT NULL AND v_now - v_last_revoke < interval '3600 seconds'` | `supabase/migrations/20260726205357_0d2ee20c-89f9-48fa-b062-771f247461f2.sql` |
| `IF v_last_decline IS NOT NULL AND v_now - v_last_decline < interval '86400 seconds'` | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `IF v_last_revoke IS NOT NULL AND v_now - v_last_revoke < interval '3600 seconds'` | `supabase/migrations/20260726205526_ac148629-ced7-40c8-9d7e-dd5227e47101.sql` |
| `COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint AS deleted_30d,` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `COALESCE(sum(r.deleted_entries + r.deleted_matches) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `COALESCE(sum(r.deleted_notifications + r.deleted_silences) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days') AS runs_30d,` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),` | `supabase/migrations/20260726214428_e601ffc2-d4ea-4122-b25b-d9a672cb0153.sql` |
| `IF _expires_at - v_now > interval '90 days' THEN` | `supabase/migrations/20260727205212_75513959-861a-4f27-b5d3-2ce28ade6c76.sql` |
| `IF NEW.expires_at > NEW.created_at + interval '30 minutes' THEN` | `supabase/migrations/20260728133707_8928683b-42ce-4e11-993d-a13b95d3ae33.sql` |
| `VALUES (v_other, v_reg, 'config.read', 'selftest-193-owner', now() + interval '5 minutes', v_other);` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `VALUES (v_owner, v_reg, 'config.read', 'selftest-193-ok', now() + interval '5 minutes', v_owner);` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `VALUES (v_owner, v_reg, 'config.read', 'selftest-193-ttl', now() + interval '90 minutes', v_owner);` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `VALUES (v_owner, v_reg, 'device.reboot', 'selftest-193-ok', now() + interval '10 minutes', v_owner)` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `VALUES (v_owner, v_reg, 'stream.restart', 'selftest-193-excl', now() + interval '10 minutes', v_owner);` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `now() - interval '1 second', v_owner, now() - interval '2 minutes');` | `supabase/migrations/20260728133943_897e1b06-0e5e-4109-8e12-edf43b904ed8.sql` |
| `IF NEW.expires_at > NEW.created_at + interval '30 minutes' THEN` | `supabase/migrations/20260728134817_cc353891-a3d5-42e2-bbf5-d37fdaf0d844.sql` |
| `now() + interval '20 minutes', v_owner)` | `supabase/migrations/20260728134817_cc353891-a3d5-42e2-bbf5-d37fdaf0d844.sql` |
| `now() + interval '5 minutes', v_owner, 'queued', now(), 2);` | `supabase/migrations/20260728134817_cc353891-a3d5-42e2-bbf5-d37fdaf0d844.sql` |
| `IF NEW.expires_at > NEW.created_at + interval '30 minutes' THEN` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `SET status='delivered', delivered_at=now() - interval '5 minutes', delivery_attempts=3` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `now() + interval '1 minute', v_owner)` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `now() + interval '20 minutes', v_owner)` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `v_lease interval := interval '60 seconds'; -- DELIVERY_LEASE_MS` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `v_res := public.sweep_device_remote_commands(now() + interval '2 minutes', 500);` | `supabase/migrations/20260728140937_6c268d06-6142-4fcd-91c5-2033abd841d0.sql` |
| `SET status='delivered', delivered_at=v_t0 - interval '5 minutes', delivery_attempts=3` | `supabase/migrations/20260728141046_26d6d180-d01a-4ccc-b565-d1ab37165d59.sql` |
| `v_cut timestamptz := now() + interval '30 seconds';` | `supabase/migrations/20260728141046_26d6d180-d01a-4ccc-b565-d1ab37165d59.sql` |
| `v_t0 + interval '10 seconds', v_owner)` | `supabase/migrations/20260728141046_26d6d180-d01a-4ccc-b565-d1ab37165d59.sql` |
| `v_t0 + interval '20 minutes', v_owner)` | `supabase/migrations/20260728141046_26d6d180-d01a-4ccc-b565-d1ab37165d59.sql` |
| `v_ws - interval '1 minute', v_we);` | `supabase/migrations/20260728205845_80d192ee-d05d-4b49-a672-07fcf3993d29.sql` |
| `(v_user, 'sel-400', v_now - interval '400 days', v_now - interval '400 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `(v_user, 'sel-500', v_now - interval '500 days', v_now - interval '500 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `(v_user, 'sel-600', v_now - interval '600 days', v_now - interval '600 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `(v_user, 'sel-edge', v_now - interval '365 days' - interval '1 hour', v_now - interval '365 days', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `(v_user, 'sel-new', v_now - interval '1 hour', v_now, '{"admitted":1}'::jsonb, 1, 1);` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `WHERE cutoff_at = v_now - interval '365 days') >= 3,` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `WHERE cutoff_at = v_now - interval '365 days';` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `WHERE cutoff_at IN (v_now - interval '365 days');` | `supabase/migrations/20260728211428_cd9d5bf0-be45-40d9-bcae-57b996d27d60.sql` |
| `(v_user, 'sel-400', v_now - interval '400 days', v_now - interval '400 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `(v_user, 'sel-500', v_now - interval '500 days', v_now - interval '500 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `(v_user, 'sel-600', v_now - interval '600 days', v_now - interval '600 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `(v_user, 'sel-edge', v_now - interval '365 days' - interval '1 hour', v_now - interval '365 days', '{"admitted":1}'::jsonb, 1, 1),` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `(v_user, 'sel-new', v_now - interval '1 hour', v_now, '{"admitted":1}'::jsonb, 1, 1);` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `WHERE cutoff_at = v_now - interval '365 days') >= 3,` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `WHERE cutoff_at = v_now - interval '365 days';` | `supabase/migrations/20260728211519_21c8c5e2-c6f8-4ff9-8d16-485be8aa6a0e.sql` |
| `(v_now - interval '1 day', 'reconciled', 0, 0, 0, 0, 0, 0, 365);` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `(v_now - interval '730 days', 'settling', 0, 0, 0, 0, 0, 0, 365),` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `WHERE cutoff_at = v_now - interval '730 days') >= 3,` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `WHERE cutoff_at = v_now - interval '730 days';` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `WHERE observed_at = v_base + interval '1 day'),` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `WHERE observed_at = v_now - interval '1 day'),` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `WHERE observed_at = v_now - interval '730 days'),` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `v_now timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '2000 days';` | `supabase/migrations/20260728222828_5ff679f5-2d95-4e7c-815b-5ee4ffbc2826.sql` |
| `(v_now - interval '1 day', 'reconciled', 0, 0, 0, 0, 0, 0, 365);` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `(v_now - interval '730 days', 'settling', 0, 0, 0, 0, 0, 0, 365),` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `WHERE cutoff_at = v_now - interval '730 days') >= 4,` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `WHERE cutoff_at = v_now - interval '730 days';` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `WHERE observed_at = v_base + interval '1 day'),` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `WHERE observed_at = v_now - interval '1 day'),` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `WHERE observed_at = v_now - interval '730 days'),` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `v_now timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '2000 days';` | `supabase/migrations/20260728222929_afc0c8d1-9b1f-4ad7-80b1-18cb1c187ee4.sql` |
| `('selftest:b', 'email', 'critical', 60, 5, v_now - interval '1 day');` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `AND suppressed_at = v_base + interval '1 day'),` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `VALUES ('selftest:b', 'email', 'critical', 60, 5, v_base + interval '2 days'),` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `VALUES ('selftest:c', 'telegram', 'warning', 60, 5, v_now + interval '10 days');` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `WHERE cutoff_at = v_now - interval '30 days') >= 2,` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `WHERE cutoff_at = v_now - interval '30 days';` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `v_now timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '400 days';` | `supabase/migrations/20260729151504_b1d0a76a-7e8e-4068-b8c9-67da29e913ac.sql` |
| `(v_row->>'registered_at')::timestamptz + interval '1 minute'` | `supabase/migrations/20260729152247_c834c24a-4e4c-4c8f-a542-9a201d4b8793.sql` |
| `+ ((v_row->>'cadence_minutes')::int + 16) * interval '1 minute'` | `supabase/migrations/20260729152247_c834c24a-4e4c-4c8f-a542-9a201d4b8793.sql` |
| … +45 linhas — lista completa em `context.json` | |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 50 | `src/components/GlobalSearch.tsx` |
| 1 | `src/components/admin/AgentHealingCard.tsx` |
| 10 | `src/components/admin/AgentHealingCard.tsx` |
| 1 | `src/components/admin/AgentRestartBudgetCard.tsx` |
| 8 | `src/components/admin/AgentRestartBudgetCard.tsx` |
| 1 | `src/components/admin/CameraClockSkewCard.tsx` |
| 10 | `src/components/admin/CameraClockSkewCard.tsx` |
| 2000 | `src/components/admin/ConnectivityResolutionCard.tsx` |
| 15 | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| 20 | `src/components/admin/CronWatchdogRunsCard.tsx` |
| 20 | `src/components/admin/CspAnomalyBadge.tsx` |
| 12 | `src/components/admin/DbHealthCard.tsx` |
| 200 | `src/components/admin/EdgeErrorsAuditCard.tsx` |
| 10 | `src/components/admin/ForgetUserMediaCard.tsx` |
| 50 | `src/components/admin/GlacierStuckAlertsCard.tsx` |
| 10 | `src/components/admin/MaintenanceAlertsCard.tsx` |
| 12 | `src/components/admin/MaintenanceDispatchCard.tsx` |
| 50 | `src/components/admin/MaintenanceEscalationCard.tsx` |
| 2000 | `src/components/admin/PartitionBacklogTrendCard.tsx` |
| 1 | `src/components/admin/PartitionDrainCard.tsx` |
| 1 | `src/components/admin/PartitionQuarantineCard.tsx` |
| 1 | `src/components/admin/RootCauseCorrelationCard.tsx` |
| 50 | `src/components/behavior/useBehaviorAnalysis.ts` |
| 20 | `src/components/cameras/AddCameraDialog.tsx` |
| 10 | `src/components/cameras/CameraTestHistoryCard.tsx` |
| 100 | `src/components/license-plate/useLicensePlateData.ts` |
| 30 | `src/components/local-agents/RelayPurgeHistoryCard.tsx` |
| 1 | `src/components/notification-settings/useNotificationConfig.ts` |
| 50 | `src/components/people/PersonDetailsDialog.tsx` |
| 50 | `src/components/security/VaultAuditTimeline.tsx` |
| 1 | `src/components/settings/useSettingsData.ts` |
| 50 | `src/hooks/useAccessEvents.ts` |
| 5000 | `src/hooks/useAdmissionCoverage.ts` |
| 1 | `src/hooks/useAlerts.ts` |
| 100 | `src/hooks/useAuditLogs.ts` |
| 200 | `src/hooks/useBandwidthMonitor.ts` |
| 1 | `src/hooks/useCameras.ts` |
| 1 | `src/hooks/useChronicSeries.ts` |
| 2000 | `src/hooks/useCommandReliability.ts` |
| 1000 | `src/hooks/useDetectionReviews.ts` |
| 500 | `src/hooks/useDeviceSilence.ts` |
| 500 | `src/hooks/useEpisodeBridgeWatch.ts` |
| 500 | `src/hooks/useHeatmap.tsx` |
| 500 | `src/hooks/useMaintenanceAlertBadge.ts` |
| 200 | `src/hooks/useMaintenanceConsole.ts` |
| 500 | `src/hooks/useMaintenanceConsole.ts` |
| 100 | `src/hooks/useNotifications.ts` |
| 100 | `src/hooks/useOfflineSync.ts` |
| 50 | `src/hooks/usePanicButton.ts` |
| 500 | `src/hooks/usePlateDetections.ts` |
| 20 | `src/hooks/useRealtimeAnalysisHistory.ts` |
| 30 | `src/hooks/useRealtimeAnalysisHistory.ts` |
| 50 | `src/hooks/useRemoteCommand.ts` |
| 100 | `src/hooks/useRuleExecutions.ts` |
| 100 | `src/hooks/useStreamHealth.ts` |
| 500 | `src/hooks/useStreamHealth.ts` |
| 1 | `src/hooks/useTestMode.ts` |
| 50 | `src/hooks/useTimelapse.ts` |
| 1 | `src/hooks/useUserRole.ts` |
| 500 | `src/pages/EventAlertsDashboardPage.tsx` |
| 200 | `src/pages/IncidentNotificationsPage.tsx` |
| 200 | `src/pages/LocalAgentsPage.tsx` |
| 200 | `src/pages/NightSuspiciousEventsPage.tsx` |
| 1000 | `src/pages/NvrDownloadHistoryPage.tsx` |
| 100 | `src/pages/NvrDownloadsPage.tsx` |
| 200 | `src/pages/OutOfAreaEventsPage.tsx` |
| 100 | `src/pages/TestModePage.tsx` |
| 2000 | `src/pages/WeeklyReportPage.tsx` |
| 5000 | `src/pages/WeeklyReportPage.tsx` |
| 50 | `src/pages/zones/hooks/useZonesState.ts` |
| 1 | `supabase/functions/camera-health-monitor/index.ts` |
| 5000 | `supabase/functions/connectivity-resolution-alert/index.ts` |
| 20 | `supabase/functions/csp-anomaly-notify/index.ts` |
| 50 | `supabase/functions/device-commands/index.ts` |
| 20 | `supabase/functions/health/index.ts` |
| 600 | `supabase/functions/maintenance-alerts-dispatch/index.ts` |
| 1 | `supabase/functions/promote-test-executions/index.ts` |
| 500 | `supabase/functions/promote-test-executions/index.ts` |
| 0 | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| 1 | `supabase/functions/validate-rtsp-stream/criticalAlert.ts` |
| 1 | `supabase/functions/vault-coverage-watchdog/index.ts` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| falha fixture | `scripts/automation.unit.mjs` |
| Formato de report.json não reconhecido. | `scripts/bundle-report.mjs` |
|   */ import { execFileSync } from  | `scripts/check-admission-trend-alert.ts` |
| saída inesperada da rotina: ${out.length} linha(s) | `scripts/check-blame-routing.mjs` |
| . Sem reconhecimento,  | `scripts/check-maintenance-console.mjs` |
|  é executável por  | `scripts/check-maintenance-escalation.mjs` |
|  não usa o status inexistente  | `scripts/check-relay-lease.mjs` |
| Nenhum user com role encontrada — necessário para user_id | `scripts/seed-rules.mjs` |
| SUPABASE_SERVICE_ROLE_KEY não configurada — defina a variável de ambiente antes de rodar este script | `scripts/seed-rules.mjs` |
| camera_vault_audit is append-only | `scripts/simulate-wave-fortress-6-scenarios.mjs` |
| invalid | `scripts/simulate-wave-shinobi-4-scenarios.mjs` |
|  }); for (let i = 0; i < 80; i++) scenarios.push({ stuck: 5, dedupe: true, expect:  | `scripts/simulate-wave-storage-14-scenarios.mjs` |
| function ${name} not found | `scripts/simulate-wave-storage-26-scenarios.mjs` |
| ) && !justification) {     return { status: 400, audited: true, reason:  | `scripts/simulate-wave-storage-27-scenarios.mjs` |
| kind desconhecido: ${kind} | `scripts/simulate-wave120-scenarios.mjs` |
| fetch ${String(input)} aborted after ${ms}ms | `scripts/simulate-wave144-network-chaos.mjs` |
| )) {       assert(got ===  | `scripts/simulate-wave161-emap.mjs` |
| ,       },     ],     { minSeparationPx: 40, rect }   );   assert(glued.length === 1,  | `scripts/simulate-wave161-emap.mjs` |
|  },     { id:  | `scripts/simulate-wave162-emap-realtime.mjs` |
| , observedAt: 1 },   { cameraId:  | `scripts/simulate-wave162-emap-realtime.mjs` |
| , observedAt: 1 },   { cameraId: 7, status:  | `scripts/simulate-wave162-emap-realtime.mjs` |
| , observedAt: 1 },   {}, ]; for (const event of malformed) {   const { ledger, outcome } = applyStatusEvent({}, event);   check(outcome ===  | `scripts/simulate-wave162-emap-realtime.mjs` |
| , observedAt: Number.NaN },   { cameraId:  | `scripts/simulate-wave162-emap-realtime.mjs` |
| , observedAt: Number.POSITIVE_INFINITY },   { cameraId: undefined, status:  | `scripts/simulate-wave162-emap-realtime.mjs` |
|  && n.cameraIds.includes( | `scripts/simulate-wave163-emap-notices.mjs` |
| ),       transition( | `scripts/simulate-wave163-emap-notices.mjs` |
| );   check( | `scripts/simulate-wave163-emap-notices.mjs` |
| )], 1000 + i);     check( | `scripts/simulate-wave163-emap-notices.mjs` |
| )], 6_000);   state = result.state;   check( | `scripts/simulate-wave163-emap-notices.mjs` |
| )], Number.NaN).notices.length ===       0   ); }  console.log( | `scripts/simulate-wave163-emap-notices.mjs` |
| )], clock);     const notified = result.notices.some(       (n) => n.status ===  | `scripts/simulate-wave163-emap-notices.mjs` |
| )], clock);   state = escalate.state;   check(      | `scripts/simulate-wave163-emap-notices.mjs` |
| , worsened: true },     { cameraId:  | `scripts/simulate-wave163-emap-notices.mjs` |
| ;     check( | `scripts/simulate-wave163-emap-notices.mjs` |
| , to:  | `scripts/simulate-wave164-emap-pulse.mjs` |
| , worsened: true },     { cameraId:  | `scripts/simulate-wave164-emap-pulse.mjs` |
| , worsened: true },   ];   const l = registerPulses(emptyPulseLedger(), bad, Number.NaN);   ok(!( | `scripts/simulate-wave164-emap-pulse.mjs` |
| , worsened: true }],     t0   );   l2 = registerPulses(     l2,     [{ cameraId:  | `scripts/simulate-wave164-emap-pulse.mjs` |
| , worsened: true }],     t0   );   ok(isPulsing(ledger,  | `scripts/simulate-wave164-emap-pulse.mjs` |
|  \|\| s ===  | `scripts/simulate-wave166-plan-navigator.mjs` |
|  }) === false,  | `scripts/simulate-wave167-attention-router.mjs` |
|  }], 11_000) === base,      | `scripts/simulate-wave168-attention-clock.mjs` |
|  }], badClock) === base,        | `scripts/simulate-wave168-attention-clock.mjs` |
| , 10, 5);   const handoff = buildHandoff(journal, ledgerOf([flapper]), 60_000);   const text = formatHandoffReport(handoff, (id) =>  | `scripts/simulate-wave169-shift-handoff.mjs` |
| , 200),     entryOf( | `scripts/simulate-wave169-shift-handoff.mjs` |
| bloqueado | `scripts/simulate-wave170-shift-durability.mjs` |
|  }], NOW - 30_000);   // Confirmação repetida não rejuvenesce a dívida.   for (let i = 0; i < 10; i += 1) {     ledger = observeAttention(ledger, [{ cameraId:  | `scripts/simulate-wave171-triage-queue.mjs` |
| , age: 10 },     ],     NOW   );   const q = buildTriageQueue({ ledger, now: NOW });   ok(q.items[0].cameraId ===  | `scripts/simulate-wave171-triage-queue.mjs` |
| , age: 1_000 },       { id:  | `scripts/simulate-wave171-triage-queue.mjs` |
| , age: FRESH },     { id:  | `scripts/simulate-wave171-triage-queue.mjs` |
| , age: PROLONGED },       { id:  | `scripts/simulate-wave171-triage-queue.mjs` |
| planta indisponível | `scripts/simulate-wave171-triage-queue.mjs` |
|  }),      | `scripts/simulate-wave172-triage-ack.mjs` |
|  }), T0 + ttl * 3) ===  | `scripts/simulate-wave172-triage-ack.mjs` |
| ,       worst:  | `scripts/simulate-wave172-triage-ack.mjs` |
| ,     });   for (let i = 50; i < 80; i += 1)     mutated[ | `scripts/simulate-wave172-triage-ack.mjs` |
| , openedAt: T0 });   check(      | `scripts/simulate-wave172-triage-ack.mjs` |
| , openedAt: T0 },       null,        | `scripts/simulate-wave172-triage-ack.mjs` |
| , openedAt: T0 },       { cameraId:  | `scripts/simulate-wave172-triage-ack.mjs` |
| , worst:  | `scripts/simulate-wave172-triage-ack.mjs` |
| bloqueado | `scripts/simulate-wave172-triage-ack.mjs` |
| ,       openedAt: T0 + drift,     },   });   ok(v.frozen === false,  | `scripts/simulate-wave174-triage-sla.mjs` |
| ,       worst:  | `scripts/simulate-wave174-triage-sla.mjs` |
| , NaN)]) {   const v = evaluateSla({ entry: bad, now: T0 });   ok(v.state ===  | `scripts/simulate-wave174-triage-sla.mjs` |
| , T0), cameraId:  | `scripts/simulate-wave174-triage-sla.mjs` |
| , T0), now: T0 + 10_000 }),   evaluateSla({     entry: { ...entry( | `scripts/simulate-wave174-triage-sla.mjs` |
| , T0), now: badNow });   ok(v.state ===  | `scripts/simulate-wave174-triage-sla.mjs` |
| , T0);   const v = evaluateSla({     entry: e,     now: T0 + 500_000,     ack: {       cameraId:  | `scripts/simulate-wave174-triage-sla.mjs` |
| ,         openedAt: openedAt - drift,       },     },     startedAt: SHIFT,     now,   });   ok(perf.decided === 0,  | `scripts/simulate-wave175-shift-performance.mjs` |
| ,         worst:  | `scripts/simulate-wave175-shift-performance.mjs` |
| , openedAt, now) },     acks: {        | `scripts/simulate-wave175-shift-performance.mjs` |
| Muitas falhas — abortando simulação. | `scripts/simulate-wave188-favorite-views.mjs` |
| Falhas demais — abortando. | `scripts/simulate-wave193-remote-command.mjs` |
| cam-b caiu | `scripts/simulate-wave211.ts` |
| executor exploded | `scripts/simulate-wave211.ts` |
| boom:${id} | `scripts/simulate-wave212.ts` |
| cuda oom | `scripts/simulate-wave213.ts` |
| accumulator overflow | `scripts/simulate-wave214.ts` |
| ocr crashed | `scripts/simulate-wave214.ts` |
| tensor shape mismatch | `scripts/simulate-wave214.ts` |
| sink down | `scripts/simulate-wave24-scenarios.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| Autofix exige branch de trabalho; main/develop sao proibidas. | `scripts/autofix-lint/run.mjs` |
| Caminhos de saida obrigatorios. | `scripts/autofix-lint/run.mjs` |
| ESLint ${fixing ?  | `scripts/autofix-lint/run.mjs` |
| SHA base invalido. | `scripts/autofix-lint/run.mjs` |
| git falhou (${result.status}): ${result.stderr.trim()} | `scripts/autofix-lint/run.mjs` |
| HTTP ${res.status} | `scripts/ci/check-deploy-freeze.mjs` |
| prom_status_${body?.status} | `scripts/ci/check-deploy-freeze.mjs` |
| --entrada exige o caminho do arquivo com a resposta do banco.sql | `scripts/inventario/gerar-banco.mjs` |
| Management API ${caminho} respondeu HTTP ${res.status} | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_PROJECT_REF=${ref} nao e o banco oficial (${PROJETO_OFICIAL}). | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco oficial: ${comuns} tabelas em comum com o manifesto  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco oficial: ledger com ${registros} registros e maior versao ${max};  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao traz resumo.ledger_versao_max/ledger_registros; rode o banco.sql atual. | `scripts/inventario/gerar-banco.mjs` |
| a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql. | `scripts/inventario/gerar-banco.mjs` |
| entrada sem as chaves: ${faltando.join( | `scripts/inventario/gerar-banco.mjs` |
| entrada sem tabelas | `scripts/inventario/gerar-banco.mjs` |
| format_version ${dado.format_version} desconhecido (esperado 1) | `scripts/inventario/gerar-banco.mjs` |
| nenhuma tabela encontrada em src/integrations/supabase/types.ts | `scripts/inventario/gerar-banco.mjs` |
| sem --entrada e sem SUPABASE_ACCESS_TOKEN: nada para ler (veja o cabecalho do script). | `scripts/inventario/gerar-banco.mjs` |
| src/integrations/supabase/types.ts sem bloco  | `scripts/inventario/gerar-banco.mjs` |
| ripgrep (rg) falhou com exit ${status}; o inventário não foi gerado. | `scripts/inventario/gerar-repo.mjs` |
| ripgrep (rg) não encontrado; o inventário não pode ser gerado com segurança. | `scripts/inventario/gerar-repo.mjs` |
| failed | `scripts/maintenance/lib.mjs` |
| missing_dependencies | `scripts/maintenance/lib.mjs` |
| skipped_busy | `scripts/maintenance/lib.mjs` |
| formatter fixture failed | `scripts/maintenance/maintenance.unit.mjs` |
| blocked_network_sandbox | `scripts/maintenance/run.mjs` |
| pending_patch | `scripts/maintenance/run.mjs` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| ).length;     const analysisCount = items.filter((i) => i.type ===  | `src/components/AnalysisHistoryPanel.tsx` |
| ;   const Icon = isAlert ? AlertTriangle : (ANALYSIS_ICONS[item.analysisType ??  | `src/components/AnalysisHistoryPanel.tsx` |
| Sessão não encontrada | `src/components/AuthCallback.tsx` |
|  className= | `src/components/CameraCard.tsx` |
|                      ?  | `src/components/CameraMap.tsx` |
| , label:  | `src/components/CameraMap.tsx` |
| :       return CHART_COLORS.cameraAlert;     case  | `src/components/CameraMap.tsx` |
| Erro ao processar gravação | `src/components/ClipRecorderControls.tsx` |
| Erro na gravação | `src/components/ClipRecorderControls.tsx` |
| Gravação local (sem nuvem) | `src/components/ClipRecorderControls.tsx` |
| Não foi possível baixar o clip | `src/components/ClipRecorderControls.tsx` |
| Não foi possível iniciar a gravação | `src/components/ClipRecorderControls.tsx` |
| Stream não disponível para gravação | `src/components/ClipRecorderControls.tsx` |
|  \|\| c.status ===  | `src/components/Dashboard.tsx` |
| ,     title:  | `src/components/EventTimeline.tsx` |
|  &&                          | `src/components/GlobalSearch.tsx` |
| Erro ao analisar imagem. Verifique a qualidade da foto e tente novamente. | `src/components/LicensePlateRecognition.tsx` |
| Faça login para analisar imagens | `src/components/LicensePlateRecognition.tsx` |
| Erro no login com Google | `src/components/OAuthButtons.tsx` |
| ; import { Button } from  | `src/components/PWAMigrationBanner.tsx` |
| ).length },       ],     });     sections.push({       title:  | `src/components/ReportsPanel.tsx` |
| Erro ao gerar relatório | `src/components/ReportsPanel.tsx` |
|  } > = {   low: { label:  | `src/components/RuleCard.tsx` |
|  },   critical: { label:  | `src/components/RuleCard.tsx` |
|  &&                  | `src/components/StatusIndicator.tsx` |
|  \|\| status ===  | `src/components/StatusIndicator.tsx` |
| Digite uma URL de stream | `src/components/StreamConfigPanel.tsx` |
| URL do stream é obrigatória | `src/components/StreamConfigPanel.tsx` |
| ; import { cn } from  | `src/components/TelegramConfig.tsx` |
| , label:  | `src/components/VideoPlayer.tsx` |
| :         return  | `src/components/VideoPlayer.tsx` |
| ; import { AlertTriangle, HeartPulse, RefreshCw } from  | `src/components/admin/AgentHealingCard.tsx` |
| ; import { useAgentHealingTrail } from  | `src/components/admin/AgentHealingTrailCard.tsx` |
| ; import { Progress } from  | `src/components/admin/AgentRestartBudgetCard.tsx` |
| Adicione ao menos um matcher válido | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| Comentário obrigatório (mín. 5 caracteres) | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| Duração inválida (5–1440 minutos) | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| Justificativa obrigatória (mín. 5 caracteres) para expirar | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| Matcher global ( | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| ; import { useArbiterInvariants } from  | `src/components/admin/ArbiterInvariantsCard.tsx` |
| ; import { AlertTriangle, Clock, RefreshCw } from  | `src/components/admin/CameraClockSkewCard.tsx` |
| Falha ao executar: ${(e as Error).message} | `src/components/admin/CameraHealthCard.tsx` |
|                  aria-live= | `src/components/admin/ConnectivityResolutionCard.tsx` |
| ; import {   Select,   SelectContent,   SelectItem,   SelectTrigger,   SelectValue, } from  | `src/components/admin/CronJobRunsCard.tsx` |
| Cron atrasado: ${row.jobname} | `src/components/admin/CronStaleWatcher.tsx` |
| Escalação manual falhou | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| Falha ao carregar histórico | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| Falha ao consultar status de escalação | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| Falha ao registrar ACK | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| Execução manual falhou | `src/components/admin/CronWatchdogRunsCard.tsx` |
| Falha ao carregar execuções do watchdog | `src/components/admin/CronWatchdogRunsCard.tsx` |
| ; import { ScrollArea } from  | `src/components/admin/ForgetUserMediaCard.tsx` |
| Falha ao executar esquecimento | `src/components/admin/ForgetUserMediaCard.tsx` |
| ; import { ScrollArea } from  | `src/components/admin/LegalHoldManagerCard.tsx` |
| Motivo obrigatório (mín. 5 caracteres) | `src/components/admin/LegalHoldManagerCard.tsx` |
| UUID inválido | `src/components/admin/LegalHoldManagerCard.tsx` |
| ; import { AlertTriangle, BellRing, RefreshCw } from  | `src/components/admin/MaintenanceAlertsCard.tsx` |
| ; import { AlertTriangle, RefreshCw, Send } from  | `src/components/admin/MaintenanceDispatchCard.tsx` |
| , {         _alert_id: alertId,       });       setAcking(null);        if (rpcError) {         toast({           title:  | `src/components/admin/MaintenanceEscalationCard.tsx` |
| ; import { AlertTriangle, BellRing, Check, RefreshCw } from  | `src/components/admin/MaintenanceEscalationCard.tsx` |
| Não foi possível reconhecer | `src/components/admin/MaintenanceEscalationCard.tsx` |
| Falha ao copiar | `src/components/admin/MissingFkIndexesCard.tsx` |
| ; import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp, Minus, Activity } from  | `src/components/admin/PartitionBacklogTrendCard.tsx` |
| ; import { AlertTriangle, Droplets, RefreshCw } from  | `src/components/admin/PartitionDrainCard.tsx` |
| ; import { AlertTriangle, FlaskConical, RefreshCw } from  | `src/components/admin/PartitionQuarantineCard.tsx` |
| ; import { AlertTriangle, GitMerge, RefreshCw } from  | `src/components/admin/RootCauseCorrelationCard.tsx` |
| Falha no ANALYZE: ${e.message} | `src/components/admin/StatsStalenessCard.tsx` |
| ; import { cn } from  | `src/components/alarms/AlarmScheduleEditor.tsx` |
| ; import {   Select,   SelectContent,   SelectItem,   SelectTrigger,   SelectValue, } from  | `src/components/alarms/AlarmSchemeFormDialog.tsx` |
| Cadastro recusado | `src/components/alarms/AlarmSchemeFormDialog.tsx` |
|  size= | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| ; export type SeverityFilter =  | `src/components/analysis-history/AnalysisHistoryFilters.tsx` |
| , label:  | `src/components/automation/constants.ts` |
| ],   cameras: [],   zone_id: null,   schedule: {     enabled: false,     days: [1, 2, 3, 4, 5],     start_time:  | `src/components/automation/constants.ts` |
| Arquivo vazio | `src/components/behavior/useBehaviorAnalysis.ts` |
| Erro ao analisar imagem | `src/components/behavior/useBehaviorAnalysis.ts` |
| Canal deve estar entre 1 e 64. | `src/components/cameras/AddCameraDialog.tsx` |
| Descoberta falhou: ${safeErrorMessage(err)} | `src/components/cameras/AddCameraDialog.tsx` |
| Falha ao cadastrar câmera: ${safeErrorMessage(err)} | `src/components/cameras/AddCameraDialog.tsx` |
| IP em rede local detectado — selecione um Agente Local ou ajuste a configuração. | `src/components/cameras/AddCameraDialog.tsx` |
| IP em rede local — sondagem precisa de Agente Local ou host público. | `src/components/cameras/AddCameraDialog.tsx` |
| Informe o IP ou hostname da câmera. | `src/components/cameras/AddCameraDialog.tsx` |
| Informe o IP/host da câmera para gerar as URLs. | `src/components/cameras/AddCameraDialog.tsx` |
| Informe o IP/hostname da câmera antes de testar portas. | `src/components/cameras/AddCameraDialog.tsx` |
| Não foi possível capturar o snapshot inicial — capture manualmente na tela da câmera | `src/components/cameras/AddCameraDialog.tsx` |
| PTZ: ${ptzErr.message} | `src/components/cameras/AddCameraDialog.tsx` |
| Porta inválida. | `src/components/cameras/AddCameraDialog.tsx` |
| Preencha URL RTSP e credenciais antes de testar. | `src/components/cameras/AddCameraDialog.tsx` |
| Preencha endpoint, usuário e senha PTZ. | `src/components/cameras/AddCameraDialog.tsx` |
| Preencha usuário e senha antes de descobrir. | `src/components/cameras/AddCameraDialog.tsx` |
| Selecione um modelo antes de aplicar. | `src/components/cameras/AddCameraDialog.tsx` |
| Sessão expirada | `src/components/cameras/AddCameraDialog.tsx` |
| Substream contém credenciais — considere migrar para o cofre em uma próxima etapa | `src/components/cameras/AddCameraDialog.tsx` |
| Teste de portas falhou: ${safeErrorMessage(err)} | `src/components/cameras/AddCameraDialog.tsx` |
| ; import {   RTSP_TEMPLATES,   getTemplatesForBrand,   renderTemplate,   type RtspBrand,   type RtspTemplate, } from  | `src/components/cameras/AddNvrDialog.tsx` |
| Não foi possível gerar as URLs dos canais | `src/components/cameras/AddNvrDialog.tsx` |
|                    ?  | `src/components/cameras/CameraCard.tsx` |
|        ?  | `src/components/cameras/CameraCard.tsx` |
|  ? (                     <>                       <Circle className= | `src/components/cameras/CameraCard.tsx` |
| ; import { Loader2, Copy, RefreshCw, ShieldOff, Radio, Eye, EyeOff } from  | `src/components/cameras/CameraIngestPushCard.tsx` |
| Não foi possível ler as portas (${result.reason}) | `src/components/cameras/CameraIoPanel.tsx` |
| Erro ao aplicar regras | `src/components/cameras/CameraSetupWizard.tsx` |
| Erro ao carregar zonas | `src/components/cameras/CameraSetupWizard.tsx` |
| Falha ao gerar PDF: ${(e as Error).message} | `src/components/cameras/CameraTestHistoryCard.tsx` |
| Falha: ${(e as Error).message} | `src/components/cameras/CameraTestHistoryCard.tsx` |
| Nenhuma validação disponível para gerar o relatório. | `src/components/cameras/CameraTestHistoryCard.tsx` |
| ; import { useFirmwareDetection } from  | `src/components/cameras/FirmwareAutodetectCard.tsx` |
|                      className= | `src/components/cameras/LivePreviewPlayer.tsx` |
| Intervalo deve estar entre 1 e 1440 minutos | `src/components/cameras/RtspRevalidationScheduleCard.tsx` |
| Selecione ao menos um alvo (principal ou substream) | `src/components/cameras/RtspRevalidationScheduleCard.tsx` |
| Falha ao rodar benchmark | `src/components/cameras/RtspVariantBenchmarkCard.tsx` |
| Informe o IP/host antes de testar. | `src/components/cameras/RtspVariantBenchmarkCard.tsx` |
| Nenhuma variante disponível para testar. | `src/components/cameras/RtspVariantBenchmarkCard.tsx` |
| ; import { Send, ShieldX, Check, X, Clock } from  | `src/components/collab/CollabInvitesCard.tsx` |
| ;    const { zones } = useZoneDetection({ cameraId: camera.id, cameraName: camera.name });    return (     <div       className={cn(          | `src/components/dashboard/CameraStreamCard.tsx` |
| Cadastre ao menos uma câmera para simular eventos | `src/components/dashboard/EventSimulator.tsx` |
| ; import { Tooltip, TooltipContent, TooltipTrigger } from  | `src/components/devices/RemoteCommandPanel.tsx` |
| Não foi possível cancelar o comando. | `src/components/devices/RemoteCommandPanel.tsx` |
| Não foi possível falar com o servidor. Confira a fila antes de repetir. | `src/components/devices/RemoteCommandPanel.tsx` |
|        ?  | `src/components/emap/CrossFloorAttentionBanner.tsx` |
| >               {problem}             </p>           )}         </div>          <DialogFooter>           <Button variant= | `src/components/emap/UploadPlanDialog.tsx` |
| ; import { Button } from  | `src/components/evidence/DossierVerifierCard.tsx` |
| ; import { Badge } from  | `src/components/faces/FaceEventTimeline.tsx` |
| ; import { Route, ArrowRight, AlertTriangle, Clock } from  | `src/components/faces/PersonTimelineCard.tsx` |
| ; import { Badge } from  | `src/components/faces/ReferenceFaceMatchCard.tsx` |
| ; import { FileSignature, Download, AlertTriangle, ShieldQuestion } from  | `src/components/faces/TimelineAttestationCard.tsx` |
| Não foi possível emitir o atestado | `src/components/faces/TimelineAttestationCard.tsx` |
| O servidor não devolveu o atestado. | `src/components/faces/TimelineAttestationCard.tsx` |
| Erro ao enviar via Telegram | `src/components/journey/useJourneyData.ts` |
| Sem dados para enviar | `src/components/journey/useJourneyData.ts` |
| Sem dados para exportar | `src/components/journey/useJourneyData.ts` |
|            aria-live= | `src/components/layout/SectionErrorBoundary.tsx` |
| Erro ao carregar histórico | `src/components/license-plate/useLicensePlateData.ts` |
| Erro ao carregar veículos | `src/components/license-plate/useLicensePlateData.ts` |
| Erro ao excluir veículo | `src/components/license-plate/useLicensePlateData.ts` |
| Erro ao salvar veículo | `src/components/license-plate/useLicensePlateData.ts` |
| Erro na busca | `src/components/license-plate/useLicensePlateData.ts` |
| ; import { Badge } from  | `src/components/maintenance/DispatchDeliverabilityCard.tsx` |
| ; import { BellOff, CheckCircle2, ShieldAlert } from  | `src/components/maintenance/MaintenanceAlertsCard.tsx` |
| Campo obrigatório | `src/components/notification-settings/ChannelsTab.tsx` |
| Já adicionado | `src/components/notification-settings/ChannelsTab.tsx` |
| Erro ao salvar configurações | `src/components/notification-settings/useNotificationConfig.ts` |
| Erro ao testar notificação via ${channel} | `src/components/notification-settings/useNotificationConfig.ts` |
| Não foi possível gerar link de download. | `src/components/nvr-downloads/NvrDownloadJobRow.tsx` |
| Erro ao salvar | `src/components/people/PersonFormDialog.tsx` |
| Formato de arquivo inválido ou corrompido (magic bytes). | `src/components/people/PersonFormDialog.tsx` |
| Nome é obrigatório | `src/components/people/PersonFormDialog.tsx` |
| Uma foto com rosto é obrigatória para novos cadastros | `src/components/people/PersonFormDialog.tsx` |
| Erro ao carregar dados | `src/components/people/usePeopleData.ts` |
| Erro ao remover | `src/components/people/usePeopleData.ts` |
| Preencha nome e selecione pelo menos um EPI | `src/components/ppe/PPEZonesTab.tsx` |
|            data-testid= | `src/components/ptz/PtzAxisRangeVisualizer.tsx` |
| ; import { ScrollArea } from  | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| Selecione ao menos um preset | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| Sem preset_number livre (limite 255) | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
| absolute_move_requer_onvif | `src/components/ptz/PtzCalibratedPresetsPanel.tsx` |
|                >                 <TriangleAlert className= | `src/components/ptz/PtzCalibrationPanel.tsx` |
| ${msg} — considere recalibrar | `src/components/ptz/PtzCalibrationPanel.tsx` |
| ${msg} — recalibração recomendada | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Arquivo inválido: JSON malformado. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Arquivo não parece ser uma calibração PTZ exportada. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Campo  | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Câmera sem ID — impossível importar. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Dome não se moveu o suficiente em ${AXIS_LABEL[axis]} (Δ=${traveled.toFixed(3)}). | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Entrada inválida para o eixo ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Falha ao salvar calibração importada: ${error.message} | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Falha ao salvar observado: ${error.message} | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Fora do intervalo permitido [${lo}, ${hi}]. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| GetStatus não reportou posição final em ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| GetStatus não reportou posição inicial em ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| GetStatus não reportou posição para ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Medição inconclusiva em ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Medição indisponível (driver não expõe GetStatus) | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Meça o sweep real de ${AXIS_LABEL[axis]} antes de revalidar. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Máximo (${cur.toFixed(2)}) precisa ser maior que o mínimo (${other.toFixed(2)}) | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Mínimo (${cur.toFixed(2)}) precisa ser menor que o máximo (${other.toFixed(2)}) | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Mínimo precisa ser menor que o máximo. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Nenhum eixo válido no arquivo importado. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Nenhuma calibração para exportar. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Recaptura guiada indisponível (driver não expõe GetStatus). | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Revalidação indisponível (driver não expõe GetStatus) | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Sem folga suficiente para revalidar em ${AXIS_LABEL[axis]}. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| … +385 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `admin` | `src/components/security/CameraVaultAuditCard.tsx` |
| `denied` | `src/components/settings/NotificationSettingsPanel.tsx` |
| `granted` | `src/components/settings/NotificationSettingsPanel.tsx` |
| `banner` | `src/contexts/a11y/components.tsx` |
| `contentinfo` | `src/contexts/a11y/components.tsx` |
| `main` | `src/contexts/a11y/components.tsx` |
| `navigation` | `src/contexts/a11y/components.tsx` |
| `region` | `src/contexts/a11y/components.tsx` |
| `granted` | `src/hooks/useRealtimeAlertNotifications.ts` |
| `admin` | `src/hooks/useUserRole.ts` |
| `granted` | `src/lib/browserNotifications.ts` |
| `admin` | `src/lib/permissions/capabilities.ts` |
| `role` | `src/pages/UserManagementPage.tsx` |
| `user` | `supabase/functions/_shared/auth.ts` |
| `admin` | `supabase/functions/alertmanager-silence/index.ts` |
| `true` | `supabase/functions/archive-warm-to-cold/index.ts` |
| `admin` | `supabase/functions/camera-credentials-vault/index.ts` |
| `true` | `supabase/functions/resolve-media-url/index.ts` |
| `true` | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| `admin` | `supabase/migrations/20260513172507_a273368b-18d4-44e8-a3d2-93256a18cab5.sql` |
| `admin` | `supabase/migrations/20260712203101_5c17fa62-23c1-4193-9b97-ed9a520095bf.sql` |
| `admin` | `supabase/migrations/20260712203138_3cddfb9f-ab09-4a8d-8608-e320c7edb821.sql` |
| `admin` | `supabase/migrations/20260717141046_0e43442e-3087-49ad-8461-006e43868263.sql` |
| `admin` | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `manager` | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `operator` | `supabase/migrations/20260717144715_79dfc401-82e7-43ef-ba15-6ec6970c6533.sql` |
| `admin` | `supabase/migrations/20260728115459_1fac1b3d-2b98-43cd-9ca7-02c696cb3ad0.sql` |

## K. Testes como especificação (2688 testes em 236 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `supabase/functions/_shared/__tests__/webhookContractTests_test.ts` | 80 | ingest-auth V1: aceita payload publish válido · ingest-auth V1: aceita payload unpublish com todos os campos opcionais · ingest-auth V1: aceita protocol srt_push · ingest-auth V1: rejeita action inválida … |
| `supabase/functions/_shared/__tests__/contractValidation_test.ts` | 47 | getContractVersion retorna v1 por padrão quando não há header · getContractVersion retorna v2 via x-api-version: v2 · getContractVersion retorna v2 via x-api-version: 2 · getContractVersion retorna v2 via x-contract-version: v2 … |
| `src/test/lib/ipUtils.test.ts` | 42 | ipUtils · isValidIPv4 · valid IPs · invalid IPs … |
| `src/components/ptz/lib/__tests__/calibrationRules.boundary.test.ts` | 37 | computeRecaptureRequired — fronteira do limiar (default 10%) · não marca no valor exato do limiar (10.0) · não marca um ULP abaixo do limiar · marca um ULP acima do limiar (menor diferença representável em float64) … |
| `src/__tests__/lib/collabNetwork.test.ts` | 35 | canonicalPlate · aceita as duas gerações de placa brasileira · ignora separadores, espaços e caixa · corrige confusão de OCR respeitando a posição … |
| `supabase/functions/_shared/zoneMatcher.test.ts` | 35 | isPointInPolygon: ponto claramente interno · isPointInPolygon: ponto claramente externo · isPointInPolygon: polígono côncavo (formato L) · isPointInPolygon: polígono vazio devolve false … |
| `src/lib/evidence/__tests__/custodyManifest.test.ts` | 34 | canonicalize (C7) · é indiferente à ordem das chaves · colapsa -0 em 0 — é o mesmo fato · recusa selar valores ambíguos … |
| `tests/e2e/critical-paths.spec.ts` | 28 | Auth Flow — Complete Happy Paths · should toggle between Login and Signup tabs · should show password strength indicator on signup · should show validation error for empty email … |
| `src/lib/__tests__/productivityDescribe.test.ts` | 25 | describeConfig — tipos de evento · lista todos os rótulos quando todos os tipos estão ativos · lista apenas os tipos selecionados · preserva a ordem em que os tipos foram selecionados … |
| `src/lib/__tests__/productivityWindow.test.ts` | 25 | isWithinWindow — janela diurna simples · inclui o instante exato de início (limite inferior inclusivo) · inclui o instante exato de fim (limite superior inclusivo) · exclui um minuto antes do início … |
| `cypress/e2e/accessibility-full.cy.ts` | 24 | Accessibility Full E2E · WCAG 2.1 AA Compliance · deve passar verificação a11y em ${page.name} · Navegação por Teclado … |
| `cypress/e2e/api-integration.cy.ts` | 24 | API Integration E2E · Supabase · deve conectar ao Supabase · deve realizar operações CRUD … |
| `src/__tests__/lib/dwellTracker.test.ts` | 24 | applyDwellObservation · rejeita alvo sem identificador · rejeita detecção abaixo da confiança mínima · aceita exatamente no piso de confiança … |
| `src/lib/__tests__/healingTrail.test.ts` | 24 | healingTrail — T1 rótulo e tom para toda ação · %s tem rótulo e tom · observe nunca é apresentado como sucesso · classifica ações contidas … |
| `src/lib/retention/__tests__/retentionRegistry.test.ts` | 24 | registro de rotinas de retenção · não tem nomes nem tabelas duplicados · mantém ordem alfabética por tabela de origem · declara cadência positiva e rótulo não vazio … |
| `src/test/hooks/hooks.test.ts` | 24 | hooks (logic tests) · useToggle logic · toggles boolean · useCounter logic … |
| `src/test/lib/dateUtils.test.ts` | 24 | lib/dateUtils · formatDate · formats valid dates · returns empty for invalid dates … |
| `cypress/e2e/security.cy.ts` | 23 | Security E2E · Autenticação · deve redirecionar para login se não autenticado · deve expirar sessão após inatividade … |
| `src/__tests__/lib/monitoringCenter.test.ts` | 23 | Onda 126 — mapa Contact ID · todo evento mapeia para código Ademco de 3 dígitos e qualificador válido · eventos de vida (pânico/coação/incêndio) têm prioridade máxima · pares evento/restauro compartilham código e divergem no qualificador … |
| `src/lib/faces/__tests__/attestationConference.test.ts` | 23 | conferAttestation — caminho feliz · confirma autenticidade quando conteúdo e registro concordam · aceita o mesmo instante escrito em formatos diferentes · I1 — falha de transporte nunca acusa … |
| `src/__tests__/lib/agentRestartBudget.test.ts` | 22 | perRunBudget · é proporcional à frota, com piso e teto · windowRemaining · desconta os reinícios já feitos e nunca fica negativo … |
| `src/components/ptz/lib/__tests__/calibrationRules.test.ts` | 22 | computeRecaptureRequired · retorna todos false quando validation está vazia · não marca eixo quando error_pct é exatamente o limiar (comparação estrita) · marca eixo quando error_pct excede o limiar … |
| `cypress/e2e/real-time-alerts.cy.ts` | 21 | Real-Time Alerts E2E · Recebimento de Alertas · deve receber alerta via WebSocket · deve tocar som de notificação … |
| `src/__tests__/lib/partitionBacklogTrend.test.ts` | 21 | theilSenSlopePerHour · recupera a inclinação exata de uma série perfeitamente linear · retorna null quando não há par com intervalo de tempo válido · ignora um pico isolado — a razão de não usar mínimos quadrados … |
| `src/lib/__tests__/productivityPresets.test.ts` | 21 | matchPreset — reconhecimento exato · reconhece o padrão como o preset  · retorna o preset de horário comercial para a config equivalente · retorna o preset noturno mesmo com janela cruzando a meia-noite … |
| `src/lib/__tests__/relayVerdict.test.ts` | 21 | classifyOutcome — desfecho canônico · trata desistência do backend como causa nossa, mesmo com janela justa · classifica resposta com erro do alvo como resposta, não como silêncio · separa silêncio sem claim de travamento após claim … |
| `src/__tests__/lib/collabGovernance.test.ts` | 20 | governança da rede colaborativa — emissão de convite · aceita o caminho feliz com o TTL padrão · exige autoridade antes de qualquer outra crítica · recusa convidar a própria dona da rede … |
| `src/__tests__/lib/collabNotifications.test.ts` | 20 | roteamento de notificações — matriz completa · cobre toda ação de governança com um tipo de notificação · entrega o convite recebido só à convidada — a dona não é avisada do que fez · devolve resposta (aceite/recusa) à dona da rede, nunca à própria respondente … |
| `src/lib/__tests__/bottomNavBadge.test.ts` | 20 | bottomNavBadge — frota (B1, B2, B3) · B2 frota vazia nunca renderiza contador · B1 sempre mostra online/total, inclusive com zero online · B3 tom acompanha a razão da frota … |
| `src/lib/devices/__tests__/pullPointLease.test.ts` | 20 | pullPointLease — empréstimo · empréstimo vivo e folgado manda puxar mensagens · vencido recria, nunca renova (P2) · perto do vencimento renova antes de morrer … |
| `src/lib/faces/__tests__/personTimeline.test.ts` | 20 | personTimeline — agrupamento em permanências · sem leitura, devolve linha do tempo vazia sem inventar instantes · leituras próximas na mesma câmera formam uma permanência única · intervalo maior que o corte abre nova permanência … |
| `src/__tests__/lib/collabNotificationSilencing.test.ts` | 19 | collabNotificationSilencing — invariantes de segurança · nunca permite silenciar aviso acionável ou crítico · mantém aviso não silenciável realçado em toda combinação de preferência e relógio · collabNotificationSilencing — normalização … |
| `src/__tests__/lib/streamIngest.test.ts` | 19 | streamIngest — forma da chave · aceita apenas hex entre 32 e 64 caracteres · mascara sem revelar o miolo · streamIngest — URLs de publicação … |
| `src/lib/alarms/__tests__/alarmScheme.test.ts` | 19 | alarmScheme — cadastro · aprova um esquema completo · S1/S2 recusa nome vazio e tipo fora do catálogo · S3 degrada com origem parcial e inoperante sem nenhuma origem viva … |
| `src/lib/maintenance/__tests__/deliverabilityAlert.test.ts` | 19 | deliverabilityAlertSeverity (W1–W7) · W2 — mudo com crítico aberto é crítico; sem crítico é aviso · W3 — canal configurado que não entrega é sempre crítico · W4 — entrega parcial é aviso, nunca crítico … |
| `cypress/e2e/mobile.cy.ts` | 18 | Mobile E2E · ${viewport.name} (${viewport.width}x${viewport.height}) · Layout Responsivo · deve exibir menu hamburguer … |
| `cypress/e2e/multi-camera.cy.ts` | 18 | Multi-Camera E2E · Grid de Câmeras · deve exibir grid 2x2 · deve exibir grid 3x3 … |
| `src/__tests__/lib/maintenanceSourceAlerts.test.ts` | 18 | evaluateMaintenanceSources — detector de relógio · não emite nada quando a frota está saudável · trata detector inexistente como crítico · marca execução obsoleta como crítica … |
| `src/components/skeletons/__tests__/LoadingPlaceholders.test.tsx` | 18 | Loading placeholders permanecem renderizados durante o loading · CamerasSkeleton · expõe role= · renderiza placeholder de filtros (search + select + view switcher) … |
| `src/lib/__tests__/clipStorageUrls.test.ts` | 18 | extractStoragePath · extrai o path de signed URLs · extrai o path de URLs públicas · retorna null para URL de blob local e vazio … |
| `src/lib/evidence/__tests__/exportRegistryView.test.ts` | 18 | exportRegistryView — os dois eixos nunca se fundem (C1) · material comprometido pode estar com a corrente íntegra · material admissível pode estar adulterado · exportRegistryView — presunções proibidas … |
| `src/__tests__/lib/maintenanceEscalation.test.ts` | 17 | maintenanceEscalation — escada de urgência · não escala alerta recém-criado e entregue · sobe para lembrete após 30 min de silêncio em alerta crítico · congela a escada quando o alerta é reconhecido, mesmo muito antigo … |
| `src/lib/alarms/__tests__/admissionLedger.test.ts` | 17 | buildAdmissionLedger · L1 — contabilidade fechada · L2 — cada evento conta uma vez, pelo motivo global · L3 — evento fora da janela é descartado de forma declarada … |
| `src/lib/alarms/__tests__/admissionPurgeHistory.test.ts` | 17 | readCount · aceita bigint textual do PostgREST · recusa texto não numérico e negativos · readPurgeRun … |
| `src/lib/alarms/__tests__/alarmSchemeForm.test.ts` | 17 | parseIdList · aceita vírgula, ponto-e-vírgula e quebra de linha, deduplicando · F5 — entrada hostil não lança · admitSchemeSubmission … |
| `src/lib/alarms/__tests__/episodeCommandQueue.test.ts` | 17 | episodeCommandQueue — idempotência · absorve o mesmo fato enfileirado duas vezes · descarta comandos malformados sem lançar · episodeCommandQueue — ordem e recuo … |
| `src/lib/permissions/__tests__/capabilities.test.ts` | 17 | capabilities — piso dos papéis · C2: o piso é monotônico na hierarquia · C7: todo papel resolve mesmo sem concessão · admin cobre o catálogo inteiro … |
| `src/__tests__/lib/agentHealing.test.ts` | 16 | computeDeafRatio · retorna null com amostra insuficiente · ignora tarefas ainda pendentes no denominador · decideAgentHealing … |
| `src/lib/collab/__tests__/collabNavBadge.test.ts` | 16 | ageInHours (C8) · entradas inválidas viram null em vez de NaN · timestamp no futuro nunca vira idade negativa · idade é medida em horas … |
| `src/lib/devices/__tests__/onvifPullPointParse.test.ts` | 16 | parseSubscribeResponse · extrai endereço e carimbos independentemente do prefixo · é total diante de lixo · leaseFromDeviceClocks … |
| `src/lib/faces/__tests__/faceSearch.test.ts` | 16 | normalizeFaceSearchCriteria · recusa janela ausente e invertida · recusa janela no futuro e acima do teto · nunca deixa o fim ultrapassar o agora … |
| `src/lib/faces/__tests__/timelineAttestation.test.ts` | 16 | assessTimeline · corrobora trajetória limpa · trata ausência de permanência como inconclusiva, nunca como ausência da pessoa · conflito de co-presença contesta a trajetória … |
| `src/lib/maintenance/__tests__/acknowledgementDecay.test.ts` | 16 | undeliveredCriticalCount (X2) — o coração corretivo da onda · reconhecer NUNCA reduz a acusação de mudez · mede a lavagem em vez de escondê-la · assessAcknowledgement … |
| `src/lib/provenance/__tests__/readingProvenance.test.ts` | 16 | normalizeProvenanceTier · aceita rótulos conhecidos independentemente de caixa e espaço · rebaixa qualquer coisa não reconhecida para unknown (P5) · deriveStageTier … |
| `cypress/e2e/offline-mode.cy.ts` | 15 | Offline Mode E2E · Detecção de Conexão · deve detectar perda de conexão · deve detectar reconexão … |
| `cypress/e2e/performance.cy.ts` | 15 | Performance E2E · Core Web Vitals · deve ter LCP abaixo de 2.5s · deve ter FID abaixo de 100ms … |
| `src/__tests__/lib/rootCauseCorrelation.test.ts` | 15 | correlateRootCause · declara estabilidade quando o backlog não cresce de forma relevante · trata janela degenerada como dados insuficientes, não como saúde · atribui o crescimento à câmera com relógio crítico e assinatura coerente … |
| `src/lib/__tests__/maintenanceConsoleView.test.ts` | 15 | buildMaintenanceConsole — varredura combinatória · cobre centenas de cenários · I1 — reconhecido não oferece ação; previsão só enquanto a promessa vale · I2 — alerta no teto da severidade não tem previsão … |
| `src/lib/__tests__/relayRedeliveryHealth.test.ts` | 15 | wilsonLowerBound · devolve 0 sem amostra · nunca excede a proporção observada (I2) · converge para a proporção com amostra grande … |
| `src/lib/faces/__tests__/attestationBatch.test.ts` | 15 | summarizeBatch · B3 — lote vazio é inconclusivo, jamais autêntico · B1 — o pior elemento define o cabeçalho, não a maioria · B2 — peça ilegível impede tom positivo mas não acusa … |
| `src/lib/faces/__tests__/faceTimeline.test.ts` | 15 | faceTimeline — zoom · escolhe o passo mais grosso que cabe e recusa janela impossível · o passo mais fino disponível nunca estoura o teto de divisões · só oferece zooms que cabem, sempre em ordem declarada … |
| `src/lib/vision/processors/__tests__/processors.test.ts` | 15 | adaptador de face · A1 trata backend indisponível como falha declarada, nunca como cena vazia · A2 aborta o backend travado no prazo em vez de segurar o slot · A3 degrada para rastreio e reporta quando não há comparador … |
| `cypress/e2e/full-workflow.cy.ts` | 14 | Full Workflow E2E · Autenticação · deve realizar login com credenciais válidas · deve exibir erro com credenciais inválidas … |
| `src/__tests__/lib/clockSkew.test.ts` | 14 | classifyClockSkew · exige amostras mínimas antes de qualquer veredito (I1) · classifica relógio dentro da tolerância como ok (I2) · classifica desvio moderado como atenção (I3) … |
| `src/__tests__/lib/collabGovernanceView.test.ts` | 14 | modelo de visão — convites · mostra convite vencido como vencido antes do cron materializar a coluna · oferece resposta apenas à organização convidada · oferece revogação apenas à dona da rede e nunca autoaceite … |
| `src/lib/__tests__/navBadge.test.ts` | 14 | navBadge — regressão do rótulo textual · exibe o contador de câmeras  · navBadge — N1..N5 · N1 número: só finito e positivo renderiza … |
| `src/lib/alarms/__tests__/eventAdmission.test.ts` | 14 | admitEvent · admite dentro da janela declarada · recusa fora da janela informando o motivo exato · E1 — evento que ninguém vigia é recusa neutra … |
| `src/lib/vision/__tests__/processorContract.test.ts` | 14 | processorContract — entrada · C1 deriva prazo do modo autorizado, nunca do processador · processorContract — saída · C2 trata laudo malformado como falha, nunca como sucesso silencioso … |
| `src/lib/__tests__/cronSchedule.test.ts` | 13 | parseCronSchedule · every minute · hourly at :15 · hourly rollover … |
| `src/lib/__tests__/maintenanceOwner.test.ts` | 13 | readOwnerRouting · traduz todo o vocabulário do banco com rótulo e ação · não inventa responsável quando o alerta não é roteado por culpa · rebaixa rótulo desconhecido para triagem em vez de lançar … |
| `src/lib/__tests__/ownerFilter.test.ts` | 13 | buildOwnerBuckets · particiona todas as linhas entre os baldes (I1) · não oferece balde vazio e mantém  · conta abertos e críticos por dono (I6) … |
| `src/lib/alarms/__tests__/alarmAggregation.test.ts` | 13 | alarmAggregation — agenda · trata agenda vazia como 24x7 · respeita início inclusivo e fim exclusivo · cobre janela que cruza a meia-noite … |
| `src/lib/alarms/__tests__/chronicSeriesBoard.test.ts` | 13 | buildChronicSeriesBoard · classifica pela mesma escada da avaliação local · nunca resume série crítica · série sem carimbo de abertura fica sem registro, nunca calma … |
| `src/lib/devices/__tests__/remoteCommandDelivery.test.ts` | 13 | coleta de comandos (Onda 194) · entrega a ordem mais antiga viável e apenas uma por vez · nunca entrega ordem vencida — ela morre na leitura · o poll é a prova de presença que faltava … |
| `src/lib/vision/__tests__/inferenceCadence.test.ts` | 13 | inferenceCadence · descarta frame velho antes de qualquer outra consideração (C6) · sem atividade não roda nada · primeira aparição da trilha identifica sem esperar intervalo (C4) … |
| `supabase/functions/_shared/__tests__/failureBlame_test.ts` | 13 | simulação cobre centenas de cenários distintos · invariante: função total, sempre no vocabulário fechado · invariante: determinismo — mesma entrada, mesmo veredito · invariante: cancelamento do chamador nunca acusa terceiros … |
| `src/__tests__/lib/suppressionLedger.test.ts` | 12 | Onda 242 — trilha do ruído evitado · S1 agrega por condição preservando canais e instantes · S2 linha ilegível nunca vira economia · S3 supressão fora da janela é descartada … |
| `src/components/ui/__tests__/variant-props.test.tsx` | 12 | Button — prop  · aceita variant=%s e aplica a classe correta · usa variant=default quando omitido · variant inválido em runtime não aplica classe do design system … |
| `src/hooks/video-stream/__tests__/useStreamStats.test.ts` | 12 | useStreamStats ? bitrate adaptativo (autoLevelCapping) · degrada um n?vel ap?s 2 amostras consecutivas de buffer baixo, sem usar currentLevel · amostra intermedi?ria quebra a sequ?ncia consecutiva de buffer baixo · recupera o modo auto ap?s 2 amostras consecutivas com buffer est?vel … |
| `src/lib/__tests__/browserInfo.test.ts` | 12 | browserInfo · detectBrowser · detecta Chrome no Windows · detecta Firefox no Linux … |
| `src/lib/__tests__/firmwareDetector.test.ts` | 12 | firmwareDetector — detectFromBuffer · identifica firmware XiongMai/Sofia (NBD80X) com alta pontuação · identifica firmware Hikvision por strings ISAPI · identifica firmware Dahua (DVRIPweb) … |
| `src/lib/__tests__/ownerAging.test.ts` | 12 | ownerAging (Onda 149) · A5 balde sem abertos fica idle · A1 reconhecidos não influenciam o balde · A3 breached ⇔ folga não positiva … |
| `src/lib/__tests__/relayTaskWindow.test.ts` | 12 | normalizeWindow · aplica a janela padrão a partir do agendamento quando não há TTL proposto · estica o TTL curto de uma tarefa jitterada — a armadilha da Onda 118 · trunca TTL absurdo no teto de sanidade … |
| `src/lib/alarms/__tests__/admissionLedgerRows.test.ts` | 12 | ledgerFromRows · R1 — aceita linha fechada e soma corretamente · R1 — quarentena linha desbalanceada em vez de sanear · R2 — motivo desconhecido invalida a linha … |
| `src/lib/alarms/__tests__/armedNow.test.ts` | 12 | Onda 223 — está armado agora? · N1: desabilitado é  · N2: inoperante jamais aparece como armado · N3: degradado dentro da janela continua valendo, com ressalva … |
| `src/lib/devices/__tests__/pathFailover.test.ts` | 12 | pathFailover — ordenação de caminhos · mantém o preferido saudável na frente e devolve permutação completa · rebaixa o preferido em quarentena sem removê-lo da lista · devolve o preferido quando a quarentena vence … |
| `src/lib/faces/__tests__/referenceMatch.test.ts` | 12 | safeCosine / embeddingNorm · não mede vetor degenerado nem dimensão diferente · mede identidade como 1 · matchReference — recusas declaradas … |
| `src/lib/maintenance/__tests__/dispatchDeliverability.test.ts` | 12 | assessDeliverability · V1 — sem execução registrada nunca reporta saúde · V2 — despachante sem canal com crítico aberto é crítico e nomeia os não avisados · V2 — sem canal e sem crítico aberto ainda é aviso, nunca  … |
| `src/lib/permissions/__tests__/grantConsole.test.ts` | 12 | grantConsole — admissão de concessões · aprova concessão legítima com prazo dentro do teto · recusa concessão sem prazo · aceita exatamente o teto e recusa um dia além … |
| `src/lib/retention/__tests__/retentionAlerts.test.ts` | 12 | Onda 135 — fan-in das rotinas de retenção · não emite nada quando todas as rotinas estão em dia · trata rotina registrada sem observação como nunca executada (crítico) · ignora observações de rotinas não registradas … |
| `src/test/lib/featureFlags.test.ts` | 12 | FeatureFlagService · isEnabled · returns true for enabled flag · returns false for disabled flag … |
| `supabase/functions/validate-rtsp-stream/__tests__/suggestions.test.ts` | 12 | computeScore: perfeito · computeScore: warn em latência 400ms · computeScore: critical em falha · suggestions: timeout gera crítica … |
| `src/__tests__/lib/deviceEnrollment.test.ts` | 11 | deviceEnrollment — conexão por registro · aceita o segredo vigente e registra prova de vida · aceita o segredo anterior só dentro da graça · revogação vence segredo correto e apaga a graça … |
| `src/lib/__tests__/relayHealingArbiter.test.ts` | 11 | arbitrate — Onda 123 · mantém a escalada: caso esgotado é humano, não algorítmico (R0) · veta reinício quando o ambiente já é o culpado (R1, G2) · preserva ações não invasivas sob causa externa … |
| `src/lib/alarms/__tests__/admissionBacklogAlert.test.ts` | 11 | Onda 232 — fan-in do passivo do expurgo · I2: sem execução legível não acusa passivo · I1: linha contestada não vira prova nem alívio · I3: passivo zerado na execução mais recente encerra … |
| `src/lib/alarms/__tests__/admissionOrphanAlert.test.ts` | 11 | Onda 234 — fan-in do órfão (K1–K8) · K2: estoque sem dono vira alerta crítico com os números na frase · K3: estoque vencido sem execução legível é aviso, não crítico · K4: corrida benigna (foto anterior à execução) nunca alerta … |
| `src/lib/alarms/__tests__/alarmRecurrence.test.ts` | 11 | alarmRecurrence · não reincide com ocorrência isolada · agrupa série reincidente não crítica · nunca resume alarme crítico … |
| `src/lib/devices/__tests__/commandSweep.test.ts` | 11 | varredura de ordens abandonadas (Onda 195) · não toca ordem viva na fila · distingue quem venceu antes e depois da entrega · prazo vence antes do empréstimo: ordem vencida está vencida … |
| `src/lib/devices/__tests__/ioSafety.test.ts` | 11 | ioSafety.decideActuation · recusa antes de tudo quando falta a capacidade · recusa porta inexistente, desabilitada e entrada · usa a duração padrão da porta quando nenhuma é pedida … |
| `src/lib/maintenance/__tests__/escalationAckGate.test.ts` | 11 | Onda 249 — portão de reconhecimento da escada · Y1 — congela dentro da janela e decai depois dela · Y3 — condição resolvida honra o ack para sempre · Y4 — agravamento fura o congelamento na hora … |
| `tests/e2e/rtsp-live-preview.spec.ts` | 11 | rtsp-preview — hardening (auth, validação, cleanup) · POST sem Authorization retorna 401 · OPTIONS (preflight CORS) responde 2xx com headers · método GET é rejeitado com 405 … |
| `src/__tests__/lib/conditionSilenceView.test.ts` | 10 | Onda 241 — silêncio visível por condição · R2 — perfil operacional nunca silencia · R2 — a janela é a mesma que a edge function aplica (paridade Q2) · R3 — falha de transporte não cala … |
| `src/__tests__/lib/maintenanceDispatchPolicy.test.ts` | 10 | maintenanceDispatchPolicy — Onda 111 · despacha alerta crítico recém-criado · não reenvia alerta já entregue · respeita o backoff exponencial após falha … |
| `src/__tests__/lib/suppressionRetention.test.ts` | 10 | Onda 243 — retenção da trilha de supressão · T1 relógio ilegível recusa o expurgo inteiro · T2 prazo fora da faixa recusa em vez de  · T3 empate exato no corte preserva a linha … |
| `src/lib/__tests__/relayLease.test.ts` | 10 | relayLease — Onda 121 · nunca reentrega tarefa com lease vigente (I1) · trata lease ausente como vencido para não criar tarefa zumbi · reentrega com recuo e janela justa (I4) … |
| `src/lib/__tests__/resilience.test.ts` | 10 | CircuitBreaker · deve iniciar no estado CLOSED · deve executar funções com sucesso e permanecer CLOSED · deve abrir o circuito após atingir o limite de falhas … |
| `src/lib/alarms/__tests__/reconcileSnapshotRetention.test.ts` | 10 | reconcileSnapshotRetention (Onda 237) · N1: relógio ilegível recusa sem apagar · N2: prazo fora da faixa recusa o expurgo inteiro · N3: empate no corte preserva a foto … |
| `src/lib/collab/__tests__/collabEntryLifecycle.test.ts` | 10 | collabEntryLifecycle — fronteiras · não apaga na fronteira exata da carência, apaga logo depois · entrada viva e nunca revogada jamais é elegível · idade não-finita nunca autoriza apagar … |
| `src/lib/collab/__tests__/collabRetention.test.ts` | 10 | Onda 132 — retenção justa de avisos colaborativos · nenhuma carência ultrapassa o teto absoluto · reconhecer um aviso nunca aumenta o tempo de guarda · acionável e crítico não lidos sobrevivem à retenção base … |
| `src/lib/devices/__tests__/connectivityFailureKind.test.ts` | 10 | classifyPathFailure · classifica todos os códigos de transporte como transport · trata código desconhecido como neutro (config), nunca transport · é total: null, vazio e lixo não lançam … |
| `src/lib/insightface/__tests__/similarity.test.ts` | 10 | insightface/similarity · cosineSimilarity returns 1 for identical vectors · cosineSimilarity returns 0 for orthogonal vectors · cosineSimilarity returns -1 for opposite vectors … |
| `src/lib/vision/__tests__/frameBus.test.ts` | 10 | frameBus — Onda 207 · F1/F4: entrega o mesmo frame a todos os consumidores ociosos · F2: consumidor ocupado guarda só a pendência mais recente · F2: concluir libera a pendência mais recente, nunca a antiga … |
| `src/lib/vision/__tests__/pipelineCycle.test.ts` | 10 | pipelineCycle (Onda 211) · L1 — publica o frame uma única vez e executa as tarefas admitidas · L2 — executor ausente é fracasso declarado, nunca silêncio · L2 — toda tarefa admitida recebe exatamente um desfecho … |
| `src/lib/vision/__tests__/pipelineMetrics.test.ts` | 10 | pipelineMetrics (Onda 212) · M3 — a soma dos baldes de descarte é sempre o total · M2 —  · M4 — executor ausente não gera custo nem sucesso … |
| `src/lib/vision/__tests__/visionPipeline.test.ts` | 10 | visionPipeline — Onda 208 · P2: processador só recebe tarefa da capacidade que declarou · P3: identificação é única por tick, mesmo com dois capazes · P5: identificação sem quem a assuma nunca é cobrada do orçamento … |
| `src/test/hooks/useManagedFilters.test.tsx` | 10 | useManagedFilters · hidrata defaults quando localStorage está vazio · persiste no localStorage ao alterar filtros · clearFilters sem ativos apenas mostra toast.info, sem confirmação … |
| `src/test/lib/exportUtils.test.ts` | 10 | exportUtils · exportToCSV · does nothing for empty data · exports data with auto headers … |
| `supabase/functions/health/index.test.ts` | 10 | health: should return 200 with status · analyze-image: should reject empty body · analyze-image: should reject invalid analysisType · detect-faces: should reject empty body … |
| `supabase/functions/validate-rtsp-stream/criticalAlert.test.ts` | 10 | não dispara alerta na 1ª validação crítica (streak=1 < 2) · dispara alerta na 2ª validação crítica consecutiva (streak=2) · reseta streak quando score volta para  · reseta streak quando score é  … |
| `supabase/functions/validate-rtsp-stream/__tests__/sdp.test.ts` | 10 | parseSdp: cliprect (ONVIF) resolve WxH e ordem correta · parseSdp: x-dimensions (Axis) + x-framerate · parseSdp: framesize (Dahua) WWWW-HHHH · parseSdp: fmtp com width/height/framerate … |
| `src/__tests__/components/collabGovernanceCards.test.tsx` | 9 | CollabInvitesCard · mostra o prazo e oferece revogação à dona da rede · não oferece ação alguma em convite vencido, mesmo com status pendente gravado · permite à organização convidada aceitar e recusar … |
| `src/__tests__/lib/maintenanceConditionThrottle.test.ts` | 9 | Onda 240 — silêncio por condição · Q1 expõe a chave da condição no item planejado · Q2 espelha a janela do perfil de escalada da Onda 238 · cala a reemissão diária da mesma condição no canal já notificado … |
| `src/components/admin/__tests__/CronStaleWatcher.test.tsx` | 9 | CronStaleWatcher · não faz RPC quando usuário não é admin · não faz RPC enquanto role está carregando · dispara toast para cada job stale (admin) … |
| `src/lib/alarms/__tests__/admissionOrphanTrend.test.ts` | 9 | admissionOrphanTrend · L2 — a foto mais recente zerada encerra a acusação · L3 — histórico curto é emergente, nunca persistente · L4/L5/L6 — crescimento, queda e estabilidade são vereditos distintos … |
| `src/lib/alarms/__tests__/admissionTrendAlert.test.ts` | 9 | admissionTrendAlert (Onda 236) · M2/M3 — crescente e persistente são críticos, com cooldowns distintos · M4 — órfão em queda ou recém-surgido avisa, nunca silencia · M5 — sem órfão e sem histórico não emitem … |
| `src/lib/alarms/__tests__/alarmScheduleForm.test.ts` | 9 | Onda 221 — agenda semanal (S8) · G1: agenda vazia é 24×7 declarado e persiste como null · G2: o sétimo período é recusado e nomeado, jamais truncado em silêncio · G3: período degenerado é recusado por ser ambíguo entre  … |
| `src/lib/devices/__tests__/commandReliability.test.ts` | 9 | reputação de obediência ao comando (Onda 196) · amostra curta é  · silêncio observado condena; falha declarada não é silêncio · ordem viva e ordem de outro dono ficam fora da amostra … |
| `src/lib/evidence/__tests__/custodyDossier.test.ts` | 9 | custodyDossier · emite, serializa e reconfere um dossiê íntegro · mantém a emissão fora do bloco selado · detecta edição de um trecho selado … |
| `src/lib/retention/__tests__/episodeBridgeWatch.test.ts` | 9 | vigia da ponte de episódios · declara ignorância em vez de saúde quando há poucas execuções · não alarma quando a fila está drenando · trata patamar absoluto como crítico mesmo estável ou drenando … |
| `src/lib/retention/__tests__/retentionDebut.test.ts` | 9 | evaluateRetentionDebut (Onda 245) · U3: execução presente anula a estreia · U4: ausência de âncora mantém o crítico · U5: registro no futuro não compra carência … |
| `src/lib/vision/__tests__/pipelineFleet.test.ts` | 9 | pipelineFleet · F1 — o pior processador governa a câmera · F2 — câmera sem processador é desconhecida, nunca saudável · F3 — sem desfecho a confiabilidade é nula, não 100% … |
| `src/test/lib/alertSounds.test.ts` | 9 | alertSounds · getSoundSettings returns all severities · each severity has correct shape · setAlertSoundsMuted/getAlertSoundsMuted roundtrip … |
| `src/test/lib/analytics.test.ts` | 9 | analytics · initAnalytics does not throw · double init is safe · trackEvent does not throw … |
| `src/test/lib/errorTracking.test.ts` | 9 | lib/errorTracking · captureException · logs errors · logs with context … |
| `src/test/lib/utils.test.ts` | 9 | cn (class names utility) · merges classes · handles conditional · handles undefined … |
| `supabase/functions/_shared/__tests__/maskSecrets_test.ts` | 9 | maskString oculta user:pass simples · maskString é robusto a @ na senha (Fortress 4) · maskString mantém URL sem credenciais · maskString mascara múltiplas URLs na mesma linha … |
| `cypress/e2e/license-plate.cy.ts` | 8 | License Plate Recognition · should display ALPR page · should show detected plates list · should filter plates by date … |
| `cypress/e2e/reports.cy.ts` | 8 | Reports · should display reports page · should show report types · should generate alert report … |
| `src/__tests__/lib/detachedMonitor.test.ts` | 8 | detachedMonitor — livro de janelas destacadas · abre a primeira janela e foca a segunda solicitação da mesma câmera · considera perdida a janela sem batida e reabre com nova identidade · nunca rebaixa a batida mais recente e ignora janela órfã … |
| `src/components/cameras/__tests__/LivePreviewPlayer.test.tsx` | 8 | LivePreviewPlayer · inicia a prévia via botão e exibe countdown de 60s · estende +60s ao clicar em  · desabilita  … |
| `src/components/navigation/__tests__/navRoutes.test.ts` | 8 | menu x rotas (App.tsx) · todas as 13 telas expostas existem como rota em App.tsx · todo item de menu aponta para rota existente · o minRole das telas expostas nao e mais permissivo que o guard da rota … |
| `src/components/ptz/__tests__/historyReducer.test.ts` | 8 | pushHistory · faz prepend do item mais recente · corta em cap=10 · ignora duplicata consecutiva (mesmo saved_at) … |
| `src/lib/__tests__/livePreviewErrors.test.ts` | 8 | livePreviewErrors — resolveLivePreviewError · mapeia mediamtx_pull_failed com sugestão de firewall/credenciais · mapeia hls_timeout mencionando o prazo de 10s e substream · mapeia connection_dropped destacando estabilidade Wi-Fi/PoE … |
| `src/lib/__tests__/onvifProfiles.test.ts` | 8 | onvifProfiles catalog · expõe o perfil XiongMai NBD80X · resolve NBD80X08S-QWG-V3 → xiongmai-nbd80x (match por prefixo) · resolve por Manufacturer (XiongMai/HZXM/XM) quando Model é desconhecido … |
| `src/lib/__tests__/rtspTemplates.test.ts` | 8 | rtspTemplates · has templates for all supported brands · returns empty array for unknown brand · resolves host, port and channel tokens … |
| `src/lib/__tests__/snapshotAnnotator.test.ts` | 8 | snapshotAnnotator · resolveBoxColor retorna cor determinística por classe · clampBox normaliza box invertido e clampa ao frame · clampBox retorna null para box zero-área ou fora do frame … |
| `src/lib/__tests__/zoneGeometry.test.ts` | 8 | zoneGeometry · rejeita polígono com menos de 3 vértices · dedup remove vértices consecutivos duplicados · calcula área correta de quadrado unitário … |
| `src/lib/alarms/__tests__/admissionReconciliation.test.ts` | 8 | Onda 233 — conciliação estoque × trilha · J1 — inventário ausente ou ilegível nunca é conciliado · J2 — foto anterior à execução é obsoleta, nunca acusação · J3 — estoque vencido sem execução legível é no_run, nunca unaccounted … |
| `src/lib/alarms/__tests__/schemeCatalog.test.ts` | 8 | Onda 220 — catálogo de origens e bibliotecas · K1: id escolhido que sumiu do catálogo vira ausência declarada, nunca sumiço · K2: catálogo desconhecido não acusa ninguém de ter sumido · K3/K4: entrada hostil é saneada sem lançar e preserva a ordem … |
| `src/lib/evidence/__tests__/custodyManifest.simulation.test.ts` | 8 | Onda 156 — simulação de cenários de exportação probatória · I6:  · I3: acrescentar defeito nunca melhora a peça · I5: carimbos do equipamento nunca são reescritos … |
| `src/lib/retention/__tests__/alarmRecurrenceRetention.test.ts` | 8 | retenção dos episódios de reincidência · guarda o episódio ainda aberto por mais antigo que seja · conta o prazo pelo fechamento, não pela abertura · trata a fronteira do prazo como exclusiva … |
| `src/lib/retention/__tests__/episodeReconciliation.test.ts` | 8 | planEpisodeReconciliation · fecha no corte declarado, nunca no instante da execução · não toca em episódio ainda dentro do prazo — é alarme em curso · pula abertura no futuro em vez de  … |
| `supabase/functions/_shared/mediamtxPath.test.ts` | 8 | sanitize: aceita nomes legítimos · sanitize: rejeita path traversal · sanitize: rejeita encoding, controle, barras de borda · sanitize: INVARIANTE — todo nome aceito é seguro na URL (fuzz) … |
| `supabase/functions/_shared/__tests__/networkError_test.ts` | 8 | abort é  · códigos de transporte não viram timeout por engano · fallback textual cobre redirect loop, TLS e corpo terminado · o desconhecido continua explícito (vira alerta, não silêncio) … |
| `tests/e2e/mobile-drawer.spec.ts` | 8 | Mobile drawer (BottomNavigation) · abre drawer ao tocar categoria ativa (Monitor) e fecha ao re-tocar · navega ao tocar categoria diferente (drawer não abre) · drawer fecha ao tocar no overlay (backdrop) … |
| `cypress/e2e/auth.cy.ts` | 7 | Authentication · shows login form · shows email input · shows password input … |
| `cypress/e2e/face-recognition.cy.ts` | 7 | Face Recognition · should display face recognition page · should show registered faces list · should allow uploading a new face … |
| `src/__tests__/lib/deviceConnect.test.ts` | 7 | deviceConnect — porta pública · toda recusa é byte a byte idêntica · aceitação devolve versão, aviso de segredo velho e TTL do servidor · corpo hostil não passa e não vira resposta distinta … |
| `src/components/skeletons/__tests__/SkeletonDimensionSnapshots.test.tsx` | 7 | Snapshots de dimensões dos skeletons (anti-CLS) · CamerasSkeleton: footprint vertical estável · AlertsSkeleton: footprint vertical estável · ZonesSkeleton: footprint vertical estável … |
| `src/components/skeletons/__tests__/SkeletonFallbackResilience.test.tsx` | 7 | SkeletonErrorBoundary — branded skeleton crash · renderiza SkeletonFallback quando o skeleton interno lança · respeita label customizado no fallback · withLazyLoad — lazy chunk rejection … |
| `src/lib/__tests__/clipRetention.test.ts` | 7 | clipRetention · resolveRetentionDays usa override por objeto · computeExpiryDate retorna null para clip crítico · computeExpiryDate soma dias corretamente … |
| `src/lib/__tests__/consoleEscalationProfile.test.ts` | 7 | perfil aplicado no console · fonte de contabilidade usa a escada diária, não a operacional · rotina operacional permanece inalterada (não-regressão da Onda 117) · a âncora da condição faz o crônico renovado aparecer com a idade real … |
| `src/lib/__tests__/dbHealthGuard.test.ts` | 7 | evaluateHealth · snapshot atual do MCP → sem alertas · memória crítica · disco warning … |
| `src/lib/alarms/__tests__/alarmEpisodeBridge.test.ts` | 7 | alarmEpisodeBridge · abre episódio no carimbo do fato · não move o livro quando a agregação ignora o evento · rearme não cria episódio novo quando já há um aberto … |
| `src/test/lib/logger.test.ts` | 7 | logger · debug does not throw · info does not throw · warn does not throw … |
| `src/test/middleware/rateLimit.test.ts` | 7 | rateLimitMiddleware · allows requests within limit · blocks requests over limit · different IPs have separate limits … |
| `tests/e2e/auth.spec.ts` | 7 | Authentication Flow · should show login page on root · should show password field · should show validation error on empty submit … |
| `scripts/autofix-lint/run.test.mjs` | 6 | selecao exclui delecoes e preserva renomeados e nomes especiais · executa verificacao sem fix depois de corrigir, com argv seguro · erro nao corrigivel bloqueia mesmo sem diff · main e develop sao bloqueadas incluindo refs completas … |
| `src/components/admin/__tests__/CronStaleBadge.test.tsx` | 6 | CronStaleBadge · não renderiza para não-admin · não renderiza quando role está carregando · não renderiza quando nenhum job stale … |
| `src/components/cameras/__tests__/LivePreviewPlayer.resilience.test.tsx` | 6 | LivePreviewPlayer — resiliência · mediamtx_pull_failed: exibe título + sugestão específica e NÃO chama stop (sem sessão) · hls_timeout: watchdog dispara após 10s sem canplay, chama stop e mostra sugestão · canplay antes do prazo cancela o watchdog (sem falha espúria) … |
| `src/components/maintenance/__tests__/EpisodeBridgeCard.test.tsx` | 6 | cartão da ponte de episódios · nunca apresenta ignorância como saúde · não sinaliza severidade enquanto a fila drena · marca a ponte travada como crítica e mostra a variação … |
| `src/components/ptz/__tests__/axisRangeVisualizer.test.tsx` | 6 | PtzAxisRangeVisualizer · renderiza posição dentro do intervalo calibrado · marca posição fora do intervalo com classe destrutiva · não renderiza marcas de observado quando não fornecido … |
| `src/components/ptz/__tests__/preflight.test.ts` | 6 | computePhaseTimeout · retorna fallback quando sweep é nulo/inválido · aplica piso de 4s quando sweep é muito curto · usa sweep * 1.5 dentro do intervalo … |
| `src/lib/__tests__/cacheUtils.test.ts` | 6 | cacheUtils · deve salvar e recuperar dados da memória · deve salvar e recuperar dados do localStorage · deve expirar dados após o TTL … |
| `tests/e2e/accessibility.spec.ts` | 6 | Accessibility · should have lang attribute on html · all images should have alt text · interactive elements should be keyboard accessible … |
| `tests/e2e/auth-routes-mobile-nav.spec.ts` | 6 | All Auth Routes — Desktop · ${route.name} (${route.path}) carrega sem erros · All Auth Routes — Mobile (iPhone 12) · ${route.name} (${route.path}) — saúde + BottomNav + padding … |
| `tests/e2e/navigation.spec.ts` | 6 | Navigation & Layout · should load the app without errors · should have proper meta tags · should have skip-to-content link … |
| `tests/e2e/rtsp-live-preview-ui.spec.ts` | 6 | LivePreviewPlayer — fluxo UI (prévia ao vivo 60s) · iniciar prévia dispara start, mostra vídeo e countdown ativo · estender +60s incrementa o tempo restante e o badge de extensões · limite de 3 extensões desabilita o botão Estender … |
| `cypress/e2e/analytics.cy.ts` | 5 | Analytics · shows analytics page · shows charts section · shows date filters … |
| `cypress/e2e/dashboard.cy.ts` | 5 | Dashboard · should display dashboard title · should navigate to cameras page · should navigate to alerts page … |
| `src/components/maintenance/__tests__/DeviceSilenceCard.test.tsx` | 5 | DeviceSilenceCard · separa quem está recusado de quem sumiu · silêncio intencional aparece como fato, nunca como incidente · nunca rotula ausência de dados como saúde … |
| `src/components/ptz/__tests__/limitsHistory.test.tsx` | 5 | PtzCalibrationPanel · versionamento de limits · exibe  · exibe versão formatada quando presente · desabilita botão Reverter com history vazio … |
| `src/components/ptz/__tests__/recaptureFlow.test.tsx` | 5 | PtzCalibrationPanel · fluxo de recaptura (integração) · dispara recaptureRequired e exibe mensagem de erro quando revalidação acusa desvio > 10% · não exibe recaptureRequired quando o desvio está dentro do threshold · abre o diálogo de confirmação de recaptura mostrando o desvio detectado … |
| `src/components/vision/__tests__/VisionPipelineFleetCard.test.tsx` | 5 | VisionPipelineFleetCard · declara ausência em vez de fingir saúde · mostra o pior primeiro e nomeia o processador suspenso · separa pressão de barramento da saúde do processador … |
| `src/hooks/__tests__/useFrameBuffer.test.ts` | 5 | useFrameBuffer — invariante de snapshot estável · getBufferStats retorna o MESMO objeto entre chamadas sem mutação (snapshot estável) · o hook expõe stats estáveis entre renders até o buffer mudar · pushFrame invalida apenas o cache da câmera mutada … |
| `src/lib/__tests__/wizardTemplateRecommendation.test.ts` | 5 | recommendTemplates · sugere intrusão para zona restrita · sugere ALPR para estacionamento · sugere EPI para segurança … |
| `src/lib/agents/__tests__/arbiterInvariants.test.ts` | 5 | arbiterInvariants · mantém as quatro invariantes na ordem canônica · trata invariante ausente como falha explícita · ignora chave desconhecida vinda do banco … |
| `src/lib/devices/__tests__/pullPointLease.simulation.test.ts` | 5 | Onda 155 — varredura combinatória do ciclo PullPoint · mantém J1–J5 em todo o espaço de estados · J6 — pureza: repetir a chamada devolve exatamente o mesmo veredito · Onda 155 — trajetórias vivas contra equipamento mal comportado … |
| `src/lib/insightface/__tests__/cache.test.ts` | 5 | insightface cache key · namespaces per operation · invalidates on model version bump · collides only on identical hash+version+namespace … |
| `src/lib/insightface/__tests__/ttl-policy.test.ts` | 5 | edge_cache TTL policy · encode has longest TTL — embeddings are identity-stable · liveness has shortest TTL to prevent replay attacks · every namespace has positive TTL (0 disables caching) … |
| `src/pages/AnalyticsPage.test.ts` | 5 | sameLocalDay (agrupamento por fuso local) · corresponde à conversão local de date-fns (mesmo dia) · corresponde à conversão local na véspera de meia-noite UTC · rejeita um dia que difere da conversão local … |
| `src/pages/__tests__/RecordingsPage.clips.test.tsx` | 5 | RecordingsPage · clips · 0004 player atravessa páginas e re-assina o clip fora da página · 0005 exclusão em lote age fora da página/filtro e remove do storage · 0006 exclusão em lote remove clips ausentes da lista carregada … |
| `src/stores/__tests__/appStore.test.ts` | 5 | appStore · deve ter o estado inicial correto · deve atualizar o estado de loading corretamente · deve gerenciar erros corretamente … |
| `tests/e2e/alertmanager-silence.spec.ts` | 5 | Alertmanager silence — falhas de permissão e validação (E2E) · anônimo (sem Authorization) recebe 401 · DELETE sem justificativa é rejeitado com 400 · POST create com payload inválido não vaza stack traces … |
| `tests/e2e/filters-lifecycle.spec.ts` | 5 | Filtros — ciclo confirmar/cancelar/desfazer/persistir (Recognition Logs) · cancelar a confirmação preserva filtros aplicados · confirmar limpa filtros e mostra toast detalhado com ação Desfazer · desfazer restaura o filtro anterior dentro da janela de 10s … |
| `tests/e2e/performance.spec.ts` | 5 | Performance · should load within acceptable time · should not have excessive DOM nodes · should lazy load images below the fold … |
| `tests/e2e/ptz-recapture-adversarial.spec.ts` | 5 | PtzCalibrationPanel · cenários adversariais de recaptura · recaptura com min ≥ max exibe toast  · editor  · editor  … |
| `tests/e2e/rtsp-live-preview-resilience.spec.ts` | 5 | LivePreviewPlayer — resiliência (falhas MediaMTX/HLS) · mediamtx_pull_failed exibe título + sugestão de firewall/credenciais · hls_timeout retornado pelo servidor mostra sugestão de substream/latência · connection_dropped: erro no <video> encerra sessão com sugestão de Wi-Fi/PoE … |
| `cypress/e2e/alerts.cy.ts` | 4 | Alerts Page · should display alerts list · should filter by severity · should acknowledge alert |
| `cypress/e2e/cameras.cy.ts` | 4 | Cameras Page · should display cameras grid · should open camera modal on click · should filter cameras by status |
| `src/components/ptz/__tests__/recaptureAuditInsert.test.tsx` | 4 | PtzCalibrationPanel · auditoria de recaptura em ptz_connection_attempts · recaptura bem-sucedida insere ok=true com payload completo · recaptura inválida (min ≥ max) insere ok=false com outcome= · cancelar o diálogo de confirmação NÃO gera INSERT de auditoria |
| `src/config/models_config.test.ts` | 4 | models_config · usa CDN por padrão (fonte  · getModelUrl retorna a URL da fonte ativa · URL da CDN aponta para o diretório de pesos do repositório (não do pacote npm) |
| `src/hooks/clip-recorder/__tests__/useClipStorage.test.ts` | 4 | useClipStorage · salva no bucket privado camera-clips com path user/camera e status completed · não usa getPublicUrl (bucket privado) e assina com validade de 7 dias · deleteClip remove os objetos do storage antes do registro |
| `supabase/functions/admin-slow-queries/index.test.ts` | 4 | admin-slow-queries: rejects non-POST · admin-slow-queries: OPTIONS returns CORS ok · admin-slow-queries: rejects missing auth · admin-slow-queries: rejects non-admin user |
| `tests/e2e/qa-console-sweep.spec.ts` | 4 | QA Console Sweep — Desktop · desktop ${route} · QA Console Sweep — Mobile · mobile ${route} |
| `cypress/e2e/people.cy.ts` | 3 | People · loads people page · opens person form |
| `cypress/e2e/recordings.cy.ts` | 3 | Recordings · loads recordings page · filters by date |
| `cypress/e2e/settings.cy.ts` | 3 | Settings · loads settings page · toggles dark mode |
| `cypress/e2e/zones.cy.ts` | 3 | Zones · loads zones page · opens zone editor |
| `src/components/__tests__/LazyLoad.test.tsx` | 3 | LazyLoad · renderiza children quando em viewport · aceita className customizada |
| `src/components/__tests__/OfflineIndicator.test.tsx` | 3 | OfflineIndicator · renderiza variante minimal quando online sem crashar · aceita className extra sem erros |
| `src/components/__tests__/RuleTemplateSelector.test.tsx` | 3 | RuleTemplateSelector · renderiza botão de abrir o seletor · chamada de callback funciona sem crashar |
| `src/components/__tests__/SwipeableView.test.tsx` | 3 | SwipeableView · renderiza children dentro do wrapper · não quebra em rota fora da lista de swipe |
| `src/lib/devices/__tests__/ioSafety.simulation.test.ts` | 3 | Onda 154 — simulação de I/O de alarme físico · matriz combinatória: implementação e modelo concordam em tudo · trajetórias vivas: nenhuma saída monoestável termina travada |
| `supabase/functions/run-retention/index.test.ts` | 3 | run-retention: OPTIONS returns CORS ok · run-retention: rejects missing secret header · run-retention: rejects wrong secret |
| `tests/e2e/mobile-nav-measured-overlap.spec.ts` | 3 | Mobile nav — overlap com altura medida dinamicamente · BottomNav é mensurável e tem altura coerente em /dashboard · ${route} — último elemento acima da BottomNav (altura medida) |
| `tests/e2e/mobile-nav-multi-viewport-theme.spec.ts` | 3 | mobile-nav multi-viewport × multi-theme — visual snapshots · viewport=${vp.name} theme=${theme} · ${name} @ ${vp.name} ${theme} |
| `tests/e2e/mobile-nav-overlap.spec.ts` | 3 | BottomNav não cobre conteúdo (multi-viewport mobile) · viewport ${vp.name} (${vp.width}x${vp.height}) · ${name}: último conteúdo acima da BottomNav |
| `src/components/__tests__/AutomationRulesManager.test.tsx` | 2 | AutomationRulesManager · renderiza sem erros com lista vazia de regras |
| `src/components/__tests__/BottomNavigation.test.tsx` | 2 | BottomNavigation · renderiza sem erros com role admin |
| `src/components/__tests__/GlobalSearch.test.tsx` | 2 | GlobalSearch · renderiza sem crashar (fechado por padrão) |
| `src/components/__tests__/RuleExecutionHistory.test.tsx` | 2 | RuleExecutionHistory · renderiza sem erros com histórico vazio |
| `src/hooks/__tests__/useMLModels.error.test.ts` | 2 | useMLModels — erro de carregamento chega ao chamador · expõe o erro real em  |
| `src/layouts/__tests__/MainLayout.test.tsx` | 2 | MainLayout · renders shell chrome around children |
| `tests/e2e/a11y-axe-critical-routes.spec.ts` | 2 | A11y (axe-core) — rotas críticas · ${route.name} (${route.path}) sem violações critical/serious |
| `tests/e2e/cls-regression.spec.ts` | 2 | CLS regression · ${route} mantém CLS <= ${threshold} |
| `tests/e2e/mobile-nav-class-presence.spec.ts` | 2 | Build gate: presença de mb-mobile-nav no DOM (mobile) · ${route} renderiza wrapper com classe \ |
| `tests/e2e/mobile-nav-content-overlap.spec.ts` | 2 | Mobile nav — sobreposição visual de conteúdo (heurístico) · ${route} — nenhum elemento interativo/texto coberto pela BottomNav |
| `tests/e2e/mobile-nav-padding.spec.ts` | 2 | Mobile nav padding (runtime) · ${route} aplica padding-bottom ≥ ${MIN_PADDING_PX}px |
| `tests/e2e/mobile-nav-scroll-positions.spec.ts` | 2 | mobile-nav-scroll-positions — overlap em topo/meio/fim · ${route} @ scroll=${pos} — sem overlap com BottomNav |
| `tests/e2e/mobile-nav-visual.spec.ts` | 2 | Mobile Nav Visual Regression · ${name}: snapshot mobile + sem overlap da BottomNav |
| `tests/e2e/qa-visual-snapshots.spec.ts` | 2 | QA Screenshots (${vp.name}) · ${route.name} |
| `tests/e2e/smoke-a11y-mobile.spec.ts` | 2 | Smoke a11y (mobile) · ${target.name} — landmarks e ARIA básico |
| `tests/e2e/smoke-client-navigation.spec.ts` | 2 | Navegação client-side (${vp.name}) · Dashboard → Heatmap → Analytics via menu |
| `tests/e2e/smoke-pages.spec.ts` | 2 | Smoke (${vp.name}) · ${target.name} carrega sem erros |
| `tests/e2e/helpers/authSession.ts` | 1 | rota autenticada |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `SKIP_WAITING` | `public/sw.js` |
| `cancel` | `supabase/functions/nvr-recording-download/index.ts` |
| `download` | `supabase/functions/nvr-recording-download/index.ts` |
| `list` | `supabase/functions/nvr-recording-download/index.ts` |
| `string` | `supabase/functions/timeline-attest/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `notify` | `src/components/AutomationRulesManager.tsx` |
| `invoke(` | `src/components/LicensePlateRecognition.tsx` |
| `notify` | `src/components/RuleExecutionHistory.tsx` |
| `invoke(` | `src/components/admin/AlertmanagerSilencesCard.tsx` |
| `invoke(` | `src/components/admin/CameraHealthCard.tsx` |
| `invoke(` | `src/components/admin/CronWatchdogEscalationCard.tsx` |
| `invoke(` | `src/components/admin/CronWatchdogRunsCard.tsx` |
| `invoke(` | `src/components/admin/ForgetUserMediaCard.tsx` |
| `notify` | `src/components/automation/constants.ts` |
| `invoke(` | `src/components/behavior/useBehaviorAnalysis.ts` |
| `invoke(` | `src/components/cameras/AddCameraDialog.tsx` |
| `invoke(` | `src/components/cameras/LivePreviewPlayer.tsx` |
| `invoke(` | `src/components/faces/TimelineAttestationCard.tsx` |
| `invoke(` | `src/components/journey/useJourneyData.ts` |
| `invoke(` | `src/components/local-agents/RelayCameraTestCard.tsx` |
| `invoke(` | `src/components/notification-settings/useNotificationConfig.ts` |
| `invoke(` | `src/components/ptz/PtzPresetImportPanel.tsx` |
| `invoke(` | `src/components/ptz/PtzSetupWizard.tsx` |
| `notify` | `src/components/rule-editor/RuleEditorConstants.ts` |
| `invoke(` | `src/components/security/EnvelopeEncryptionCard.tsx` |
| `invoke(` | `src/components/telegram/useTelegramConfig.ts` |
| `notify` | `src/components/testMode/DryRunReportCard.tsx` |
| `notifying` | `src/components/testMode/DryRunReportCard.tsx` |
| `notifyingHere` | `src/components/testMode/DryRunReportCard.tsx` |
| `notifyOnBlock` | `src/config/ipWhitelist.ts` |
| `.add('theme-transition'` | `src/contexts/ThemeProvider.tsx` |
| `notify` | `src/data/ruleTemplates.ts` |
| `invoke(` | `src/hooks/useCameraIo.ts` |
| `invoke(` | `src/hooks/useCameraVault.ts` |
| `invoke(` | `src/hooks/useEvidenceExports.ts` |
| `invoke(` | `src/hooks/useFaceDetection.ts` |
| `notifyOnVIP` | `src/hooks/useFaceRecognitionAlerts.ts` |
| `invoke(` | `src/hooks/useFirstSnapshot.ts` |
| `notify` | `src/hooks/useFrameBuffer.ts` |
| `invoke(` | `src/hooks/useImageAnalysis.ts` |
| `invoke(` | `src/hooks/useMapboxToken.ts` |
| `invoke(` | `src/hooks/useMediaMTX.ts` |
| `invoke(` | `src/hooks/useMultiCameraRecognition.ts` |
| `invoke(` | `src/hooks/useNotifications.ts` |
| `invoke(` | `src/hooks/usePlateDetections.ts` |
| `invoke(` | `src/hooks/usePtzControl.ts` |
| `invoke(` | `src/hooks/useRealtimeRecognition.ts` |
| `invoke(` | `src/hooks/useRtspValidation.ts` |
| `invoke(` | `src/hooks/useSlowQueries.ts` |
| `invoke(` | `src/hooks/useStreamFaceDetection.ts` |
| `invoke(` | `src/hooks/analysis/useAnalysisExecution.ts` |
| `invoke(` | `src/hooks/ppe/usePPEVisionAI.ts` |
| `notify` | `src/integrations/supabase/types.ts` |
| `enqueue(` | `src/lib/errorReporter.ts` |
| `invoke(` | `src/lib/rtspVariantBenchmark.ts` |
| `invoke(` | `src/lib/wizardClient.ts` |
| `notify` | `src/lib/alarms/alarmRecurrence.ts` |
| `invoke(` | `src/pages/CameraFleetHealthPage.tsx` |
| `invoke(` | `src/pages/NvrDownloadsPage.tsx` |
| `invoke(` | `src/pages/TestModePage.tsx` |
| `notify` | `src/pages/TestModePage.tsx` |
| `invoke(` | `src/pages/UserManagementPage.tsx` |
| `notify` | `src/types/faceRecognition/helpers.ts` |
| `notify` | `src/types/faceRecognition/types.ts` |
| `notify` | `src/types/zones/types.ts` |
| `notify` | `supabase/seed-automation-rules.sql` |
| `notify` | `supabase/functions/_shared/webhookSchemas.ts` |
| `notify_error` | `supabase/functions/camera-health-monitor/index.ts` |
| `notify_non_ok` | `supabase/functions/camera-health-monitor/index.ts` |
| `sendNotification` | `supabase/functions/camera-health-monitor/index.ts` |
| `sendEmail` | `supabase/functions/maintenance-alerts-dispatch/index.ts` |
| `invoke(` | `supabase/functions/process-automation-rules/index.ts` |
| `notify` | `supabase/functions/process-automation-rules/index.ts` |
| `notify_error` | `supabase/functions/process-automation-rules/index.ts` |
| `notify` | `supabase/functions/promote-test-executions/index.ts` |
| `notifyActions` | `supabase/functions/promote-test-executions/index.ts` |
| `notify_` | `supabase/functions/promote-test-executions/index.ts` |
| `notify_throw` | `supabase/functions/promote-test-executions/index.ts` |
| `invoke(` | `supabase/functions/replay-rule-execution/index.ts` |
| `notify_http_` | `supabase/functions/validate-rtsp-stream/criticalAlert.ts` |
| `notify` | `supabase/migrations/00001_consolidated_all_gaps.sql` |
| `notify` | `supabase/migrations/20251219013114_ca9ebcd9-c0f9-4e08-ac58-61f681d93ea4.sql` |
| `notify` | `supabase/migrations/20251219_facial_recognition.sql` |
| `notify` | `supabase/migrations/20260728105916_ae4f4767-825e-463d-973b-6ac36a7aed24.sql` |
| `notify` | `supabase/migrations/20260808150000_seed_automation_rules.sql` |
| `enqueue(` | `workers/media-uploader/index.mjs` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| * StorageState gerado pelo global-setup. Aplicado apenas se já existir | `playwright.config.ts` |
| testes de render legítimos estouravam o prazo e — pior — o teste abortado | `vitest.config.ts` |
| ---- Re-export barrels (apenas re-exports, sem lógica) ---- | `vitest.config.ts` |
| Filtros Types testados em paralelo. Ordem importa apenas para logs. | `agent/src/discover.ts` |
| * VISÃO — Custom ESLint Rule: no-hardcoded-colors | `eslint-rules/no-hardcoded-colors.js` |
| * @type {import('eslint').Rule.RuleModule} */ | `eslint-rules/no-hardcoded-colors.js` |
| SOLICITAR PERMISSÃO DE NOTIFICAÇÕES | `src/main.tsx` |
| Solicitar permissão de notificações após 5 segundos | `src/main.tsx` |
| - `string` → nome da zona onde a detecção ocorreu (regra com `zone_id`). | `src/components/AlertCard.tsx` |
| - `null`   → detecção ocorreu FORA da zona configurada na regra. | `src/components/AlertCard.tsx` |
| - `undefined` → sem contexto de zona (regra sem `zone_id` ou alerta legado). | `src/components/AlertCard.tsx` |
| Renderiza apenas os botões — o transform em si é aplicado pelo consumidor | `src/components/DigitalZoomOverlay.tsx` |
| * Componente LazyLoad - Carrega conteúdo apenas quando visível | `src/components/LazyLoad.tsx` |
| Mostra apenas uma vez — usuário pode dispensar. | `src/components/PWAMigrationBanner.tsx` |
| * VISÃO - Rule Editor (Refactored) | `src/components/RuleEditor.tsx` |
| detectou e qual degrau da escada de cura foi aplicado. Somente leitura — as | `src/components/admin/AgentHealingCard.tsx` |
| lacuna respondendo a duas perguntas: qual regra vetou, e o que teria | `src/components/admin/AgentHealingTrailCard.tsx` |
| * Somente leitura: nenhuma escrita, nenhum botão de ação sobre o agente. | `src/components/admin/AgentHealingTrailCard.tsx` |
| omissão. Somente leitura: quem decide é a rotina agendada no banco. | `src/components/admin/AgentRestartBudgetCard.tsx` |
| ainda satisfaz as mesmas regras? Somente leitura, restrito a administradores | `src/components/admin/ArbiterInvariantsCard.tsx` |
| carimbada pela câmera com a hora de chegada do evento. Somente leitura. | `src/components/admin/CameraClockSkewCard.tsx` |
| Visível apenas para admins; oculto quando saudável ou role ainda carregando. | `src/components/admin/CronStaleBadge.tsx` |
| Visível apenas para admins; oculto quando não há anomalias. | `src/components/admin/CspAnomalyBadge.tsx` |
| este card apenas expõe o que ele já concluiu — não dispara manutenção. | `src/components/admin/MaintenanceAlertsCard.tsx` |
| * Detectar rotina parada sem avisar ninguém é apenas telemetria decorativa. | `src/components/admin/MaintenanceDispatchCard.tsx` |
| * Linha bruta de `partition_backlog_samples` (RLS: somente admin). */ | `src/components/admin/PartitionBacklogTrendCard.tsx` |
| resultado da última execução da rotina de drenagem. Somente administradores | `src/components/admin/PartitionDrainCard.tsx` |
| * Mesmo limite do gate `npm run db:check:quarantine`. */ | `src/components/admin/PartitionQuarantineCard.tsx` |
| implausíveis. Esta rotina apenas os CLASSIFICA — nunca corrige nem apaga — | `src/components/admin/PartitionQuarantineCard.tsx` |
| - Controles para ajustar janela, mínimo de eventos e threshold ao vivo. | `src/components/admin/PreviewAlertStatusCard.tsx` |
| é exposto ao frontend — apenas o admin da infraestrutura o utiliza. | `src/components/admin/PrometheusMetricsCard.tsx` |
| * Linha bruta de `root_cause_correlation_runs` (RLS: somente admin lê). */ | `src/components/admin/RootCauseCorrelationCard.tsx` |
| tem dono — e, principalmente, o quanto NÃO tem. Somente leitura. | `src/components/admin/RootCauseCorrelationCard.tsx` |
| Renders loading / empty / permission-denied / error / data states without | `src/components/admin/SlowQueriesCard.tsx` |
| Mesma regra do servidor: o botão só habilita quando a tratativa é aceita. | `src/components/alarms/AlarmTreatmentDialog.tsx` |
| * VISÃO - Rule Card Component | `src/components/automation/RuleCard.tsx` |
| * VISÃO - Rule Form Dialog | `src/components/automation/RuleFormDialog.tsx` |
| * Mostra a ordem real de tentativa (regra da Onda 152) com a evidência que a | `src/components/cameras/CameraPathPlanCard.tsx` |
| Vincula cada regra à primeira zona compatível (por tipo) ou à primeira zona existente. | `src/components/cameras/CameraSetupWizard.tsx` |
| * Não persiste o binário no cliente; envia à Edge Function apenas se | `src/components/cameras/FirmwareAutodetectCard.tsx` |
| 3. Botão "Estender +60s" chama `extend` (limite: 3 extensões / 240s total). | `src/components/cameras/LivePreviewPlayer.tsx` |
| - Nunca recebe RTSP/senha em texto — apenas `sessionId` e `hlsUrl` efêmera. | `src/components/cameras/LivePreviewPlayer.tsx` |
| * Prazo máximo (ms) para o vídeo emitir `canplay` após `start` bem-sucedido. */ | `src/components/cameras/LivePreviewPlayer.tsx` |
| * Se `false`, mostra apenas o botão "Iniciar prévia" e aguarda ação explícita. */ | `src/components/cameras/LivePreviewPlayer.tsx` |
| * CLSBadge - Indicador visual de CLS por rota. Apenas DEV. | `src/components/debug/CLSBadge.tsx` |
| apenas para repintar o rótulo — a verdade vive no livro, não na tela. | `src/components/emap/AttentionClockPanel.tsx` |
| * É apenas um convite: nada aqui troca a planta sozinho. O operador decide. | `src/components/emap/CrossFloorAttentionBanner.tsx` |
| situação não pode depender só dela. | `src/components/emap/FloorPlanCanvas.tsx` |
| apenas parar de exibir o aviso, nunca silenciar a pendência. | `src/components/emap/InheritedAckCard.tsx` |
| * Onda 175 — livro de ciências, base do prazo de atendimento. */ | `src/components/emap/ShiftHandoffCard.tsx` |
| entre normalizar e apenas dar ciência. O relatório em texto é gerado pela | `src/components/emap/ShiftHandoffCard.tsx` |
| mesma regra pura que a simulação exercita — a tela nunca reescreve o fato. | `src/components/emap/ShiftHandoffCard.tsx` |
| Onda 175 — desempenho de atendimento derivado da mesma regra pura do gate. | `src/components/emap/ShiftHandoffCard.tsx` |
| * Livro de ciência (Onda 172) — congela o veredito de prazo da Onda 174. */ | `src/components/emap/TriageQueuePanel.tsx` |
| * Onda 174: o prazo nunca compete com a gravidade — só a explica. */ | `src/components/emap/TriageQueuePanel.tsx` |
| o operador a não olhar. O relógio local apenas repinta rótulos de idade — a | `src/components/emap/TriageQueuePanel.tsx` |
| ordem verdadeira é derivada da regra pura em `triageQueue.ts`. | `src/components/emap/TriageQueuePanel.tsx` |
| Onda 174 — veredito de prazo por item. Fora de escopo não vira selo. | `src/components/emap/TriageQueuePanel.tsx` |
| manda, balde vazio é "sem registro" e nunca "sem ninguém". Esta tela apenas | `src/components/faces/FaceEventTimeline.tsx` |
| quem leu, a leitura não pode corroborar nada. | `src/components/faces/FaceEventTimeline.tsx` |
| regra única. | `src/components/faces/PersonTimelineCard.tsx` |
| desloca as vizinhas. Vacância sempre exibe o motivo declarado pela regra. | `src/components/favorite-views/FavoriteArrangementGrid.tsx` |
| * Largura máxima do conteúdo (centralizado). Default: `full` (sem limite). */ | `src/components/layout/MainLayout.tsx` |
| * Apresentação apenas: toda decisão vem de `buildChronicSeriesBoard`. O que a | `src/components/maintenance/ChronicSeriesCard.tsx` |
| Onda 148 — recorte por responsável. O estado guarda apenas a chave crua; | `src/components/maintenance/MaintenanceAlertsCard.tsx` |
| `health` do banco entra apenas como corroboração (Lei U9). | `src/components/maintenance/RetentionOverviewCard.tsx` |
| Ticker de 1s apenas quando ativo, para atualizar ETA/tempo decorrido. | `src/components/nvr-downloads/NvrDownloadJobRow.tsx` |
| * A tela pré-valida com a MESMA regra do banco (`grantConsole.ts`) para | `src/components/permissions/CapabilityGrantsCard.tsx` |
| * Conteúdo liberado quando a permissão existe. */ | `src/components/permissions/RequireCapability.tsx` |
| * Alternativa exibida quando falta permissão. Padrão: nada. */ | `src/components/permissions/RequireCapability.tsx` |
| nas políticas de acesso e nas rotinas do banco; aqui apenas evitamos | `src/components/permissions/RequireCapability.tsx` |
| * Timeout máximo por eixo antes de considerar a medição inconclusiva. */ | `src/components/ptz/PtzCalibrationPanel.tsx` |
| * Δ mínimo (fração do range) para considerar o dome ainda em movimento. */ | `src/components/ptz/PtzCalibrationPanel.tsx` |
| * Amostras consecutivas abaixo do épsilon para confirmar parada por limite. */ | `src/components/ptz/PtzCalibrationPanel.tsx` |
| estagnação (dome bateu no limite) ou timeout de 15s. | `src/components/ptz/PtzCalibrationPanel.tsx` |
| Critério 2: estagnação (bateu no limite físico). | `src/components/ptz/PtzCalibrationPanel.tsx` |
| estagnação (limite físico), captura o mínimo, faz o mesmo no sentido | `src/components/ptz/PtzCalibrationPanel.tsx` |
| positivo e captura o máximo. Persiste ambos como fresh e limpa a | `src/components/ptz/PtzCalibrationPanel.tsx` |
| * Δ mínimo aceito entre alvo e posição reportada (em fração do range físico). */ | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| * Desvio máximo tolerado antes de sinalizar "desvio" (10% do range). */ | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| Sem telemetria: usa apenas tempo estimado. | `src/components/ptz/PtzLimitPreflightDialog.tsx` |
| * Validação sequencial dos limites de todos os eixos suportados | `src/components/ptz/PtzMultiAxisPreflightDialog.tsx` |
| componente: qualquer alteração aqui deve ser refletida lá. | `src/components/ptz/lib/calibrationRules.ts` |
| Um eixo exige recaptura quando existe uma entrada de validação | `src/components/ptz/lib/calibrationRules.ts` |
| 3. `min` deve ser **estritamente menor** que `max` (min ≥ max é inválido). | `src/components/ptz/lib/calibrationRules.ts` |
| * VISÃO - Rule Conditions Section | `src/components/rule-editor/ConditionsSection.tsx` |
| * VISÃO - Rule Schedule Section | `src/components/rule-editor/ScheduleSection.tsx` |
| Onda 139: convite recebido tem prazo — o contador é o que impede que | `src/components/sidebar/config/categories.ts` |
| * SkeletonFallback - Skeleton genérico mínimo, sem dependências externas | `src/components/skeletons/SkeletonFallback.tsx` |
| (apenas `cn` + Tailwind animate-pulse). Usado como último recurso quando | `src/components/skeletons/SkeletonFallback.tsx` |
| * IDs pré-selecionados. Usado com `fixedScope='camera'\|'rule'`. */ | `src/components/testMode/TestModeDialog.tsx` |
| apenas pinta o retrato que recebeu. | `src/components/vision/VisionPipelineFleetCard.tsx` |
| Required environment variables | `src/config/env.ts` |
| Missing env vars validation - silent in production | `src/config/env.ts` |
| * IMPORTANTE: Apenas IPs listados aqui terão acesso ao sistema | `src/config/ipWhitelist.ts` |
| de `dateUtils.ts`, uma string 'YYYY-MM-DD' não pode ser ancorada em meia-noite | `src/config/locale.ts` |
| Used by Recharts, Canvas API, and Mapbox where raw color strings are required. | `src/constants/chartColors.ts` |
| from './validation'; | `src/constants/index.ts` |
| MENSAGENS DE VALIDAÇÃO | `src/constants/messages.ts` |
| * Lê apenas as janelas do próprio usuário (RLS) num recorte declarado e devolve | `src/hooks/useAdmissionCoverage.ts` |
| Instantes sintéticos preservam apenas a ORDEM já garantida pelo banco. | `src/hooks/useAdmissionOrphanTrend.ts` |
| * Prazo declarado da guarda de retenção (Onda 230). */ | `src/hooks/useAdmissionReconcile.ts` |
| * Somente leitura. Quem decide é a rotina agendada no banco (`heal_local_agents`); | `src/hooks/useAgentHealingTrail.ts` |
| este hook existe apenas para tornar visível a decisão de NÃO agir, que hoje é | `src/hooks/useAgentHealingTrail.ts` |
| filtro de `user_id` no cliente de propósito: duplicar a regra aqui criaria uma | `src/hooks/useAgentHealingTrail.ts` |
| * A regra de entrega (idempotência, ordem, recuo, carta morta) vive em | `src/hooks/useAlarmRecurrenceQueue.ts` |
| a regra pura não pode fazer: ler relógio, tocar `localStorage`, chamar RPC | `src/hooks/useAlarmRecurrenceQueue.ts` |
| mudar numa próxima tentativa; recusa de regra é definitiva e insistir nela | `src/hooks/useAlarmRecurrenceQueue.ts` |
| apenas queima orçamento e esconde o problema do operador. | `src/hooks/useAlarmRecurrenceQueue.ts` |
| * Desliga a drenagem automática (útil em testes e telas somente-leitura). */ | `src/hooks/useAlarmRecurrenceQueue.ts` |
| máximo um item por série, então o paralelismo aqui é seguro. | `src/hooks/useAlarmRecurrenceQueue.ts` |
| * Estado atual, usado para a validação local antes da ida ao servidor. */ | `src/hooks/useAlarmTreatment.ts` |
| * Executa a tratativa. A validação local usa exatamente a mesma regra do | `src/hooks/useAlarmTreatment.ts` |
| * Retorna a URL/protocolo que a IA deve consumir para análise contínua. | `src/hooks/useAnalysisStream.ts` |
| * - Apenas em DEV (`import.meta.env.DEV`). | `src/hooks/useCLSAlert.ts` |
| regra que a Edge Function aplica no servidor. Não é validação de segurança — | `src/hooks/useCameraIo.ts` |
| localmente um pulso que ainda está dentro do intervalo mínimo evita uma ida | `src/hooks/useCameraIo.ts` |
| isso o veredito local NUNCA habilita nada — ele apenas explica; quem | `src/hooks/useCameraIo.ts` |
| * Veredito local, apenas para explicar o botão desabilitado ao operador. */ | `src/hooks/useCameraIo.ts` |
| A URL rehidratada do cofre é acessível APENAS por workers internos (service_role). | `src/hooks/useCameraStreamUrl.ts` |
| O cliente browser NUNCA deve invocar `resolve-camera-url`. | `src/hooks/useCameraStreamUrl.ts` |
| a regra a partir do papel: se recalculasse, uma divergência de versão entre | `src/hooks/useCapabilities.ts` |
| o front não sabe o que fazer com ela e não deve fingir que sabe. | `src/hooks/useCapabilities.ts` |
| `grant_capability` / `revoke_capability_grant`, que são a regra de | `src/hooks/useCapabilityGrants.ts` |
| admissão no servidor. O cliente pré-valida apenas para dar mensagem | `src/hooks/useCapabilityGrants.ts` |
| organização) e entrega tudo para a regra única de montagem | `src/hooks/useChronicSeries.ts` |
| * Carimbo ausente ou ilegível vira `null` — nunca `Date.now()` (regra 2). */ | `src/hooks/useChronicSeries.ts` |
| Convites vencem sozinhos: sem refetch periódico a tela mente sobre o prazo. | `src/hooks/useCollabGovernance.ts` |
| não reimplementa a regra: ela pede, e mostra o que o banco devolveu. | `src/hooks/useCollabSilence.ts` |
| - Habilitado somente quando `enabled=true` (páginas admin) para não gerar | `src/hooks/useCronFreshness.ts` |
| requisições 403 em contas sem permissão. | `src/hooks/useCronFreshness.ts` |
| 500 (erro interno), 403 (sem permissão), ou qualquer falha — array vazio. | `src/hooks/useCronFreshness.ts` |
| * Onda 189 — Multimonitor destacado: ligação entre a regra e o navegador. | `src/hooks/useDetachedMonitors.ts` |
| não pode registrar uma janela que nunca existiu. | `src/hooks/useDetachedMonitors.ts` |
| `rotate_device_secret`, `revoke_device`): a tabela é somente-leitura para o | `src/hooks/useDeviceRegistrations.ts` |
| aplicativo. O segredo em claro existe apenas no retorno da chamada — nunca é | `src/hooks/useDeviceRegistrations.ts` |
| que separa "sumiu" de "está sendo recusado", e essa distinção não pode | `src/hooks/useDeviceSilence.ts` |
| * A tabela `maintenance_dispatch_runs` é append-only e visível apenas a | `src/hooks/useDispatchDeliverability.ts` |
| * 1. **Sem `p_now` vindo do cliente.** O relógio do navegador não pode definir | `src/hooks/useEpisodeReconciliation.ts` |
| produziria timeouts que a regra classificaria como "indeterminado" — | `src/hooks/useEvidenceExports.ts` |
| Executa apenas na montagem — remontagens não recontam. | `src/hooks/useFeatureReadyMark.ts` |
| Permitir apenas Escape em inputs | `src/hooks/useGlobalShortcuts.ts` |
| Aqui apenas consumimos os modelos já carregados; detectObjects/Poses lidam com | `src/hooks/useMLModels.ts` |
| sidebar vive em todas as telas e não pode arrastar 200 linhas com detalhe | `src/hooks/useMaintenanceAlertBadge.ts` |
| JSONB a cada navegação. Aqui buscamos apenas o mínimo para contar — e apenas | `src/hooks/useMaintenanceAlertBadge.ts` |
| não pode reconhecer — a RLS já barraria, mas requisição inútil é custo. | `src/hooks/useMaintenanceAlertBadge.ts` |
| dispara — ex: tempo mínimo de permanência, densidade de pessoas. | `src/hooks/useModelThresholds.ts` |
| Falha ao carregar o modelo (coco-ssd) não pode ser silenciosa: repassa ao chamador pelo | `src/hooks/usePPEDetection.ts` |
| valores padrão (somente leitura em memória). | `src/hooks/useProductivityConfig.ts` |
| Check push permission on mount | `src/hooks/useRealtimeAlertNotifications.ts` |
| Autoplay blocked - user interaction required | `src/hooks/useRealtimeAlertNotifications.ts` |
| Show browser push notification if enabled and permission granted | `src/hooks/useRealtimeAlerts.ts` |
| * Máximo de faces por frame */ | `src/hooks/useRealtimeRecognition.ts` |
| Silently skip on rate limit | `src/hooks/useRealtimeRecognition.ts` |
| a regra única; aqui ela serve para *explicar* antes de tentar e para não | `src/hooks/useRemoteCommand.ts` |
| mudá-la não deve provocar novo render. | `src/hooks/useSitePlans.ts` |
| precisa repintar), mas expira por relógio, nunca por render. | `src/hooks/useSitePlans.ts` |
| O roster é enfeite do seletor: falhar aqui não pode derrubar o mapa. | `src/hooks/useSitePlans.ts` |
| * Onda 163 — avisa o operador apenas do que piorou. | `src/hooks/useSitePlans.ts` |
| * Um único timer para todo o mapa: agenda-se o próximo vencimento em vez de | `src/hooks/useSitePlans.ts` |
| Don't retry auth/permission errors. | `src/hooks/useSlowQueries.ts` |
| * Tamanho máximo do arquivo em bytes (padrão: 5MB) */ | `src/hooks/useStorage.ts` |
| por regra em /automation-rules). | `src/hooks/useTestMode.ts` |
| H1 — O livro mora em `useRef`: um ciclo por frame não pode custar um render | `src/hooks/useVisionMetrics.ts` |
| decide nada: ele apenas guarda o estado entre renders, encaminha chamadas e | `src/hooks/useVisionPipeline.ts` |
| instante não pode disparar um render por frame. O render só acontece | `src/hooks/useVisionPipeline.ts` |
| Recria o pipeline apenas quando a câmera muda: trocar de câmera é trocar de | `src/hooks/useVisionPipeline.ts` |
| * Rule evaluation engine for continuous analysis. | `src/hooks/analysis/useRuleEvaluation.ts` |
| Extracts rule evaluation logic from useContinuousAnalysis. | `src/hooks/analysis/useRuleEvaluation.ts` |
| * VISÃO — Rule ⇔ Zone spatial matcher | `src/hooks/zone-detection/matchesRuleZone.ts` |
| * Uso: chame `matchesRuleZone(rule, detection, zonesById)` no avaliador | `src/hooks/zone-detection/matchesRuleZone.ts` |
| detecções que caíram fora do polígono/círculo cadastrado para a regra. | `src/hooks/zone-detection/matchesRuleZone.ts` |
| * Retorna true se a detecção casa com a zona da regra. | `src/hooks/zone-detection/matchesRuleZone.ts` |
| - Regra sem zona → sempre true. | `src/hooks/zone-detection/matchesRuleZone.ts` |
| CI e a UI importam daqui. Duplicar a regra em PL/pgSQL abriria a porta | `src/lib/agentHealing.ts` |
| * Intervalo mínimo entre duas tentativas de cura no mesmo agente. */ | `src/lib/agentHealing.ts` |
| * `true` quando o SQL deve enfileirar uma tarefa de relay. */ | `src/lib/agentHealing.ts` |
| I1 — agente revogado é decisão de negócio, não falha: não se cura. | `src/lib/agentHealing.ts` |
| errada, não apenas a ação em excesso. | `src/lib/agentRestartBudget.ts` |
| * Mínimo absoluto de agentes doentes para armar o breaker. */ | `src/lib/agentRestartBudget.ts` |
| 15% por varredura: numa frota de 60, no máximo 9 reinícios a cada 10 min. | `src/lib/agentRestartBudget.ts` |
| não apenas os candidatos a reinício: se 40 dos 60 agentes já esgotaram as | `src/lib/agentRestartBudget.ts` |
| 100)}% da frota afetada (limite ${Math.round(policy.breakerFraction * 100)}%)`, | `src/lib/agentRestartBudget.ts` |
| * Retenção padrão em dias (aplica quando nenhuma regra específica bate). */ | `src/lib/clipRetention.ts` |
| nunca expira | `src/lib/clipRetention.ts` |
| * Esta lógica é pura e determinística de propósito: é a mesma regra executada | `src/lib/clockSkew.ts` |
| * Quando `true`, o achado é real mas não deve gerar alerta externo: a câmera | `src/lib/clockSkew.ts` |
| não está online, então o desvio pode ser apenas resíduo de dados antigos. | `src/lib/clockSkew.ts` |
| A severidade NÃO é rebaixada — apenas o despacho é suprimido (I8). | `src/lib/clockSkew.ts` |
| I7 sinal do desvio não altera a severidade, apenas a direção reportada. | `src/lib/clockSkew.ts` |
| O máximo nunca pode ser menor que a mediana em módulo — protege contra | `src/lib/clockSkew.ts` |
| * Ref fraca ao elemento DOM (apenas runtime; não serializa). */ | `src/lib/clsMonitor.ts` |
| * Relatórios apenas das rotas explicitamente monitoradas. */ | `src/lib/clsMonitor.ts` |
| * Wave 33 — Parser mínimo de expressões cron para os padrões usados por | `src/lib/cronSchedule.ts` |
| cobre apenas os casos plausíveis dos jobs internos e retorna: | `src/lib/cronSchedule.ts` |
| Onda 117. Esta onda não pode alterar o comportamento de nenhuma fonte | `src/lib/escalationProfiles.ts` |
| no máximo +1 por avaliação, respeitado o intervalo mínimo do perfil. | `src/lib/escalationProfiles.ts` |
| - `streak` — a linha é apenas a *última evidência* de uma condição que se | `src/lib/escalationProfiles.ts` |
| Existe para que O2 seja **verificável**, não apenas prometida: o gate de | `src/lib/escalationProfiles.ts` |
| `warning` diário nunca escalona: 14 dias apenas para o repique, e teto 2 | `src/lib/escalationProfiles.ts` |
| ausência de notificação ainda pode ser apenas atraso de fila. | `src/lib/escalationProfiles.ts` |
| * Regra de quebra (O5): qualquer linha reconhecida invalida como âncora | `src/lib/escalationProfiles.ts` |
| * VISÃO - Utilitários de validação de arquivos via Magic Bytes | `src/lib/file-validation.ts` |
| Funções utilitárias para manipulação e validação de IPs | `src/lib/ipUtils.ts` |
| * Este é a ÚNICA fonte de verdade da política de escalonamento. O SQL apenas | `src/lib/maintenanceEscalation.ts` |
| I3  no máximo +1 nível por avaliação | `src/lib/maintenanceEscalation.ts` |
| * Intervalo mínimo entre dois degraus do mesmo alerta. */ | `src/lib/maintenanceEscalation.ts` |
| promessa corre prazo e vence, em vez de o silêncio virar congelamento | `src/lib/maintenanceEscalation.ts` |
| * Apenas os alertas com degrau a aplicar, na ordem de entrada. */ | `src/lib/maintenanceEscalation.ts` |
| negativo: um alerta "do futuro" não deve escalar, e zerar produz exatamente | `src/lib/maintenanceEscalation.ts` |
| Ninguém foi avisado: o primeiro degrau (repique) não espera o prazo normal, | `src/lib/maintenanceEscalation.ts` |
| Onda 249 (Y1–Y5) — reconhecer congela a escada **por um prazo**, não para | `src/lib/maintenanceEscalation.ts` |
| da classificação. O SQL apenas coleta os fatos brutos; o gate de CI e a UI | `src/lib/maintenanceSourceAlerts.ts` |
| Emite no máximo um candidato: o pior pai particionado. Alertar por pai | `src/lib/maintenanceSourceAlerts.ts` |
| * Ponto de entrada do fan-in. Retorna no máximo um candidato por rotina, | `src/lib/maintenanceSourceAlerts.ts` |
| 1. Roda apenas em DEV (`import.meta.env.DEV`) e em viewport mobile (<768px). | `src/lib/mobileNavGuard.ts` |
| em mobile, mas a classe deve existir SEMPRE para que o desenvolvedor pegue | `src/lib/mobileNavGuard.ts` |
| OU `<main>` ainda não montado — caso em que o caller deve aguardar). | `src/lib/mobileNavGuard.ts` |
| 1. Checagem primária: classe `mb-mobile-nav` deve existir no DOM | `src/lib/mobileNavGuard.ts` |
| 2. Checagem secundária (apenas mobile): scroll containers próprios sem padding | `src/lib/mobileNavGuard.ts` |
| limite de 500 entradas (FIFO). Em DEV expõe `window.__clsNavLog` | `src/lib/navigationCLSLog.ts` |
| * A regra abaixo é pura e determinística de propósito: é a mesma consumida pela | `src/lib/partitionBacklogTrend.ts` |
| * Severidade derivada apenas do valor absoluto corrente. */ | `src/lib/partitionBacklogTrend.ts` |
| * Severidade derivada apenas do horizonte projetado de saturação. */ | `src/lib/partitionBacklogTrend.ts` |
| O early-return acima garante samples.length > 0; o fallback existe apenas | `src/lib/partitionBacklogTrend.ts` |
| * Fire-and-forget: nunca deve bloquear o player em caso de falha do backend. | `src/lib/previewTelemetry.ts` |
| apenas em `console.debug` durante desenvolvimento. | `src/lib/previewTelemetry.ts` |
| entre elas cria dois erros simétricos — um de omissão, outro de comissão. | `src/lib/relayHealingArbiter.ts` |
| * A regra que unifica os dois: **reinício exige que o agente seja o suspeito | `src/lib/relayHealingArbiter.ts` |
| continua sendo gravada e alertada; o que se perde é apenas a permissão de | `src/lib/relayHealingArbiter.ts` |
| I3  prova de vida na janela (entregas > 0) e severidade apenas `warning` | `src/lib/relayHealingArbiter.ts` |
| severidade apenas de aviso não sustenta derrubar o processo. | `src/lib/relayHealingArbiter.ts` |
| ser um **empréstimo com prazo**, não uma transferência definitiva. Vencido o | `src/lib/relayLease.ts` |
| exponencial, até um teto de tentativas e um prazo final absoluto. | `src/lib/relayLease.ts` |
| I3  Reentrega jamais estende a tarefa além do prazo final absoluto. | `src/lib/relayLease.ts` |
| I6  Terminar por decisão nossa (teto/prazo) nunca gera motivo que acuse o | `src/lib/relayLease.ts` |
| * Prazo do empréstimo concedido no `claim`, em segundos. */ | `src/lib/relayLease.ts` |
| * Número máximo de reivindicações por tarefa. */ | `src/lib/relayLease.ts` |
| * Prazo final absoluto contado de `created_at`, em segundos. */ | `src/lib/relayLease.ts` |
| * Não cabe mais reentrega dentro do prazo final — decisão nossa. */ | `src/lib/relayLease.ts` |
| * Preenchido apenas em `requeue`. */ | `src/lib/relayLease.ts` |
| * Preenchido apenas em `requeue`. */ | `src/lib/relayLease.ts` |
| * Preenchido apenas em `expire`. */ | `src/lib/relayLease.ts` |
| * Decide o destino de uma tarefa em voo. Função pura: o reaper SQL apenas | `src/lib/relayLease.ts` |
| * A Onda 121 tornou a fila resiliente: lease com prazo, reentrega com recuo e | `src/lib/relayRedeliveryHealth.ts` |
| **limite inferior do intervalo de Wilson** (95%): a pior taxa plausível | `src/lib/relayRedeliveryHealth.ts` |
| dado o tamanho da amostra. Com n pequeno o limite inferior desaba para | `src/lib/relayRedeliveryHealth.ts` |
| I2  O limite inferior de Wilson nunca excede a proporção observada. | `src/lib/relayRedeliveryHealth.ts` |
| * Mínimo de tarefas concluídas na janela para emitir qualquer veredito. */ | `src/lib/relayRedeliveryHealth.ts` |
| * Limite inferior de Wilson que dispara `warning`. */ | `src/lib/relayRedeliveryHealth.ts` |
| * Limite inferior de Wilson que dispara `critical`. */ | `src/lib/relayRedeliveryHealth.ts` |
| * Limite inferior do intervalo de Wilson para uma proporção. Escolhido no | `src/lib/relayRedeliveryHealth.ts` |
| * Proporção crua observada (apenas informativa). */ | `src/lib/relayRedeliveryHealth.ts` |
| TTL curto expira ANTES de ser oferecida ao agente — e, pior, a rotina de cura | `src/lib/relayTaskWindow.ts` |
| reinício → nova tarefa jitterada → expira de novo. | `src/lib/relayTaskWindow.ts` |
| mínimo operacional. Normalizamos na escrita em vez de rejeitar, para que | `src/lib/relayTaskWindow.ts` |
| * Regra de projeto: **corrigir, nunca rejeitar**. Um `INSERT` recusado no meio | `src/lib/relayTaskWindow.ts` |
| * Motivo gravado em `agent_relay_tasks.error` quando a tarefa expira. */ | `src/lib/relayTaskWindow.ts` |
| * A regra que unifica os três: **só é evidência de surdez a tarefa que teve | `src/lib/relayVerdict.ts` |
| * A Edge Function desistiu antes do prazo — decisão nossa. */ | `src/lib/relayVerdict.ts` |
| Onda 121: prazo final absoluto da tarefa — encerramento administrativo | `src/lib/relayVerdict.ts` |
| * Veredito final. O denominador é apenas `alive + deaf`: incluir linhas | `src/lib/relayVerdict.ts` |
| 100)}% de não-resposta, abaixo do limite`, | `src/lib/relayVerdict.ts` |
| Teto de atribuição: a soma das linhas-sentinela não pode imputar mais do | `src/lib/rootCauseCorrelation.ts` |
| * VISÃO - Schemas de validação Zod | `src/lib/schemas.ts` |
| Single source of truth para validação frontend + backend | `src/lib/schemas.ts` |
| REGRA DE AUTOMAÇÃO | `src/lib/schemas.ts` |
| * Disponível somente em DEV ou quando ?debug=skeletons está presente. | `src/lib/skeletonFailureFlag.ts` |
| * Avalia se a falha deve ser simulada para um determinado escopo. | `src/lib/skeletonFailureFlag.ts` |
| * VISÃO — Wave 3: Validação geométrica de zonas | `src/lib/zoneGeometry.ts` |
| * Onda 142 — regra única das 4 invariantes estruturais do árbitro de cura. | `src/lib/agents/arbiterInvariants.ts` |
| * Este módulo é apenas apresentação: nomes, explicações e a consequência real de | `src/lib/agents/arbiterInvariants.ts` |
| * Este módulo não inventa informação — ele apenas separa as duas metades e | `src/lib/agents/healingTrail.ts` |
| reconhece a regra que produziu o veto, para que a UI consiga responder à | `src/lib/agents/healingTrail.ts` |
| * Regra de robustez: motivo desconhecido NUNCA é descartado. Cai em | `src/lib/agents/healingTrail.ts` |
| T5 cada regra do árbitro é reconhecida pelo seu texto canônico | `src/lib/agents/healingTrail.ts` |
| * Regra que produziu a decisão. Os nomes seguem as âncoras R0..R3 documentadas | `src/lib/agents/healingTrail.ts` |
| * Rótulo curto da regra, para badge. */ | `src/lib/agents/healingTrail.ts` |
| resolvido, apenas registrado. Pintar de verde ensinaria o operador a tratar | `src/lib/agents/healingTrail.ts` |
| * Trecho canônico que identifica a regra dentro do motivo gravado. */ | `src/lib/agents/healingTrail.ts` |
| tela. Passivo crescente significa que linhas que já venceram o prazo de | `src/lib/alarms/admissionBacklogAlert.ts` |
| apenas de performance. | `src/lib/alarms/admissionBacklogAlert.ts` |
| uma rotina diária não pode gerar avisos de hora em hora, nem ficar | `src/lib/alarms/admissionBacklogAlert.ts` |
| I1 — apenas execuções válidas. | `src/lib/alarms/admissionBacklogAlert.ts` |
| `mergedSources` some como identidade na fusão: guardamos o máximo, | `src/lib/alarms/admissionLedger.ts` |
| contabilidade fechada garantida por CHECK. Mesmo assim, a UI **não pode** | `src/lib/alarms/admissionLedgerRows.ts` |
| R5. Origem vista **apenas** em linha malformada nunca é `covered`: ela é | `src/lib/alarms/admissionLedgerRows.ts` |
| retenção (Onda 135). Acusar duas vezes com peso máximo é ruído. | `src/lib/alarms/admissionOrphanAlert.ts` |
| L4. Crescimento é **estrito** e medido apenas no bloco contíguo com órfão, | `src/lib/alarms/admissionOrphanTrend.ts` |
| * `lastValidRun` deve ser a execução válida mais recente (a leitura da Onda | `src/lib/alarms/admissionReconciliation.ts` |
| NUNCA deve ser passada como válida — a função reconfere de todo modo. | `src/lib/alarms/admissionReconciliation.ts` |
| J3 — sem execução legível a contabilidade não pode ser acusada. | `src/lib/alarms/admissionReconciliation.ts` |
| G2. O prazo conta pelo **fim** da janela (`windowEnd`), nunca pela criação | `src/lib/alarms/admissionRetention.ts` |
| G3. Janela ainda dentro do prazo **jamais** é apagada. Empate no corte | `src/lib/alarms/admissionRetention.ts` |
| G5. Prazo fora da faixa declarada (30–3650 dias) recusa o expurgo inteiro: | `src/lib/alarms/admissionRetention.ts` |
| um parâmetro errado não pode virar apagamento em massa. | `src/lib/alarms/admissionRetention.ts` |
| * Faixa aceita para o prazo de guarda, em dias (G5). */ | `src/lib/alarms/admissionRetention.ts` |
| * Prazo padrão: 1 ano de prova de cobertura. */ | `src/lib/alarms/admissionRetention.ts` |
| * Linha candidata, no formato mínimo lido do banco. */ | `src/lib/alarms/admissionRetention.ts` |
| M6. Histórico composto **apenas** de fotos ilegíveis nunca vira tendência: | `src/lib/alarms/admissionTrendAlert.ts` |
| … +731 linhas — lista completa em `context.json` | |
