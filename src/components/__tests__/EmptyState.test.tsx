import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders without crashing', () => {
    const { container } = render(<EmptyState />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<EmptyState />);
    expect(container).toMatchSnapshot();
  });
});
