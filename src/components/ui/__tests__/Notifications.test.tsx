import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Notifications, NotificationItem, NotificationContainer } from '../Notifications';

describe('Notifications', () => {
  describe('NotificationItem', () => {
    const defaultProps = {
      id: '1',
      type: 'info' as const,
      title: 'Test Title',
      message: 'Test message',
      onClose: vi.fn(),
    };

    it('renders notification with title and message', () => {
      render(<NotificationItem {...defaultProps} />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders info type correctly', () => {
      render(<NotificationItem {...defaultProps} type="info" />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('notification-info');
    });

    it('renders success type correctly', () => {
      render(<NotificationItem {...defaultProps} type="success" />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('notification-success');
    });

    it('renders warning type correctly', () => {
      render(<NotificationItem {...defaultProps} type="warning" />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('notification-warning');
    });

    it('renders error type correctly', () => {
      render(<NotificationItem {...defaultProps} type="error" />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('notification-error');
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<NotificationItem {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      
      expect(onClose).toHaveBeenCalledWith('1');
    });

    it('auto-closes after duration', async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      
      render(<NotificationItem {...defaultProps} onClose={onClose} duration={3000} />);
      
      vi.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledWith('1');
      });
      
      vi.useRealTimers();
    });

    it('does not auto-close when duration is 0', async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      
      render(<NotificationItem {...defaultProps} onClose={onClose} duration={0} />);
      
      vi.advanceTimersByTime(10000);
      
      expect(onClose).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('renders with action button', () => {
      const onAction = vi.fn();
      render(
        <NotificationItem 
          {...defaultProps} 
          action={{ label: 'Undo', onClick: onAction }} 
        />
      );
      
      const actionButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(actionButton);
      
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe('NotificationContainer', () => {
    it('renders multiple notifications', () => {
      const notifications = [
        { id: '1', type: 'info' as const, title: 'Info', message: 'Info message' },
        { id: '2', type: 'success' as const, title: 'Success', message: 'Success message' },
      ];
      
      render(<NotificationContainer notifications={notifications} onClose={vi.fn()} />);
      
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('positions notifications correctly', () => {
      render(
        <NotificationContainer 
          notifications={[{ id: '1', type: 'info', title: 'Test', message: 'Test' }]} 
          position="top-right"
          onClose={vi.fn()} 
        />
      );
      
      const container = screen.getByTestId('notification-container');
      expect(container).toHaveClass('top-right');
    });

    it('limits maximum visible notifications', () => {
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        type: 'info' as const,
        title: `Notification ${i}`,
        message: `Message ${i}`,
      }));
      
      render(<NotificationContainer notifications={notifications} maxVisible={5} onClose={vi.fn()} />);
      
      expect(screen.getAllByRole('alert')).toHaveLength(5);
    });
  });
});
