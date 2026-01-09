'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChessIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// Knight - Used for branding and loading
export function KnightIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 45 45"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <path
        d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        style={{ fill: 'currentColor', stroke: 'currentColor' }}
      />
      <path
        d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
        style={{ fill: 'currentColor', stroke: 'currentColor' }}
      />
      <path
        d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
        style={{ fill: 'none', stroke: 'var(--background, #0a0a0a)', strokeWidth: 1.5 }}
      />
      <path
        d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
        transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
        style={{ fill: 'none', stroke: 'var(--background, #0a0a0a)', strokeWidth: 1.5 }}
      />
    </svg>
  );
}

// King - Used for rating/status
export function KingIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 45 45"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <path d="M 22.5,11.63 L 22.5,6" style={{ fill: 'none', strokeLinejoin: 'miter' }} />
      <path d="M 20,8 L 25,8" style={{ fill: 'none', strokeLinejoin: 'miter' }} />
      <path
        d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"
        style={{ fill: 'currentColor', strokeLinecap: 'butt', strokeLinejoin: 'miter' }}
      />
      <path
        d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37"
        style={{ fill: 'currentColor', strokeLinecap: 'butt' }}
      />
      <path d="M 12.5,30 C 18,27 27,27 32.5,30" style={{ fill: 'none' }} />
      <path d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5" style={{ fill: 'none' }} />
      <path d="M 12.5,37 C 18,34 27,34 32.5,37" style={{ fill: 'none' }} />
    </svg>
  );
}

// Pawn - Used for secondary elements
export function PawnIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <circle cx="12" cy="6" r="3" />
      <path d="M10 9h4v3h2l1 8H7l1-8h2V9z" />
      <path d="M6 20h12v2H6v-2z" />
    </svg>
  );
}

// Rook - Used for defense/structure
export function RookIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <path d="M6 2h2v3h2V2h4v3h2V2h2v5H6V2z" />
      <path d="M7 7h10v2H7V7z" />
      <path d="M8 9h8l1 9H7l1-9z" />
      <path d="M5 18h14v4H5v-4z" />
    </svg>
  );
}

// Bishop - Used for openings
export function BishopIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <path d="M12 2c-1 0-2 1-2 2.5C10 6 11 7 12 8c1-1 2-2 2-3.5C14 3 13 2 12 2z" />
      <path d="M9 8l3 2 3-2" />
      <path d="M9 10c-1 3-1 6 0 8h6c1-2 1-5 0-8" />
      <path d="M7 18h10l1 2H6l1-2z" />
      <path d="M5 20h14v2H5v-2z" />
    </svg>
  );
}

// Queen - Used for achievements
export function QueenIcon({ className, ...props }: ChessIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      <circle cx="6" cy="4" r="1.5" />
      <circle cx="12" cy="2" r="1.5" />
      <circle cx="18" cy="4" r="1.5" />
      <path d="M6 5.5L8 18h8l2-12.5" />
      <path d="M12 3.5V18" />
      <path d="M6 18h12l1 2H5l1-2z" />
      <path d="M4 20h16v2H4v-2z" />
    </svg>
  );
}

// Animated Knight for loading states
export function AnimatedKnight({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse', className)}>
      <KnightIcon className="h-12 w-12 text-primary" />
    </div>
  );
}

// Result icons
export function WinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 text-success', className)}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function LossIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 text-destructive', className)}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function DrawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 text-warning', className)}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
