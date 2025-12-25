import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualList } from '../VirtualList';

describe('VirtualList', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
  const renderItem = (item: { id: number; name: string }) => <div key={item.id}>{item.name}</div>;

  it('renders visible items only', () => {
    render(<VirtualList items={items} renderItem={renderItem} itemHeight={50} height={200} />);
    const renderedItems = screen.getAllByText(/Item \d+/);
    expect(renderedItems.length).toBeLessThan(items.length);
  });

  it('applies container height', () => {
    const { container } = render(<VirtualList items={items} renderItem={renderItem} itemHeight={50} height={300} />);
    expect(container.firstChild).toHaveStyle({ height: '300px' });
  });

  it('handles empty list', () => {
    render(<VirtualList items={[]} renderItem={renderItem} itemHeight={50} height={200} />);
    expect(screen.queryByText(/Item/)).not.toBeInTheDocument();
  });

  it('updates on scroll', () => {
    const { container } = render(<VirtualList items={items} renderItem={renderItem} itemHeight={50} height={200} />);
    container.firstChild!.scrollTop = 500;
    container.firstChild!.dispatchEvent(new Event('scroll'));
    expect(screen.getByText('Item 10')).toBeInTheDocument();
  });
});
