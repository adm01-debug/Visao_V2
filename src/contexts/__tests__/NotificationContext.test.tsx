import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../NotificationContext';

function TestComponent() {
  const { notifications, addNotification } = useNotifications();
  return (
    <div>
      <span data-testid="count">{notifications?.length ?? 0}</span>
      <button onClick={() => addNotification({ type: 'success', message: 'Test' })}>
        Add
      </button>
    </div>
  );
}

describe('NotificationContext', () => {
  it('provides notifications context', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders add button', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });
});
