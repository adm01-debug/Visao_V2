import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AutomationRulesManager } from '../AutomationRulesManager';

vi.mock('@/hooks/useRules', () => ({
  useRules: () => ({
    rules: [],
    loading: false,
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCameras', () => ({
  useCameras: () => ({ cameras: [], loading: false }),
}));

describe('AutomationRulesManager', () => {
  it('renderiza sem erros com lista vazia de regras', () => {
    const { container } = render(<AutomationRulesManager />);
    expect(container.firstChild).toBeTruthy();
  });
});
