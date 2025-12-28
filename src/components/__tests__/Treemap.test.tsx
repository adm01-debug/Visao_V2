import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Treemap from '@/components/Treemap';

const mockData = {
  name: 'root',
  children: [
    { name: 'A', value: 100 },
    { name: 'B', value: 200 },
    { name: 'C', value: 50 },
  ],
};

describe('Treemap', () => {
  it('renders treemap container', () => {
    render(<Treemap data={mockData} />);
    expect(screen.getByTestId('treemap')).toBeInTheDocument();
  });

  it('displays node labels', () => {
    render(<Treemap data={mockData} showLabels />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<Treemap data={{ name: 'empty', children: [] }} />);
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument();
  });

  it('shows values when enabled', () => {
    render(<Treemap data={mockData} showValues />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
