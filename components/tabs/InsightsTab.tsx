'use client';

import type { Game } from '@/lib/types';
import InsightCards from '../InsightCards';
import TerminationChart from '../TerminationChart';
import TimeManagementChart from '../TimeManagementChart';
import TimeOfDayChart from '../TimeOfDayChart';
import Card from '../ui/Card';

interface InsightsTabProps {
  games: Game[];
}

export default function InsightsTab({ games }: InsightsTabProps) {
  return (
    <div className="space-y-6">
      {/* Auto-generated Insights */}
      <Card title="Insights" subtitle="Auto-generated observations about your play">
        <InsightCards games={games} />
      </Card>

      {/* Time of Day Performance */}
      <TimeOfDayChart games={games} />

      {/* Time Management Analysis */}
      <TimeManagementChart games={games} />

      {/* Termination Analysis */}
      <TerminationChart games={games} />
    </div>
  );
}
