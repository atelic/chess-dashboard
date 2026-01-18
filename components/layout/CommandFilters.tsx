'use client';

import { useMemo } from 'react';
import { X, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { FilterState, TimeClass, PlayerColor, GameResult, GameSource } from '@/lib/types';
import { getDefaultFilters, saveDefaultFilter, clearDefaultFilter, isBaseDefaults } from '@/lib/utils';

interface CommandFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClose: () => void;
  hasStoredDefault: boolean;
  onDefaultSaved: () => void;
  onDefaultCleared: () => void;
}

const TIME_CLASSES: { value: TimeClass; label: string }[] = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapid', label: 'Rapid' },
  { value: 'classical', label: 'Classical' },
];

const RESULTS: { value: GameResult; label: string }[] = [
  { value: 'win', label: 'Wins' },
  { value: 'loss', label: 'Losses' },
  { value: 'draw', label: 'Draws' },
];

const SOURCES: { value: GameSource; label: string }[] = [
  { value: 'chesscom', label: 'Chess.com' },
  { value: 'lichess', label: 'Lichess' },
];

export default function CommandFilters({
  filters,
  onFiltersChange,
  onClose,
  hasStoredDefault,
  onDefaultSaved,
  onDefaultCleared,
}: CommandFiltersProps) {
  const handleTimeClassToggle = (tc: TimeClass) => {
    const current = filters.timeClasses;
    const updated = current.includes(tc)
      ? current.filter((t) => t !== tc)
      : [...current, tc];
    onFiltersChange({ ...filters, timeClasses: updated });
  };

  const handleColorToggle = (color: PlayerColor) => {
    const current = filters.colors;
    const updated = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color];
    onFiltersChange({ ...filters, colors: updated });
  };

  const handleResultToggle = (result: GameResult) => {
    const current = filters.results;
    const updated = current.includes(result)
      ? current.filter((r) => r !== result)
      : [...current, result];
    onFiltersChange({ ...filters, results: updated });
  };

  const handleSourceToggle = (source: GameSource) => {
    const current = filters.sources;
    const updated = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    onFiltersChange({ ...filters, sources: updated });
  };

  const handleRatedToggle = (rated: boolean | null) => {
    const newValue = filters.rated === rated ? null : rated;
    onFiltersChange({ ...filters, rated: newValue });
  };

  const handleViewModeChange = (mode: 'all' | 'last100' | 'last500') => {
    if (mode === 'all') {
      onFiltersChange({ ...filters, dateRange: {}, maxGames: 0 });
    } else if (mode === 'last100') {
      onFiltersChange({ ...filters, dateRange: {}, maxGames: 100 });
    } else if (mode === 'last500') {
      onFiltersChange({ ...filters, dateRange: {}, maxGames: 500 });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange(getDefaultFilters());
  };

  const handleSaveAsDefault = () => {
    saveDefaultFilter(filters);
    onDefaultSaved();
  };

  const handleClearDefault = () => {
    clearDefaultFilter();
    onDefaultCleared();
  };

  const canSaveAsDefault = !isBaseDefaults(filters);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.timeClasses.length > 0) count++;
    if (filters.colors.length > 0) count++;
    if (filters.results.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.rated !== null && filters.rated !== undefined) count++;
    if (filters.maxGames > 0) count++;
    return count;
  }, [filters]);

  const viewMode = filters.maxGames === 100 ? 'last100' : filters.maxGames === 500 ? 'last500' : 'all';

  return (
    <div className="bg-card/95 border-b border-border animate-fade-in">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="status-badge status-badge-info">
                {activeFilterCount} active
              </span>
            )}
            {hasStoredDefault && (
              <span className="text-xs text-primary">Using saved default</span>
            )}
            {!hasStoredDefault && activeFilterCount === 0 && (
              <span className="text-xs text-muted-foreground">Unfiltered</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canSaveAsDefault && (
              <button
                onClick={handleSaveAsDefault}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary/80 transition-colors"
                title="Save current filters as default"
              >
                <Save className="w-3 h-3" />
                Save as Default
              </button>
            )}
            {hasStoredDefault && (
              <button
                onClick={handleClearDefault}
                className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                title="Clear saved default filter"
              >
                <Trash2 className="w-3 h-3" />
                Clear Default
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Groups */}
        <div className="flex flex-wrap gap-6">
          {/* Time Frame */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Time Frame
            </label>
            <div className="flex gap-1">
              {(['all', 'last100', 'last500'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'all' ? 'All Time' : mode === 'last100' ? 'Last 100' : 'Last 500'}
                </button>
              ))}
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Time Control
            </label>
            <div className="flex gap-1">
              {TIME_CLASSES.map((tc) => (
                <button
                  key={tc.value}
                  onClick={() => handleTimeClassToggle(tc.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    filters.timeClasses.includes(tc.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Platform
            </label>
            <div className="flex gap-1">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleSourceToggle(s.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    filters.sources.includes(s.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Color
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => handleColorToggle('white')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  filters.colors.includes('white')
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="w-2.5 h-2.5 bg-white rounded-sm border border-border" />
                White
              </button>
              <button
                onClick={() => handleColorToggle('black')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  filters.colors.includes('black')
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="w-2.5 h-2.5 bg-secondary rounded-sm border border-border" />
                Black
              </button>
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Result
            </label>
            <div className="flex gap-1">
              {RESULTS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleResultToggle(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    filters.results.includes(r.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rated/Unrated */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Game Type
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => handleRatedToggle(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filters.rated === true
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Rated
              </button>
              <button
                onClick={() => handleRatedToggle(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filters.rated === false
                    ? 'bg-blue-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Unrated
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
