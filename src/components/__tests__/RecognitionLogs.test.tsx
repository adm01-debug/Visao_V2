import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecognitionLogs } from '../RecognitionLogs';

const mockLogs = [
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

describe('RecognitionLogs', () => {
  it('renders logs table', () => {
    render(<RecognitionLogs logs={mockLogs} />);
    
    expect(screen.getByText('Logs de Reconhecimento')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Pessoa')).toBeInTheDocument();
    expect(screen.getByText('Câmera')).toBeInTheDocument();
  });

  it('displays log entries', () => {
    render(<RecognitionLogs logs={mockLogs} />);
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Câmera Entrada')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('shows recognized badge for recognized faces', () => {
    render(<RecognitionLogs logs={mockLogs} />);
    
    expect(screen.getByText('Reconhecido')).toBeInTheDocument();
  });

  it('shows unknown badge for unrecognized faces', () => {
    render(<RecognitionLogs logs={mockLogs} />);
    
    expect(screen.getByText('Desconhecido')).toBeInTheDocument();
  });

  it('filters logs by search query', () => {
    render(<RecognitionLogs logs={mockLogs} />);
    
    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'João' } });
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('calls onLogClick when log row is clicked', () => {
    const onLogClick = vi.fn();
    render(<RecognitionLogs logs={mockLogs} onLogClick={onLogClick} />);
    
    fireEvent.click(screen.getByText('João Silva'));
    expect(onLogClick).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('shows export button when onExport is provided', () => {
    const onExport = vi.fn();
    render(<RecognitionLogs logs={mockLogs} onExport={onExport} />);
    
    const exportButton = screen.getByRole('button', { name: /exportar/i });
    expect(exportButton).toBeInTheDocument();
    
    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  it('shows empty state when no logs', () => {
    render(<RecognitionLogs logs={[]} />);
    
    expect(screen.getByText('Nenhum log encontrado')).toBeInTheDocument();
  });

  it('paginates logs correctly', () => {
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      personName: `Pessoa ${i}`,
      recognized: true,
      confidence: 0.9,
      cameraId: 'cam1',
      cameraName: 'Câmera 1',
      timestamp: new Date(),
    }));
    
    render(<RecognitionLogs logs={manyLogs} itemsPerPage={15} />);
    
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
