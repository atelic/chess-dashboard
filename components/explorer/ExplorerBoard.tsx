'use client';

import { useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { PieceDropHandlerArgs } from 'react-chessboard';

// Dynamic import to avoid SSR issues with react-chessboard
const Chessboard = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-zinc-800 rounded animate-pulse" /> }
);

interface ExplorerBoardProps {
  /** FEN position to display (or 'start' for initial position) */
  fen: string;
  /** Callback when a move is made on the board */
  onMove?: (move: { san: string; uci: string; targetFen: string }) => void;
  /** UCI moves that are allowed (if empty, all legal moves allowed) */
  allowedMoves?: string[];
  /** Board orientation */
  orientation?: 'white' | 'black';
  /** Whether the board is interactive */
  interactive?: boolean;
}

export default function ExplorerBoard({
  fen,
  onMove,
  allowedMoves = [],
  orientation = 'white',
  interactive = true,
}: ExplorerBoardProps) {
  // Create chess instance to validate moves
  const chess = useMemo(() => {
    const c = new Chess();
    if (fen !== 'start' && fen) {
      try {
        c.load(fen);
      } catch {
        // Invalid FEN, use starting position
        c.reset();
      }
    }
    return c;
  }, [fen]);

  // Handle piece drop
  const onDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!interactive || !onMove || !targetSquare) {
        return false;
      }

      // Check if this move is in allowed moves (if specified)
      const uci = sourceSquare + targetSquare;
      if (allowedMoves.length > 0) {
        const isAllowed = allowedMoves.some(
          (m) => m.startsWith(uci) || m === uci + 'q' // Include queen promotion
        );
        if (!isAllowed) {
          return false;
        }
      }

      // Try to make the move
      try {
        // Determine promotion piece if applicable
        const pieceType = piece.pieceType.toLowerCase();
        const isPromotion =
          pieceType === 'p' &&
          ((targetSquare[1] === '8' && piece.pieceType === piece.pieceType.toUpperCase()) ||
            (targetSquare[1] === '1' && piece.pieceType === piece.pieceType.toLowerCase()));

        const result = chess.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: isPromotion ? 'q' : undefined,
        });

        if (result) {
          onMove({
            san: result.san,
            uci: result.from + result.to + (result.promotion || ''),
            targetFen: chess.fen(),
          });
          return true;
        }
      } catch {
        // Invalid move
      }

      return false;
    },
    [chess, onMove, allowedMoves, interactive]
  );

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <Chessboard
        options={{
          position: fen === 'start' ? 'start' : fen,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: '#3f3f46' },
          lightSquareStyle: { backgroundColor: '#71717a' },
          allowDragging: interactive,
          animationDurationInMs: 200,
          onPieceDrop: onDrop,
        }}
      />
    </div>
  );
}
