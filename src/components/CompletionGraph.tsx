import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AppData } from '../domain/types';
import { getMonthlyCompletionGraph } from '../domain/completionCalculator';
import { dayOfMonth } from '../domain/dateUtils';

interface CompletionGraphProps {
  data: AppData;
  monthAnchor: Date;
}

export function CompletionGraph({ data, monthAnchor }: CompletionGraphProps) {
  const points = getMonthlyCompletionGraph(data.habits, monthAnchor, data.completions);

  const chartData = points.map((p) => ({
    day: dayOfMonth(p.date),
    date: p.date,
    percentage: p.percentage,
  }));

  return (
    <div className="bg-surface rounded-card shadow-card border border-border p-4">
      <h2 className="font-display text-[13px] tracking-wide text-textMuted uppercase mb-3">
        Completion This Month
      </h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#2A2D37" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#2A2D37' }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tick={{ fill: '#8B8D97', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: '#1B1D24',
                border: '1px solid #2A2D37',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'Inter',
              }}
              labelStyle={{ color: '#E8E6E1' }}
              itemStyle={{ color: '#C9A05C' }}
              formatter={(value: number | string) =>
                typeof value === 'number' ? [`${Math.round(value)}%`, 'Completed'] : [value, '']
              }
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''}
            />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#C9A05C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#C9A05C', stroke: '#121317', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
