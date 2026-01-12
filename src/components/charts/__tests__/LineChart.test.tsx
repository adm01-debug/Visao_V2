import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LineChart } from '../LineChart';

describe('LineChart', () => {
  const data = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
  ];

  it('renders svg element', () => {
    const { container } = render(<LineChart data={data} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correct number of points', () => {
    const { container } = render(<LineChart data={data} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders with custom dimensions', () => {
    const { container } = render(<LineChart data={data} width={500} height={300} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('500');
    expect(svg?.getAttribute('height')).toBe('300');
  });

  it('returns null for empty data', () => {
    const { container } = render(<LineChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
