import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";

const YEAR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
const MONTH_LABELS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export default function YearComparisonChart({ data, selectedYears, metric }) {
  const chartData = useMemo(() => {
    return MONTH_LABELS.map((label, monthIdx) => {
      const row = { month: label };

      selectedYears.forEach(year => {
        const monthData = data.filter(d => d.year === year && d.month === monthIdx);
        row[`${year}`] = monthData.reduce((sum, d) => sum + d[metric], 0);
      });

      return row;
    });
  }, [data, selectedYears, metric]);

  const formatNumber = (val) => val?.toLocaleString('nl-NL') || '0';

  // Use lines for year comparison (like the example image)
  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value, name) => [formatNumber(value), name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Legend />
          {selectedYears.map((year, idx) => {
            // Current year as bars, others as lines
            if (idx === 0) {
              return (
                <Bar
                  key={year}
                  dataKey={`${year}`}
                  name={`${year}`}
                  fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fillOpacity={0.8}
                />
              );
            }
            return (
              <Line
                key={year}
                type="monotone"
                dataKey={`${year}`}
                name={`${year}`}
                stroke={YEAR_COLORS[idx % YEAR_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: YEAR_COLORS[idx % YEAR_COLORS.length] }}
                connectNulls
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}