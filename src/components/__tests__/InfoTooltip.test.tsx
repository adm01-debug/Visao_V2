import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import InfoTooltip from '../InfoTooltip';

describe('InfoTooltip', () => {
  it('renders without crashing', () => {
    const { container } = render(<InfoTooltip />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<InfoTooltip />);
    expect(container).toMatchSnapshot();
  });
});
