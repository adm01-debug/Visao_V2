import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import DateRangePicker from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('renders without crashing', () => {
    const { container } = render(<DateRangePicker />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<DateRangePicker />);
    expect(container).toMatchSnapshot();
  });
});
