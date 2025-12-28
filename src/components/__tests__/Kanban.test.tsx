import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Kanban from '@/components/Kanban';

const mockColumns = [
  { id: 'todo', title: 'To Do', cards: [{ id: '1', title: 'Task 1' }] },
  { id: 'doing', title: 'Doing', cards: [{ id: '2', title: 'Task 2' }] },
  { id: 'done', title: 'Done', cards: [] },
];

describe('Kanban', () => {
  it('renders kanban board', () => {
    render(<Kanban columns={mockColumns} onCardMove={vi.fn()} />);
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('displays all columns', () => {
    render(<Kanban columns={mockColumns} onCardMove={vi.fn()} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Doing')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('displays cards in columns', () => {
    render(<Kanban columns={mockColumns} onCardMove={vi.fn()} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('shows add card button', () => {
    render(<Kanban columns={mockColumns} onCardMove={vi.fn()} onAddCard={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /adicionar/i })).toHaveLength(3);
  });

  it('shows column card count', () => {
    render(<Kanban columns={mockColumns} onCardMove={vi.fn()} showCount />);
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });
});
