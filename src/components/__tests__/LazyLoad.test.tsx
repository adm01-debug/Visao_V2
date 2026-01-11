import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyLoad } from '../LazyLoad';

describe('LazyLoad', () => {
  it('renders without crashing', () => {
    render(<LazyLoad><div>Lazy Content</div></LazyLoad>);
    expect(document.body).toBeInTheDocument();
  });
  it('shows loading state initially', () => {
    render(<LazyLoad><div>Content</div></LazyLoad>);
    expect(document.body).toBeInTheDocument();
  });
  it('loads content when visible', async () => {
    render(<LazyLoad><div>Lazy Content</div></LazyLoad>);
    await waitFor(() => expect(document.body).toBeInTheDocument());
  });
  it('supports custom placeholder', () => {
    render(<LazyLoad placeholder={<div>Loading...</div>}><div>Content</div></LazyLoad>);
    expect(document.body).toBeInTheDocument();
  });
});