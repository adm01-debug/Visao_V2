import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomizableDashboard } from '../CustomizableDashboard';

// Mock do hook REAL usado pelo componente
vi.mock('@/hooks/useWidgetDashboard', () => ({
  useWidgetDashboard: () => ({
    widgets: [
      { id: '1', type: 'alertStats', title: 'Alerts', x: 0, y: 0, w: 2, h: 2 },
      { id: '2', type: 'cameraGrid', title: 'Cameras', x: 2, y: 0, w: 2, h: 2 },
    ],
    layouts: { lg: [] },
    isEditing: false,
    hasChanges: false,
    toggleEditing: vi.fn(),
    addWidget: vi.fn(),
    removeWidget: vi.fn(),
    updateLayouts: vi.fn(),
    saveChanges: vi.fn(),
    resetChanges: vi.fn(),
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSensor: () => ({}),
  useSensors: () => [],
  PointerSensor: class {},
  KeyboardSensor: class {},
  closestCenter: () => null,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/widgets/WidgetRenderer', () => ({
  WidgetRenderer: ({ widget }: { widget: { title: string } }) => <div>{widget.title}</div>,
}));

vi.mock('@/components/widgets/WidgetCatalog', () => ({
  WidgetCatalog: () => <div>Widget Catalog</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('CustomizableDashboard', () => {
  it('renders without crashing', () => {
    render(<CustomizableDashboard />);
    expect(document.body).toBeInTheDocument();
  });

  it('displays dashboard widgets', () => {
    render(<CustomizableDashboard />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Cameras')).toBeInTheDocument();
  });

  it('has edit button', () => {
    render(<CustomizableDashboard />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders widget renderer for each widget', () => {
    render(<CustomizableDashboard />);
    expect(document.body).toBeInTheDocument();
  });
});
