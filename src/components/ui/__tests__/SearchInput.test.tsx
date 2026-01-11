import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders input field', () => {
    render(<SearchInput onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<SearchInput onSearch={vi.fn()} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearch when typing', async () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);
    
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });

  it('debounces search calls', async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'te' } });
    fireEvent.change(input, { target: { value: 'tes' } });
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(onSearch).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(300);
    
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('test');
    
    vi.useRealTimers();
  });

  it('shows clear button when has value', () => {
    render(<SearchInput onSearch={vi.fn()} value="test" showClear />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} value="test" showClear />);
    
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('shows search icon', () => {
    render(<SearchInput onSearch={vi.fn()} showIcon />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('supports loading state', () => {
    render(<SearchInput onSearch={vi.fn()} isLoading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<SearchInput onSearch={vi.fn()} disabled />);
    expect(screen.getByRole('searchbox')).toBeDisabled();
  });

  it('calls onFocus when focused', () => {
    const onFocus = vi.fn();
    render(<SearchInput onSearch={vi.fn()} onFocus={onFocus} />);
    
    fireEvent.focus(screen.getByRole('searchbox'));
    
    expect(onFocus).toHaveBeenCalled();
  });

  it('calls onBlur when blurred', () => {
    const onBlur = vi.fn();
    render(<SearchInput onSearch={vi.fn()} onBlur={onBlur} />);
    
    fireEvent.blur(screen.getByRole('searchbox'));
    
    expect(onBlur).toHaveBeenCalled();
  });
});
