import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ColorPickerAdvanced from '@/components/ColorPickerAdvanced';

describe('ColorPickerAdvanced', () => {
  const mockOnChange = vi.fn();

  it('renders color input', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays current color', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('#ff0000')).toBeInTheDocument();
  });

  it('shows color preview', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} />);
    const preview = screen.getByTestId('color-preview');
    expect(preview).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('calls onChange when color changes', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '#00ff00' } });
    expect(mockOnChange).toHaveBeenCalledWith('#00ff00');
  });

  it('shows preset colors when enabled', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} showPresets />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('validates hex format', () => {
    render(<ColorPickerAdvanced value="#ff0000" onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'invalid' } });
    expect(screen.getByText(/formato inválido/i)).toBeInTheDocument();
  });
});
