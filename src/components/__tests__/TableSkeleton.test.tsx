import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TableSkeleton from '../TableSkeleton';

describe('TableSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TableSkeleton />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<TableSkeleton />);
    expect(container).toMatchSnapshot();
  });
});
