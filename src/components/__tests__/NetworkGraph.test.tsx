import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NetworkGraph from '@/components/NetworkGraph';

const mockData = {
  nodes: [{ id: '1', label: 'Node 1' }, { id: '2', label: 'Node 2' }],
  edges: [{ source: '1', target: '2' }],
};

describe('NetworkGraph', () => {
  it('renders graph container', () => {
    render(<NetworkGraph data={mockData} />);
    expect(screen.getByTestId('network-graph')).toBeInTheDocument();
  });

  it('displays nodes', () => {
    render(<NetworkGraph data={mockData} />);
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<NetworkGraph data={{ nodes: [], edges: [] }} />);
    expect(screen.getByText(/sem dados/i)).toBeInTheDocument();
  });

  it('shows zoom controls', () => {
    render(<NetworkGraph data={mockData} showControls />);
    expect(screen.getByRole('button', { name: /zoom/i })).toBeInTheDocument();
  });
});
