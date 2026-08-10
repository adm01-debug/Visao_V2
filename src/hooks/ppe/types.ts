/**
 * VISÃO - PPE Types & Constants
 */

export type PPEType =
  'helmet' | 'vest' | 'gloves' | 'boots' | 'goggles' | 'mask' | 'earmuffs' | 'harness';
export type PPEStatus = 'detected' | 'missing' | 'unknown';

export interface PPEItem {
  type: PPEType;
  status: PPEStatus;
  confidence: number;
  detectionMethod: 'vision-ai' | 'local-ml' | 'heuristic';
}

export interface PersonPPEDetection {
  personId: string;
  trackingId: string;
  box: { x: number; y: number; width: number; height: number };
  items: PPEItem[];
  isCompliant: boolean;
  missingItems: PPEType[];
  timestamp: Date;
  cameraId?: string;
  zoneId?: string;
}

export interface PPEZone {
  id: string;
  name: string;
  cameraId: string;
  requiredPPE: PPEType[];
  alertEnabled: boolean;
  gracePeriodSeconds: number;
  polygon?: { x: number; y: number }[];
  createdAt: Date;
}

export interface PPEViolation {
  id: string;
  personId: string;
  zoneId: string;
  zoneName: string;
  cameraId: string;
  missingItems: PPEType[];
  timestamp: Date;
  acknowledged: boolean;
  imageUrl?: string;
}

export interface PPEConfig {
  useVisionAI: boolean;
  confidenceThreshold: number;
  detectionInterval: number;
  saveViolations: boolean;
  alertOnViolation: boolean;
  gracePeriodMs: number;
}

export interface PPEStats {
  totalDetections: number;
  compliantCount: number;
  violationCount: number;
  complianceRate: number;
  byPPEType: Record<PPEType, { detected: number; missing: number }>;
}

export interface PPEZoneConfig {
  id: string;
  name: string;
  cameraId: string;
  requiredPPE: PPEType[];
  alertEnabled: boolean;
  gracePeriodSeconds: number;
  isActive: boolean;
}

export const PPE_TYPES: { id: PPEType; label: string; icon: string }[] = [
  { id: 'helmet', label: 'Capacete', icon: '🪖' },
  { id: 'vest', label: 'Colete', icon: '🦺' },
  { id: 'gloves', label: 'Luvas', icon: '🧤' },
  { id: 'boots', label: 'Botas', icon: '👢' },
  { id: 'goggles', label: 'Óculos', icon: '🥽' },
  { id: 'mask', label: 'Máscara', icon: '😷' },
  { id: 'earmuffs', label: 'Protetor Auricular', icon: '🎧' },
  { id: 'harness', label: 'Cinto de Segurança', icon: '🪢' },
];

export const PPE_LABELS: Record<PPEType, { pt: string; en: string; icon: string }> = {
  helmet: { pt: 'Capacete', en: 'Helmet', icon: '🪖' },
  vest: { pt: 'Colete', en: 'Vest', icon: '🦺' },
  gloves: { pt: 'Luvas', en: 'Gloves', icon: '🧤' },
  boots: { pt: 'Botas', en: 'Boots', icon: '👢' },
  goggles: { pt: 'Óculos', en: 'Goggles', icon: '🥽' },
  mask: { pt: 'Máscara', en: 'Mask', icon: '😷' },
  earmuffs: { pt: 'Protetor Auricular', en: 'Earmuffs', icon: '🎧' },
  harness: { pt: 'Cinto de Segurança', en: 'Harness', icon: '🪢' },
};

export const DEFAULT_PPE_CONFIG: PPEConfig = {
  confidenceThreshold: 0.6,
  detectionInterval: 2000,
  saveViolations: true,
  alertOnViolation: true,
  useVisionAI: true,
  gracePeriodMs: 5000,
};
