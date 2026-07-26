/**
 * Onda 138 — varredura combinatória dos contadores da navegação inferior.
 *
 * A intenção é provar as invariantes B1..B8 contra o espaço de estados que a
 * frota real produz, e não contra três exemplos escolhidos a dedo.
 */

import { describe, it, expect } from 'vitest';
import {
  buildBottomNavBadge,
  fleetTone,
  type BottomNavStatusInput,
} from '../navigation/bottomNavBadge';

const base: BottomNavStatusInput = {
  unreadAlerts: 0,
  onlineCameras: 0,
  totalCameras: 0,
  registeredPersons: 0,
  openMaintenanceAlerts: 0,
  openMaintenanceCritical: 0,
  maintenanceAtCeiling: 0,
};

const CATEGORIES = ['monitoring', 'security', 'intelligence', 'management', 'settings'];

describe('bottomNavBadge — frota (B1, B2, B3)', () => {
  it('B2 frota vazia nunca renderiza contador', () => {
    for (const online of [0, 1, 5, -3, Number.NaN]) {
      const d = buildBottomNavBadge('monitoring', { ...base, totalCameras: 0, onlineCameras: online }, true);
      expect(d.text).toBeNull();
      expect(d.dot).toBeNull();
    }
  });

  it('B1 sempre mostra online/total, inclusive com zero online', () => {
    for (let total = 1; total <= 60; total++) {
      for (const online of [0, 1, Math.floor(total / 2), total]) {
        const d = buildBottomNavBadge('monitoring', { ...base, totalCameras: total, onlineCameras: online }, false);
        expect(d.text).toBe(`${Math.min(online, total)}/${total}`);
        expect(d.srLabel).toContain(String(total));
      }
    }
  });

  it('B3 tom acompanha a razão da frota', () => {
    expect(fleetTone(0, 0)).toBe('neutral');
    for (let total = 1; total <= 40; total++) {
      for (let online = 0; online <= total; online++) {
        const ratio = online / total;
        const expected = ratio >= 0.8 ? 'success' : ratio >= 0.5 ? 'warning' : 'danger';
        expect(fleetTone(online, total)).toBe(expected);
      }
    }
  });

  it('online acima do total é saturado (dados inconsistentes não viram 70/60)', () => {
    const d = buildBottomNavBadge('monitoring', { ...base, totalCameras: 60, onlineCameras: 70 }, true);
    expect(d.text).toBe('60/60');
    expect(d.tone).toBe('success');
  });
});

describe('bottomNavBadge — alertas (B4)', () => {
  it('zero alerta vira ponto de status, nunca contador', () => {
    const d = buildBottomNavBadge('security', { ...base, unreadAlerts: 0 }, true);
    expect(d.text).toBeNull();
    expect(d.dot).toBe('success');
  });

  it('escala warning/danger no limiar de 5', () => {
    for (let n = 1; n <= 200; n++) {
      const d = buildBottomNavBadge('security', { ...base, unreadAlerts: n }, false);
      expect(d.tone).toBe(n > 5 ? 'danger' : 'warning');
      expect(d.text).toBe(n > 99 ? '99+' : String(n));
    }
  });
});

describe('bottomNavBadge — manutenção (B5, B6)', () => {
  it('B5 não-admin nunca vê o contador de manutenção', () => {
    for (let open = 0; open <= 30; open++) {
      const d = buildBottomNavBadge(
        'settings',
        { ...base, openMaintenanceAlerts: open, openMaintenanceCritical: open },
        false,
      );
      expect(d.text).toBeNull();
    }
  });

  it('B6 crítico pinta danger e teto do escalonamento pulsa', () => {
    for (let open = 1; open <= 25; open++) {
      for (const critical of [0, 1, open]) {
        for (const ceiling of [0, 1]) {
          const d = buildBottomNavBadge(
            'settings',
            {
              ...base,
              openMaintenanceAlerts: open,
              openMaintenanceCritical: critical,
              maintenanceAtCeiling: ceiling,
            },
            true,
          );
          expect(d.text).toBe(open > 99 ? '99+' : String(open));
          expect(d.tone).toBe(critical > 0 ? 'danger' : 'warning');
          expect(d.pulse).toBe(ceiling > 0);
        }
      }
    }
  });

  it('zero incidente aberto não deixa resíduo visual', () => {
    const d = buildBottomNavBadge('settings', { ...base, maintenanceAtCeiling: 3 }, true);
    expect(d.text).toBeNull();
    expect(d.pulse).toBe(false);
  });
});

describe('bottomNavBadge — invariantes gerais (B7, B8)', () => {
  const values = [0, 1, 6, 100, -1, Number.NaN, Number.POSITIVE_INFINITY, 2.7];

  it('B7/B8 nenhum estado produz badge+dot simultâneos nem rótulo vazio', () => {
    let checked = 0;
    for (const category of CATEGORIES) {
      for (const unreadAlerts of values) {
        for (const totalCameras of values) {
          for (const onlineCameras of values) {
            for (const openMaintenanceAlerts of [0, 2]) {
              for (const isAdmin of [true, false]) {
                const d = buildBottomNavBadge(
                  category,
                  {
                    ...base,
                    unreadAlerts,
                    totalCameras,
                    onlineCameras,
                    openMaintenanceAlerts,
                    openMaintenanceCritical: 0,
                    maintenanceAtCeiling: 0,
                  },
                  isAdmin,
                );
                checked++;
                expect(d.text === null || d.dot === null).toBe(true);
                if (d.text !== null || d.dot !== null) {
                  expect(d.srLabel.length).toBeGreaterThan(0);
                }
                if (d.text !== null) {
                  expect(d.text.trim()).toBe(d.text);
                  expect(d.text.length).toBeGreaterThan(0);
                  expect(d.text).not.toContain('NaN');
                  expect(d.text).not.toContain('Infinity');
                }
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('categoria desconhecida é silenciosa', () => {
    const d = buildBottomNavBadge('inexistente', { ...base, unreadAlerts: 9 }, true);
    expect(d).toEqual({ text: null, dot: null, tone: 'neutral', pulse: false, srLabel: '' });
  });
});
