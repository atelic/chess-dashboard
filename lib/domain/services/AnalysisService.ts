/**
 * Analysis Service
 * 
 * Provides game analysis using a hybrid approach:
 * 1. First tries Lichess Cloud Eval (fast, pre-computed)
 * 2. Falls back to local Stockfish WASM (slower, but always available)
 */

import {
  getCloudEval,
  type Evaluation,
  classifyMove,
  type MoveClassification,
} from '@/lib/analysis/lichess-cloud-eval';
import {
  StockfishEngine,
  type MoveAnalysis,
  type GameAnalysis,
  calculateAccuracy,
  calculateAcpl,
  countClassifications,
} from '@/lib/analysis/stockfish-engine';

/**
 * Progress callback for game analysis
 */
export type AnalysisProgressCallback = (progress: number, message: string) => void;

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Depth for local analysis (default: 16) */
  depth?: number;
  /** Whether to use cloud evaluation (default: true) */
  useCloud?: boolean;
  /** Progress callback */
  onProgress?: AnalysisProgressCallback;
}

/**
 * Analysis Service class
 */
export class AnalysisService {
  private engine: StockfishEngine | null = null;

  /**
   * Initialize the local Stockfish engine (optional, only needed for local analysis)
   */
  async initEngine(): Promise<void> {
    if (this.engine) return;
    
    this.engine = new StockfishEngine();
    await this.engine.init();
  }

  /**
   * Destroy the engine and clean up resources
   */
  destroyEngine(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
  }

  /**
   * Analyze a single position
   * 
   * @param fen - FEN string of the position
   * @param options - Analysis options
   * @returns Evaluation of the position
   */
  async analyzePosition(
    fen: string,
    options: AnalysisOptions = {}
  ): Promise<Evaluation> {
    const { depth = 16, useCloud = true } = options;

    // Try cloud evaluation first
    if (useCloud) {
      const cloudEval = await getCloudEval(fen);
      if (cloudEval) {
        return cloudEval;
      }
    }

    // Fall back to local analysis
    await this.initEngine();
    return this.engine!.analyze(fen, depth);
  }

  /**
   * Analyze an entire game
   * 
   * @param gameId - Game ID for reference
   * @param fens - Array of FEN positions (one per ply)
   * @param moves - Array of moves in UCI notation
   * @param playerColor - Which color the player is ('white' | 'black')
   * @param options - Analysis options
   * @returns Full game analysis
   */
  async analyzeGame(
    gameId: string,
    fens: string[],
    moves: string[],
    playerColor: 'white' | 'black',
    options: AnalysisOptions = {}
  ): Promise<GameAnalysis> {
    const { onProgress } = options;
    const moveAnalyses: MoveAnalysis[] = [];
    const cpLosses: number[] = [];

    // Analyze each position
    for (let i = 0; i < fens.length && i < moves.length; i++) {
      const isPlayerMove = (i % 2 === 0 && playerColor === 'white') ||
                          (i % 2 === 1 && playerColor === 'black');

      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / fens.length) * 100;
        onProgress(progress, `Analyzing move ${Math.floor(i / 2) + 1}...`);
      }

      // Get evaluation before the move
      const evalBefore = await this.analyzePosition(fens[i], options);

      // Get evaluation after the move (next position)
      let evalAfter: Evaluation | null = null;
      if (i + 1 < fens.length) {
        evalAfter = await this.analyzePosition(fens[i + 1], options);
      }

      // Calculate centipawn loss for player's moves
      let cpLoss = 0;
      let classification: MoveClassification = 'good';

      if (isPlayerMove && evalBefore && evalAfter) {
        // Calculate loss from the player's perspective
        const scoreBefore = playerColor === 'white' ? evalBefore.score : -evalBefore.score;
        const scoreAfter = playerColor === 'white' ? evalAfter.score : -evalAfter.score;
        
        // Loss = how much worse the position got after the move
        cpLoss = Math.max(0, scoreBefore - scoreAfter);
        classification = classifyMove(cpLoss);
        cpLosses.push(cpLoss);
      }

