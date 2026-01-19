'use client';

import { useState, useMemo, useCallback } from 'react';
import { AlertCircle, RotateCcw, Loader2, Cpu } from 'lucide-react';
import type { Game } from '@/lib/types';
import type { ExplorerNode } from '@/lib/explorer/types';
import { getPositionFromMoves, getPositionKey } from '@/lib/explorer/buildTree';
import { useExplorerTree } from '@/lib/explorer/useExplorerTree';
import { useStockfishExplorer } from '@/lib/explorer/useStockfishExplorer';
import ExplorerBoard from '@/components/explorer/ExplorerBoard';
import MoveTree from '@/components/explorer/MoveTree';
import PositionStats from '@/components/explorer/PositionStats';
import MoveHistory from '@/components/explorer/MoveHistory';
import EvaluationBar from '@/components/explorer/EvaluationBar';
import EngineLines from '@/components/explorer/EngineLines';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface ExplorerTabProps {
  games: Game[];
}

export default function ExplorerTab({ games }: ExplorerTabProps) {
  // Move history state
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Perspective toggle (as white, as black, or both)
  const [perspective, setPerspectiveState] = useState<'white' | 'black' | 'both'>('both');

  // Board orientation - defaults to match perspective
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  // Stockfish engine toggle (off by default)
  const [engineEnabled, setEngineEnabled] = useState(false);

  // Wrapper to update orientation and reset moves when perspective changes
  const setPerspective = useCallback((newPerspective: 'white' | 'black' | 'both') => {
    setPerspectiveState(newPerspective);
    setMoveHistory([]); // Reset to starting position
    if (newPerspective === 'white' || newPerspective === 'black') {
      setOrientation(newPerspective);
    }
  }, []);

  // Use the optimized explorer tree hook (Web Worker + smart caching)
  const { tree, isBuilding, error } = useExplorerTree(games, perspective);

  // Current position based on move history
  const currentPosition = useMemo(() => {
    if (moveHistory.length === 0) {
      return {
        fen: STARTING_FEN,
        positionKey: getPositionKey(STARTING_FEN),
      };
    }

    const result = getPositionFromMoves(moveHistory);
    return result || { fen: STARTING_FEN, positionKey: getPositionKey(STARTING_FEN) };
  }, [moveHistory]);

  // Stockfish analysis for current position
  const {
    evaluation: stockfishEval,
    isAnalyzing: isEngineAnalyzing,
    isInitializing: isEngineInitializing,
    error: engineError,
  } = useStockfishExplorer(currentPosition.fen, {
    enabled: engineEnabled,
    depth: 18,
    multiPv: 3,
  });

  // Current node in the tree
  const currentNode: ExplorerNode | null = useMemo(() => {
    return tree.nodes.get(currentPosition.positionKey) || null;
  }, [tree, currentPosition.positionKey]);

  // Get allowed moves (moves we have data for)
  // Allow all legal moves (empty array = no restrictions)
  const allowedMoves: string[] = [];

  // Handle move from the board or move tree
  const handleMove = useCallback((san: string) => {
    setMoveHistory((prev) => [...prev, san]);
  }, []);

  const handleMoveClick = useCallback((san: string) => {
    handleMove(san);
  }, [handleMove]);

  // Handle multiple moves (for clicking deep into engine lines)
  const handleMovesClick = useCallback((sans: string[]) => {
    setMoveHistory((prev) => [...prev, ...sans]);
  }, []);

  const handleBoardMove = useCallback(
    (move: { san: string }) => {
      handleMove(move.san);
    },
    [handleMove]
  );

  // Navigation handlers
  const handleBack = useCallback(() => {
    setMoveHistory((prev) => prev.slice(0, -1));
  }, []);

  const handleReset = useCallback(() => {
    setMoveHistory([]);
  }, []);

  const handleJumpTo = useCallback((index: number) => {
    setMoveHistory((prev) => prev.slice(0, index + 1));
  }, []);

  // Count games with/without PGN
  const gamesWithPgnCount = games.filter((g) => g.pgn).length;
  const gamesWithoutPgnCount = games.length - gamesWithPgnCount;

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
        <p className="text-red-400">Failed to build opening tree</p>
        <p className="text-muted-foreground text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Show loading state while building tree
  if (isBuilding) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
        <p className="text-muted-foreground">Building opening tree from {gamesWithPgnCount.toLocaleString()} games...</p>
        <p className="text-muted-foreground text-sm mt-1">This runs in the background and won&apos;t freeze your browser</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Warning banner if many games missing PGN */}
      {gamesWithoutPgnCount > 0 && gamesWithPgnCount < games.length && (
        <div className="flex items-start gap-3 p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium">
              {gamesWithoutPgnCount.toLocaleString()} games missing move data
            </p>
            <p className="text-amber-200/70 text-sm mt-1">
              These games were synced before move data storage was enabled.
              Run a full resync to fetch the missing data.
            </p>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Perspective toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show games as:</span>
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setPerspective('white')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                perspective === 'white'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              White
            </button>
            <button
              onClick={() => setPerspective('black')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                perspective === 'black'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Black
            </button>
            <button
              onClick={() => setPerspective('both')}
              className={`px-3 py-1.5 text-sm transition-colors ${
                perspective === 'both'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Both
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Engine toggle */}
          <button
            onClick={() => setEngineEnabled((e) => !e)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              engineEnabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Engine {engineEnabled ? 'On' : 'Off'}
          </button>

          {/* Flip board button */}
          <button
            onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary hover:bg-muted rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Flip board
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Board and move history */}
        <div className="lg:col-span-5 space-y-4">
          {/* Board with optional eval bar */}
          <div
            className="grid mx-auto"
            style={{
              gridTemplateColumns: engineEnabled ? '24px 1fr' : '1fr',
              maxWidth: engineEnabled ? '530px' : '500px',
              gap: engineEnabled ? '6px' : '0'
            }}
          >
            {/* Evaluation bar (to the left of board when enabled) */}
            {engineEnabled && (
              <div className="self-stretch">
                <EvaluationBar
                  evaluation={stockfishEval?.evaluation ?? null}
                  isAnalyzing={isEngineAnalyzing}
                  isInitializing={isEngineInitializing}
                />
              </div>
            )}

            {/* Chess board */}
            <ExplorerBoard
              fen={currentPosition.fen}
              onMove={handleBoardMove}
              allowedMoves={allowedMoves}
              orientation={orientation}
              interactive={true}
            />
          </div>

          <MoveHistory
            moves={moveHistory}
            onBack={handleBack}
            onReset={handleReset}
            onJumpTo={handleJumpTo}
          />

          {/* Engine lines (below move history when enabled) */}
          {engineEnabled && (
            <EngineLines
              evaluation={stockfishEval?.evaluation ?? null}
              additionalPvs={stockfishEval?.additionalPvs}
              fen={currentPosition.fen}
              isAnalyzing={isEngineAnalyzing}
              error={engineError}
              onMovesClick={handleMovesClick}
            />
          )}
        </div>

        {/* Right column: Stats and move tree */}
        <div className="lg:col-span-7 space-y-4">
          {/* Position stats */}
          <PositionStats node={currentNode} />

          {/* Move tree */}
          <MoveTree node={currentNode} onMoveClick={handleMoveClick} />

          {/* Tree info */}
          <div className="text-sm text-muted-foreground text-center">
            {tree.totalGames.toLocaleString()} games with move data
            {tree.gamesWithoutPgn > 0 && (
              <span> ({tree.gamesWithoutPgn.toLocaleString()} excluded - no PGN)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
