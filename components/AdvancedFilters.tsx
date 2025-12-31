'use client';

import { useState, useMemo } from 'react';
import type { Game, FilterState, TimeClass, PlayerColor, GameResult, GameSource } from '@/lib/types';
import { getUniqueOpenings, getDefaultFilters } from '@/lib/utils';
import Button from './ui/Button';
import Input from './ui/Input';

interface AdvancedFiltersProps {
  games: Game[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onRefetch: (startDate: Date | undefined, endDate: Date | undefined, maxGames: number) => void;
  isLoading: boolean;
}

export default function AdvancedFilters({ 
  games, 
  filters, 
  onFiltersChange, 
  onRefetch,
  isLoading 
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchMode, setFetchMode] = useState<'last100' | 'custom'>('last100');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Get unique values from games for filter options
  const availableOpenings = useMemo(() => getUniqueOpenings(games), [games]);
  
  const handleFetchModeChange = (mode: 'last100' | 'custom') => {
    setFetchMode(mode);
    if (mode === 'last100') {
      onRefetch(undefined, undefined, 100);
    }
  };

  const handleApplyDateRange = () => {
    const start = startDateStr ? new Date(startDateStr) : undefined;
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59') : undefined;
    onRefetch(start, end, 1000);
  };

  const handleTimeClassToggle = (tc: TimeClass) => {
    const current = filters.timeClasses;
    const updated = current.includes(tc)
      ? current.filter(t => t !== tc)
      : [...current, tc];
    onFiltersChange({ ...filters, timeClasses: updated });
  };

  const handleColorToggle = (color: PlayerColor) => {
    const current = filters.colors;
    const updated = current.includes(color)
      ? current.filter(c => c !== color)
      : [...current, color];
    onFiltersChange({ ...filters, colors: updated });
  };

  const handleResultToggle = (result: GameResult) => {
    const current = filters.results;
    const updated = current.includes(result)
      ? current.filter(r => r !== result)
      : [...current, result];
    onFiltersChange({ ...filters, results: updated });
  };

  const handleSourceToggle = (source: GameSource) => {
    const current = filters.sources;
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    onFiltersChange({ ...filters, sources: updated });
  };

  const handleOpeningToggle = (eco: string) => {
    const current = filters.openings;
    const updated = current.includes(eco)
      ? current.filter(o => o !== eco)
      : [...current, eco];
    onFiltersChange({ ...filters, openings: updated });
  };

  const handleRatingRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      opponentRatingRange: {
        ...filters.opponentRatingRange,
        [type]: numValue,
      },
    });
  };

  const handleClearFilters = () => {
    onFiltersChange(getDefaultFilters());
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.timeClasses.length > 0) count++;
    if (filters.colors.length > 0) count++;
    if (filters.results.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.openings.length > 0) count++;
    if (filters.opponentRatingRange.min !== undefined || filters.opponentRatingRange.max !== undefined) count++;
    return count;
  }, [filters]);

  const TIME_CLASSES: { value: TimeClass; label: string }[] = [
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz', label: 'Blitz' },
    { value: 'rapid', label: 'Rapid' },
    { value: 'classical', label: 'Classical' },
  ];

  const RESULTS: { value: GameResult; label: string; color: string }[] = [
    { value: 'win', label: 'Wins', color: 'text-green-400' },
    { value: 'loss', label: 'Losses', color: 'text-red-400' },
    { value: 'draw', label: 'Draws', color: 'text-zinc-400' },
  ];

  const SOURCES: { value: GameSource; label: string }[] = [
    { value: 'chesscom', label: 'Chess.com' },
    { value: 'lichess', label: 'Lichess' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      {/* Header Row - Always Visible */}
      <div className="p-4 flex flex-wrap items-center gap-4">
        {/* Fetch Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleFetchModeChange('last100')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              fetchMode === 'last100'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            disabled={isLoading}
          >
            Last 100 Games
          </button>
          <button
            type="button"
            onClick={() => handleFetchModeChange('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              fetchMode === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            disabled={isLoading}
          >
            Custom Range
          </button>
        </div>

        {/* Date Range Inputs (shown when custom) */}
        {fetchMode === 'custom' && (
          <>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-40"
                disabled={isLoading}
              />
              <span className="text-zinc-500">to</span>
              <Input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-40"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyDateRange}
              size="sm"
              disabled={isLoading}
            >
              Fetch
            </Button>
          </>
        )}

        {/* Expand Button */}
        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="text-xs text-blue-400 bg-blue-950 px-2 py-1 rounded">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Less Filters' : 'More Filters'}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Time Control */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Time Control</label>
            <div className="flex flex-wrap gap-2">
              {TIME_CLASSES.map(tc => (
                <button
                  key={tc.value}
                  type="button"
                  onClick={() => handleTimeClassToggle(tc.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.timeClasses.includes(tc.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Color Played</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleColorToggle('white')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filters.colors.includes('white')
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-3 h-3 bg-white rounded-sm border border-zinc-500" />
                White
              </button>
              <button
                type="button"
                onClick={() => handleColorToggle('black')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filters.colors.includes('black')
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-3 h-3 bg-zinc-800 rounded-sm border border-zinc-500" />
                Black
              </button>
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Result</label>
            <div className="flex gap-2">
              {RESULTS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleResultToggle(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.results.includes(r.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Source</label>
            <div className="flex gap-2">
              {SOURCES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleSourceToggle(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.sources.includes(s.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opponent Rating Range */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Opponent Rating</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.opponentRatingRange.min ?? ''}
                onChange={(e) => handleRatingRangeChange('min', e.target.value)}
                className="w-24"
              />
              <span className="text-zinc-500">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.opponentRatingRange.max ?? ''}
                onChange={(e) => handleRatingRangeChange('max', e.target.value)}
                className="w-24"
              />
            </div>
          </div>

          {/* Openings (show only if we have unique openings) */}
          {availableOpenings.length > 0 && availableOpenings.length <= 20 && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Opening ({availableOpenings.length} available)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableOpenings.map(o => (
                  <button
                    key={o.eco}
                    type="button"
                    onClick={() => handleOpeningToggle(o.eco)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filters.openings.includes(o.eco)
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title={o.name}
                  >
                    {o.eco}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear All Filters */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
