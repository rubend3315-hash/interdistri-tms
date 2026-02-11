import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ProeftijdStats({ contracts }) {
  const data = useMemo(() => {
    let met = 0;
    let zonder = 0;
    contracts.forEach(c => {
      if (c.proeftijd === 'Geen proeftijd') {
        zonder++;
      } else {
        met++;
      }
    });
    return [
      { name: 'Met proeftijd', value: met, color: '#3b82f6' },
      { name: 'Zonder proeftijd', value: zonder, color: '#f59e0b' }
    ];
  }, [contracts]);

  const total = data[0].value + data[1].value;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Proeftijd Verdeling</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: d.color }} />
                <div>
                  <p className="font-semibold text-slate-900">{d.value} contracten</p>
                  <p className="text-xs text-slate-500">{d.name} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}