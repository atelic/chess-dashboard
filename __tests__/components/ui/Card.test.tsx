import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '@/components/ui/Card';

describe('Card', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Card><p>Card content</p></Card>);
      
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies base styling classes', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('border-border');
      expect(card).toHaveClass('rounded-xl');
    });
  });

  describe('title', () => {
    it('renders title when provided', () => {
      render(<Card title="Card Title">Content</Card>);
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('renders title with correct styling', () => {
      render(<Card title="Card Title">Content</Card>);
      
      const title = screen.getByText('Card Title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
    });

    it('does not render title container when no title or subtitle', () => {
      render(<Card data-testid="card">Just content</Card>);
      
      const card = screen.getByTestId('card');
      // Should not have the mb-4 header div
      expect(card.querySelector('.mb-4')).not.toBeInTheDocument();
    });
  });

  describe('subtitle', () => {
    it('renders subtitle when provided', () => {
      render(<Card subtitle="Card subtitle">Content</Card>);
      
      expect(screen.getByText('Card subtitle')).toBeInTheDocument();
    });

    it('renders subtitle with correct styling', () => {
      render(<Card subtitle="Card subtitle">Content</Card>);
      
      const subtitle = screen.getByText('Card subtitle');
      expect(subtitle).toHaveClass('text-sm');
      expect(subtitle).toHaveClass('text-muted-foreground');
    });

    it('renders both title and subtitle', () => {
      render(<Card title="Title" subtitle="Subtitle">Content</Card>);
      
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });
  });

  describe('forwarding props', () => {
    it('forwards className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('merges className with base classes', () => {
      render(<Card className="extra-padding" data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('extra-padding');
    });

    it('forwards data attributes', () => {
      render(<Card data-testid="test-card">Content</Card>);
      
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('forwards aria attributes', () => {
      render(<Card aria-label="Information card">Content</Card>);
      
      expect(screen.getByLabelText('Information card')).toBeInTheDocument();
    });
  });
});
