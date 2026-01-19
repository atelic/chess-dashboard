'use client';

import { useState, Fragment } from 'react';
import type { Game, OpponentStats, RatingBracketStats } from '@/lib/types';
import {
  calculateOpponentStats,
  findNemesis,
  findFavoriteOpponent,
  calculateRatingBrackets,
  formatDate,
} from '@/lib/utils';
import Card from './ui/Card';
import GamesTable from './games/GamesTable';

interface OpponentAnalysisProps {
  games: Game[];
  minGames?: number;
}

interface OpponentCardProps {
  opponent: OpponentStats;
  type: 'nemesis' | 'favorite';
}

function OpponentCard({ opponent, type }: OpponentCardProps) {
  const isNemesis = type === 'nemesis';

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
          isNemesis ? 'bg-red-950/50' : 'bg-green-950/50'
        }`}>
          {isNemesis ? '👹' : '🎯'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {isNemesis ? 'Your Nemesis' : 'Favorite Opponent'}
            </span>
          </div>
          <div className="text-xl font-semibold text-foreground mt-1">
            {opponent.username}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Avg rating: {opponent.avgRating}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="text-center">
              <div className={`text-lg font-semibold ${isNemesis ? 'text-red-400' : 'text-green-400'}`}>
                {opponent.winRate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-muted-foreground">{opponent.games}</div>
              <div className="text-xs text-muted-foreground">Games</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                <span className="text-green-400">{opponent.wins}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-red-400">{opponent.losses}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-muted-foreground">{opponent.draws}</span>
              </div>
              <div className="text-xs text-muted-foreground">W-L-D</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            Last played: {formatDate(opponent.lastPlayed)}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface RatingBracketChartProps {
  brackets: RatingBracketStats[];
}

function RatingBracketChart({ brackets }: RatingBracketChartProps) {
  if (brackets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Not enough games for rating analysis
      </div>
    );
  }

  const maxGames = Math.max(...brackets.map(b => b.games));

  return (
    <div className="space-y-3">
      {brackets.map((bracket) => (
        <div key={bracket.bracket} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{bracket.bracket}</span>
            <span className="text-muted-foreground">
              {bracket.games} games ({bracket.winRate.toFixed(0)}% win)
            </span>
          </div>
          <div className="h-6 bg-secondary rounded overflow-hidden flex">
            {/* Proportional bar based on game count */}
            <div 
              className="h-full flex"
              style={{ width: `${(bracket.games / maxGames) * 100}%` }}
            >
              <div 
                className="bg-green-500 h-full"
                style={{ width: `${bracket.winRate}%` }}
              />
              <div 
                className="bg-red-500 h-full"
                style={{ width: `${(bracket.losses / bracket.games) * 100}%` }}
              />
              <div 
                className="bg-muted-foreground h-full"
                style={{ width: `${(bracket.draws / bracket.games) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded" />
          Wins
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" />
          Losses
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-muted-foreground rounded" />
          Draws
        </div>
      </div>
    </div>
  );
}

type SortField = 'games' | 'winRate' | 'avgRating';
type SortDirection = 'asc' | 'desc';

// Helper function to render sort icon - not a component
function renderSortIcon(field: SortField, sortField: SortField, sortDirection: SortDirection) {
  if (sortField !== field) {
    return <span className="text-muted-foreground ml-1">↕</span>;
  }
  return (
    <span className="text-blue-400 ml-1">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
}

interface FrequentOpponentsTableProps {
  opponents: OpponentStats[];
  allGames: Game[];
  limit?: number;
}

function FrequentOpponentsTable({ opponents, allGames, limit = 10 }: FrequentOpponentsTableProps) {
  const [sortField, setSortField] = useState<SortField>('games');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (username: string) => {
    setExpandedOpponent(expandedOpponent === username ? null : username);
  };

  const getGamesForOpponent = (username: string): Game[] => {
    return allGames
      .filter(g => g.opponent.username.toLowerCase() === username.toLowerCase())
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  };

  const sortedOpponents = [...opponents]
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    })
    .slice(0, limit);

  if (opponents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No opponents to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium w-8"></th>
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Opponent</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">
              <button
                type="button"
                onClick={() => handleSort('games')}
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
              >
                Games {renderSortIcon('games', sortField, sortDirection)}
              </button>
            </th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">
              <button
                type="button"
                onClick={() => handleSort('winRate')}
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
              >
                Win Rate {renderSortIcon('winRate', sortField, sortDirection)}
              </button>
            </th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">W/L/D</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">
              <button
                type="button"
                onClick={() => handleSort('avgRating')}
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
              >
                Avg Rating {renderSortIcon('avgRating', sortField, sortDirection)}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedOpponents.map((opp) => {
            const isExpanded = expandedOpponent === opp.username;
            const opponentGames = isExpanded ? getGamesForOpponent(opp.username) : [];

            return (
              <Fragment key={opp.username}>
                <tr
                  className={`border-b border-border/50 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                  }`}
                  onClick={() => handleRowClick(opp.username)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(opp.username);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} games against ${opp.username}`}
                >
                  <td className="py-2 px-2 text-muted-foreground">
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                  <td className="py-2 px-2 text-foreground">{opp.username}</td>
                  <td className="text-right py-2 px-2 text-muted-foreground">{opp.games}</td>
                  <td className="text-right py-2 px-2">
                    <span className={`${
                      opp.winRate >= 60 ? 'text-green-400' :
                      opp.winRate >= 40 ? 'text-muted-foreground' :
                      'text-red-400'
                    }`}>
                      {opp.winRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">
                    <span className="text-green-400">{opp.wins}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-400">{opp.losses}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{opp.draws}</span>
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">{opp.avgRating}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="bg-secondary/20 p-4">
                      <GamesTable 
                        games={opponentGames} 
                        maxRows={10}
                        showOpponent={false}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OpponentAnalysis({ games, minGames = 2 }: OpponentAnalysisProps) {
  const nemesis = findNemesis(games, minGames);
  const favorite = findFavoriteOpponent(games, minGames);
  const ratingBrackets = calculateRatingBrackets(games);
  const allOpponents = calculateOpponentStats(games).filter(o => o.games >= 2);

  const hasNemesisOrFavorite = nemesis || favorite;

  return (
    <div className="space-y-6">
      {/* Nemesis and Favorite Cards */}
      {hasNemesisOrFavorite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nemesis && <OpponentCard opponent={nemesis} type="nemesis" />}
          {favorite && <OpponentCard opponent={favorite} type="favorite" />}
        </div>
      )}

      {/* Rating Brackets */}
      <Card 
        title="Performance by Rating Bracket" 
        subtitle="Win rate against opponents grouped by rating"
      >
        <RatingBracketChart brackets={ratingBrackets} />
      </Card>

      {/* Frequent Opponents Table */}
      <Card 
        title="Frequent Opponents" 
        subtitle="Click a row to view games"
      >
        <FrequentOpponentsTable opponents={allOpponents} allGames={games} />
      </Card>
    </div>
  );
}
