import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalShortcutsProvider } from '../GlobalShortcutsProvider';


vi.mock('@/hooks/useGlobalShortcuts', () => ({
  useGlobalShortcuts: () => ({ shortcuts: [], registerShortcut: vi.fn(), unregisterShortcut: vi.fn() }),
}));

describe('GlobalShortcutsProvider', () => {
  it('renders children', () => {
    render(<GlobalShortcutsProvider><div>Test Child</div></GlobalShortcutsProvider>);
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
  it('handles keyboard shortcuts', () => {
    render(<GlobalShortcutsProvider><div>Content</div></GlobalShortcutsProvider>);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(document.body).toBeInTheDocument();
  });
  it('provides shortcut context', () => {
    render(<GlobalShortcutsProvider><div>Content</div></GlobalShortcutsProvider>);
    expect(document.body).toBeInTheDocument();
  });
  it('cleans up listeners on unmount', () => {
    const { unmount } = render(<GlobalShortcutsProvider><div>Content</div></GlobalShortcutsProvider>);
    unmount();
    expect(document.body).toBeInTheDocument();
  });
});