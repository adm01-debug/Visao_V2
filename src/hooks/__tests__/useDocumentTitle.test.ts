import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = document.title;
  afterEach(() => { document.title = originalTitle; });

  it('sets document title', () => {
    renderHook(() => useDocumentTitle('New Title'));
    expect(document.title).toBe('New Title');
  });

  it('restores title on unmount', () => {
    document.title = 'Original';
    const { unmount } = renderHook(() => useDocumentTitle('New Title', { restoreOnUnmount: true }));
    unmount();
    expect(document.title).toBe('Original');
  });

  it('updates title on change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: 'First' } });
    expect(document.title).toBe('First');
    rerender({ title: 'Second' });
    expect(document.title).toBe('Second');
  });
});
