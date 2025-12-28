import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import Meta from '@/components/Meta';

const renderWithHelmet = (component: React.ReactNode) => 
  render(<HelmetProvider>{component}</HelmetProvider>);

describe('Meta', () => {
  it('adds meta tags', () => {
    renderWithHelmet(<Meta name="author" content="Test Author" />);
    const meta = document.querySelector('meta[name="author"]');
    expect(meta?.getAttribute('content')).toBe('Test Author');
  });

  it('adds property meta tags', () => {
    renderWithHelmet(<Meta property="og:title" content="OG Title" />);
    const meta = document.querySelector('meta[property="og:title"]');
    expect(meta?.getAttribute('content')).toBe('OG Title');
  });

  it('handles multiple meta tags', () => {
    renderWithHelmet(<><Meta name="author" content="Author" /><Meta name="keywords" content="test" /></>);
    expect(document.querySelector('meta[name="author"]')).toBeInTheDocument();
    expect(document.querySelector('meta[name="keywords"]')).toBeInTheDocument();
  });
});
