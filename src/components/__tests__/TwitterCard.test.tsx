import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import TwitterCard from '@/components/TwitterCard';

const renderWithHelmet = (component: React.ReactNode) => 
  render(<HelmetProvider>{component}</HelmetProvider>);

describe('TwitterCard', () => {
  it('adds twitter:card meta', () => {
    renderWithHelmet(<TwitterCard card="summary" />);
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary');
  });

  it('adds twitter:title', () => {
    renderWithHelmet(<TwitterCard title="Test Title" />);
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Test Title');
  });

  it('adds twitter:description', () => {
    renderWithHelmet(<TwitterCard description="Test desc" />);
    expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe('Test desc');
  });

  it('adds twitter:image', () => {
    renderWithHelmet(<TwitterCard image="https://example.com/img.jpg" />);
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/img.jpg');
  });
});
