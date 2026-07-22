import { describe, it, expect } from 'vitest';
import { recommendTemplates } from '../wizardTemplateRecommendation';

describe('recommendTemplates', () => {
  it('sugere intrusão para zona restrita', () => {
    expect(recommendTemplates(['restricted'])).toContain('intrusion');
  });
  it('sugere ALPR para estacionamento', () => {
    expect(recommendTemplates(['parking'])).toContain('alpr_dwell');
  });
  it('sugere EPI para segurança', () => {
    expect(recommendTemplates(['safety'])).toContain('ppe_monitoring');
  });
  it('deduplica sugestões entre múltiplas zonas', () => {
    const r = recommendTemplates(['restricted', 'tripwire']);
    expect(new Set(r).size).toBe(r.length);
  });
});
