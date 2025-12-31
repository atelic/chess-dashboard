'use client';

import { useState } from 'react';
import type { Game, OpponentStats, RatingBracketStats } from '@/lib/types';
import {
  calculateOpponentStats,
  findNemesis,
  findFavoriteOpponent,
  calculateRatingBrackets,
  formatDate,
} from '@/lib/utils';
import Card from './ui/Card';

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
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              {isNemesis ? 'Your Nemesis' : 'Favorite Opponent'}
            </span>
          </div>
          <div className="text-xl font-semibold text-zinc-100 mt-1">
            {opponent.username}
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            Avg rating: {opponent.avgRating}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="text-center">
              <div className={`text-lg font-semibold ${isNemesis ? 'text-red-400' : 'text-green-400'}`}>
                {opponent.winRate.toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-zinc-300">{opponent.games}</div>
              <div className="text-xs text-zinc-500">Games</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                <span className="text-green-400">{opponent.wins}</span>
                <span className="text-zinc-600">-</span>
                <span className="text-red-400">{opponent.losses}</span>
                <span className="text-zinc-600">-</span>
                <span className="text-zinc-400">{opponent.draws}</span>
              </div>
              <div className="text-xs text-zinc-500">W-L-D</div>
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-3">
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
      <div className="text-center py-8 text-zinc-500">
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
            <span className="text-zinc-400">{bracket.bracket}</span>
            <span className="text-zinc-500">
              {bracket.games} games ({bracket.winRate.toFixed(0)}% win)
            </span>
          </div>
          <div className="h-6 bg-zinc-800 rounded overflow-hidden flex">
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
                className="bg-zinc-500 h-full"
                style={{ width: `${(bracket.draws / bracket.games) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded" />
          Wins
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" />
          Losses
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-zinc-500 rounded" />
          Draws
        </div>
      </div>
    </div>
  );
}

type SortField = 'games' | 'winRate' | 'avgRating';
type SortDirection = 'asc' | 'desc';

interface FrequentOpponentsTableProps {
  opponents: OpponentStats[];
  limit?: number;
}

function FrequentOpponentsTable({ opponents, limit = 10 }: FrequentOpponentsTableProps) {
  const [sortField, setSortField] = useState<SortField>('games');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOpponents = [...opponents]
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    })
    .slice(0, limit);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-zinc-600 ml-1">↕</span>;
    }
    return (
      <span className="text-blue-400 ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (opponents.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No opponents to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-2 px-2 text-zinc-400 font-medium">Opponent</th>
            <th 
              className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('games')}
            >
              Games <SortIcon field="games" />
            </th>
            <th 
              className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('winRate')}
            >
              Win Rate <SortIcon field="winRate" />
            </th>
            <th className="text-right py-2 px-2 text-zinc-400 font-medium">W/L/D</th>
            <th 
              className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('avgRating')}
            >
              Avg Rating <SortIcon field="avgRating" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedOpponents.map((opp) => (
            <tr key={opp.username} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-2 px-2 text-zinc-200">{opp.username}</td>
              <td className="text-right py-2 px-2 text-zinc-300">{opp.games}</td>
              <td className="text-right py-2 px-2">
                <span className={`${
                  opp.winRate >= 60 ? 'text-green-400' :
                  opp.winRate >= 40 ? 'text-zinc-300' :
                  'text-red-400'
                }`}>
                  {opp.winRate.toFixed(0)}%
                </span>
              </td>
              <td className="text-right py-2 px-2 text-zinc-400">
                <span className="text-green-400">{opp.wins}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-red-400">{opp.losses}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400">{opp.draws}</span>
              </td>
              <td className="text-right py-2 px-2 text-zinc-400">{opp.avgRating}</td>
            </tr>
          ))}
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
        subtitle="Opponents you've played at least twice"
      >
        <FrequentOpponentsTable opponents={allOpponents} />
      </Card>
    </div>
  );
}
