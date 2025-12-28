import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InstallBanner from '@/components/InstallBanner';

describe('InstallBanner', () => {
  const mockOnInstall = vi.fn();
  const mockOnDismiss = vi.fn();

  it('renders install banner', () => {
    render(<InstallBanner show onInstall={mockOnInstall} onDismiss={mockOnDismiss} />);
    expect(screen.getByText(/instalar/i)).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<InstallBanner show={false} onInstall={mockOnInstall} onDismiss={mockOnDismiss} />);
    expect(screen.queryByText(/instalar/i)).not.toBeInTheDocument();
  });

  it('calls onInstall when install clicked', () => {
    render(<InstallBanner show onInstall={mockOnInstall} onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /instalar/i }));
    expect(mockOnInstall).toHaveBeenCalled();
  });

  it('calls onDismiss when dismissed', () => {
    render(<InstallBanner show onInstall={mockOnInstall} onDismiss={mockOnDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /depois/i }));
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});
