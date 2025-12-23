import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SeverityBadge from '../SeverityBadge';

describe('SeverityBadge', () => {
  it('renders without crashing', () => {
    const { container } = render(<SeverityBadge />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<SeverityBadge />);
    expect(container).toMatchSnapshot();
  });
});
