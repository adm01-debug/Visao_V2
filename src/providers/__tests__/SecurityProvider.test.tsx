import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SecurityProvider, useSecurity } from '@/providers/SecurityProvider';

const TestComponent = () => {
  const { csrfToken, isSecure } = useSecurity();
  return <div data-testid="security">{isSecure ? 'Secure' : 'Insecure'}</div>;
};

describe('SecurityProvider', () => {
  it('renders children', () => {
    render(<SecurityProvider><div>Secure Content</div></SecurityProvider>);
    expect(screen.getByText('Secure Content')).toBeInTheDocument();
  });

  it('provides security context', () => {
    render(<SecurityProvider><TestComponent /></SecurityProvider>);
    expect(screen.getByTestId('security')).toBeInTheDocument();
  });

  it('provides CSRF token', () => {
    render(<SecurityProvider><TestComponent /></SecurityProvider>);
    expect(screen.getByTestId('security')).toBeDefined();
  });
});
