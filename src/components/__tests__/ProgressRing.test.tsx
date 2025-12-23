import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProgressRing from '../ProgressRing';

describe('ProgressRing', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressRing />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<ProgressRing />);
    expect(container).toMatchSnapshot();
  });
});
