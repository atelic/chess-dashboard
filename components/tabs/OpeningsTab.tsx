'use client';

import type { Game } from '@/lib/types';
import OpeningInsights from '../OpeningInsights';

interface OpeningsTabProps {
  games: Game[];
}

export default function OpeningsTab({ games }: OpeningsTabProps) {
  return <OpeningInsights games={games} minGames={3} />;
}
