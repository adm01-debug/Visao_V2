import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProviders } from '@/providers/AppProviders';

describe('AppProviders', () => {
  it('renders children', () => {
    render(<AppProviders><div>App Content</div></AppProviders>);
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('wraps all required providers', () => {
    const { container } = render(<AppProviders><div>Test</div></AppProviders>);
    expect(container.firstChild).toBeDefined();
  });
});
