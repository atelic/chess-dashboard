/**
 * Lichess Cloud Eval API Client
 * 
 * Uses Lichess's cloud evaluation database to get pre-computed analysis
 * for common chess positions. This is faster than local analysis for
 * positions that have already been analyzed.
 * 
 * API Docs: https://lichess.org/api#tag/Analysis
 */

const CLOUD_EVAL_URL = 'https://lichess.org/api/cloud-eval';

/**
 * Cloud evaluation response from Lichess
 */
export interface CloudEval {
  /** FEN of the position */
  fen: string;
  /** Number of nodes analyzed (in thousands) */
  knodes: number;
  /** Depth reached */
  depth: number;
  /** Principal variations */
  pvs: CloudEvalPV[];
}

export interface CloudEvalPV {
  /** Moves in UCI notation, space-separated */
  moves: string;
  /** Centipawn evaluation (positive = white advantage) */
  cp?: number;
  /** Mate in N moves (positive = white wins) */
  mate?: number;
}

/**
 * Standardized evaluation result
 */
export interface Evaluation {
  /** Centipawn score (positive = white advantage) */
  score: number;
  /** Mate in N moves (null if not a forced mate) */
  mate: number | null;
  /** Best move in UCI notation */
  bestMove: string;
  /** Depth of analysis */
  depth: number;
  /** Principal variation (best line) in UCI notation */
  pv: string[];
  /** Source of this evaluation */
  source: 'cloud' | 'local';
}

/**
 * Fetch cloud evaluation for a position
 * 
 * @param fen - FEN string of the position
 * @param multiPv - Number of principal variations to return (1-5)
 * @returns Evaluation or null if position not in cloud database
 */
export async function getCloudEval(
  fen: string,
  multiPv: number = 1
): Promise<Evaluation | null> {
  try {
    const params = new URLSearchParams({
      fen,
      multiPv: multiPv.toString(),
    });

    const response = await fetch(`${CLOUD_EVAL_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    // 404 means position not in cloud database
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error(`Cloud eval failed: ${response.status}`);
      return null;
    }

    const data: CloudEval = await response.json();
    
    if (!data.pvs || data.pvs.length === 0) {
      return null;
    }

    const bestPv = data.pvs[0];
    const moves = bestPv.moves.split(' ');

    return {
      score: bestPv.cp ?? (bestPv.mate ? (bestPv.mate > 0 ? 10000 : -10000) : 0),
      mate: bestPv.mate ?? null,
      bestMove: moves[0] || '',
      depth: data.depth,
      pv: moves,
      source: 'cloud',
    };
  } catch (error) {
    console.error('Cloud eval error:', error);
    return null;
  }
}

/**
 * Convert centipawn score to human-readable format
 */
export function formatScore(score: number, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? `M${mate}` : `M${-mate}`;
  }
  
  const pawns = score / 100;
  const sign = pawns >= 0 ? '+' : '';
  return `${sign}${pawns.toFixed(2)}`;
}

/**
 * Classify a move based on centipawn loss
 */
export type MoveClassification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export function classifyMove(cpLoss: number): MoveClassification {
  if (cpLoss <= 10) return 'best';
  if (cpLoss <= 25) return 'excellent';
  if (cpLoss <= 50) return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 200) return 'mistake';
  return 'blunder';
}

/**
 * Get CSS color for move classification
 */
export function getClassificationColor(classification: MoveClassification): string {
  switch (classification) {
    case 'best':
      return '#22c55e'; // green-500
    case 'excellent':
      return '#84cc16'; // lime-500
    case 'good':
      return '#a3e635'; // lime-400
    case 'inaccuracy':
      return '#eab308'; // yellow-500
    case 'mistake':
      return '#f97316'; // orange-500
    case 'blunder':
      return '#ef4444'; // red-500
  }
}
