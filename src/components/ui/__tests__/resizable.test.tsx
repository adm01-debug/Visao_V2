import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../resizable';

describe('Resizable', () => {
  it('deve renderizar grupo', () => {
    render(<ResizablePanelGroup direction="horizontal" data-testid="group"><ResizablePanel>Panel</ResizablePanel></ResizablePanelGroup>);
    expect(screen.getByTestId('group')).toBeInTheDocument();
  });

  it('deve renderizar panel', () => {
    render(<ResizablePanelGroup direction="horizontal"><ResizablePanel>Content</ResizablePanel></ResizablePanelGroup>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('deve renderizar handle', () => {
    render(<ResizablePanelGroup direction="horizontal"><ResizablePanel>1</ResizablePanel><ResizableHandle /><ResizablePanel>2</ResizablePanel></ResizablePanelGroup>);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('deve aceitar direction vertical', () => {
    render(<ResizablePanelGroup direction="vertical" data-testid="group"><ResizablePanel>Panel</ResizablePanel></ResizablePanelGroup>);
    expect(screen.getByTestId('group')).toBeInTheDocument();
  });
});
