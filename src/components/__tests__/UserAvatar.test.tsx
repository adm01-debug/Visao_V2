import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import UserAvatar from '../UserAvatar';

describe('UserAvatar', () => {
  it('renders without crashing', () => {
    const { container } = render(<UserAvatar />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<UserAvatar />);
    expect(container).toMatchSnapshot();
  });
});
