import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { KeyboardShortcuts } from '../KeyboardShortcuts';

describe('KeyboardShortcuts', () => {
  it('triggers callback on key press', () => {
    const onShortcut = vi.fn();
    render(<KeyboardShortcuts shortcuts={{ 'ctrl+s': onShortcut }} />);
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(onShortcut).toHaveBeenCalled();
  });

  it('handles multiple shortcuts', () => {
    const onSave = vi.fn();
    const onOpen = vi.fn();
    render(<KeyboardShortcuts shortcuts={{ 'ctrl+s': onSave, 'ctrl+o': onOpen }} />);
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'o', ctrlKey: true });
    expect(onSave).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });

  it('ignores unregistered shortcuts', () => {
    const onShortcut = vi.fn();
    render(<KeyboardShortcuts shortcuts={{ 'ctrl+s': onShortcut }} />);
    fireEvent.keyDown(document, { key: 'x', ctrlKey: true });
    expect(onShortcut).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const onShortcut = vi.fn();
    const { unmount } = render(<KeyboardShortcuts shortcuts={{ 'ctrl+s': onShortcut }} />);
    unmount();
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(onShortcut).not.toHaveBeenCalled();
  });
});
