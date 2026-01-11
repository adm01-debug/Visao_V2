import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWidgetDashboard } from '../useWidgetDashboard';

describe('useWidgetDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useWidgetDashboard());
    
    expect(result.current.widgets).toBeDefined();
    expect(result.current.layout).toBeDefined();
    expect(result.current.isEditing).toBe(false);
  });

  it('adds widget', () => {
    const { result } = renderHook(() => useWidgetDashboard());
    
    act(() => {
      result.current.addWidget({ id: 'widget-1', type: 'chart', config: {} });
    });
    
    expect(result.current.widgets).toContainEqual(expect.objectContaining({ id: 'widget-1' }));
  });

  it('removes widget', () => {
    const { result } = renderHook(() => useWidgetDashboard());
    
    act(() => {
      result.current.addWidget({ id: 'widget-1', type: 'chart', config: {} });
      result.current.removeWidget('widget-1');
    });
    
    expect(result.current.widgets).not.toContainEqual(expect.objectContaining({ id: 'widget-1' }));
  });

  it('updates widget config', () => {
    const { result } = renderHook(() => useWidgetDashboard());
    
    act(() => {
      result.current.addWidget({ id: 'widget-1', type: 'chart', config: { title: 'Old' } });
      result.current.updateWidget('widget-1', { config: { title: 'New' } });
    });
    
    const widget = result.current.widgets.find(w => w.id === 'widget-1');
    expect(widget?.config.title).toBe('New');
  });

  it('toggles edit mode', () => {
    const { result } = renderHook(() => useWidgetDashboard());
    
    act(() => {
      result.current.toggleEditMode();
    });
    
    expect(result.current.isEditing).toBe(true);
  });
});
