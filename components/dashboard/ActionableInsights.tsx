'use client';

import * as React from 'react';
import { AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Insight } from '@/lib/types';

interface ActionableInsightsProps {
  insights: Insight[];
  maxItems?: number;
  className?: string;
}

function InsightIcon({ type }: { type: Insight['type'] }) {
  switch (type) {
    case 'positive':
      return <TrendingUp className="h-4 w-4 text-success" />;
    case 'negative':
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    default:
      return <Lightbulb className="h-4 w-4 text-primary" />;
  }
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card
      className={cn(
        'p-4 border-l-4',
        insight.type === 'positive' && 'border-l-success',
        insight.type === 'negative' && 'border-l-destructive',
        insight.type === 'warning' && 'border-l-warning',
        insight.type === 'neutral' && 'border-l-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          insight.type === 'positive' && 'bg-success/10',
          insight.type === 'negative' && 'bg-destructive/10',
          insight.type === 'warning' && 'bg-warning/10',
          insight.type === 'neutral' && 'bg-primary/10'
        )} aria-hidden="true">
          <InsightIcon type={insight.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground text-sm">{insight.title}</h4>
            <Badge variant={
              insight.type === 'positive' ? 'success' :
              insight.type === 'negative' ? 'destructive' :
              insight.type === 'warning' ? 'warning' : 'secondary'
            } className="text-[10px] px-1.5 py-0">
              {insight.type === 'positive' ? 'Strength' :
               insight.type === 'negative' || insight.type === 'warning' ? 'Focus' : 'Info'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{insight.value}</p>
        </div>
        
      </div>
    </Card>
  );
}

export function ActionableInsights({ insights, maxItems = 4, className }: ActionableInsightsProps) {
  // Prioritize: show negatives/warnings first (areas to improve), then positives
  const sortedInsights = React.useMemo(() => {
    const priorityOrder: Record<Insight['type'], number> = {
      negative: 0,
      warning: 1,
      positive: 2,
      neutral: 3,
    };

    return [...insights]
      .sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type])
      .slice(0, maxItems);
  }, [insights, maxItems]);

  if (sortedInsights.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-foreground">Key Insights</h2>
        <span className="text-small text-muted-foreground">
          {insights.length} total insights
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

export default ActionableInsights;
