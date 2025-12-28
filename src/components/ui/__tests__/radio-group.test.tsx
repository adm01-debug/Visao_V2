import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RadioGroup, RadioGroupItem } from '../radio-group';

describe('RadioGroup', () => {
  it('deve renderizar corretamente', () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });

  it('deve renderizar múltiplos itens', () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
        <RadioGroupItem value="option3" />
      </RadioGroup>
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('deve ter valor padrão', () => {
    render(
      <RadioGroup defaultValue="option2">
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
      </RadioGroup>
    );
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
  });

  it('deve disparar onValueChange', () => {
    const handleChange = vi.fn();
    render(
      <RadioGroup onValueChange={handleChange}>
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
      </RadioGroup>
    );
    fireEvent.click(screen.getAllByRole('radio')[1]);
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('deve aceitar className customizada', () => {
    render(
      <RadioGroup className="custom-group">
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(screen.getByRole('radiogroup')).toHaveClass('custom-group');
  });

  it('deve estar desabilitado', () => {
    render(
      <RadioGroup disabled>
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('deve ter orientação vertical por padrão', () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(screen.getByRole('radiogroup')).toHaveClass('grid');
  });

  it('deve aceitar aria-label', () => {
    render(
      <RadioGroup aria-label="Selecione uma opção">
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(screen.getByLabelText('Selecione uma opção')).toBeInTheDocument();
  });
});
