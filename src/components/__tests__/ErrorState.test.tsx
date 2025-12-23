import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('renders without crashing', () => {
    const { container } = render(<ErrorState />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<ErrorState />);
    expect(container).toMatchSnapshot();
  });
});
