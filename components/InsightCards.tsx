'use client';

import { useMemo, memo } from 'react';
import type { Game, Insight } from '@/lib/types';
import { generateInsights } from '@/lib/utils';

interface InsightCardsProps {
  games: Game[];
}

interface InsightCardProps {
  insight: Insight;
}

const InsightCard = memo(function InsightCard({ insight }: InsightCardProps) {
  const bgColors = {
    positive: 'bg-success/10 border-success/20 dark:bg-green-950/30 dark:border-green-900/50',
    negative: 'bg-destructive/10 border-destructive/20 dark:bg-red-950/30 dark:border-red-900/50',
    warning: 'bg-warning/10 border-warning/20 dark:bg-amber-950/30 dark:border-amber-900/50',
    neutral: 'bg-secondary/50 border-border/50',
  };

  const textColors = {
    positive: 'text-green-700 dark:text-green-400',
    negative: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    neutral: 'text-blue-700 dark:text-blue-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${bgColors[insight.type]} transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${textColors[insight.type]}`}>
            {insight.title}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {insight.description}
          </p>
          {insight.value && (
            <p className="text-xs text-muted-foreground mt-2">
              {insight.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default function InsightCards({ games }: InsightCardsProps) {
  // Memoize expensive insight generation
  const insights = useMemo(() => generateInsights(games), [games]);

  // Memoize grouped and ordered insights
  const orderedInsights = useMemo(() => {
    const positiveInsights = insights.filter(i => i.type === 'positive');
    const negativeInsights = insights.filter(i => i.type === 'negative');
    const neutralInsights = insights.filter(i => i.type === 'neutral');
    const warningInsights = insights.filter(i => i.type === 'warning');

    const ordered: Insight[] = [];
    const maxLen = Math.max(
      positiveInsights.length,
      neutralInsights.length,
      negativeInsights.length,
      warningInsights.length
    );

    for (let i = 0; i < maxLen; i++) {
      if (positiveInsights[i]) ordered.push(positiveInsights[i]);
      if (neutralInsights[i]) ordered.push(neutralInsights[i]);
      if (negativeInsights[i]) ordered.push(negativeInsights[i]);
      if (warningInsights[i]) ordered.push(warningInsights[i]);
    }

    return ordered;
  }, [insights]);

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No insights yet</h3>
        <p className="text-sm">Play more games to generate insights about your play style.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orderedInsights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
