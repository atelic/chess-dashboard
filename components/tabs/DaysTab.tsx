'use client';

import type { Game } from '@/lib/types';
import DayPerformance from '../DayPerformance';

interface DaysTabProps {
  games: Game[];
}

export default function DaysTab({ games }: DaysTabProps) {
  return <DayPerformance games={games} />;
}
