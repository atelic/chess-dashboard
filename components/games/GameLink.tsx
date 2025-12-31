'use client';

import type { GameSource } from '@/lib/types';

interface GameLinkProps {
  url: string;
  source: GameSource;
  className?: string;
}

// Chess.com logo (green pawn)
const ChessComIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7-.3.2-.5.4-.8.6-1.5 1.2-2.5 3-2.5 5v.2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-.2c0-2-1-3.8-2.5-5-.3-.2-.5-.4-.8-.6 1.1-.9 1.8-2.2 1.8-3.7C16.5 4 14.5 2 12 2z" />
  </svg>
);

// Lichess logo (horse knight)
const LichessIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.5 2C10 2 8 4 8 6.5c0 1.1.4 2.1 1 2.9L6.5 12H5c-.6 0-1 .4-1 1v1c0 .6.4 1 1 1h1v5c0 .6.4 1 1 1h10c.6 0 1-.4 1-1v-5h1c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1h-1.5L15 9.4c.6-.8 1-1.8 1-2.9C16 4 14 2 12.5 2zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.9 9 12.5 9 10 7.9 10 6.5 11.1 4 12.5 4z" />
  </svg>
);

export default function GameLink({ url, source, className = '' }: GameLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors ${className}`}
      title={`View on ${source === 'chesscom' ? 'Chess.com' : 'Lichess'}`}
    >
      {source === 'chesscom' ? (
        <span className="text-green-500">
          <ChessComIcon />
        </span>
      ) : (
        <span className="text-white">
          <LichessIcon />
        </span>
      )}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
