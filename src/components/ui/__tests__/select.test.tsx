import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

describe('Select', () => {
  const renderSelect = (props = {}) => {
    return render(
      <Select {...props}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Opção 1</SelectItem>
          <SelectItem value="option2">Opção 2</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  it('deve renderizar corretamente', () => {
    renderSelect();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('deve exibir placeholder', () => {
    renderSelect();
    expect(screen.getByText('Selecione...')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderSelect();
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('deve ter valor padrão', () => {
    renderSelect({ defaultValue: 'option1' });
    expect(screen.getByText('Opção 1')).toBeInTheDocument();
  });

  it('deve disparar onValueChange', async () => {
    const handleChange = vi.fn();
    renderSelect({ onValueChange: handleChange });
    fireEvent.click(screen.getByRole('combobox'));
    const option = await screen.findByText('Opção 2');
    fireEvent.click(option);
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('deve estar desabilitado', () => {
    renderSelect({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('deve aceitar className no trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveClass('custom-trigger');
  });
});
