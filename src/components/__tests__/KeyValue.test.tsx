import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import KeyValue from '../KeyValue';

describe('KeyValue', () => {
  it('renders without crashing', () => {
    const { container } = render(<KeyValue />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<KeyValue />);
    expect(container).toMatchSnapshot();
  });
});
