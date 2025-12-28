import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProviders } from '@/providers/AppProviders';

describe('AppProviders', () => {
  it('renders children', () => {
    render(<AppProviders><div>App Content</div></AppProviders>);
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('wraps with all required providers', () => {
    const { container } = render(<AppProviders><div>Content</div></AppProviders>);
    expect(container.firstChild).toBeDefined();
  });

  it('handles nested components', () => {
    render(
      <AppProviders>
        <div><span>Nested</span></div>
      </AppProviders>
    );
    expect(screen.getByText('Nested')).toBeInTheDocument();
  });
});
