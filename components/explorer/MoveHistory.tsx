'use client';

import { ChevronLeft, RotateCcw } from 'lucide-react';

interface MoveHistoryProps {
  /** List of moves played from the starting position */
  moves: string[];
  /** Go back one move */
  onBack: () => void;
  /** Reset to starting position */
  onReset: () => void;
  /** Jump to a specific move index */
  onJumpTo?: (index: number) => void;
}

export default function MoveHistory({
  moves,
  onBack,
  onReset,
  onJumpTo,
}: MoveHistoryProps) {
  // Format moves with move numbers
  const formattedMoves: { moveNumber: string; san: string; index: number }[] = [];

  for (let i = 0; i < moves.length; i++) {
    const fullMoveNumber = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;

    formattedMoves.push({
      moveNumber: isWhite ? `${fullMoveNumber}.` : '',
      san: moves[i],
      index: i,
    });
  }

  return (
    <div className="flex items-center gap-2 mt-4">
      {/* Navigation buttons */}
      <button
        onClick={onReset}
        disabled={moves.length === 0}
        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Reset to start"
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        onClick={onBack}
        disabled={moves.length === 0}
        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Go back one move"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Move list */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto py-1 px-2 bg-zinc-800/50 rounded-lg min-h-[36px]">
        {moves.length === 0 ? (
          <span className="text-zinc-500 text-sm">Starting position</span>
        ) : (
          formattedMoves.map(({ moveNumber, san, index }) => (
            <span key={index} className="flex items-center">
              {moveNumber && (
                <span className="text-zinc-500 text-sm mr-0.5">{moveNumber}</span>
              )}
              <button
                onClick={() => onJumpTo?.(index)}
                className="font-mono text-sm text-zinc-200 hover:text-blue-400 hover:underline transition-colors px-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {san}
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
