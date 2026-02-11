import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInMonths, differenceInDays } from "date-fns";

export default function ContractDurationStats({ contracts }) {
  const stats = useMemo(() => {
    const tijdelijk = contracts.filter(c => 
      c.contract_type?.includes('Tijdelijk') && c.start_date && c.end_date
    );
    
    if (tijdelijk.length === 0) return null;

    const durations = tijdelijk.map(c => {
      const months = differenceInMonths(new Date(c.end_date), new Date(c.start_date));
      const days = differenceInDays(new Date(c.end_date), new Date(c.start_date));
      return { months, days };
    });

    const avgMonths = durations.reduce((sum, d) => sum + d.months, 0) / durations.length;
    const avgDays = durations.reduce((sum, d) => sum + d.days, 0) / durations.length;
    const shortest = Math.min(...durations.map(d => d.months));
    const longest = Math.max(...durations.map(d => d.months));

    return { count: tijdelijk.length, avgMonths: avgMonths.toFixed(1), avgDays: Math.round(avgDays), shortest, longest };
  }, [contracts]);

  if (!stats) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Gemiddelde Duur Tijdelijke Contracten</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-500">Geen tijdelijke contracten gevonden.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Gemiddelde Duur Tijdelijke Contracten</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.count}</p>
            <p className="text-xs text-slate-600">Tijdelijke contracten</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-700">{stats.avgMonths}</p>
            <p className="text-xs text-slate-600">Gem. maanden</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-teal-700">{stats.shortest}</p>
            <p className="text-xs text-slate-600">Kortste (mnd)</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-700">{stats.longest}</p>
            <p className="text-xs text-slate-600">Langste (mnd)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}