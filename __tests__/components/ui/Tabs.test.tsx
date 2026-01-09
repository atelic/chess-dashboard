import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tabs, { Tab } from '@/components/ui/Tabs';

describe('Tabs', () => {
  const defaultTabs: Tab[] = [
    { id: 'tab1', label: 'First Tab' },
    { id: 'tab2', label: 'Second Tab' },
    { id: 'tab3', label: 'Third Tab' },
  ];

  describe('rendering', () => {
    it('renders all tabs', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      expect(screen.getByText('First Tab')).toBeInTheDocument();
      expect(screen.getByText('Second Tab')).toBeInTheDocument();
      expect(screen.getByText('Third Tab')).toBeInTheDocument();
    });

    it('renders tabs with tab role', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('renders within a tablist element', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('applies active styling to active tab', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const activeTab = screen.getByRole('tab', { name: 'First Tab' });
      expect(activeTab).toHaveAttribute('data-state', 'active');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('does not apply active styling to inactive tabs', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const inactiveTab = screen.getByRole('tab', { name: 'Second Tab' });
      expect(inactiveTab).toHaveAttribute('data-state', 'inactive');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('sets aria-selected on active tab', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab2" onChange={() => {}} />);
      
      const activeTab = screen.getByRole('tab', { name: 'Second Tab' });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('does not set aria-selected=true on inactive tabs', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab2" onChange={() => {}} />);
      
      const inactiveTab = screen.getByRole('tab', { name: 'First Tab' });
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('click handling', () => {
    it('calls onChange when tab is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      await user.click(screen.getByRole('tab', { name: 'Second Tab' }));
      
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('calls onChange with correct tab id', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      await user.click(screen.getByRole('tab', { name: 'Third Tab' }));
      
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });

    it('does not fire onChange when clicking already active tab', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      await user.click(screen.getByRole('tab', { name: 'First Tab' }));
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('icons', () => {
    it('renders icon when provided', () => {
      const tabsWithIcons: Tab[] = [
        { id: 'tab1', label: 'Tab 1', icon: <span data-testid="icon-1">Icon</span> },
      ];
      
      render(<Tabs tabs={tabsWithIcons} activeTab="tab1" onChange={() => {}} />);
      
      expect(screen.getByTestId('icon-1')).toBeInTheDocument();
    });

    it('does not render icon when no icon provided', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      // Should not have any test icons
      expect(screen.queryByTestId('icon-1')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders nothing when tabs array is empty', () => {
      render(<Tabs tabs={[]} activeTab="" onChange={() => {}} />);
      
      const tabs = screen.queryAllByRole('tab');
      expect(tabs).toHaveLength(0);
    });
  });
});
