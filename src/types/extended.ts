/**
 * VISÃO - Tipos Adicionais
 * 
 * Tipos para tabelas criadas depois da geração inicial do Supabase
 * Importar junto com os tipos gerados automaticamente
 */

// ============================================
// PPE (Equipamentos de Proteção Individual)
// ============================================

export type PPEType = 
  | 'helmet'
  | 'vest'
  | 'goggles'
  | 'mask'
  | 'gloves'
  | 'boots'
  | 'earmuffs'
  | 'harness';

export interface PPEZone {
  id: string;
  name: string;
  camera_id: string | null;
  required_ppe: PPEType[];
  alert_on_violation: boolean;
  grace_period_seconds: number;
  active: boolean;
  polygon: { x: number; y: number }[] | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PPEZoneInsert {
  name: string;
  camera_id?: string | null;
  required_ppe?: PPEType[];
  alert_on_violation?: boolean;
  grace_period_seconds?: number;
  active?: boolean;
  polygon?: { x: number; y: number }[] | null;
  user_id?: string | null;
}

export interface PPEZoneUpdate {
  name?: string;
  camera_id?: string | null;
  required_ppe?: PPEType[];
  alert_on_violation?: boolean;
  grace_period_seconds?: number;
  active?: boolean;
  polygon?: { x: number; y: number }[] | null;
}

export interface PPEViolation {
  id: string;
  zone_id: string | null;
  camera_id: string | null;
  person_id: string | null;
  missing_items: PPEType[];
  snapshot_url: string | null;
  confidence: number;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PPEViolationInsert {
  zone_id?: string | null;
  camera_id?: string | null;
  person_id?: string | null;
  missing_items: PPEType[];
  snapshot_url?: string | null;
  confidence?: number;
  acknowledged?: boolean;
  metadata?: Record<string, any>;
}

export interface PPEConfig {
  id: string;
  camera_id: string | null;
  enabled: boolean;
  min_confidence: number;
  detection_interval_ms: number;
  alert_on_violation: boolean;
  save_violations: boolean;
  grace_period_seconds: number;
  model_endpoint: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// HEATMAP (Mapa de Calor)
// ============================================

export interface HeatmapData {
  id: string;
  camera_id: string | null;
  x: number;
  y: number;
  value: number;
  grid_size: number;
  created_at: string;
}

export interface HeatmapDataInsert {
  camera_id?: string | null;
  x: number;
  y: number;
  value?: number;
  grid_size?: number;
}

export interface HeatmapSnapshot {
  id: string;
  camera_id: string | null;
  data: number[][];
  total_detections: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface HeatmapSnapshotInsert {
  camera_id?: string | null;
  data: number[][];
  total_detections?: number;
  start_time: string;
  end_time: string;
}

// ============================================
// EXTENSÃO DOS TIPOS SUPABASE
// ============================================

// Use estes tipos ao criar queries para as novas tabelas:
//
// const { data } = await supabase
//   .from('ppe_zones')
//   .select('*')
//   .returns<PPEZone[]>();
//
// const { data } = await supabase
//   .from('ppe_violations')
//   .insert(violation as PPEViolationInsert);
