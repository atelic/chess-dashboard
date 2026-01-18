'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { Evaluation } from '@/lib/analysis/lichess-cloud-eval';
import { formatScore } from '@/lib/analysis/lichess-cloud-eval';

interface EvaluationBarProps {
  /** Primary evaluation */
  evaluation: Evaluation | null;
  /** Whether currently analyzing */
  isAnalyzing: boolean;
  /** Whether engine is initializing */
  isInitializing: boolean;
}

/**
 * Calculate bar percentage from centipawn score
 */
function scoreToBarPercent(score: number, mate: number | null): number {
  if (mate !== null) {
    return mate > 0 ? 95 : 5;
  }

  const maxCp = 500;
  const clampedScore = Math.max(-maxCp, Math.min(maxCp, score));
  return 50 + (clampedScore / maxCp) * 45;
}

export default function EvaluationBar({
  evaluation,
  isAnalyzing,
  isInitializing,
}: EvaluationBarProps) {
  const { barPercent, scoreText, isWhiteAdvantage } = useMemo(() => {
    if (!evaluation) {
      return { barPercent: 50, scoreText: '0.00', isWhiteAdvantage: null };
    }

    const percent = scoreToBarPercent(evaluation.score, evaluation.mate);
    const text = formatScore(evaluation.score, evaluation.mate);
    const advantage = evaluation.mate
      ? evaluation.mate > 0
      : evaluation.score > 0;

    return {
      barPercent: percent,
      scoreText: text,
      isWhiteAdvantage: evaluation.score === 0 && evaluation.mate === null ? null : advantage,
    };
  }, [evaluation]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center w-6 h-full">
        <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-6">
      {/* Score at top when black is ahead */}
      <div className="h-5 flex items-center justify-center shrink-0">
        {isWhiteAdvantage === false && (
          <span className="font-mono text-[10px] font-bold text-zinc-400">
            {scoreText}
          </span>
        )}
        {isAnalyzing && isWhiteAdvantage !== false && (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
        )}
      </div>

      {/* Vertical evaluation bar */}
      <div className="relative w-full flex-1 overflow-hidden bg-zinc-700 min-h-0">
        {/* White portion (from bottom) */}
        <div
          className="absolute inset-x-0 bottom-0 bg-zinc-100 transition-all duration-300 ease-out"
          style={{ height: `${barPercent}%` }}
        />
        {/* Black portion (from top) */}
        <div
          className="absolute inset-x-0 top-0 bg-zinc-900 transition-all duration-300 ease-out"
          style={{ height: `${100 - barPercent}%` }}
        />
      </div>

      {/* Score at bottom when white is ahead */}
      <div className="h-5 flex items-center justify-center shrink-0">
        {(isWhiteAdvantage === true || isWhiteAdvantage === null) && (
          <span className="font-mono text-[10px] font-bold text-zinc-100">
            {evaluation ? scoreText : '—'}
          </span>
        )}
        {isAnalyzing && isWhiteAdvantage === false && (
          <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
        )}
      </div>
    </div>
  );
}
