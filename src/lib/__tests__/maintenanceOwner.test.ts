/**
 * Onda 147 — Testes da leitura de responsável na tela de manutenção.
 *
 * O foco é o dado HOSTIL: `detail` chega da rede e nada garante seu formato.
 * Um rótulo desconhecido não pode derrubar o console nem, pior, sumir com o
 * alerta da tela.
 */
import { describe, it, expect } from 'vitest';
import { readOwnerRouting, scopeLabel } from '@/lib/maintenance/maintenanceOwner';
import {
  buildMaintenanceConsole,
  type MaintenanceAlertRow,
} from '@/lib/maintenance/maintenanceConsoleView';

const OWNERS = ['field_tech', 'network_ops', 'registry_admin', 'platform', 'triage'] as const;

describe('readOwnerRouting', () => {
  it('traduz todo o vocabulário do banco com rótulo e ação', () => {
    for (const owner of OWNERS) {
      const routing = readOwnerRouting({ owner });
      expect(routing).not.toBeNull();
      expect(routing?.owner).toBe(owner);
      expect(routing?.label.length).toBeGreaterThan(2);
      expect(routing?.action.length).toBeGreaterThan(8);
    }
  });

  it('não inventa responsável quando o alerta não é roteado por culpa', () => {
    expect(readOwnerRouting(null)).toBeNull();
    expect(readOwnerRouting({})).toBeNull();
    expect(readOwnerRouting({ owner: '' })).toBeNull();
    expect(readOwnerRouting({ owner: 42 })).toBeNull();
  });

  it('rebaixa rótulo desconhecido para triagem em vez de lançar', () => {
    for (const hostile of ['DROP TABLE', 'field-tech', 'FIELD_TECH', '  ', '{}']) {
      const routing = readOwnerRouting({ owner: hostile });
      expect(routing?.owner).toBe('triage');
    }
  });

  it('ignora contagem de câmeras inválida sem descartar o roteamento', () => {
    for (const hostile of [-1, Number.NaN, Infinity, '3', null, {}]) {
      const routing = readOwnerRouting({ owner: 'field_tech', cameras: hostile });
      expect(routing?.owner).toBe('field_tech');
      expect(routing?.cameras).toBeNull();
    }
    expect(readOwnerRouting({ owner: 'field_tech', cameras: 7.9 })?.cameras).toBe(7);
  });

  it('só aceita escopos do vocabulário', () => {
    expect(readOwnerRouting({ owner: 'platform', scope: 'fleet' })?.scope).toBe('fleet');
    expect(readOwnerRouting({ owner: 'platform', scope: 'galaxia' })?.scope).toBeNull();
  });
});

describe('scopeLabel', () => {
  it('descreve causa comum com a abrangência, para evitar despacho múltiplo', () => {
    const routing = readOwnerRouting({ owner: 'network_ops', scope: 'agent', cameras: 8 });
    expect(scopeLabel(routing!)).toBe('causa comum · 8 câmeras');
  });

  it('não promete contagem quando ela não veio', () => {
    expect(scopeLabel(readOwnerRouting({ owner: 'platform', scope: 'fleet' })!)).toBe('frota');
    expect(scopeLabel(readOwnerRouting({ owner: 'field_tech', scope: 'camera' })!)).toBe('câmera');
    expect(scopeLabel(readOwnerRouting({ owner: 'field_tech' })!)).toBeNull();
  });
});

describe('console de manutenção com roteamento', () => {
  const base: MaintenanceAlertRow = {
    id: 'a1',
    routine: 'blame:device:cam-1',
    severity: 'critical',
    reason: '12 falhas atribuídas a device na mesma câmera',
    detail: { owner: 'field_tech', scope: 'camera', cameras: 1 },
    created_at: new Date(1_000_000).toISOString(),
    observed_at: null,
    acknowledged_at: null,
    acknowledged_by: null,
    escalation_level: 0,
    last_escalated_at: null,
  };

  it('anexa o responsável à linha exibida', () => {
    const model = buildMaintenanceConsole([base], 2_000_000);
    expect(model.rows[0].routing?.owner).toBe('field_tech');
  });

  it('mantém na tela alertas antigos sem responsável', () => {
    const legacy: MaintenanceAlertRow = {
      ...base,
      id: 'a2',
      routine: 'retention:purge',
      detail: {},
    };
    const model = buildMaintenanceConsole([legacy], 2_000_000);
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0].routing).toBeNull();
  });

  it('detalhe corrompido não derruba o console', () => {
    const hostile: MaintenanceAlertRow = {
      ...base,
      id: 'a3',
      detail: { owner: 'invasor', scope: 42, cameras: 'muitas' } as Record<string, unknown>,
    };
    const model = buildMaintenanceConsole([hostile], 2_000_000);
    expect(model.rows[0].routing?.owner).toBe('triage');
    expect(model.summary.open).toBe(1);
  });
});
