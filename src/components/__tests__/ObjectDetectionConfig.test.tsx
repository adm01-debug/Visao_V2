import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectDetectionConfig } from '../ObjectDetectionConfig';

const mockConfig = {
  enabled: true,
  confidenceThreshold: 75,
  detectableObjects: ['person', 'vehicle'] as const,
  alertOnDetection: true,
  minObjectSize: 50,
  maxObjectsPerFrame: 20,
  processingInterval: 500,
};

describe('ObjectDetectionConfig', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders object detection config', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Detecção de Objetos')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText(/Configure os parâmetros de detecção/)).toBeInTheDocument();
  });

  it('toggles enabled state', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
  });

  it('shows confidence threshold', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows detectable objects', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    
    expect(screen.getByText('Pessoas')).toBeInTheDocument();
    expect(screen.getByText('Veículos')).toBeInTheDocument();
    expect(screen.getByText('Animais')).toBeInTheDocument();
  });

  it('toggles object selection', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Animais'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      detectableObjects: expect.arrayContaining(['animal']),
    }));
  });

  it('shows alert on detection toggle', () => {
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Alertar ao Detectar')).toBeInTheDocument();
  });

  it('dims content when disabled', () => {
    const { container } = render(
      <ObjectDetectionConfig config={{ ...mockConfig, enabled: false }} onChange={mockOnChange} />
    );
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });

  it('shows save button when onSave provided', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ObjectDetectionConfig config={mockConfig} onChange={mockOnChange} onSave={onSave} />);
    
    expect(screen.getByRole('button', { name: /salvar configurações/i })).toBeInTheDocument();
  });
});
