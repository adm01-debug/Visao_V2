import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DetectionOverlay } from '../DetectionOverlay';

const mockDetections = [
  {
    id: '1',
    type: 'face' as const,
    label: 'João',
    confidence: 0.95,
    x: 100,
    y: 50,
    width: 80,
    height: 100,
  },
  {
    id: '2',
    type: 'person' as const,
    confidence: 0.8,
    x: 200,
    y: 100,
    width: 60,
    height: 150,
  },
];

describe('DetectionOverlay', () => {
  it('renders SVG overlay', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480} 
      />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '640');
    expect(svg).toHaveAttribute('height', '480');
  });

  it('renders detection boxes', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480} 
      />
    );
    
    const rects = container.querySelectorAll('rect');
    // Should have bounding boxes and label backgrounds
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });

  it('displays labels when showLabels is true', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480}
        showLabels={true}
      />
    );
    
    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toContain('João');
  });

  it('hides labels when showLabels is false', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480}
        showLabels={false}
      />
    );
    
    const text = container.querySelector('text');
    expect(text).not.toBeInTheDocument();
  });

  it('displays confidence when showConfidence is true', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480}
        showLabels={true}
        showConfidence={true}
      />
    );
    
    const textContent = container.querySelector('text')?.textContent;
    expect(textContent).toContain('95%');
  });

  it('applies custom colors', () => {
    const detectionsWithColor = [
      { ...mockDetections[0], color: '#ff0000' },
    ];
    
    const { container } = render(
      <DetectionOverlay 
        detections={detectionsWithColor} 
        containerWidth={640} 
        containerHeight={480}
      />
    );
    
    const rect = container.querySelector('rect');
    expect(rect).toHaveAttribute('stroke', '#ff0000');
  });

  it('renders corner accents', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480}
      />
    );
    
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={mockDetections} 
        containerWidth={640} 
        containerHeight={480}
        className="custom-overlay"
      />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-overlay');
  });

  it('handles empty detections', () => {
    const { container } = render(
      <DetectionOverlay 
        detections={[]} 
        containerWidth={640} 
        containerHeight={480}
      />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.children.length).toBe(0);
  });
});
