import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Breadcrumb } from '../Breadcrumb';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Breadcrumb', () => {
  it('renders home icon', () => {
    renderWithRouter(<Breadcrumb items={[]} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders items', () => {
    renderWithRouter(
      <Breadcrumb
        items={[
          { label: 'Page 1', href: '/page1' },
          { label: 'Page 2' },
        ]}
      />
    );

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('renders links for items with href', () => {
    renderWithRouter(
      <Breadcrumb items={[{ label: 'Page 1', href: '/page1' }]} />
    );

    const link = screen.getByText('Page 1');
    expect(link.tagName).toBe('A');
  });

  it('renders span for items without href', () => {
    renderWithRouter(<Breadcrumb items={[{ label: 'Current' }]} />);

    const span = screen.getByText('Current');
    expect(span.tagName).toBe('SPAN');
  });
});
