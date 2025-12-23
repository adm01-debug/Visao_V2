import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatusBadge />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<StatusBadge />);
    expect(container).toMatchSnapshot();
  });
});
