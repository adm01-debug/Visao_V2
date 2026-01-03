import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiCameraView } from '../MultiCameraView';

const mockCameras = [
  {
    id: '1',
    name: 'Câmera Entrada',
    streamUrl: 'rtsp://cam1.local',
    status: 'online' as const,
    detectedPeople: 3,
  },
  {
    id: '2',
    name: 'Câmera Saída',
    status: 'offline' as const,
    detectedPeople: 0,
  },
  {
    id: '3',
    name: 'Câmera Estacionamento',
    status: 'warning' as const,
    detectedPeople: 5,
  },
  {
    id: '4',
    name: 'Câmera Depósito',
    status: 'alert' as const,
    detectedPeople: 1,
  },
];

describe('MultiCameraView', () => {
  it('renders camera grid', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    
    expect(screen.getByText('Monitoramento ao Vivo')).toBeInTheDocument();
    expect(screen.getByText('4 câmeras')).toBeInTheDocument();
  });

  it('displays camera names', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    
    expect(screen.getByText('Câmera Entrada')).toBeInTheDocument();
    expect(screen.getByText('Câmera Saída')).toBeInTheDocument();
  });

  it('shows detected people count', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    
    expect(screen.getByText('3 pessoas')).toBeInTheDocument();
    expect(screen.getByText('5 pessoas')).toBeInTheDocument();
  });

  it('shows layout controls', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    
    expect(screen.getByText('1x1')).toBeInTheDocument();
    expect(screen.getByText('2x2')).toBeInTheDocument();
    expect(screen.getByText('3x3')).toBeInTheDocument();
    expect(screen.getByText('4x4')).toBeInTheDocument();
  });

  it('changes layout when buttons clicked', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    
    fireEvent.click(screen.getByText('3x3'));
    // Layout should change - button should be active
    expect(screen.getByText('3x3').closest('button')).toHaveClass('bg-primary');
  });

  it('calls onCameraClick when camera is clicked', () => {
    const onCameraClick = vi.fn();
    render(<MultiCameraView cameras={mockCameras} onCameraClick={onCameraClick} />);
    
    fireEvent.click(screen.getByText('Câmera Entrada'));
    expect(onCameraClick).toHaveBeenCalledWith(mockCameras[0]);
  });

  it('shows LIVE badge for online cameras', () => {
    render(<MultiCameraView cameras={mockCameras} />);
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
  });

  it('shows empty state when no cameras', () => {
    render(<MultiCameraView cameras={[]} />);
    expect(screen.getByText('Nenhuma câmera configurada')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MultiCameraView cameras={mockCameras} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
