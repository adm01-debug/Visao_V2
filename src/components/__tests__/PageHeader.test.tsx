import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageHeader from '../PageHeader';

describe('PageHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageHeader />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<PageHeader />);
    expect(container).toMatchSnapshot();
  });
});
