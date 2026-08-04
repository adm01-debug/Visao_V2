/**
 * Onda 137 — varredura das regras de contador da navegação.
 *
 * Cobre N1..N5 (navBadge) e M1..M6 (contador de manutenção), incluindo a
 * regressão que motivou a onda: rótulos textuais como "5/10" desapareciam.
 */

import { describe, expect, it } from 'vitest';
import {
  NAV_BADGE_MAX,
  formatNavBadge,
  shouldRenderNavBadge,
  type NavBadgeValue,
} from '@/lib/navigation/navBadge';
import { buildMaintenanceNavBadge } from '@/lib/maintenance/maintenanceNavBadge';
import { DEFAULT_ESCALATION_THRESHOLDS } from '@/lib/maintenanceEscalation';

describe('navBadge — regressão do rótulo textual', () => {
  it('exibe o contador de câmeras "online/total" (bug corrigido na Onda 137)', () => {
    expect(shouldRenderNavBadge('5/10')).toBe(true);
    expect(formatNavBadge('5/10')).toBe('5/10');
    // A regra antiga: Number("5/10") → NaN → nunca renderizava.
    expect(Number('5/10') > 0).toBe(false);
  });
});

describe('navBadge — N1..N5', () => {
  const numbers = [
    -1000,
    -1,
    -0.4,
    0,
    0.4,
    1,
    2,
    9,
    42,
    98,
    99,
    100,
    101,
    1000,
    1e6,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  const texts = ['', ' ', '  ', '0', '0/0', '5/10', '99+', 'novo', 'ç ã', '  3  '];
  const values: NavBadgeValue[] = [...numbers, ...texts, undefined, null];

  it('N1 número: só finito e positivo renderiza', () => {
    for (const n of numbers) {
      expect(shouldRenderNavBadge(n)).toBe(Number.isFinite(n) && n > 0);
    }
  });

  it('N2 texto: não vazio após trim sempre renderiza', () => {
    for (const t of texts) {
      expect(shouldRenderNavBadge(t)).toBe(t.trim().length > 0);
    }
    expect(shouldRenderNavBadge(undefined)).toBe(false);
    expect(shouldRenderNavBadge(null)).toBe(false);
  });

  it('N3 formatar nunca devolve vazio quando o badge deve aparecer', () => {
    for (const v of values) {
      const out = formatNavBadge(v);
      if (shouldRenderNavBadge(v)) expect(out.length).toBeGreaterThan(0);
      else expect(out).toBe('');
      expect(out).not.toContain('NaN');
      expect(out).not.toContain('undefined');
    }
  });

  it('N4 rótulo textual é preservado (apenas trim)', () => {
    for (const t of texts.filter((x) => x.trim().length > 0)) {
      expect(formatNavBadge(t)).toBe(t.trim());
    }
  });

  it('N5 números acima do teto viram "<teto>+" e nunca passam de 4 caracteres', () => {
    for (const n of numbers.filter((x) => Number.isFinite(x) && x > 0)) {
      const out = formatNavBadge(n);
      expect(out.length).toBeLessThanOrEqual(String(NAV_BADGE_MAX).length + 1);
      if (n > NAV_BADGE_MAX) expect(out).toBe(`${NAV_BADGE_MAX}+`);
      else expect(out).toBe(String(Math.floor(n)));
    }
    expect(formatNavBadge(500, 9)).toBe('9+');
    expect(formatNavBadge(500, 0)).toBe(`${NAV_BADGE_MAX}+`);
  });
});

describe('maintenanceNavBadge — M1..M6 (varredura combinatória)', () => {
  const opens = [0, 1, 2, 5, 17, 99, 100, 250, -3, Number.NaN];
  const criticals = [0, 1, 3, 17, 250, -1, Number.NaN];
  const ceilings = [0, 1, 4, 250, -2, Number.NaN];
  const admins = [true, false];

  it('varre todas as combinações mantendo as invariantes', () => {
    let scenarios = 0;

    for (const isAdmin of admins) {
      for (const open of opens) {
        for (const openCritical of criticals) {
          for (const atCeiling of ceilings) {
            scenarios += 1;
            const summary = { open, openCritical, atCeiling };
            const result = buildMaintenanceNavBadge(summary, isAdmin);

            const normOpen = Number.isFinite(open) ? Math.max(0, Math.trunc(open)) : 0;
            const normCrit = Number.isFinite(openCritical)
              ? Math.max(0, Math.trunc(openCritical))
              : 0;
            const normCeil = Number.isFinite(atCeiling) ? Math.max(0, Math.trunc(atCeiling)) : 0;
            const visible = isAdmin && normOpen > 0;

            // M1 / M2 / M3
            expect(result.badge).toBe(visible ? normOpen : undefined);
            // M4
            if (visible) {
              expect(result.variant).toBe(normCrit > 0 ? 'destructive' : 'warning');
            } else {
              expect(result.variant).toBe('default');
            }
            // M5
            expect(result.pulse).toBe(visible && normCeil > 0);
            // M6
            expect(result.srLabel.length).toBeGreaterThan(0);
            if (visible) expect(result.srLabel).toContain(String(normOpen));
            // O badge, quando existe, sempre é renderizável pela sidebar.
            expect(shouldRenderNavBadge(result.badge)).toBe(visible);
          }
        }
      }
    }

    expect(scenarios).toBe(admins.length * opens.length * criticals.length * ceilings.length);
    expect(scenarios).toBeGreaterThan(500);
  });

  it('M1 não-admin nunca vê contador, mesmo com incidentes críticos no teto', () => {
    const result = buildMaintenanceNavBadge({ open: 40, openCritical: 40, atCeiling: 40 }, false);
    expect(result.badge).toBeUndefined();
    expect(result.pulse).toBe(false);
  });

  it('M2 lista só com reconhecidos não gera contador', () => {
    expect(
      buildMaintenanceNavBadge({ open: 0, openCritical: 0, atCeiling: 0 }, true).badge
    ).toBeUndefined();
  });

  it('resumo ausente é tratado como silêncio, não como erro', () => {
    expect(buildMaintenanceNavBadge(null, true).badge).toBeUndefined();
    expect(buildMaintenanceNavBadge(undefined, true).badge).toBeUndefined();
  });

  it('o rótulo avisa quando o escalonamento já esgotou (teto da Onda 117)', () => {
    const result = buildMaintenanceNavBadge({ open: 3, openCritical: 1, atCeiling: 2 }, true);
    expect(result.srLabel).toMatch(/teto do escalonamento/);
    expect(result.pulse).toBe(true);
    // O teto usado pelo hook é o mesmo do cron.
    expect(DEFAULT_ESCALATION_THRESHOLDS.maxLevel.critical).toBeGreaterThan(
      DEFAULT_ESCALATION_THRESHOLDS.maxLevel.warning
    );
  });
});
