import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Sunburst from '@/components/Sunburst';

const mockData = {
  name: 'root',
  children: [
    { name: 'A', value: 10 },
    { name: 'B', value: 20, children: [{ name: 'B1', value: 5 }] },
  ],
};

describe('Sunburst', () => {
  it('renders sunburst chart', () => {
    render(<Sunburst data={mockData} />);
    expect(screen.getByTestId('sunburst-chart')).toBeInTheDocument();
  });

  it('displays root label', () => {
    render(<Sunburst data={mockData} showLabels />);
    expect(screen.getByText('root')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<Sunburst data={{ name: 'empty', children: [] }} />);
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument();
  });
});
