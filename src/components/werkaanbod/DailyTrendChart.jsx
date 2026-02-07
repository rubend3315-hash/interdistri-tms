import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const YEAR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function DailyTrendChart({ data, selectedYears, selectedWeek, metric }) {
  const chartData = useMemo(() => {
    // Build data per day of week (1=Mon to 7=Sun)
    const days = DAY_LABELS.map((label, idx) => {
      const dayNum = idx + 1; // 1=Mon
      const row = { day: label };

      selectedYears.forEach(year => {
        const dayData = data.filter(d => {
          if (d.year !== year || d.week !== selectedWeek) return false;
          // Convert JS day (0=Sun) to ISO (1=Mon..7=Sun)
          const isoDay = d.dayOfWeek === 0 ? 7 : d.dayOfWeek;
          return isoDay === dayNum;
        });
        row[`${year}`] = dayData.reduce((sum, d) => sum + d[metric], 0);
      });

      return row;
    });

    return days;
  }, [data, selectedYears, selectedWeek, metric]);

  const formatNumber = (val) => val?.toLocaleString('nl-NL') || '0';

  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value, name) => [formatNumber(value), name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Legend />
          {selectedYears.map((year, idx) => (
            <Bar
              key={year}
              dataKey={`${year}`}
              name={`${year}`}
              fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}