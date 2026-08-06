"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  label: string;
  totalSeconds: number;
  accuracyPercent: number;
  sessionCount: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2)
    return (
      <p className="chartEmpty">完成至少两组相同训练后，将显示成长趋势。</p>
    );

  return (
    <div className="chart" aria-label="每组总用时趋势图">
      <ResponsiveContainer width="100%" height={170}>
        <LineChart
          data={points}
          margin={{ top: 12, right: 8, bottom: 4, left: -20 }}
        >
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickCount={points.length > 20 ? 3 : points.length > 10 ? 4 : 5}
            unit="s"
          />
          <Tooltip
            formatter={(value: number, _name, item) => [
              `${value}s`,
              `每组总用时（${item.payload.sessionCount}组平均）`,
            ]}
            labelFormatter={(label) => `训练范围：${label}`}
          />
          <Line
            type="monotone"
            dataKey="totalSeconds"
            name="总用时"
            stroke="#2f8566"
            strokeWidth={3}
            dot={{ r: points.length > 20 ? 2 : 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
