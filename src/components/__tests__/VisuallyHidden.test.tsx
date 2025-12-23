import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import VisuallyHidden from '../VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders without crashing', () => {
    const { container } = render(<VisuallyHidden />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<VisuallyHidden />);
    expect(container).toMatchSnapshot();
  });
});
