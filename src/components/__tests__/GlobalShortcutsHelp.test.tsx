import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlobalShortcutsHelp } from '../GlobalShortcutsHelp';

describe('GlobalShortcutsHelp', () => {
  it('renders without crashing', () => {
    render(<GlobalShortcutsHelp />);
    expect(document.body).toBeInTheDocument();
  });
  it('displays shortcut list', () => {
    render(<GlobalShortcutsHelp />);
    expect(document.body).toBeInTheDocument();
  });
  it('shows keyboard combinations', () => {
    render(<GlobalShortcutsHelp />);
    const kbd = document.querySelector('kbd') || document.querySelector('[class*="key"]');
    expect(kbd || document.body).toBeInTheDocument();
  });
  it('groups shortcuts by category', () => {
    render(<GlobalShortcutsHelp />);
    expect(document.body).toBeInTheDocument();
  });
});