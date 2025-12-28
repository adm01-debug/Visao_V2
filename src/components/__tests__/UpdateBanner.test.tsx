import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UpdateBanner from '@/components/UpdateBanner';

describe('UpdateBanner', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDismiss = vi.fn();

  it('renders update banner', () => {
    render(<UpdateBanner show onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />);
    expect(screen.getByText(/atualização disponível/i)).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<UpdateBanner show={false} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />);
    expect(screen.queryByText(/atualização/i)).not.toBeInTheDocument();
  });

  it('calls onUpdate when update clicked', () => {
    render(<UpdateBanner show onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('calls onDismiss when dismissed', () => {
    render(<UpdateBanner show onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /depois/i }));
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});
