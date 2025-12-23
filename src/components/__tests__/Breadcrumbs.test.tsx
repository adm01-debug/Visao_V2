import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders without crashing', () => {
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeTruthy();
  });
  it('matches snapshot', () => {
    const { container } = render(<Breadcrumbs />);
    expect(container).toMatchSnapshot();
  });
});
