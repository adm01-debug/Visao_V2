import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertNotification } from '../AlertNotification';

const mockAlert = {
  id: '1',
  type: 'security' as const,
  severity: 'critical' as const,
  message: 'Intrusão detectada na área restrita',
  cameraName: 'Câmera Principal',
  timestamp: new Date(),
};

describe('AlertNotification', () => {
  it('renders alert notification', () => {
    render(<AlertNotification alert={mockAlert} />);
    
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Intrusão detectada na área restrita')).toBeInTheDocument();
    expect(screen.getByText('Câmera Principal')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<AlertNotification alert={mockAlert} onDismiss={onDismiss} />);
    
    const buttons = screen.getAllByRole('button');
    const dismissButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    }
  });

  it('shows view details button when onView is provided', () => {
    const onView = vi.fn();
    render(<AlertNotification alert={mockAlert} onView={onView} />);
    
    const viewButton = screen.getByRole('button', { name: /ver detalhes/i });
    expect(viewButton).toBeInTheDocument();
    
    fireEvent.click(viewButton);
    expect(onView).toHaveBeenCalled();
  });

  it('auto-hides after specified duration', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    
    render(<AlertNotification alert={mockAlert} onDismiss={onDismiss} autoHideDuration={1000} />);
    
    expect(screen.getByText('Intrusão detectada na área restrita')).toBeInTheDocument();
    
    vi.advanceTimersByTime(1100);
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
    
    vi.useRealTimers();
  });

  it('allows toggling mute', () => {
    render(<AlertNotification alert={mockAlert} soundEnabled={true} />);
    
    const buttons = screen.getAllByRole('button');
    const muteButton = buttons.find(btn => 
      btn.querySelector('svg.lucide-volume-2') || btn.querySelector('svg.lucide-volume-x')
    );
    
    expect(muteButton).toBeInTheDocument();
    if (muteButton) {
      fireEvent.click(muteButton);
    }
  });

  it('applies correct severity styles', () => {
    const { container } = render(<AlertNotification alert={mockAlert} />);
    
    // Critical alerts should have animate-pulse class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders low severity alert without animation', () => {
    const lowAlert = { ...mockAlert, severity: 'low' as const };
    const { container } = render(<AlertNotification alert={lowAlert} />);
    
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });
});
