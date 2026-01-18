'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        success: 'border-transparent bg-success text-success-foreground shadow',
        warning: 'border-transparent bg-warning text-warning-foreground shadow',
        outline: 'text-foreground border-border',
        // Chess-themed variants
        win: 'border-transparent bg-success/20 text-success',
        loss: 'border-transparent bg-destructive/20 text-destructive',
        draw: 'border-transparent bg-warning/20 text-warning',
        white: 'border-transparent bg-[var(--chess-light-solid)] text-zinc-900',
        black: 'border-transparent bg-zinc-800 text-zinc-100 border border-zinc-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
