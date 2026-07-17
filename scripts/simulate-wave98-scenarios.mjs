#!/usr/bin/env node
/**
 * Onda 98 — Simulação: tabelas com coluna updated_at mas SEM trigger BEFORE UPDATE
 * que a atualize. Ausência causa dados de auditoria enganosos.
 */
const scenarios = [];
const tables = [
  'cameras','profiles','organizations','rules','alerts','vehicles','video_clips',
  'zones','recording_configs','notification_configs','registered_persons','registered_plates',
  'camera_presets','camera_patrols','face_recognition_configs','stream_recordings',
  'organization_members','user_filter_preferences','model_thresholds','camera_ptz_config',
  'camera_detection_rules','event_alerts','arm_disarm_states','detection_reviews'
];
for (const t of tables) {
  for (const hasTrigger of [true, false]) {
    for (const isView of [false]) {
      for (const isPartition of [false, true]) {
        scenarios.push({ table: t, hasTrigger, isView, isPartition });
      }
    }
  }
}
// edge cases
scenarios.push({ table: 'edge_cache', hasTrigger: false, updatedAtNullable: true });
scenarios.push({ table: 'audit_logs', hasTrigger: false, isImmutable: true });
scenarios.push({ table: 'idempotency_keys', hasTrigger: false, isImmutable: true });

const critical = scenarios.filter(s => !s.hasTrigger && !s.isPartition && !s.isImmutable).length;
console.log(`Cenários simulados: ${scenarios.length}`);
console.log(`Ausências críticas: ${critical}`);
console.log('Regra: ignorar tabelas particionadas (herdam trigger do pai) e tabelas imutáveis (audit_logs, idempotency_keys).');
