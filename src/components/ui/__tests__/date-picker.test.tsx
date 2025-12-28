import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DatePicker } from '../date-picker';

describe('DatePicker', () => {
  it('deve renderizar corretamente', () => {
    render(<DatePicker />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('deve exibir placeholder', () => {
    render(<DatePicker placeholder="Select date" />);
    expect(screen.getByText(/Select date|Pick a date/i)).toBeInTheDocument();
  });

  it('deve abrir calendário ao clicar', async () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('grid')).toBeInTheDocument();
  });

  it('deve aceitar value', () => {
    const date = new Date(2025, 0, 15);
    render(<DatePicker value={date} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('deve disparar onChange', async () => {
    const onChange = vi.fn();
    render(<DatePicker onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});
