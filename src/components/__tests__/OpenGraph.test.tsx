import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import OpenGraph from '@/components/OpenGraph';

const renderWithHelmet = (component: React.ReactNode) => 
  render(<HelmetProvider>{component}</HelmetProvider>);

describe('OpenGraph', () => {
  it('adds og:title', () => {
    renderWithHelmet(<OpenGraph title="Test Title" />);
    const meta = document.querySelector('meta[property="og:title"]');
    expect(meta?.getAttribute('content')).toBe('Test Title');
  });

  it('adds og:description', () => {
    renderWithHelmet(<OpenGraph description="Test desc" />);
    const meta = document.querySelector('meta[property="og:description"]');
    expect(meta?.getAttribute('content')).toBe('Test desc');
  });

  it('adds og:image', () => {
    renderWithHelmet(<OpenGraph image="https://example.com/img.jpg" />);
    const meta = document.querySelector('meta[property="og:image"]');
    expect(meta?.getAttribute('content')).toBe('https://example.com/img.jpg');
  });

  it('sets og:type', () => {
    renderWithHelmet(<OpenGraph type="article" />);
    const meta = document.querySelector('meta[property="og:type"]');
    expect(meta?.getAttribute('content')).toBe('article');
  });
});
