import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const YEAR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function WeeklyTrendChart({ data, selectedYears, metric }) {
  const chartData = useMemo(() => {
    const weeks = [];
    for (let w = 1; w <= 53; w++) {
      const row = { week: `W${w}` };
      let hasData = false;

      selectedYears.forEach(year => {
        const weekData = data.filter(d => d.year === year && d.week === w);
        const total = weekData.reduce((sum, d) => sum + d[metric], 0);
        row[`${year}`] = total || null;
        if (total > 0) hasData = true;
      });

      if (hasData) weeks.push(row);
    }
    return weeks;
  }, [data, selectedYears, metric]);

  const formatNumber = (val) => val?.toLocaleString('nl-NL') || '0';

  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value, name) => [formatNumber(value), name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Legend />
          {selectedYears.map((year, idx) => (
            <Line
              key={year}
              type="monotone"
              dataKey={`${year}`}
              name={`${year}`}
              stroke={YEAR_COLORS[idx % YEAR_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}