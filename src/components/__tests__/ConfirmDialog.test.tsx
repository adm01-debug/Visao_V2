import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConfirmDialog />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<ConfirmDialog />);
    expect(container).toMatchSnapshot();
  });
});
