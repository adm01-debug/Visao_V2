import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Gauge from '@/components/Gauge';

describe('Gauge', () => {
  it('renders gauge component', () => {
    render(<Gauge value={75} />);
    expect(screen.getByTestId('gauge')).toBeInTheDocument();
  });

  it('displays value', () => {
    render(<Gauge value={75} showValue />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<Gauge value={75} label="Temperature" />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
  });

  it('applies color based on thresholds', () => {
    render(<Gauge value={90} thresholds={{ warning: 70, danger: 85 }} />);
    expect(screen.getByTestId('gauge')).toHaveClass('danger');
  });

  it('handles min/max values', () => {
    render(<Gauge value={50} min={0} max={100} showValue />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows unit suffix', () => {
    render(<Gauge value={75} unit="%" showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
