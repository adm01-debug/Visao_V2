import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm } from '../useForm';

describe('useForm', () => {
  it('should initialize with initial values', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: '', email: '' } })
    );

    expect(result.current.values).toEqual({ name: '', email: '' });
  });

  it('should update values on change', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: '' } })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'name', value: 'John', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.values.name).toBe('John');
  });

  it('should validate on submit', async () => {
    const validate = vi.fn().mockReturnValue({ name: 'Required' });
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: '' },
        validate,
        onSubmit,
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(validate).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBe('Required');
  });

  it('should reset form', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: { name: '' } })
    );

    act(() => {
      result.current.setFieldValue('name', 'John');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values.name).toBe('');
  });
});
