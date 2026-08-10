/**
 * Wave 4 — Templates contextuais por tipo de zona.
 * Sugere quais templates fazem sentido para o tipo semântico da zona.
 */
import type { ZoneType } from '@/types/zones/types';

export type TemplateId =
  | 'intrusion'
  | 'loitering'
  | 'perimeter_violation'
  | 'abandoned_object'
  | 'restricted_zone'
  | 'ppe_monitoring'
  | 'alpr_dwell'
  | 'queue_length'
  | 'occupancy_limit';

export const TEMPLATE_BY_ZONE_TYPE: Record<ZoneType, TemplateId[]> = {
  restricted: ['intrusion', 'restricted_zone', 'perimeter_violation'],
  counting: ['occupancy_limit'],
  tripwire: ['perimeter_violation', 'intrusion'],
  dwell: ['loitering', 'abandoned_object'],
  occupancy: ['occupancy_limit'],
  parking: ['alpr_dwell', 'loitering'],
  queue: ['queue_length', 'loitering'],
  safety: ['ppe_monitoring'],
  custom: ['intrusion', 'loitering', 'restricted_zone'],
};

export function recommendTemplates(zoneTypes: ZoneType[]): TemplateId[] {
  const set = new Set<TemplateId>();
  for (const t of zoneTypes) {
    for (const tpl of TEMPLATE_BY_ZONE_TYPE[t] ?? []) set.add(tpl);
  }
  return Array.from(set);
}
