import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PPEDetectionPanel } from '../PPEDetectionPanel';

const mockConfig = {
  enabled: true,
  requiredPPE: ['helmet', 'vest'] as const,
  confidenceThreshold: 80,
  alertOnMissing: true,
  alertDelay: 5,
  zones: [],
};

const mockStats = {
  compliant: 45,
  nonCompliant: 5,
  lastCheck: new Date(),
};

describe('PPEDetectionPanel', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PPE detection panel', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Detecção de EPI')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText(/Equipamentos de Proteção Individual/)).toBeInTheDocument();
  });

  it('toggles enabled state', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
  });

  it('shows detection stats when provided', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} detectionStats={mockStats} />);
    
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('shows PPE options', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    
    expect(screen.getByText('Capacete')).toBeInTheDocument();
    expect(screen.getByText('Colete')).toBeInTheDocument();
    expect(screen.getByText('Luvas')).toBeInTheDocument();
    expect(screen.getByText('Óculos')).toBeInTheDocument();
  });

  it('toggles PPE selection', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Luvas'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      requiredPPE: expect.arrayContaining(['gloves']),
    }));
  });

  it('shows confidence threshold', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows alert on missing toggle', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Alertar EPI Ausente')).toBeInTheDocument();
  });

  it('shows alert delay when alert is enabled', () => {
    render(<PPEDetectionPanel config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Tempo de Tolerância')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('dims content when disabled', () => {
    const { container } = render(
      <PPEDetectionPanel config={{ ...mockConfig, enabled: false }} onChange={mockOnChange} />
    );
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });
});
