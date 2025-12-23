import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TimeAgo from '../TimeAgo';

describe('TimeAgo', () => {
  it('renders without crashing', () => {
    const { container } = render(<TimeAgo />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<TimeAgo />);
    expect(container).toMatchSnapshot();
  });
});
