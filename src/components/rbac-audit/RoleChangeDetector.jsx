import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const TRACKED_FIELDS = ['system_role', 'business_role', 'effective_role', 'employee_id'];

const FIELD_LABELS = {
  system_role: 'System Role',
  business_role: 'Business Role',
  effective_role: 'Effective Role',
  employee_id: 'Employee ID',
};

export default function RoleChangeDetector() {
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['rbac-snapshots-changes'],
    queryFn: () => base44.entities.UserRoleSnapshot.list('-snapshot_timestamp', 100),
  });

  const changes = useMemo(() => {
    if (snapshots.length < 2) return [];

    // Group by date
    const byDate = {};
    for (const s of snapshots) {
      const dateKey = s.snapshot_timestamp?.slice(0, 10);
      if (!dateKey) continue;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(s);
    }

    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    if (dates.length < 2) return [];

    const currentDate = dates[0];
    const previousDate = dates[1];

    const currentByUser = {};
    for (const s of byDate[currentDate]) {
      currentByUser[s.user_id] = s;
    }

    const previousByUser = {};
    for (const s of byDate[previousDate]) {
      previousByUser[s.user_id] = s;
    }

    const result = [];
    for (const userId of Object.keys(currentByUser)) {
      const curr = currentByUser[userId];
      const prev = previousByUser[userId];
      if (!prev) continue;

      for (const field of TRACKED_FIELDS) {
        const oldVal = prev[field] || null;
        const newVal = curr[field] || null;
        if (oldVal !== newVal) {
          result.push({
            email: curr.email,
            field,
            oldValue: oldVal || '(null)',
            newValue: newVal || '(null)',
            timestamp: curr.snapshot_timestamp,
          });
        }
      }
    }

    return result;
  }, [snapshots]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-semibold text-slate-900">Geen role wijzigingen gedetecteerd</p>
          <p className="text-sm text-slate-500 mt-1">Tussen de laatste twee snapshots zijn geen wijzigingen gevonden.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Role wijzigingen ({changes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Email</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Veld</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Oud</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Nieuw</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, idx) => {
                const isCritical = c.field === 'system_role';
                const isDowngrade = c.field === 'effective_role' && 
                  (c.newValue === '(null)' || c.newValue === 'EMPLOYEE') && 
                  c.oldValue !== '(null)' && c.oldValue !== 'EMPLOYEE';

                return (
                  <tr key={idx} className={`border-b ${isCritical ? 'bg-red-50' : isDowngrade ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                    <td className="py-2.5 px-3 font-medium">{c.email}</td>
                    <td className="py-2.5 px-3">
                      <Badge className={
                        isCritical ? 'bg-red-100 text-red-700' :
                        isDowngrade ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {FIELD_LABELS[c.field]}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{c.oldValue}</td>
                    <td className="py-2.5 px-3 font-medium">{c.newValue}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {c.timestamp ? format(new Date(c.timestamp), 'dd-MM-yyyy HH:mm') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}