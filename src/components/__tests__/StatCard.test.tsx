import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StatCard from '../StatCard';

describe('StatCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatCard />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<StatCard />);
    expect(container).toMatchSnapshot();
  });
});
