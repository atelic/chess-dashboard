import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    it('renders tabs as buttons', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('renders within a nav element', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('applies active styling to active tab', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const activeTab = screen.getByText('First Tab').closest('button');
      expect(activeTab).toHaveClass('border-blue-500');
      expect(activeTab).toHaveClass('text-blue-400');
    });

    it('does not apply active styling to inactive tabs', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={() => {}} />);
      
      const inactiveTab = screen.getByText('Second Tab').closest('button');
      expect(inactiveTab).toHaveClass('border-transparent');
      expect(inactiveTab).toHaveClass('text-zinc-400');
    });

    it('sets aria-current on active tab', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab2" onChange={() => {}} />);
      
      const activeTab = screen.getByText('Second Tab').closest('button');
      expect(activeTab).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current on inactive tabs', () => {
      render(<Tabs tabs={defaultTabs} activeTab="tab2" onChange={() => {}} />);
      
      const inactiveTab = screen.getByText('First Tab').closest('button');
      expect(inactiveTab).not.toHaveAttribute('aria-current');
    });
  });

  describe('click handling', () => {
    it('calls onChange when tab is clicked', () => {
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      fireEvent.click(screen.getByText('Second Tab'));
      
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('calls onChange with correct tab id', () => {
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      fireEvent.click(screen.getByText('Third Tab'));
      
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });

    it('allows clicking the already active tab', () => {
      const handleChange = vi.fn();
      render(<Tabs tabs={defaultTabs} activeTab="tab1" onChange={handleChange} />);
      
      fireEvent.click(screen.getByText('First Tab'));
      
      expect(handleChange).toHaveBeenCalledWith('tab1');
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
      
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });
});
