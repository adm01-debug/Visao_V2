import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import JsonLd from '@/components/JsonLd';

describe('JsonLd', () => {
  it('renders script tag with JSON-LD', () => {
    const data = { '@type': 'Organization', name: 'Test' };
    render(<JsonLd data={data} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
  });

  it('contains correct JSON data', () => {
    const data = { '@type': 'Organization', name: 'Test Corp' };
    render(<JsonLd data={data} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('Test Corp');
  });

  it('handles array of data', () => {
    const data = [{ '@type': 'Organization' }, { '@type': 'WebSite' }];
    render(<JsonLd data={data} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('Organization');
    expect(script?.textContent).toContain('WebSite');
  });
});
