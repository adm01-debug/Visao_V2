import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SecurityProvider, useSecurity } from '@/providers/SecurityProvider';

const TestComponent = () => {
  const { isAuthenticated } = useSecurity();
  return <div>{isAuthenticated ? 'Logged In' : 'Guest'}</div>;
};

describe('SecurityProvider', () => {
  it('renders children', () => {
    render(<SecurityProvider><div>Secure Content</div></SecurityProvider>);
    expect(screen.getByText('Secure Content')).toBeInTheDocument();
  });

  it('provides security context', () => {
    render(<SecurityProvider><TestComponent /></SecurityProvider>);
    expect(screen.getByText(/guest|logged in/i)).toBeInTheDocument();
  });
});
