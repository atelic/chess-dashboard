'use client';

import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { Loader2 } from 'lucide-react';
import type { Evaluation } from '@/lib/analysis/lichess-cloud-eval';
import { formatScore } from '@/lib/analysis/lichess-cloud-eval';

interface EngineLinesProps {
  /** Primary evaluation */
  evaluation: Evaluation | null;
  /** Additional principal variations */
  additionalPvs?: Evaluation[];
  /** Current FEN position */
  fen: string;
  /** Whether currently analyzing */
  isAnalyzing: boolean;
  /** Error message */
  error: string | null;
  /** Callback when moves are clicked (receives all moves up to clicked position) */
  onMovesClick?: (sans: string[]) => void;
}

interface FormattedMove {
  san: string;
  display: string;
  isMove: boolean;
  /** Index in the SAN moves array (for playing all moves up to this one) */
  moveIndex: number;
}

/**
 * Convert UCI move sequence to SAN notation
 */
function uciToSan(fen: string, uciMoves: string[]): string[] {
  const chess = new Chess(fen);
  const sanMoves: string[] = [];

  for (const uci of uciMoves) {
    try {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      const move = chess.move({ from, to, promotion });
      if (!move) {
        // Move failed - stop processing (position is now invalid for remaining moves)
        break;
      }
      sanMoves.push(move.san);
    } catch {
      // Move threw exception - stop processing
      break;
    }
  }

  return sanMoves;
}

/**
 * Format a line of moves as array of clickable elements
 * Returns both the formatted moves and the raw SAN array for click handling
 */
function formatLineAsArray(fen: string, pv: string[]): { moves: FormattedMove[]; allSans: string[] } {
  const sanMoves = uciToSan(fen, pv);
  if (sanMoves.length === 0) return { moves: [], allSans: [] };

  const isWhiteToMove = fen.split(' ')[1] === 'w';
  const fullMoveNumber = parseInt(fen.split(' ')[5] || '1', 10);

  const result: FormattedMove[] = [];
  let moveNum = fullMoveNumber;

  sanMoves.forEach((san, idx) => {
    const isWhiteMove = (idx === 0 && isWhiteToMove) || (idx > 0 && (idx % 2 === (isWhiteToMove ? 0 : 1)));

    if (isWhiteMove) {
      // Add move number
      result.push({ san: '', display: `${moveNum}.`, isMove: false, moveIndex: -1 });
      // Add the move
      result.push({ san, display: san, isMove: true, moveIndex: idx });
    } else {
      if (idx === 0) {
        // Black to move first - show continuation notation
        result.push({ san: '', display: `${moveNum}...`, isMove: false, moveIndex: -1 });
      }
      // Add the move
      result.push({ san, display: san, isMove: true, moveIndex: idx });
      moveNum++;
    }
  });

  return { moves: result, allSans: sanMoves };
}

interface FormattedLine {
  score: string;
  moves: FormattedMove[];
  allSans: string[];
  isWhiteAdvantage: boolean | null;
}

export default function EngineLines({
  evaluation,
  additionalPvs = [],
  fen,
  isAnalyzing,
  error,
  onMovesClick,
}: EngineLinesProps) {
  const formattedLines = useMemo(() => {
    const lines: FormattedLine[] = [];

    if (evaluation && evaluation.pv.length > 0) {
      const { moves, allSans } = formatLineAsArray(fen, evaluation.pv.slice(0, 8));
      lines.push({
        score: formatScore(evaluation.score, evaluation.mate),
        moves,
        allSans,
        isWhiteAdvantage: evaluation.mate
          ? evaluation.mate > 0
          : evaluation.score > 0 ? true : evaluation.score < 0 ? false : null,
      });
    }

    for (const pv of additionalPvs) {
      if (pv.pv.length > 0) {
        const { moves, allSans } = formatLineAsArray(fen, pv.pv.slice(0, 8));
        lines.push({
          score: formatScore(pv.score, pv.mate),
          moves,
          allSans,
          isWhiteAdvantage: pv.mate
            ? pv.mate > 0
            : pv.score > 0 ? true : pv.score < 0 ? false : null,
        });
      }
    }

    return lines;
  }, [evaluation, additionalPvs, fen]);

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="text-xs text-zinc-500">{error}</div>
      </div>
    );
  }

  if (formattedLines.length === 0) {
    if (isAnalyzing) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Analyzing position...</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Engine lines</span>
        {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
      </div>
      {formattedLines.map((line, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span
            className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 ${
              line.isWhiteAdvantage === null
                ? 'bg-zinc-700 text-zinc-300'
                : line.isWhiteAdvantage
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-100'
            }`}
          >
            {line.score}
          </span>
          <div className="font-mono text-xs text-zinc-400 leading-relaxed flex flex-wrap gap-x-1">
            {line.moves.map((move, moveIdx) =>
              move.isMove ? (
                <button
                  key={moveIdx}
                  onClick={() => onMovesClick?.(line.allSans.slice(0, move.moveIndex + 1))}
                  className="hover:text-blue-400 cursor-pointer transition-colors"
                >
                  {move.display}
                </button>
              ) : (
                <span key={moveIdx} className="text-zinc-500">
                  {move.display}
                </span>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
