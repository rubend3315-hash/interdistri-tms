import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function KPIImportOverview() {
  const queryClient = useQueryClient();
  const [deletingKey, setDeletingKey] = useState(null);

  const { data: allKPI = [], isLoading } = useQuery({
    queryKey: ['employee-kpi-all'],
    queryFn: () => base44.entities.EmployeeKPI.list('-created_date', 5000)
  });

  // Group by week + year
  const grouped = React.useMemo(() => {
    const map = {};
    allKPI.forEach(kpi => {
      const key = `${kpi.year}-${kpi.week}`;
      if (!map[key]) {
        map[key] = {
          week: kpi.week,
          year: kpi.year,
          count: 0,
          importDate: kpi.created_date,
          ids: []
        };
      }
      map[key].count++;
      map[key].ids.push(kpi.id);
      // Track most recent import date
      if (kpi.created_date > map[key].importDate) {
        map[key].importDate = kpi.created_date;
      }
    });
    return Object.values(map).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  }, [allKPI]);

  const handleDelete = async (group) => {
    const key = `${group.year}-${group.week}`;
    if (!confirm(`Weet je zeker dat je alle ${group.count} KPI records voor week ${group.week} (${group.year}) wilt verwijderen?`)) return;
    
    setDeletingKey(key);
    for (const id of group.ids) {
      await base44.entities.EmployeeKPI.delete(id);
    }
    setDeletingKey(null);
    queryClient.invalidateQueries({ queryKey: ['employee-kpi-all'] });
    queryClient.invalidateQueries({ queryKey: ['employee-kpi'] });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>;
  }

  if (grouped.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">Geen KPI imports gevonden.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="text-left py-3 px-4 font-medium text-slate-600">Jaar</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Week</th>
            <th className="text-right py-3 px-4 font-medium text-slate-600">Medewerkers</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Geïmporteerd op</th>
            <th className="text-right py-3 px-4 font-medium text-slate-600">Acties</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(group => {
            const key = `${group.year}-${group.week}`;
            const isDeleting = deletingKey === key;
            return (
              <tr key={key} className="border-b hover:bg-slate-50">
                <td className="py-3 px-4 font-medium">{group.year}</td>
                <td className="py-3 px-4">Week {group.week}</td>
                <td className="py-3 px-4 text-right">{group.count}</td>
                <td className="py-3 px-4 text-slate-500">
                  {new Date(group.importDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(group)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}