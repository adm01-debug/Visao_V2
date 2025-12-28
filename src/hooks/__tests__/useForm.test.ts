import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from '@/hooks/useForm';

describe('useForm', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: 'test' } }));
    expect(result.current.values.name).toBe('test');
  });

  it('handles field change', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: '' } }));
    act(() => { result.current.handleChange({ target: { name: 'name', value: 'new' } } as any); });
    expect(result.current.values.name).toBe('new');
  });

  it('validates on submit', async () => {
    const onSubmit = vi.fn();
    const validate = vi.fn().mockReturnValue({});
    const { result } = renderHook(() => useForm({ initialValues: { name: '' }, onSubmit, validate }));
    await act(async () => { await result.current.handleSubmit({ preventDefault: vi.fn() } as any); });
    expect(validate).toHaveBeenCalled();
  });

  it('tracks dirty state', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: 'test' } }));
    expect(result.current.isDirty).toBe(false);
    act(() => { result.current.handleChange({ target: { name: 'name', value: 'changed' } } as any); });
    expect(result.current.isDirty).toBe(true);
  });

  it('resets form', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: 'test' } }));
    act(() => { result.current.handleChange({ target: { name: 'name', value: 'changed' } } as any); });
    act(() => { result.current.reset(); });
    expect(result.current.values.name).toBe('test');
  });
});
