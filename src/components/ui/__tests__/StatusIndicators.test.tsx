import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicators, StatusDot, StatusBadge } from '../StatusIndicators';

describe('StatusIndicators', () => {
  describe('StatusDot', () => {
    it('renders with online status', () => {
      render(<StatusDot status="online" />);
      expect(screen.getByTestId('status-dot')).toHaveClass('online');
    });

    it('renders with offline status', () => {
      render(<StatusDot status="offline" />);
      expect(screen.getByTestId('status-dot')).toHaveClass('offline');
    });

    it('renders with busy status', () => {
      render(<StatusDot status="busy" />);
      expect(screen.getByTestId('status-dot')).toHaveClass('busy');
    });

    it('supports pulsing animation', () => {
      render(<StatusDot status="online" pulse />);
      expect(screen.getByTestId('status-dot')).toHaveClass('pulse');
    });
  });

  describe('StatusBadge', () => {
    it('renders with label', () => {
      render(<StatusBadge status="active" label="Active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies correct variant', () => {
      render(<StatusBadge status="warning" label="Warning" />);
      expect(screen.getByText('Warning').closest('.badge')).toHaveClass('warning');
    });
  });
});
