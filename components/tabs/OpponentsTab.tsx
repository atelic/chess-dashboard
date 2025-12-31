'use client';

import type { Game } from '@/lib/types';
import OpponentAnalysis from '../OpponentAnalysis';

interface OpponentsTabProps {
  games: Game[];
}

export default function OpponentsTab({ games }: OpponentsTabProps) {
  return <OpponentAnalysis games={games} minGames={2} />;
}
