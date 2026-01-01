'use client';

import { useState, Fragment } from 'react';
import type { Game, OpeningByColorStats, PlayerColor } from '@/lib/types';
import { findBestOpenings, findWorstOpenings, calculateOpeningsByColor } from '@/lib/utils';
import Card from './ui/Card';
import GamesTable from './games/GamesTable';

interface OpeningInsightsProps {
  games: Game[];
  minGames?: number;
}

type SortField = 'games' | 'winRate' | 'avgOpponentRating';
type SortDirection = 'asc' | 'desc';

interface OpeningTableProps {
  openings: OpeningByColorStats[];
  title: string;
  allGames: Game[];
}

// Helper function to render sort icon - not a component
function renderSortIcon(field: SortField, sortField: SortField, sortDirection: SortDirection) {
  if (sortField !== field) {
    return <span className="text-zinc-600 ml-1">↕</span>;
  }
  return (
    <span className="text-blue-400 ml-1">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function OpeningTable({ openings, title, allGames }: OpeningTableProps) {
  const [sortField, setSortField] = useState<SortField>('games');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedEco, setExpandedEco] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOpenings = [...openings].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const handleRowClick = (eco: string) => {
    setExpandedEco(expandedEco === eco ? null : eco);
  };

  // Get games for expanded opening (filtered client-side from already-loaded games)
  const getGamesForOpening = (eco: string, color: PlayerColor): Game[] => {
    return allGames
      .filter(g => g.opening.eco === eco && g.playerColor === color)
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  };

  if (openings.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        Not enough games to show openings
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-400 mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 px-2 text-zinc-400 font-medium w-8"></th>
              <th className="text-left py-2 px-2 text-zinc-400 font-medium">Opening</th>
              <th 
                className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort('games')}
              >
                Games {renderSortIcon('games', sortField, sortDirection)}
              </th>
              <th 
                className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort('winRate')}
              >
                Win Rate {renderSortIcon('winRate', sortField, sortDirection)}
              </th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">W/L/D</th>
              <th 
                className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort('avgOpponentRating')}
              >
                Avg Opp {renderSortIcon('avgOpponentRating', sortField, sortDirection)}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOpenings.map((opening) => {
              const isExpanded = expandedEco === opening.eco;
              const openingGames = isExpanded ? getGamesForOpening(opening.eco, opening.color) : [];

              return (
                <Fragment key={opening.eco}>
                  <tr 
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'
                    }`}
                    onClick={() => handleRowClick(opening.eco)}
                  >
                    <td className="py-2 px-2 text-zinc-500">
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-zinc-200">{opening.name}</span>
                      <span className="text-zinc-500 ml-2 text-xs">({opening.eco})</span>
                    </td>
                    <td className="text-right py-2 px-2 text-zinc-300">{opening.games}</td>
                    <td className="text-right py-2 px-2">
                      <span className={`${
                        opening.winRate >= 60 ? 'text-green-400' : 
                        opening.winRate >= 40 ? 'text-zinc-300' : 
                        'text-red-400'
                      }`}>
                        {opening.winRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 text-zinc-400">
                      <span className="text-green-400">{opening.wins}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-red-400">{opening.losses}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-zinc-400">{opening.draws}</span>
                    </td>
                    <td className="text-right py-2 px-2 text-zinc-400">{opening.avgOpponentRating}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-zinc-800/20 p-4">
                        <GamesTable 
                          games={openingGames} 
                          maxRows={10} 
                          showOpening={false}
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
    </div>
  );
}

interface OpeningHighlightProps {
  opening: OpeningByColorStats;
  type: 'best' | 'worst';
}

function OpeningHighlight({ opening, type }: OpeningHighlightProps) {
  const isBest = type === 'best';
  
  return (
    <div className={`p-4 rounded-lg border ${
      isBest ? 'bg-green-950/30 border-green-900/50' : 'bg-red-950/30 border-red-900/50'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{isBest ? '📈' : '📉'}</span>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {isBest ? 'Best' : 'Needs Work'}
        </span>
      </div>
      <div className="text-zinc-200 font-medium">{opening.name}</div>
      <div className="text-xs text-zinc-500">({opening.eco})</div>
      <div className={`text-lg font-semibold mt-1 ${
        isBest ? 'text-green-400' : 'text-red-400'
      }`}>
        {opening.winRate.toFixed(0)}% win rate
      </div>
      <div className="text-xs text-zinc-500">
        {opening.wins}W / {opening.losses}L / {opening.draws}D ({opening.games} games)
      </div>
    </div>
  );
}

export default function OpeningInsights({ games, minGames = 3 }: OpeningInsightsProps) {
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('white');

  const bestWhite = findBestOpenings(games, 'white', minGames, 1)[0];
  const worstWhite = findWorstOpenings(games, 'white', minGames, 1)[0];
  const bestBlack = findBestOpenings(games, 'black', minGames, 1)[0];
  const worstBlack = findWorstOpenings(games, 'black', minGames, 1)[0];

  const allOpeningsForColor = calculateOpeningsByColor(games, selectedColor)
    .filter(o => o.games >= minGames);

  const hasHighlights = bestWhite || worstWhite || bestBlack || worstBlack;

  return (
    <div className="space-y-6">
      {/* Highlights Section */}
      {hasHighlights && (
        <Card title="Opening Highlights" subtitle={`Minimum ${minGames} games to qualify`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* As White */}
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <span className="w-4 h-4 bg-white rounded-sm border border-zinc-600" />
                As White
              </h4>
              <div className="space-y-3">
                {bestWhite && <OpeningHighlight opening={bestWhite} type="best" />}
                {worstWhite && <OpeningHighlight opening={worstWhite} type="worst" />}
                {!bestWhite && !worstWhite && (
                  <p className="text-zinc-500 text-sm">Not enough games</p>
                )}
              </div>
            </div>

            {/* As Black */}
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <span className="w-4 h-4 bg-zinc-800 rounded-sm border border-zinc-600" />
                As Black
              </h4>
              <div className="space-y-3">
                {bestBlack && <OpeningHighlight opening={bestBlack} type="best" />}
                {worstBlack && <OpeningHighlight opening={worstBlack} type="worst" />}
                {!bestBlack && !worstBlack && (
                  <p className="text-zinc-500 text-sm">Not enough games</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Full Table Section */}
      <Card title="All Openings" subtitle="Click a row to view games">
        {/* Color Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedColor('white')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedColor === 'white'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-3 h-3 bg-white rounded-sm border border-zinc-500" />
            White
          </button>
          <button
            onClick={() => setSelectedColor('black')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedColor === 'black'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-3 h-3 bg-zinc-800 rounded-sm border border-zinc-500" />
            Black
          </button>
        </div>

        <OpeningTable
          openings={allOpeningsForColor}
          title={`${selectedColor === 'white' ? 'White' : 'Black'} Openings`}
          allGames={games}
        />
      </Card>
    </div>
  );
}
