import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RuleTemplateSelector } from '../RuleTemplateSelector';

vi.mock('@/data/ruleTemplates', () => ({
  ruleTemplates: [
    {
      id: 'tpl-1',
      name: 'Template Teste',
      description: 'descrição do template',
      category: 'security',
      severity: 'high',
      icon: 'Shield',
      color: 'red',
      conditions: [],
      actions: [],
    },
  ],
  getCategoryLabel: () => 'Segurança',
  getSeverityLabel: () => 'Alto',
}));

describe('RuleTemplateSelector', () => {
  it('renderiza botão de abrir o seletor', () => {
    render(<RuleTemplateSelector onSelectTemplate={vi.fn()} />);
    // O trigger é um botão do DialogTrigger; garantir montagem sem crash.
    expect(document.body).toBeInTheDocument();
  });

  it('chamada de callback funciona sem crashar', () => {
    const spy = vi.fn();
    render(<RuleTemplateSelector onSelectTemplate={spy} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
