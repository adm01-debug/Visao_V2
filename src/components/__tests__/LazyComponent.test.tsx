import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Suspense } from 'react';
import LazyComponent from '@/components/LazyComponent';

describe('LazyComponent', () => {
  it('shows loading state initially', () => {
    render(<LazyComponent component={() => <div>Loaded</div>} fallback={<div>Loading...</div>} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders component after load', async () => {
    render(<LazyComponent component={() => <div>Loaded</div>} fallback={<div>Loading...</div>} />);
    await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());
  });

  it('handles load error', async () => {
    const ErrorComponent = () => { throw new Error('Failed'); };
    render(<LazyComponent component={ErrorComponent} fallback={<div>Loading...</div>} errorFallback={<div>Error</div>} />);
    await waitFor(() => expect(screen.getByText('Error')).toBeInTheDocument());
  });
});
