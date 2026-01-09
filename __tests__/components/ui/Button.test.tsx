import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Button>Click me</Button>);
      
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('renders as a button element', () => {
      render(<Button>Test</Button>);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('applies primary variant classes by default', () => {
      render(<Button>Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });
  });

  describe('sizes', () => {
    it('applies medium size classes by default', () => {
      render(<Button>Medium</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-4');
    });

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'px-3');
    });

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-8');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>);
      
      // Should show "Loading..." text
      expect(screen.getByRole('button')).toHaveTextContent('Loading...');
      // Original children should not be visible
      expect(screen.getByRole('button')).not.toHaveTextContent('Submit');
    });

    it('is disabled when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('contains a spinner svg when loading', () => {
      render(<Button isLoading>Submit</Button>);
      
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });

  describe('click handling', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} isLoading>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('forwarding props', () => {
    it('forwards className to the button', () => {
      render(<Button className="custom-class">Custom</Button>);
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('forwards type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('forwards aria attributes', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });
  });
});
