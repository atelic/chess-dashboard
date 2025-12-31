'use client';

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
import type { RatingDataPoint } from '@/lib/types';
import Card from './ui/Card';

interface RatingChartProps {
  data: RatingDataPoint[];
}

interface ProcessedDataPoint {
  date: string;
  chesscom?: number;
  lichess?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-100 font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.dataKey === 'chesscom' ? 'Chess.com' : 'Lichess'}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function processData(data: RatingDataPoint[]): ProcessedDataPoint[] {
  // Group by date and separate by source
  const dateMap = new Map<string, ProcessedDataPoint>();
  
  for (const point of data) {
    const existing = dateMap.get(point.date) || { date: point.date };
    if (point.source === 'chesscom') {
      existing.chesscom = point.rating;
    } else {
      existing.lichess = point.rating;
    }
    dateMap.set(point.date, existing);
  }
  
  return Array.from(dateMap.values());
}

export default function RatingChart({ data }: RatingChartProps) {
  if (data.length === 0) {
    return (
      <Card title="Rating Progression">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No data available
        </div>
      </Card>
    );
  }
  
  const processedData = processData(data);
  const hasChessCom = data.some((d) => d.source === 'chesscom');
  const hasLichess = data.some((d) => d.source === 'lichess');

  return (
    <Card title="Rating Progression" subtitle="Rating changes over time">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 50', 'dataMax + 50']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
              formatter={(value) => (
                <span className="text-zinc-300 text-sm">
                  {value === 'chesscom' ? 'Chess.com' : 'Lichess'}
                </span>
              )}
            />
            {hasChessCom && (
              <Line
                type="monotone"
                dataKey="chesscom"
                stroke="#81b64c"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
            {hasLichess && (
              <Line
                type="monotone"
                dataKey="lichess"
                stroke="#ffffff"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
