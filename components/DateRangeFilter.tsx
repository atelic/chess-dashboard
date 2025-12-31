'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';

interface DateRangeFilterProps {
  onFilterChange: (startDate: Date | undefined, endDate: Date | undefined, maxGames: number) => void;
  isLoading: boolean;
}

export default function DateRangeFilter({ onFilterChange, isLoading }: DateRangeFilterProps) {
  const [filterMode, setFilterMode] = useState<'last100' | 'custom'>('last100');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (filterMode === 'last100') {
      onFilterChange(undefined, undefined, 100);
    } else {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate + 'T23:59:59') : undefined;
      onFilterChange(start, end, 1000); // Allow up to 1000 games for custom range
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('last100')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'last100'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            disabled={isLoading}
          >
            Last 100 Games
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            disabled={isLoading}
          >
            Custom Range
          </button>
        </div>

        {filterMode === 'custom' && (
          <>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                disabled={isLoading}
              />
              <span className="text-zinc-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApply}
              size="sm"
              disabled={isLoading}
            >
              Apply
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
