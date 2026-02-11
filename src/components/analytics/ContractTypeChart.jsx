import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TYPE_COLORS = {
  "Vast": "#10b981",
  "Vast Nul Uren": "#14b8a6",
  "Tijdelijk": "#3b82f6",
  "Tijdelijk Nul Uren": "#6366f1"
};

export default function ContractTypeChart({ contracts }) {
  const chartData = useMemo(() => {
    const byYear = {};
    contracts.forEach(c => {
      if (!c.start_date) return;
      const year = new Date(c.start_date).getFullYear();
      if (!byYear[year]) byYear[year] = { year, "Vast": 0, "Vast Nul Uren": 0, "Tijdelijk": 0, "Tijdelijk Nul Uren": 0 };
      if (c.contract_type && byYear[year][c.contract_type] !== undefined) {
        byYear[year][c.contract_type]++;
      }
    });
    return Object.values(byYear).sort((a, b) => a.year - b.year);
  }, [contracts]);

  const totals = useMemo(() => {
    const counts = { "Vast": 0, "Vast Nul Uren": 0, "Tijdelijk": 0, "Tijdelijk Nul Uren": 0 };
    contracts.forEach(c => {
      if (c.contract_type && counts[c.contract_type] !== undefined) counts[c.contract_type]++;
    });
    return counts;
  }, [contracts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contracten per Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(totals).map(([type, count]) => (
            <div key={type} className="rounded-lg p-3 text-center" style={{ backgroundColor: TYPE_COLORS[type] + '15' }}>
              <p className="text-2xl font-bold" style={{ color: TYPE_COLORS[type] }}>{count}</p>
              <p className="text-xs text-slate-600">{type}</p>
            </div>
          ))}
        </div>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <Bar key={type} dataKey={type} fill={color} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}