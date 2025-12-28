import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Suspense } from 'react';
import CodeSplitBoundary from '@/components/CodeSplitBoundary';

describe('CodeSplitBoundary', () => {
  it('renders children when loaded', async () => {
    render(
      <CodeSplitBoundary fallback={<div>Loading...</div>}>
        <div>Content</div>
      </CodeSplitBoundary>
    );
    await waitFor(() => expect(screen.getByText('Content')).toBeInTheDocument());
  });

  it('shows fallback while loading', () => {
    const LazyComponent = vi.fn(() => new Promise(() => {}));
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <CodeSplitBoundary fallback={<div>Loading...</div>}>
          <div>Content</div>
        </CodeSplitBoundary>
      </Suspense>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error boundary', () => {
    const ThrowError = () => { throw new Error('Test error'); };
    render(
      <CodeSplitBoundary fallback={<div>Error</div>} onError={vi.fn()}>
        <ThrowError />
      </CodeSplitBoundary>
    );
    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });
});
