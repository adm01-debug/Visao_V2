import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFormValidation } from '@/hooks/useFormValidation';

describe('useFormValidation', () => {
  const rules = {
    email: [(v: string) => !!v || 'Required', (v: string) => v.includes('@') || 'Invalid email'],
    name: [(v: string) => !!v || 'Required'],
  };

  it('validates field', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    act(() => { result.current.validateField('email', ''); });
    expect(result.current.errors.email).toBe('Required');
  });

  it('clears error on valid input', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    act(() => { result.current.validateField('email', ''); });
    act(() => { result.current.validateField('email', 'test@test.com'); });
    expect(result.current.errors.email).toBeUndefined();
  });

  it('validates all fields', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    act(() => { result.current.validateAll({ email: '', name: '' }); });
    expect(result.current.errors.email).toBe('Required');
    expect(result.current.errors.name).toBe('Required');
  });

  it('returns isValid status', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    act(() => { result.current.validateAll({ email: 'test@test.com', name: 'Test' }); });
    expect(result.current.isValid).toBe(true);
  });
});