      moveAnalyses.push({
        moveNumber: Math.floor(i / 2) + 1,
        fen: fens[i],
        move: moves[i], // This should be converted to SAN if possible
        moveUci: moves[i],
        evalBefore,
        evalAfter,
        cpLoss,
        bestMove: evalBefore?.bestMove || null,
        classification,
      });
    }

    // Calculate summary statistics
    const acpl = calculateAcpl(cpLosses);
    const accuracy = calculateAccuracy(acpl);
    const { blunders, mistakes, inaccuracies } = countClassifications(moveAnalyses);

    if (onProgress) {
      onProgress(100, 'Analysis complete');
    }

    return {
      gameId,
      moves: moveAnalyses,
      accuracy,
      blunders,
      mistakes,
      inaccuracies,
      acpl,
      analyzedAt: new Date(),
    };
  }

  /**
   * Quick analysis - only analyze critical positions
   * 
   * @param gameId - Game ID
   * @param fens - Array of FEN positions
   * @param moves - Array of moves
   * @param playerColor - Player's color
   * @returns Summary analysis (faster than full analysis)
   */
  async quickAnalysis(
    gameId: string,
    fens: string[],
    moves: string[],
    playerColor: 'white' | 'black'
  ): Promise<Pick<GameAnalysis, 'gameId' | 'accuracy' | 'blunders' | 'mistakes' | 'inaccuracies' | 'acpl' | 'analyzedAt'>> {
    // Only analyze every 5th position for speed
    const sampleIndices: number[] = [];
    
    for (let i = 0; i < fens.length; i += 5) {
      sampleIndices.push(i);
    }

    const cpLosses: number[] = [];
    let blunders = 0, mistakes = 0, inaccuracies = 0;
    let playerMovesAnalyzed = 0;

    // Count total player moves in the game
    const totalPlayerMoves = Math.ceil(fens.length / 2);

    for (const i of sampleIndices) {
      if (i >= fens.length || i >= moves.length) continue;

      const isPlayerMove = (i % 2 === 0 && playerColor === 'white') ||
                          (i % 2 === 1 && playerColor === 'black');

      if (!isPlayerMove) continue;

      const evalBefore = await this.analyzePosition(fens[i], { depth: 12 });
      
      if (i + 1 < fens.length) {
        const evalAfter = await this.analyzePosition(fens[i + 1], { depth: 12 });
        
        const scoreBefore = playerColor === 'white' ? evalBefore.score : -evalBefore.score;
        const scoreAfter = playerColor === 'white' ? evalAfter.score : -evalAfter.score;
        
        const cpLoss = Math.max(0, scoreBefore - scoreAfter);
        cpLosses.push(cpLoss);
        playerMovesAnalyzed++;

        const classification = classifyMove(cpLoss);
        if (classification === 'blunder') blunders++;
        else if (classification === 'mistake') mistakes++;
        else if (classification === 'inaccuracy') inaccuracies++;
      }
    }

    // Extrapolate to full game based on actual player moves analyzed
    const multiplier = playerMovesAnalyzed > 0 ? totalPlayerMoves / playerMovesAnalyzed : 1;
    
    return {
      gameId,
      accuracy: calculateAccuracy(calculateAcpl(cpLosses)),
      blunders: Math.round(blunders * multiplier),
      mistakes: Math.round(mistakes * multiplier),
      inaccuracies: Math.round(inaccuracies * multiplier),
      acpl: calculateAcpl(cpLosses),
      analyzedAt: new Date(),
    };
  }
}

// Singleton instance
let analysisServiceInstance: AnalysisService | null = null;

/**
 * Get the analysis service singleton
 */
export function getAnalysisService(): AnalysisService {
  if (!analysisServiceInstance) {
    analysisServiceInstance = new AnalysisService();
  }
  return analysisServiceInstance;
}
