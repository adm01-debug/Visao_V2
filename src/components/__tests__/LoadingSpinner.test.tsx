import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container).toMatchSnapshot();
  });
});
