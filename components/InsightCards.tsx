'use client';

import type { Game, Insight } from '@/lib/types';
import { generateInsights } from '@/lib/utils';

interface InsightCardsProps {
  games: Game[];
}

interface InsightCardProps {
  insight: Insight;
}

function InsightCard({ insight }: InsightCardProps) {
  const bgColors = {
    positive: 'bg-green-950/30 border-green-900/50',
    negative: 'bg-red-950/30 border-red-900/50',
    warning: 'bg-amber-950/30 border-amber-900/50',
    neutral: 'bg-zinc-800/50 border-zinc-700/50',
  };

  const textColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    warning: 'text-amber-400',
    neutral: 'text-blue-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${bgColors[insight.type]} transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${textColors[insight.type]}`}>
            {insight.title}
          </h4>
          <p className="text-sm text-zinc-300 mt-1">
            {insight.description}
          </p>
          {insight.value && (
            <p className="text-xs text-zinc-500 mt-2">
              {insight.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightCards({ games }: InsightCardsProps) {
  const insights = generateInsights(games);

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-zinc-400 mb-2">No insights yet</h3>
        <p className="text-sm">Play more games to generate insights about your play style.</p>
      </div>
    );
  }

  // Group insights by type for display
  const positiveInsights = insights.filter(i => i.type === 'positive');
  const negativeInsights = insights.filter(i => i.type === 'negative');
  const neutralInsights = insights.filter(i => i.type === 'neutral');
  const warningInsights = insights.filter(i => i.type === 'warning');

  // Interleave for visual variety: positive, neutral, negative, warning pattern
  const orderedInsights: Insight[] = [];
  const maxLen = Math.max(
    positiveInsights.length,
    neutralInsights.length,
    negativeInsights.length,
    warningInsights.length
  );

  for (let i = 0; i < maxLen; i++) {
    if (positiveInsights[i]) orderedInsights.push(positiveInsights[i]);
    if (neutralInsights[i]) orderedInsights.push(neutralInsights[i]);
    if (negativeInsights[i]) orderedInsights.push(negativeInsights[i]);
    if (warningInsights[i]) orderedInsights.push(warningInsights[i]);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orderedInsights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
