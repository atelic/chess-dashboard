'use client';

import { useState } from 'react';
import type { Game, AnalysisData } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface GameAnalysisPanelProps {
  game: Game;
  onAnalyze?: (gameId: string) => Promise<void>;
  onFetchLichessAnalysis?: (gameId: string, playerColor: 'white' | 'black') => Promise<AnalysisData | null>;
  onFetchChessComAnalysis?: (game: Game) => Promise<AnalysisData | null>;
}

/**
 * Get color for accuracy score
 */
function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-400';
  if (accuracy >= 80) return 'text-lime-400';
  if (accuracy >= 70) return 'text-yellow-400';
  if (accuracy >= 60) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get background color for accuracy bar
 */
function getAccuracyBgColor(accuracy: number): string {
  if (accuracy >= 90) return 'bg-green-500';
  if (accuracy >= 80) return 'bg-lime-500';
  if (accuracy >= 70) return 'bg-yellow-500';
  if (accuracy >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function GameAnalysisPanel({ 
  game, 
  onAnalyze,
  onFetchLichessAnalysis,
  onFetchChessComAnalysis,
}: GameAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingLichess, setIsFetchingLichess] = useState(false);
  const [isFetchingChessCom, setIsFetchingChessCom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [fetchedAnalysis, setFetchedAnalysis] = useState<AnalysisData | null>(null);

  // Use fetched analysis if available, otherwise use game's analysis
  const analysis = fetchedAnalysis || game.analysis;
  const hasAnalysis = analysis && (analysis.accuracy !== undefined || analysis.blunders !== undefined);

  const handleAnalyze = async () => {
    if (!onAnalyze) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      await onAnalyze(game.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchLichessAnalysis = async () => {
    if (!onFetchLichessAnalysis) return;
    
    setIsFetchingLichess(true);
    setError(null);
    setReviewUrl(null);
    
    try {
      const result = await onFetchLichessAnalysis(game.id, game.playerColor);
      if (result) {
        setFetchedAnalysis(result);
      } else {
        setError('No analysis available on Lichess. Request analysis on Lichess first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setIsFetchingLichess(false);
    }
  };

  const handleFetchChessComAnalysis = async () => {
    if (!onFetchChessComAnalysis) return;
    
    setIsFetchingChessCom(true);
    setError(null);
    setReviewUrl(null);
    
    try {
      const result = await onFetchChessComAnalysis(game);
      if (result) {
        setFetchedAnalysis(result);
      } else {
        setError('No analysis available yet.');
        setReviewUrl(`${game.gameUrl}?tab=review`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
      setReviewUrl(`${game.gameUrl}?tab=review`);
    } finally {
      setIsFetchingChessCom(false);
    }
  };

  // If no analysis data, show options to get analysis
  if (!hasAnalysis) {
    const isLichess = game.source === 'lichess';
    const isChessCom = game.source === 'chesscom';
    const isFetching = isFetchingLichess || isFetchingChessCom;
    
    return (
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-medium text-zinc-300">Game Analysis</h4>
            <p className="text-xs text-zinc-500 mt-1">
              {isLichess 
                ? 'Check if Lichess has analysis for this game, or analyze locally with Stockfish.'
                : 'Check if Chess.com has analysis for this game. You may need to request Game Review on Chess.com first.'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* For Lichess games, offer to fetch from Lichess first */}
            {isLichess && onFetchLichessAnalysis && (
              <Button
                onClick={handleFetchLichessAnalysis}
                disabled={isFetching || isAnalyzing}
                variant="secondary"
              >
                {isFetchingLichess ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Checking Lichess...</span>
                  </>
                ) : (
                  'Fetch from Lichess'
                )}
              </Button>
            )}

            {/* For Chess.com games, offer to fetch from Chess.com */}
            {isChessCom && onFetchChessComAnalysis && (
              <Button
                onClick={handleFetchChessComAnalysis}
                disabled={isFetching || isAnalyzing}
                variant="secondary"
              >
                {isFetchingChessCom ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Checking Chess.com...</span>
                  </>
                ) : (
                  'Fetch from Chess.com'
                )}
              </Button>
            )}
            
            {/* Local Stockfish analysis option */}
            {onAnalyze && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isFetching}
              >
                {isAnalyzing ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Analyzing...</span>
                  </>
                ) : (
                  'Analyze with Stockfish'
                )}
              </Button>
            )}
          </div>
          
          {error && (
            <div className="text-xs">
              <span className="text-red-400">{error}</span>
              {reviewUrl && (
                <span className="ml-1">
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Request Game Review on Chess.com
                  </a>
                  {' '}first, then try again.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show analysis data
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-zinc-300 mb-3">Game Analysis</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Accuracy */}
        {analysis.accuracy !== undefined && (
          <div>
            <div className="text-xs text-zinc-500 mb-1">Accuracy</div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${getAccuracyColor(analysis.accuracy)}`}>
                {analysis.accuracy}%
              </div>
              <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getAccuracyBgColor(analysis.accuracy)} transition-all`}
                  style={{ width: `${analysis.accuracy}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Blunders */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Blunders</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-red-400">{analysis.blunders}</span>
            <span className="text-red-400 text-lg">??</span>
          </div>
        </div>

        {/* Mistakes */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Mistakes</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-400">{analysis.mistakes}</span>
            <span className="text-orange-400 text-lg">?</span>
          </div>
        </div>

        {/* Inaccuracies */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Inaccuracies</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-yellow-400">{analysis.inaccuracies}</span>
            <span className="text-yellow-400 text-lg">?!</span>
          </div>
        </div>
      </div>

      {/* ACPL */}
      {analysis.acpl !== undefined && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Average Centipawn Loss</span>
            <span className="text-zinc-300 font-medium">{analysis.acpl}</span>
          </div>
        </div>
      )}

      {/* View on platform link */}
      <div className="mt-3 pt-3 border-t border-zinc-700">
        <a
          href={game.source === 'lichess' 
            ? `${game.gameUrl}/${game.playerColor}#analysis`
            : `${game.gameUrl}?tab=review`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          View full analysis on {game.source === 'lichess' ? 'Lichess' : 'Chess.com'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
