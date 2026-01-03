import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecognitionDashboard } from '../RecognitionDashboard';

const mockEvents = [
  {
    id: '1',
    personId: 'p1',
    personName: 'João Silva',
    recognized: true,
    confidence: 0.95,
    cameraId: 'cam1',
    cameraName: 'Câmera Entrada',
    timestamp: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    personId: undefined,
    personName: undefined,
    recognized: false,
    confidence: 0.65,
    cameraId: 'cam2',
    cameraName: 'Câmera Saída',
    timestamp: new Date('2024-01-15T09:00:00'),
  },
];

describe('RecognitionDashboard', () => {
  it('renders stats cards', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    expect(screen.getByText('Total Detecções')).toBeInTheDocument();
    expect(screen.getByText('Reconhecidos')).toBeInTheDocument();
    expect(screen.getByText('Desconhecidos')).toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
  });

  it('displays correct stats values', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total
    expect(screen.getByText('1')).toBeInTheDocument(); // Recognized or Unknown
  });

  it('shows events section', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    expect(screen.getByText('Eventos Recentes')).toBeInTheDocument();
  });

  it('displays recognized persons', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Pessoa Desconhecida')).toBeInTheDocument();
  });

  it('displays camera names', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    expect(screen.getByText('Câmera Entrada')).toBeInTheDocument();
    expect(screen.getByText('Câmera Saída')).toBeInTheDocument();
  });

  it('filters events by search query', () => {
    render(<RecognitionDashboard events={mockEvents} />);
    
    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'João' } });
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByText('Pessoa Desconhecida')).not.toBeInTheDocument();
  });

  it('calls onEventClick when event is clicked', () => {
    const onEventClick = vi.fn();
    render(<RecognitionDashboard events={mockEvents} onEventClick={onEventClick} />);
    
    fireEvent.click(screen.getByText('João Silva'));
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('shows empty state when no events', () => {
    render(<RecognitionDashboard events={[]} />);
    
    expect(screen.getByText('Nenhum evento encontrado')).toBeInTheDocument();
  });

  it('uses custom stats when provided', () => {
    const customStats = {
      totalDetections: 100,
      recognizedCount: 80,
      unknownCount: 20,
      alertCount: 5,
      averageConfidence: 92,
    };
    
    render(<RecognitionDashboard events={mockEvents} stats={customStats} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
