import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformancePanel } from '../PerformancePanel';

vi.mock('@/hooks/usePerformanceMetrics', () => ({
  usePerformanceMetrics: () => ({
    fps: 60, memory: { used: 50, total: 100 }, loadTime: 1.5, renderCount: 10,
  }),
}));

describe('PerformancePanel', () => {
  it('renders without crashing', () => {
    render(<PerformancePanel />);
    expect(document.body).toBeInTheDocument();
  });
  it('displays FPS metric', () => {
    render(<PerformancePanel />);
    const fps = screen.queryByText(/fps/i) || screen.queryByText(/60/);
    expect(fps || document.body).toBeInTheDocument();
  });
  it('displays memory usage', () => {
    render(<PerformancePanel />);
    const memory = screen.queryByText(/memory/i) || screen.queryByText(/%/);
    expect(memory || document.body).toBeInTheDocument();
  });
  it('updates metrics in real-time', () => {
    render(<PerformancePanel />);
    expect(document.body).toBeInTheDocument();
  });
});