import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Hotkeys from '@/components/Hotkeys';

describe('Hotkeys', () => {
  it('triggers action on key combination', () => {
    const onSave = vi.fn();
    render(<Hotkeys keyMap={{ 'ctrl+s': onSave }}><div>Content</div></Hotkeys>);
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalled();
  });

  it('supports multiple hotkeys', () => {
    const onSave = vi.fn();
    const onOpen = vi.fn();
    render(<Hotkeys keyMap={{ 'ctrl+s': onSave, 'ctrl+o': onOpen }}><div>Content</div></Hotkeys>);
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'o', ctrlKey: true });
    expect(onSave).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });

  it('prevents default when specified', () => {
    const onSave = vi.fn();
    render(<Hotkeys keyMap={{ 'ctrl+s': onSave }} preventDefault><div>Content</div></Hotkeys>);
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const spy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    const onSave = vi.fn();
    render(<Hotkeys keyMap={{ 'ctrl+s': onSave }} disabled><div>Content</div></Hotkeys>);
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });
});
