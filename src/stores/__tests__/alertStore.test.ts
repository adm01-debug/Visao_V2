import { describe, it, expect, beforeEach } from 'vitest';

describe('Alert Store', () => {
  // Mock store state
  let state = {
    alerts: [] as Array<{ id: string; type: string; message: string }>,
    unreadCount: 0,
    filters: { type: null as string | null, severity: null as string | null },
  };

  // Mock actions
  const actions = {
    addAlert: (alert: { id: string; type: string; message: string }) => {
      state.alerts.push(alert);
      state.unreadCount++;
    },
    removeAlert: (id: string) => {
      state.alerts = state.alerts.filter(a => a.id !== id);
    },
    markAsRead: (id: string) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
    clearAll: () => {
      state.alerts = [];
      state.unreadCount = 0;
    },
    setFilter: (key: 'type' | 'severity', value: string | null) => {
      state.filters[key] = value;
    },
  };

  beforeEach(() => {
    state = { alerts: [], unreadCount: 0, filters: { type: null, severity: null } };
  });

  it('should start with empty alerts', () => {
    expect(state.alerts).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('should add alert', () => {
    actions.addAlert({ id: '1', type: 'motion', message: 'Motion detected' });
    
    expect(state.alerts).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('should remove alert', () => {
    actions.addAlert({ id: '1', type: 'motion', message: 'Motion detected' });
    actions.removeAlert('1');
    
    expect(state.alerts).toHaveLength(0);
  });

  it('should mark as read', () => {
    actions.addAlert({ id: '1', type: 'motion', message: 'Motion detected' });
    actions.markAsRead('1');
    
    expect(state.unreadCount).toBe(0);
  });

  it('should clear all alerts', () => {
    actions.addAlert({ id: '1', type: 'motion', message: 'Motion 1' });
    actions.addAlert({ id: '2', type: 'face', message: 'Face detected' });
    actions.clearAll();
    
    expect(state.alerts).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('should set filters', () => {
    actions.setFilter('type', 'motion');
    actions.setFilter('severity', 'high');
    
    expect(state.filters.type).toBe('motion');
    expect(state.filters.severity).toBe('high');
  });
});
