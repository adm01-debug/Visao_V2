import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CopyButton from '../CopyButton';

describe('CopyButton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CopyButton />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<CopyButton />);
    expect(container).toMatchSnapshot();
  });
});
