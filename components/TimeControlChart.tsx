'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TimeControlDataPoint } from '@/lib/types';
import Card from './ui/Card';

interface TimeControlChartProps {
  data: TimeControlDataPoint[];
}

const COLORS: Record<string, string> = {
  bullet: '#ef4444',    // red
  blitz: '#f97316',     // orange
  rapid: '#22c55e',     // green
  classical: '#3b82f6', // blue
};

const LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TimeControlDataPoint & { name: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
        <p className="text-zinc-100 font-medium mb-1">{LABELS[data.timeClass]}</p>
        <p className="text-sm text-zinc-400">{data.count} games</p>
        <p className="text-sm text-zinc-400">{data.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
}

export default function TimeControlChart({ data }: TimeControlChartProps) {
  if (data.length === 0) {
    return (
      <Card title="Time Control Distribution">
        <div className="h-64 flex items-center justify-center text-zinc-500">
          No data available
        </div>
      </Card>
    );
  }

  // Convert data to chart-compatible format
  const chartData = data.map((d) => ({
    ...d,
    name: LABELS[d.timeClass],
  }));

  return (
    <Card title="Time Control Distribution" subtitle="Games by time control">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.timeClass]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-zinc-300 text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
