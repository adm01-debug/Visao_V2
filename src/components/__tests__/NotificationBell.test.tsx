import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NotificationBell from '../NotificationBell';

describe('NotificationBell', () => {
  it('renders without crashing', () => {
    const { container } = render(<NotificationBell />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<NotificationBell />);
    expect(container).toMatchSnapshot();
  });
});
