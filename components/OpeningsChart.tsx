'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { OpeningDataPoint } from '@/lib/types';
import Card from './ui/Card';

interface OpeningsChartProps {
  data: OpeningDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: OpeningDataPoint; dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const winRate = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-100 font-medium mb-1">{label}</p>
        <p className="text-xs text-zinc-400 mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <p className="text-green-400">Wins: {data.wins}</p>
          <p className="text-red-400">Losses: {data.losses}</p>
          <p className="text-yellow-400">Draws: {data.draws}</p>
          <p className="text-zinc-300 pt-1 border-t border-zinc-700">
            Win Rate: {winRate}%
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export default function OpeningsChart({ data }: OpeningsChartProps) {
  if (data.length === 0) {
    return (
      <Card title="Results by Opening">
        <div className="h-80 flex items-center justify-center text-zinc-500">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card title="Results by Opening" subtitle="Top 10 most played openings (by ECO code)">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="eco"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="circle"
              formatter={(value) => <span className="text-zinc-300 text-sm">{value}</span>}
            />
            <Bar dataKey="wins" stackId="a" fill="#22c55e" name="Wins" radius={[0, 0, 0, 0]} />
            <Bar dataKey="draws" stackId="a" fill="#eab308" name="Draws" />
            <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
