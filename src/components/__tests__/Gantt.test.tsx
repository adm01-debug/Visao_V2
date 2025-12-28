import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Gantt from '@/components/Gantt';

const mockTasks = [
  { id: '1', name: 'Task 1', start: new Date('2025-01-01'), end: new Date('2025-01-15'), progress: 50 },
  { id: '2', name: 'Task 2', start: new Date('2025-01-10'), end: new Date('2025-01-25'), progress: 20 },
];

describe('Gantt', () => {
  it('renders gantt container', () => {
    render(<Gantt tasks={mockTasks} />);
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
  });

  it('displays task names', () => {
    render(<Gantt tasks={mockTasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('shows task progress', () => {
    render(<Gantt tasks={mockTasks} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders timeline header', () => {
    render(<Gantt tasks={mockTasks} />);
    expect(screen.getByTestId('timeline-header')).toBeInTheDocument();
  });

  it('handles empty tasks', () => {
    render(<Gantt tasks={[]} />);
    expect(screen.getByText(/nenhuma tarefa/i)).toBeInTheDocument();
  });
});
