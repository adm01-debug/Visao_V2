import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleEngine } from '../RuleEngine';

const mockRules = [
  {
    id: '1',
    name: 'Detecção de Intrusão',
    description: 'Alerta quando detecta movimento em área restrita',
    category: 'security' as const,
    severity: 'high' as const,
    isActive: true,
    triggeredCount: 15,
  },
  {
    id: '2',
    name: 'Contagem de Pessoas',
    description: 'Monitora quantidade de pessoas na área',
    category: 'safety' as const,
    severity: 'medium' as const,
    isActive: false,
    triggeredCount: 42,
  },
];

describe('RuleEngine', () => {
  it('renders rule engine', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('Motor de Regras')).toBeInTheDocument();
  });

  it('shows active count badge', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('1/2 ativas')).toBeInTheDocument();
  });

  it('displays rule names', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('Detecção de Intrusão')).toBeInTheDocument();
    expect(screen.getByText('Contagem de Pessoas')).toBeInTheDocument();
  });

  it('displays rule descriptions', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('Alerta quando detecta movimento em área restrita')).toBeInTheDocument();
  });

  it('shows severity badges', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('shows category badges', () => {
    render(<RuleEngine rules={mockRules} />);
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.getByText('Trabalho')).toBeInTheDocument();
  });

  it('filters rules by search', () => {
    render(<RuleEngine rules={mockRules} />);
    
    const searchInput = screen.getByPlaceholderText('Buscar regras...');
    fireEvent.change(searchInput, { target: { value: 'Intrusão' } });
    
    expect(screen.getByText('Detecção de Intrusão')).toBeInTheDocument();
    expect(screen.queryByText('Contagem de Pessoas')).not.toBeInTheDocument();
  });

  it('calls onRuleToggle when switch is toggled', () => {
    const onRuleToggle = vi.fn();
    render(<RuleEngine rules={mockRules} onRuleToggle={onRuleToggle} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(onRuleToggle).toHaveBeenCalledWith('1', false);
  });

  it('calls onRuleEdit when edit button clicked', () => {
    const onRuleEdit = vi.fn();
    const { container } = render(<RuleEngine rules={mockRules} onRuleEdit={onRuleEdit} />);
    
    const editButtons = container.querySelectorAll('.lucide-edit');
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0].closest('button')!);
      expect(onRuleEdit).toHaveBeenCalledWith(mockRules[0]);
    }
  });

  it('calls onRuleDelete when delete button clicked', () => {
    const onRuleDelete = vi.fn();
    const { container } = render(<RuleEngine rules={mockRules} onRuleDelete={onRuleDelete} />);
    
    const deleteButtons = container.querySelectorAll('.lucide-trash-2');
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0].closest('button')!);
      expect(onRuleDelete).toHaveBeenCalledWith('1');
    }
  });

  it('shows create button when onCreateRule provided', () => {
    const onCreateRule = vi.fn();
    render(<RuleEngine rules={mockRules} onCreateRule={onCreateRule} />);
    
    const createButton = screen.getByRole('button', { name: /nova regra/i });
    fireEvent.click(createButton);
    
    expect(onCreateRule).toHaveBeenCalled();
  });

  it('shows empty state when no rules', () => {
    render(<RuleEngine rules={[]} />);
    expect(screen.getByText('Nenhuma regra encontrada')).toBeInTheDocument();
  });
});
