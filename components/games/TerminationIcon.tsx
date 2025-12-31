'use client';

import type { ReactNode } from 'react';
import type { TerminationType } from '@/lib/shared/types';

interface TerminationIconProps {
  termination: TerminationType;
  className?: string;
  showLabel?: boolean;
}

/**
 * Get icon and label for a termination type
 */
function getTerminationInfo(termination: TerminationType): { icon: ReactNode; label: string; color: string } {
  switch (termination) {
    case 'checkmate':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9 5H6v3l-3 3 3 3v3h3l3 3 3-3h3v-3l3-3-3-3V5h-3l-3-3zm0 5a4 4 0 110 8 4 4 0 010-8z" />
          </svg>
        ),
        label: 'Checkmate',
        color: 'text-purple-400',
      };
    case 'resignation':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M3 21l18-18" />
          </svg>
        ),
        label: 'Resignation',
        color: 'text-orange-400',
      };
    case 'timeout':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 6v6l4 2" />
          </svg>
        ),
        label: 'Timeout',
        color: 'text-red-400',
      };
    case 'stalemate':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M8 12h8" />
          </svg>
        ),
        label: 'Stalemate',
        color: 'text-zinc-400',
      };
    case 'insufficient':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
          </svg>
        ),
        label: 'Insufficient Material',
        color: 'text-zinc-400',
      };
    case 'repetition':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" d="M20.49 9A9 9 0 015.64 5.64M3.51 15a9 9 0 0014.85 3.36" />
          </svg>
        ),
        label: 'Repetition',
        color: 'text-zinc-400',
      };
    case 'agreement':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l3 3 7-7" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        ),
        label: 'Draw Agreement',
        color: 'text-zinc-400',
      };
    case 'abandoned':
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        ),
        label: 'Abandoned',
        color: 'text-zinc-500',
      };
    case 'other':
    default:
      return {
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 16h.01M12 8a2.5 2.5 0 011.5 4.5L12 14" />
          </svg>
        ),
        label: 'Other',
        color: 'text-zinc-500',
      };
  }
}

export default function TerminationIcon({ 
  termination, 
  className = '',
  showLabel = false,
}: TerminationIconProps) {
  const { icon, label, color } = getTerminationInfo(termination);

  return (
    <span className={`relative inline-flex items-center gap-1 group ${color} ${className}`}>
      {icon}
      {showLabel && <span className="text-xs">{label}</span>}
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-zinc-100 bg-zinc-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {label}
      </span>
    </span>
  );
}
