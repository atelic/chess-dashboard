'use client';

import { useState, useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RatingDataPoint, GameSource, TimeClass } from '@/lib/types';
import Card from './ui/Card';

interface RatingChartProps {
  data: RatingDataPoint[];
}

// Color schemes for different combinations
const COLORS: Record<string, string> = {
  'chesscom-bullet': '#ef4444',    // red
  'chesscom-blitz': '#f97316',     // orange
  'chesscom-rapid': '#eab308',     // yellow
  'chesscom-classical': '#84cc16', // lime
  'lichess-bullet': '#8b5cf6',     // violet
  'lichess-blitz': '#3b82f6',      // blue
  'lichess-rapid': '#06b6d4',      // cyan
  'lichess-classical': '#14b8a6',  // teal
};

const TIME_CLASS_LABELS: Record<TimeClass, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

const SOURCE_LABELS: Record<GameSource, string> = {
  chesscom: 'Chess.com',
  lichess: 'Lichess',
};

interface SeriesConfig {
  key: string;
  source: GameSource;
  timeClass: TimeClass;
  color: string;
  label: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    // Filter out undefined values and sort by value descending
    const validPayload = payload
      .filter((entry) => entry.value !== undefined)
      .sort((a, b) => b.value - a.value);

    if (validPayload.length === 0) return null;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium mb-2">{label}</p>
        {validPayload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

const RatingChart = memo(function RatingChart({ data }: RatingChartProps) {
  // Determine available sources and time classes
  const availableSeries = useMemo(() => {
    const series = new Set<string>();
    for (const point of data) {
      series.add(`${point.source}-${point.timeClass}`);
    }
    return series;
  }, [data]);

  const availableSources = useMemo(() => {
    const sources = new Set<GameSource>();
    for (const point of data) {
      sources.add(point.source);
    }
    return Array.from(sources);
  }, [data]);

  const availableTimeClasses = useMemo(() => {
    const timeClasses = new Set<TimeClass>();
    for (const point of data) {
      timeClasses.add(point.timeClass);
    }
    // Sort in logical order
    const order: TimeClass[] = ['bullet', 'blitz', 'rapid', 'classical'];
    return order.filter((tc) => timeClasses.has(tc));
  }, [data]);

  // Filter state
  const [selectedSource, setSelectedSource] = useState<GameSource | 'all'>('all');
  const [selectedTimeClass, setSelectedTimeClass] = useState<TimeClass | 'all'>('all');

  // Build series configurations based on filters
  const seriesConfigs = useMemo((): SeriesConfig[] => {
    const configs: SeriesConfig[] = [];

    for (const key of availableSeries) {
      const [source, timeClass] = key.split('-') as [GameSource, TimeClass];

      // Apply filters
      if (selectedSource !== 'all' && source !== selectedSource) continue;
      if (selectedTimeClass !== 'all' && timeClass !== selectedTimeClass) continue;

      configs.push({
        key,
        source,
        timeClass,
        color: COLORS[key] || '#888888',
        label: `${SOURCE_LABELS[source]} ${TIME_CLASS_LABELS[timeClass]}`,
      });
    }

    return configs;
  }, [availableSeries, selectedSource, selectedTimeClass]);

  // Process data into chart format
  const chartData = useMemo(() => {
    // Group by date
    const dateMap = new Map<string, Record<string, string | number>>();

    for (const point of data) {
      const key = `${point.source}-${point.timeClass}`;

      // Apply filters
      if (selectedSource !== 'all' && point.source !== selectedSource) continue;
      if (selectedTimeClass !== 'all' && point.timeClass !== selectedTimeClass) continue;

      const existing = dateMap.get(point.date) || { date: point.date };
      existing[key] = point.rating;
      dateMap.set(point.date, existing);
    }

    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [data, selectedSource, selectedTimeClass]);

  if (data.length === 0) {
    return (
      <Card title="Rating Progression">
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card title="Rating Progression" subtitle="Rating changes over time by platform and time control">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Source filter */}
        {availableSources.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-2 py-1 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  selectedSource === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {availableSources.map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`px-2 py-1 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedSource === source
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {SOURCE_LABELS[source]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time class filter */}
        {availableTimeClasses.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Control:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedTimeClass('all')}
                className={`px-2 py-1 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  selectedTimeClass === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {availableTimeClasses.map((tc) => (
                <button
                  key={tc}
                  onClick={() => setSelectedTimeClass(tc)}
                  className={`px-2 py-1 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedTimeClass === tc
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TIME_CLASS_LABELS[tc]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--chart-grid)]" />
            <XAxis
              dataKey="date"
              className="stroke-[var(--chart-axis)]"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="stroke-[var(--chart-axis)]"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip content={<CustomTooltip />} />
            {seriesConfigs.length <= 4 && (
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="line"
                formatter={(value: string) => (
                  <span className="text-muted-foreground text-sm">{value}</span>
                )}
              />
            )}
            {seriesConfigs.map((config) => (
              <Line
                key={config.key}
                type="monotone"
                dataKey={config.key}
                name={config.label}
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for many series */}
      {seriesConfigs.length > 4 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {seriesConfigs.map((config) => (
            <div key={config.key} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

export default RatingChart;
