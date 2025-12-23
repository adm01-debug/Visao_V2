import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CardSkeleton from '../CardSkeleton';

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardSkeleton />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<CardSkeleton />);
    expect(container).toMatchSnapshot();
  });
});
