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
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium mb-2">{label}</p>
        <p className="text-sm text-primary">
          Win Rate: {data.winRate.toFixed(1)}%
        </p>
        <p className="text-sm text-muted-foreground">
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
        <div className="h-64 flex items-center justify-center text-muted-foreground">
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--chart-grid)]" />
            <XAxis
              dataKey="week"
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
