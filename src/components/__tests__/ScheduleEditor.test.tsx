import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleEditor } from '../ScheduleEditor';

const mockSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5], // Weekdays
  timeSlots: [
    { id: '1', startTime: '08:00', endTime: '18:00' },
  ],
};

describe('ScheduleEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schedule editor', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    expect(screen.getByText('Agendamento')).toBeInTheDocument();
  });

  it('shows day selection buttons', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Ter')).toBeInTheDocument();
    expect(screen.getByText('Qua')).toBeInTheDocument();
    expect(screen.getByText('Qui')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();
    expect(screen.getByText('Sáb')).toBeInTheDocument();
  });

  it('toggles day selection', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Dom'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      days: [0, 1, 2, 3, 4, 5], // Sunday added
    }));
  });

  it('selects all days', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Todos'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      days: [0, 1, 2, 3, 4, 5, 6],
    }));
  });

  it('selects weekdays only', () => {
    render(<ScheduleEditor schedule={{ ...mockSchedule, days: [] }} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Úteis'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      days: [1, 2, 3, 4, 5],
    }));
  });

  it('selects weekends only', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Fim de Semana'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      days: [0, 6],
    }));
  });

  it('adds time slot', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      timeSlots: expect.arrayContaining([
        expect.objectContaining({ startTime: '08:00' }),
      ]),
    }));
  });

  it('removes time slot', () => {
    const { container } = render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    const deleteButton = container.querySelector('.lucide-trash-2')?.closest('button');
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
        timeSlots: [],
      }));
    }
  });

  it('toggles enabled state', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
  });

  it('shows summary when enabled', () => {
    render(<ScheduleEditor schedule={mockSchedule} onChange={mockOnChange} />);
    
    expect(screen.getByText('Resumo:')).toBeInTheDocument();
  });

  it('dims content when disabled', () => {
    const { container } = render(
      <ScheduleEditor schedule={{ ...mockSchedule, enabled: false }} onChange={mockOnChange} />
    );
    
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });
});
