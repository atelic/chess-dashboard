import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Test message')}>Show Info</button>
      <button onClick={() => showToast('Success!', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Show Error</button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders notification region for accessibility', () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );
      
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside ToastProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('showing toasts', () => {
    it('displays toast message when triggered', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('displays info toast by default', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-type', 'info');
    });

    it('displays success toast when specified', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Success'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-type', 'success');
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('displays error toast when specified', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Error'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('data-type', 'error');
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('can display multiple toasts simultaneously', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
        fireEvent.click(screen.getByText('Show Success'));
        fireEvent.click(screen.getByText('Show Error'));
      });

      expect(screen.getAllByRole('alert')).toHaveLength(3);
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });
  });

  describe('auto-dismiss', () => {
    it('dismisses toast after 3 seconds', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      expect(screen.getByText('Test message')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('keeps toast visible before 3 seconds', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });

      await act(async () => {
        vi.advanceTimersByTime(2900);
      });

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('manual dismiss', () => {
    it('has dismiss button', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      
      expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
    });

    it('dismisses toast when dismiss button is clicked', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      expect(screen.getByText('Test message')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
      });

      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('only dismisses the clicked toast when multiple are shown', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
        fireEvent.click(screen.getByText('Show Success'));
      });

      expect(screen.getAllByRole('alert')).toHaveLength(2);

      // Click the first dismiss button
      const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss notification' });
      await act(async () => {
        fireEvent.click(dismissButtons[0]);
      });

      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
  });

  describe('accessibility', () => {
    it('uses role="alert" for toast items', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="polite" for non-intrusive announcements', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Show Info'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });
  });
});
