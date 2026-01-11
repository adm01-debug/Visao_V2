import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';

const mockNotifications = [
  { id: '1', title: 'Alert', message: 'New alert detected', type: 'warning', timestamp: new Date() },
  { id: '2', title: 'Info', message: 'System update available', type: 'info', timestamp: new Date() },
  { id: '3', title: 'Success', message: 'Operation completed', type: 'success', timestamp: new Date() },
];

describe('NotificationCenter', () => {
  describe('Rendering', () => {
    it('renders notification list', () => {
      render(<NotificationCenter notifications={mockNotifications} />);
      
      expect(screen.getByText('Alert')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('renders empty state when no notifications', () => {
      render(<NotificationCenter notifications={[]} />);
      
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });

    it('shows notification count badge', () => {
      render(<NotificationCenter notifications={mockNotifications} showBadge />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders notification messages', () => {
      render(<NotificationCenter notifications={mockNotifications} />);
      
      expect(screen.getByText('New alert detected')).toBeInTheDocument();
      expect(screen.getByText('System update available')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onNotificationClick when notification is clicked', () => {
      const onNotificationClick = vi.fn();
      render(
        <NotificationCenter 
          notifications={mockNotifications} 
          onNotificationClick={onNotificationClick} 
        />
      );
      
      fireEvent.click(screen.getByText('Alert'));
      
      expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <NotificationCenter 
          notifications={mockNotifications} 
          onDismiss={onDismiss} 
        />
      );
      
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButtons[0]);
      
      expect(onDismiss).toHaveBeenCalledWith('1');
    });

    it('calls onClearAll when clear all is clicked', () => {
      const onClearAll = vi.fn();
      render(
        <NotificationCenter 
          notifications={mockNotifications} 
          onClearAll={onClearAll} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      
      expect(onClearAll).toHaveBeenCalled();
    });

    it('calls onMarkAsRead when marking notification as read', () => {
      const onMarkAsRead = vi.fn();
      render(
        <NotificationCenter 
          notifications={mockNotifications} 
          onMarkAsRead={onMarkAsRead} 
        />
      );
      
      const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
      fireEvent.click(markReadButtons[0]);
      
      expect(onMarkAsRead).toHaveBeenCalledWith('1');
    });
  });

  describe('Filtering', () => {
    it('filters by notification type', () => {
      render(<NotificationCenter notifications={mockNotifications} filter="warning" />);
      
      expect(screen.getByText('Alert')).toBeInTheDocument();
      expect(screen.queryByText('Info')).not.toBeInTheDocument();
    });

    it('shows all types when filter is all', () => {
      render(<NotificationCenter notifications={mockNotifications} filter="all" />);
      
      expect(screen.getByText('Alert')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct type styling', () => {
      render(<NotificationCenter notifications={mockNotifications} />);
      
      const warningNotification = screen.getByText('Alert').closest('.notification');
      expect(warningNotification).toHaveClass('notification-warning');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<NotificationCenter notifications={mockNotifications} />);
      
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Notifications');
    });

    it('announces new notifications', () => {
      render(<NotificationCenter notifications={mockNotifications} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
