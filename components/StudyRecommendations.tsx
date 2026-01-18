'use client';

import { useMemo } from 'react';
import type { Game, StudyRecommendation, RecommendationType } from '@/lib/types';
import { generateRecommendations } from '@/lib/utils';
import Card from './ui/Card';

interface StudyRecommendationsProps {
  games: Game[];
}

const TYPE_ICONS: Record<RecommendationType, string> = {
  opening_study: '📖',
  time_control: '⏱️',
  tactical_pattern: '⚔️',
  endgame: '👑',
  time_management: '⏰',
  mental_game: '🧠',
};

const TYPE_COLORS: Record<RecommendationType, { bg: string; border: string; text: string }> = {
  opening_study: { bg: 'bg-blue-950/30', border: 'border-blue-900/50', text: 'text-blue-400' },
  time_control: { bg: 'bg-purple-950/30', border: 'border-purple-900/50', text: 'text-purple-400' },
  tactical_pattern: { bg: 'bg-orange-950/30', border: 'border-orange-900/50', text: 'text-orange-400' },
  endgame: { bg: 'bg-green-950/30', border: 'border-green-900/50', text: 'text-green-400' },
  time_management: { bg: 'bg-yellow-950/30', border: 'border-yellow-900/50', text: 'text-yellow-400' },
  mental_game: { bg: 'bg-pink-950/30', border: 'border-pink-900/50', text: 'text-pink-400' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'High Priority', color: 'text-red-400 bg-red-950' },
  medium: { label: 'Medium Priority', color: 'text-yellow-400 bg-yellow-950' },
  low: { label: 'Low Priority', color: 'text-muted-foreground bg-secondary' },
};

interface RecommendationCardProps {
  recommendation: StudyRecommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const colors = TYPE_COLORS[recommendation.type];
  const priority = PRIORITY_LABELS[recommendation.priority];
  const icon = TYPE_ICONS[recommendation.type];

  return (
    <div className={`p-5 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-medium ${colors.text}`}>{recommendation.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${priority.color}`}>
              {priority.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>

          {/* Study Items */}
          {recommendation.studyItems.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Study Focus:</div>
              <ul className="space-y-1">
                {recommendation.studyItems.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          <div className="mt-3 text-xs text-muted-foreground">
            <span className="text-muted-foreground">Based on: </span>
            {recommendation.evidence}
          </div>

          {/* Impact Badge */}
          {recommendation.estimatedImpact && (
            <div className="mt-2">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  recommendation.estimatedImpact === 'high'
                    ? 'bg-green-950 text-green-400'
                    : recommendation.estimatedImpact === 'medium'
                    ? 'bg-yellow-950 text-yellow-400'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {recommendation.estimatedImpact.charAt(0).toUpperCase() +
                  recommendation.estimatedImpact.slice(1)}{' '}
                Impact
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudyRecommendations({ games }: StudyRecommendationsProps) {
  const recommendations = useMemo(() => generateRecommendations(games), [games]);

  if (games.length < 10) {
    return (
      <Card
        title="Study Recommendations"
        subtitle="Personalized suggestions to improve your game"
      >
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>Not enough games for recommendations</p>
            <p className="text-sm mt-1">Play at least 10 games to get personalized suggestions</p>
          </div>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card
        title="Study Recommendations"
        subtitle="Personalized suggestions to improve your game"
      >
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Looking Good!</h3>
            <p className="text-sm">
              No major areas of concern detected. Keep playing and we&apos;ll analyze more!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Group recommendations by priority
  const highPriority = recommendations.filter((r) => r.priority === 'high');
  const mediumPriority = recommendations.filter((r) => r.priority === 'medium');
  const lowPriority = recommendations.filter((r) => r.priority === 'low');

  return (
    <Card
      title="Study Recommendations"
      subtitle={`${recommendations.length} personalized suggestions based on your games`}
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-red-950/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{highPriority.length}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
          <div className="bg-yellow-950/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-400">{mediumPriority.length}</div>
            <div className="text-xs text-muted-foreground">Medium Priority</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-muted-foreground">{lowPriority.length}</div>
            <div className="text-xs text-muted-foreground">Low Priority</div>
          </div>
        </div>

        {/* High Priority Recommendations */}
        {highPriority.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
              <span aria-hidden="true">🔥</span>
              Focus on These First
            </h3>
            <div className="space-y-4">
              {highPriority.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority Recommendations */}
        {mediumPriority.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              Worth Addressing
            </h3>
            <div className="space-y-4">
              {mediumPriority.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Low Priority Recommendations */}
        {lowPriority.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <span aria-hidden="true">📝</span>
              Nice to Have
            </h3>
            <div className="space-y-4">
              {lowPriority.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Action Tip */}
        <div className="bg-secondary/50 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg" aria-hidden="true">💡</span>
            <div>
              <h4 className="text-muted-foreground font-medium">How to Use These Recommendations</h4>
              <p className="text-muted-foreground text-sm mt-1">
                Start with high-priority items first. Spend focused practice time on each area 
                before moving to the next. Track your progress by checking back after playing 
                more games.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
