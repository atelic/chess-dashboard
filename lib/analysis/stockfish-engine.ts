/**
 * Stockfish Engine Wrapper
 * 
 * Provides a promise-based interface for the Stockfish WASM engine.
 * Runs in a Web Worker to avoid blocking the main thread.
 * 
 * Note: This requires the stockfish.js file to be in the public folder.
 * Copy from node_modules/stockfish.wasm/stockfish.js to public/stockfish/
 */

import type { Evaluation, MoveClassification } from './lichess-cloud-eval';
import { classifyMove } from './lichess-cloud-eval';

/**
 * Analysis result for a single move
 */
export interface MoveAnalysis {
  /** Move number (1-indexed) */
  moveNumber: number;
  /** FEN position before the move */
  fen: string;
  /** The move played (SAN notation) */
  move: string;
  /** The move played (UCI notation) */
  moveUci: string;
  /** Evaluation before the move */
  evalBefore: Evaluation | null;
  /** Evaluation after the move */
  evalAfter: Evaluation | null;
  /** Centipawn loss compared to best move */
  cpLoss: number;
  /** Best move according to engine */
  bestMove: string | null;
  /** Move classification */
  classification: MoveClassification;
}

/**
 * Full game analysis result
 */
export interface GameAnalysis {
  /** Game ID */
  gameId: string;
  /** Per-move analysis */
  moves: MoveAnalysis[];
  /** Overall accuracy (0-100) */
  accuracy: number;
  /** Number of blunders */
  blunders: number;
  /** Number of mistakes */
  mistakes: number;
  /** Number of inaccuracies */
  inaccuracies: number;
  /** Average centipawn loss */
  acpl: number;
  /** When the analysis was performed */
  analyzedAt: Date;
}

/**
 * Stockfish Engine class
 * 
 * Usage:
 * ```typescript
 * const engine = new StockfishEngine();
 * await engine.init();
 * const eval = await engine.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
 * engine.destroy();
 * ```
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private pendingResolve: ((value: string) => void) | null = null;
  private messageBuffer: string[] = [];
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the Stockfish engine
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          reject(new Error('Stockfish can only run in browser environment'));
          return;
        }

        // Create a web worker from the stockfish.js file
        this.worker = new Worker('/stockfish/stockfish.js');
        
        this.worker.onmessage = (event) => {
          const message = event.data as string;
          this.handleMessage(message);
        };

        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          reject(error);
        };

        // Initialize UCI mode
        this.postMessage('uci');
        
        // Wait for uciok
        const checkReady = () => {
          if (this.messageBuffer.some(m => m.includes('uciok'))) {
            this.isReady = true;
            this.messageBuffer = [];
            // Set reasonable defaults
            this.postMessage('setoption name Threads value 1');
            this.postMessage('setoption name Hash value 16');
            this.postMessage('isready');
            
            const checkReadyOk = setInterval(() => {
              if (this.messageBuffer.some(m => m.includes('readyok'))) {
                clearInterval(checkReadyOk);
                this.messageBuffer = [];
                resolve();
              }
            }, 10);
          }
        };
        
        const interval = setInterval(() => {
          checkReady();
          if (this.isReady) {
            clearInterval(interval);
          }
        }, 10);

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isReady) {
            clearInterval(interval);
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Post a message to the worker
   */
  private postMessage(message: string): void {
    if (this.worker) {
      this.worker.postMessage(message);
    }
  }

  /**
   * Handle incoming messages from the worker
   */
  private handleMessage(message: string): void {
    this.messageBuffer.push(message);
    
    // If we're waiting for a result and got the final line
    if (this.pendingResolve && message.startsWith('bestmove')) {
      this.pendingResolve(this.messageBuffer.join('\n'));
      this.pendingResolve = null;
      this.messageBuffer = [];
    }
  }

  /**
   * Analyze a position and return the evaluation
   */
  async analyze(fen: string, depth: number = 18): Promise<Evaluation> {
    if (!this.isReady || !this.worker) {
      throw new Error('Stockfish not initialized. Call init() first.');
    }

    return new Promise((resolve, reject) => {
      this.messageBuffer = [];
      this.pendingResolve = (output) => {
        try {
          const evaluation = this.parseOutput(output);
          resolve(evaluation);
        } catch (error) {
          reject(error);
        }
      };

      // Set position and search
      this.postMessage(`position fen ${fen}`);
      this.postMessage(`go depth ${depth}`);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingResolve) {
          this.postMessage('stop');
          reject(new Error('Analysis timeout'));
          this.pendingResolve = null;
        }
      }, 30000);
    });
  }

  /**
   * Parse UCI output to extract evaluation
   */
  private parseOutput(output: string): Evaluation {
    const lines = output.split('\n');
    
    // Find the last info line with score
    let lastInfo: string | null = null;
    let bestMove = '';

    for (const line of lines) {
      if (line.startsWith('info') && line.includes('score')) {
        lastInfo = line;
      }
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        bestMove = parts[1] || '';
      }
    }

    if (!lastInfo) {
      throw new Error('No evaluation found in output');
    }

    // Parse score
    let score = 0;
    let mate: number | null = null;
    
    const cpMatch = lastInfo.match(/score cp (-?\d+)/);
    const mateMatch = lastInfo.match(/score mate (-?\d+)/);
    
    if (cpMatch) {
      score = parseInt(cpMatch[1], 10);
    } else if (mateMatch) {
      mate = parseInt(mateMatch[1], 10);
      score = mate > 0 ? 10000 - mate : -10000 - mate;
    }

    // Parse depth
    const depthMatch = lastInfo.match(/depth (\d+)/);
    const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;

    // Parse PV
    const pvMatch = lastInfo.match(/pv (.+)$/);
    const pv = pvMatch ? pvMatch[1].split(' ') : [];

    return {
      score,
      mate,
      bestMove,
      depth,
      pv,
      source: 'local',
    };
  }

  /**
   * Stop current analysis
   */
  stop(): void {
    if (this.worker) {
      this.postMessage('stop');
    }
  }

  /**
   * Destroy the engine and clean up resources
   */
  destroy(): void {
    if (this.worker) {
      this.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.initPromise = null;
  }
}

/**
 * Calculate accuracy from centipawn loss
 * Uses a formula similar to Lichess
 */
export function calculateAccuracy(acpl: number): number {
  // Formula based on Lichess accuracy calculation
  // Higher ACPL = lower accuracy
  const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * acpl) - 3.1668));
  return Math.round(accuracy);
}

/**
 * Calculate ACPL from a list of centipawn losses
 */
export function calculateAcpl(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 0;
  return cpLosses.reduce((sum, loss) => sum + loss, 0) / cpLosses.length;
}

/**
 * Count move classifications
 */
export function countClassifications(moves: MoveAnalysis[]): {
  blunders: number;
  mistakes: number;
  inaccuracies: number;
} {
  let blunders = 0, mistakes = 0, inaccuracies = 0;
  
  for (const move of moves) {
    switch (move.classification) {
      case 'blunder':
        blunders++;
        break;
      case 'mistake':
        mistakes++;
        break;
      case 'inaccuracy':
        inaccuracies++;
        break;
    }
  }
  
  return { blunders, mistakes, inaccuracies };
}

// Re-export for convenience
export { classifyMove };
export type { MoveClassification };
