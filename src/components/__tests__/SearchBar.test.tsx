import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<SearchBar />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<SearchBar />);
    expect(container).toMatchSnapshot();
  });
});
