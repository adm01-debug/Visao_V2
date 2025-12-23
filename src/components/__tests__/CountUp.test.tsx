import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CountUp from '../CountUp';

describe('CountUp', () => {
  it('renders without crashing', () => {
    const { container } = render(<CountUp />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<CountUp />);
    expect(container).toMatchSnapshot();
  });
});
