import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StructuredData from '@/components/StructuredData';

describe('StructuredData', () => {
  it('renders JSON-LD script', () => {
    render(<StructuredData type="Organization" data={{ name: 'Test' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
  });

  it('contains @type', () => {
    render(<StructuredData type="Organization" data={{ name: 'Test' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('"@type":"Organization"');
  });

  it('includes data properties', () => {
    render(<StructuredData type="Organization" data={{ name: 'Test Corp' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('Test Corp');
  });
});
