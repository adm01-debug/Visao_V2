import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TreeView from '@/components/TreeView';

const mockData = [
  { id: '1', label: 'Root', children: [
    { id: '2', label: 'Child 1' },
    { id: '3', label: 'Child 2', children: [{ id: '4', label: 'Grandchild' }] },
  ]},
];

describe('TreeView', () => {
  it('renders tree container', () => {
    render(<TreeView data={mockData} />);
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('displays root nodes', () => {
    render(<TreeView data={mockData} />);
    expect(screen.getByText('Root')).toBeInTheDocument();
  });

  it('expands node on click', () => {
    render(<TreeView data={mockData} />);
    fireEvent.click(screen.getByText('Root'));
    expect(screen.getByText('Child 1')).toBeInTheDocument();
  });

  it('calls onSelect when node selected', () => {
    const onSelect = vi.fn();
    render(<TreeView data={mockData} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Root'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('shows expand icons for parent nodes', () => {
    render(<TreeView data={mockData} />);
    expect(screen.getByTestId('expand-icon')).toBeInTheDocument();
  });
});
