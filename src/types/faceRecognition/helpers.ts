/**
 * VISÃO - Face Recognition Helpers
 * Utility functions for facial recognition
 */

import type { Person, DetectedFace, FaceRecognitionConfig, ListType } from './types';

export function calculateSimilarity(encoding1: number[], encoding2: number[]): number {
  if (encoding1.length !== encoding2.length) return 0;
  let sumSquares = 0;
  for (let i = 0; i < encoding1.length; i++) {
    sumSquares += Math.pow((encoding1[i] ?? 0) - (encoding2[i] ?? 0), 2);
  }
  const distance = Math.sqrt(sumSquares);
  return Math.max(0, 1 - (distance / 1.5));
}

export function meetsQualityThreshold(face: DetectedFace, config: FaceRecognitionConfig): boolean {
  if (face.quality < config.minFaceQuality) return false;
  if (face.confidence < 0.8) return false;
  const pixelWidth = (face.boundingBox.width / 100) * 1920;
  const pixelHeight = (face.boundingBox.height / 100) * 1080;
  if (pixelWidth < config.minFaceSize || pixelHeight < config.minFaceSize) return false;
  if (face.pose) {
    if (Math.abs(face.pose.yaw) > 45 || Math.abs(face.pose.pitch) > 30) return false;
  }
  return true;
}

export function determineAction(
  listType: ListType,
  config: FaceRecognitionConfig
): 'allow' | 'alert' | 'block' | 'log' | 'none' {
  const action = config.actions[listType];
  switch (action) {
    case 'allow': return 'allow';
    case 'alert': return 'alert';
    case 'block': return 'block';
    case 'log': return 'log';
    case 'notify': return 'alert';
    case 'ignore': return 'none';
    default: return 'log';
  }
}

export function isWithinAccessSchedule(person: Person): boolean {
  if (!person.accessSchedule?.enabled) return true;
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  if (!person.accessSchedule.days.includes(currentDay)) return false;
  const { startTime, endTime } = person.accessSchedule;
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  }
  return currentTime >= startTime || currentTime <= endTime;
}

export function getListTypeColor(listType: ListType): string {
  const colors: Record<ListType, string> = {
    whitelist: 'bg-success',
    blacklist: 'bg-destructive',
    vip: 'bg-warning',
    employee: 'bg-primary',
    visitor: 'bg-primary/70',
    contractor: 'bg-warning',
    unknown: 'bg-muted-foreground',
  };
  return colors[listType];
}

export function getListTypeLabel(listType: ListType): string {
  const labels: Record<ListType, string> = {
    whitelist: 'Permitido',
    blacklist: 'Bloqueado',
    vip: 'VIP',
    employee: 'Funcionário',
    visitor: 'Visitante',
    contractor: 'Terceiro',
    unknown: 'Desconhecido',
  };
  return labels[listType];
}
