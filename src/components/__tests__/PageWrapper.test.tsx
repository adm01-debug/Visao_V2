import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageWrapper from '../PageWrapper';

describe('PageWrapper', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageWrapper />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<PageWrapper />);
    expect(container).toMatchSnapshot();
  });
});
