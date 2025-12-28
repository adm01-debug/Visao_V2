import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dock from '@/components/Dock';

const mockItems = [
  { id: '1', icon: '📁', label: 'Files', onClick: vi.fn() },
  { id: '2', icon: '⚙️', label: 'Settings', onClick: vi.fn() },
];

describe('Dock', () => {
  it('renders dock container', () => {
    render(<Dock items={mockItems} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('displays dock items', () => {
    render(<Dock items={mockItems} />);
    expect(screen.getByText('📁')).toBeInTheDocument();
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('calls onClick when item clicked', () => {
    render(<Dock items={mockItems} />);
    fireEvent.click(screen.getByText('📁'));
    expect(mockItems[0].onClick).toHaveBeenCalled();
  });

  it('shows tooltip on hover', async () => {
    render(<Dock items={mockItems} showTooltips />);
    fireEvent.mouseEnter(screen.getByText('📁'));
    expect(await screen.findByText('Files')).toBeInTheDocument();
  });

  it('applies position class', () => {
    render(<Dock items={mockItems} position="bottom" />);
    expect(screen.getByRole('toolbar')).toHaveClass('dock-bottom');
  });

  it('supports magnification effect', () => {
    render(<Dock items={mockItems} magnification />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-magnification', 'true');
  });
});
