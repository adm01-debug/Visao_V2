import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Sankey from '@/components/Sankey';

const mockData = {
  nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
  links: [{ source: 0, target: 1, value: 10 }, { source: 1, target: 2, value: 5 }],
};

describe('Sankey', () => {
  it('renders sankey diagram', () => {
    render(<Sankey data={mockData} />);
    expect(screen.getByTestId('sankey-diagram')).toBeInTheDocument();
  });

  it('displays node labels', () => {
    render(<Sankey data={mockData} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<Sankey data={{ nodes: [], links: [] }} />);
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument();
  });
});
