import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../chart';

describe('Chart', () => {
  const config = {
    value: { label: 'Value', color: '#000' }
  };

  it('deve renderizar container', () => {
    render(<ChartContainer config={config}><div data-testid="chart">Chart</div></ChartContainer>);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('deve aceitar config', () => {
    render(<ChartContainer config={config}><div>Chart</div></ChartContainer>);
    expect(screen.getByText('Chart')).toBeInTheDocument();
  });

  it('deve aceitar className', () => {
    render(<ChartContainer config={config} className="custom"><div>Chart</div></ChartContainer>);
    expect(screen.getByText('Chart').closest('.custom')).toBeInTheDocument();
  });
});
