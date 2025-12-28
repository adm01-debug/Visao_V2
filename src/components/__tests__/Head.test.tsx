import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import Head from '@/components/Head';

const renderWithHelmet = (component: React.ReactNode) => 
  render(<HelmetProvider>{component}</HelmetProvider>);

describe('Head', () => {
  it('sets document title', () => {
    renderWithHelmet(<Head title="Test Page" />);
    expect(document.title).toBe('Test Page');
  });

  it('adds meta description', () => {
    renderWithHelmet(<Head description="Test description" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Test description');
  });

  it('sets canonical URL', () => {
    renderWithHelmet(<Head canonical="https://example.com/page" />);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe('https://example.com/page');
  });

  it('adds Open Graph tags', () => {
    renderWithHelmet(<Head title="OG Title" ogImage="https://example.com/image.jpg" />);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe('OG Title');
  });
});
