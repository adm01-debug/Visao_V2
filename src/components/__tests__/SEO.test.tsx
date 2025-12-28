import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import SEO from '@/components/SEO';

const renderWithHelmet = (component: React.ReactNode) => 
  render(<HelmetProvider>{component}</HelmetProvider>);

describe('SEO', () => {
  it('sets page title', () => {
    renderWithHelmet(<SEO title="Test Page" />);
    expect(document.title).toBe('Test Page');
  });

  it('adds meta description', () => {
    renderWithHelmet(<SEO description="Page description" />);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Page description');
  });

  it('adds canonical URL', () => {
    renderWithHelmet(<SEO canonical="https://example.com" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com');
  });

  it('sets robots meta', () => {
    renderWithHelmet(<SEO robots="noindex,nofollow" />);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
  });
});
