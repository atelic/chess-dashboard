import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders an input element', () => {
      render(<Input />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });
  });

  describe('label', () => {
    it('renders label when provided', () => {
      render(<Input label="Username" />);
      
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('associates label with input via htmlFor', () => {
      render(<Input label="Email Address" />);
      
      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', 'email-address');
      expect(input).toHaveAttribute('id', 'email-address');
    });

    it('uses custom id when provided', () => {
      render(<Input label="Username" id="custom-id" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('does not render label when not provided', () => {
      render(<Input />);
      
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message when provided', () => {
      render(<Input error="This field is required" />);
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styling to input', () => {
      render(<Input error="Error" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-destructive');
    });

    it('error message has correct styling', () => {
      render(<Input error="Error message" />);
      
      const errorText = screen.getByText('Error message');
      expect(errorText).toHaveClass('text-destructive');
    });
  });

  describe('helper text', () => {
    it('displays helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('does not show helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error" />);
      
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('helper text has correct styling', () => {
      render(<Input helperText="Some help" />);
      
      const helperText = screen.getByText('Some help');
      expect(helperText).toHaveClass('text-muted-foreground');
    });
  });

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);
      
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:opacity-50');
    });
  });

  describe('value handling', () => {
    it('displays controlled value', () => {
      render(<Input value="test value" onChange={() => {}} />);
      
      expect(screen.getByRole('textbox')).toHaveValue('test value');
    });

    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('forwarding props', () => {
    it('forwards className to the input', () => {
      render(<Input className="custom-class" />);
      
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('forwards type attribute', () => {
      render(<Input type="email" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('forwards aria attributes', () => {
      render(<Input aria-describedby="help-text" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('forwards name attribute', () => {
      render(<Input name="email" />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email');
    });
  });
});
