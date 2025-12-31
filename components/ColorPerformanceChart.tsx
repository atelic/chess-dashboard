'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ColorPerformanceDataPoint } from '@/lib/types';
import Card from './ui/Card';

interface ColorPerformanceChartProps {
  data: ColorPerformanceDataPoint[];
}

const COLORS = {
  white: '#f5f5f5',
  black: '#3f3f46',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ColorPerformanceDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-100 font-medium mb-2 capitalize">{label}</p>
        <p className="text-sm text-blue-400">Win Rate: {data.winRate.toFixed(1)}%</p>
        <p className="text-sm text-zinc-400">
          {data.wins} wins / {data.games} games
        </p>
      </div>
    );
  }
  return null;
}

export default function ColorPerformanceChart({ data }: ColorPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <Card title="Performance by Color">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No data available
        </div>
      </Card>
    );
  }

  // Format data with proper labels
  const chartData = data.map((d) => ({
    ...d,
    label: d.color.charAt(0).toUpperCase() + d.color.slice(1),
  }));

  return (
    <Card title="Performance by Color" subtitle="Win rate as White vs Black">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              dataKey="label"
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
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]} maxBarSize={80}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.color]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
