import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Combobox } from '../combobox';

describe('Combobox', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ];

  it('deve renderizar corretamente', () => {
    render(<Combobox options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('deve exibir placeholder', () => {
    render(<Combobox options={options} placeholder="Select..." />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    render(<Combobox options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText('Option 1')).toBeInTheDocument();
  });
});
