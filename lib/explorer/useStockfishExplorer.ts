'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Evaluation } from '@/lib/analysis/lichess-cloud-eval';
import { getCloudEvalMultiPv } from '@/lib/analysis/lichess-cloud-eval';
import { StockfishEngine } from '@/lib/analysis/stockfish-engine';

interface MultiPvEvaluation {
  /** Primary evaluation */
  evaluation: Evaluation;
  /** Additional principal variations */
  additionalPvs: Evaluation[];
  /** Whether still analyzing */
  isAnalyzing: boolean;
}

interface UseStockfishExplorerOptions {
  /** Whether engine is enabled */
  enabled: boolean;
  /** Analysis depth for local engine */
  depth?: number;
  /** Number of principal variations to calculate */
  multiPv?: number;
}

interface UseStockfishExplorerResult {
  /** Current evaluation (null if not ready or disabled) */
  evaluation: MultiPvEvaluation | null;
  /** Whether the engine is currently analyzing */
  isAnalyzing: boolean;
  /** Whether the engine is initializing */
  isInitializing: boolean;
  /** Error message if something went wrong */
  error: string | null;
}

/**
 * Hook for managing chess position analysis in the Explorer view.
 * Uses Lichess Cloud Eval for fast results on common positions,
 * with local Stockfish WASM as fallback for rare positions.
 */
export function useStockfishExplorer(
  fen: string,
  options: UseStockfishExplorerOptions
): UseStockfishExplorerResult {
  const { enabled, depth = 18, multiPv = 2 } = options;

  const [evaluation, setEvaluation] = useState<MultiPvEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to manage engine lifecycle
  const engineRef = useRef<StockfishEngine | null>(null);
  const currentFenRef = useRef<string>('');
  const analysisAbortedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const engineInitAttemptedRef = useRef(false);
  const engineInitFailedRef = useRef(false);

  // Cache for evaluated positions
  const cacheRef = useRef<Map<string, MultiPvEvaluation>>(new Map());

  // Keep enabled ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Clean up engine when disabled
  useEffect(() => {
    if (!enabled) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      engineInitAttemptedRef.current = false;
    }
  }, [enabled]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Initialize local engine (lazy - only when needed)
  const initLocalEngine = useCallback(async (): Promise<boolean> => {
    if (engineRef.current) return true;
    if (engineInitFailedRef.current) return false;
    if (engineInitAttemptedRef.current) return false;

    engineInitAttemptedRef.current = true;
    setIsInitializing(true);

    try {
      const engine = new StockfishEngine();
      await engine.init();
      engineRef.current = engine;
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.warn('Local Stockfish unavailable:', err);
      engineInitFailedRef.current = true;
      setIsInitializing(false);
      return false;
    }
  }, []);

  // Analyze position using cloud eval first, local Stockfish as fallback
  const analyzePosition = useCallback(async () => {
    if (!enabledRef.current || !fen) {
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(fen);
    if (cached) {
      setEvaluation(cached);
      setIsAnalyzing(false);
      return;
    }

    currentFenRef.current = fen;
    analysisAbortedRef.current = false;
    setIsAnalyzing(true);
    setError(null);

    try {
      // Try cloud eval first (with multiple PVs in single request)
      const cloudResults = await getCloudEvalMultiPv(fen, multiPv);

      if (analysisAbortedRef.current || currentFenRef.current !== fen || !enabledRef.current) {
        return;
      }

      let results: Evaluation[] = cloudResults;

      // If no cloud results, try local engine
      if (results.length === 0) {
        const hasEngine = await initLocalEngine();

        if (hasEngine && engineRef.current && currentFenRef.current === fen && enabledRef.current) {
          const localResult = await engineRef.current.analyze(fen, depth);
          results = [localResult];
        } else if (!hasEngine) {
          setError('Position not in cloud database');
          setIsAnalyzing(false);
          return;
        }
      }

      // Final update if we got results
      if (currentFenRef.current === fen && !analysisAbortedRef.current && enabledRef.current && results.length > 0) {
        const finalEval: MultiPvEvaluation = {
          evaluation: results[0],
          additionalPvs: results.slice(1),
          isAnalyzing: false,
        };

        // Cache the result
        cacheRef.current.set(fen, finalEval);

        // Limit cache size
        if (cacheRef.current.size > 100) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }

        setEvaluation(finalEval);
        setIsAnalyzing(false);
      }
    } catch (err) {
      if (currentFenRef.current === fen && !analysisAbortedRef.current && enabledRef.current) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
        setIsAnalyzing(false);
      }
    }
  }, [fen, depth, multiPv, initLocalEngine]);

  // Trigger analysis when FEN changes
  useEffect(() => {
    if (enabled) {
      // Stop any ongoing analysis
      if (engineRef.current) {
        engineRef.current.stop();
      }
      analysisAbortedRef.current = true;

      // Small delay to allow stop to process
      const timeoutId = setTimeout(() => {
        analysisAbortedRef.current = false;
        analyzePosition();
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        analysisAbortedRef.current = true;
      };
    }
  }, [enabled, fen, analyzePosition]);

  // Return disabled state values when not enabled
  const result = useMemo((): UseStockfishExplorerResult => {
    if (!enabled) {
      return {
        evaluation: null,
        isAnalyzing: false,
        isInitializing: false,
        error: null,
      };
    }
    return {
      evaluation,
      isAnalyzing,
      isInitializing,
      error,
    };
  }, [enabled, evaluation, isAnalyzing, isInitializing, error]);

  return result;
}
