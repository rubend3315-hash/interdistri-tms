import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfYear, endOfYear, eachDayOfInterval, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";

const YEAR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function DailyTrendChart({ data, selectedYears, metric }) {
  // Build a lookup: year -> dateStr -> total
  const lookup = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const key = `${d.year}_${d.dateStr}`;
      map[key] = (map[key] || 0) + d[metric];
    });
    return map;
  }, [data, metric]);

  const chartData = useMemo(() => {
    // Use the first (most recent) selected year as base for day-of-year iteration
    const baseYear = selectedYears[0];
    const start = startOfYear(new Date(baseYear, 0, 1));
    const end = endOfYear(new Date(baseYear, 0, 1));
    const allDays = eachDayOfInterval({ start, end });

    return allDays.map(day => {
      const dayOfYear = Math.floor((day - start) / 86400000) + 1;
      const monthDay = format(day, 'd MMM', { locale: nl });
      const weekNum = getISOWeek(day);
      const row = { 
        dayOfYear, 
        label: monthDay,
        week: weekNum,
      };

      selectedYears.forEach(year => {
        // Map same day-of-year to other years
        const otherDate = new Date(year, day.getMonth(), day.getDate());
        const dateStr = format(otherDate, 'yyyy-MM-dd');
        row[`${year}`] = lookup[`${year}_${dateStr}`] || 0;
      });

      return row;
    });
  }, [selectedYears, lookup]);

  const formatNumber = (val) => val?.toLocaleString('nl-NL') || '0';

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 9 }} 
            interval={29}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value, name) => [formatNumber(value), name]}
            labelFormatter={(_, payload) => {
              if (payload?.[0]?.payload) {
                const p = payload[0].payload;
                return `${p.label} (week ${p.week})`;
              }
              return '';
            }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Legend />
          {selectedYears.map((year, idx) => (
            <Bar
              key={year}
              dataKey={`${year}`}
              name={`${year}`}
              fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
              radius={[2, 2, 0, 0]}
              maxBarSize={6}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}