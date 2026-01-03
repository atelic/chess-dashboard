'use client';

import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WinRateDataPoint } from '@/lib/types';
import Card from './ui/Card';

interface WinRateChartProps {
  data: WinRateDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WinRateDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-100 font-medium mb-2">{label}</p>
        <p className="text-sm text-blue-400">
          Win Rate: {data.winRate.toFixed(1)}%
        </p>
        <p className="text-sm text-zinc-400">
          Games: {data.games} ({data.wins}W / {data.losses}L / {data.draws}D)
        </p>
      </div>
    );
  }
  return null;
}

const WinRateChart = memo(function WinRateChart({ data }: WinRateChartProps) {
  if (data.length === 0) {
    return (
      <Card title="Win Rate Over Time">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card title="Win Rate Over Time" subtitle="Weekly win percentage">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="week"
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
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#60a5fa' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

export default WinRateChart;
