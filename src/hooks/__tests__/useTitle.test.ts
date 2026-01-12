import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTitle } from '../useTitle';

describe('useTitle', () => {
  const originalTitle = document.title;

  beforeEach(() => {
    document.title = 'Original Title';
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('should set document title', () => {
    renderHook(() => useTitle('New Title'));
    expect(document.title).toBe('New Title | VIS-O');
  });

  it('should restore title on unmount when restoreOnUnmount is true', () => {
    const { unmount } = renderHook(() => useTitle('Temp Title', true));
    expect(document.title).toBe('Temp Title | VIS-O');
    
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('should not restore title when restoreOnUnmount is false', () => {
    const { unmount } = renderHook(() => useTitle('Permanent Title', false));
    unmount();
    expect(document.title).toBe('Permanent Title | VIS-O');
  });
});
