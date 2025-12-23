import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FilterDropdown from '../FilterDropdown';

describe('FilterDropdown', () => {
  it('renders without crashing', () => {
    const { container } = render(<FilterDropdown />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<FilterDropdown />);
    expect(container).toMatchSnapshot();
  });
});
