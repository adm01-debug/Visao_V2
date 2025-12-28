import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Changelog from '@/components/Changelog';

const mockChangelog = [
  { version: '1.0.0', date: '2025-01-01', changes: ['Feature A', 'Fix B'] },
  { version: '0.9.0', date: '2024-12-01', changes: ['Initial release'] },
];

describe('Changelog', () => {
  it('renders changelog entries', () => {
    render(<Changelog entries={mockChangelog} />);
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('0.9.0')).toBeInTheDocument();
  });

  it('displays changes for each version', () => {
    render(<Changelog entries={mockChangelog} />);
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Fix B')).toBeInTheDocument();
  });

  it('shows dates', () => {
    render(<Changelog entries={mockChangelog} />);
    expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
  });

  it('renders empty state when no entries', () => {
    render(<Changelog entries={[]} />);
    expect(screen.getByText(/nenhuma atualização/i)).toBeInTheDocument();
  });
});
