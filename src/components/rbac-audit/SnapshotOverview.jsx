import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, UserX, User } from "lucide-react";
import { format, subDays } from "date-fns";

export default function SnapshotOverview() {
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['rbac-snapshots'],
    queryFn: () => base44.entities.UserRoleSnapshot.list('-snapshot_timestamp', 100),
  });

  // Group snapshots by date (take most recent per day)
  const dailySummaries = useMemo(() => {
    if (!snapshots.length) return [];

    const byDate = {};
    for (const s of snapshots) {
      const dateKey = s.snapshot_timestamp?.slice(0, 10);
      if (!dateKey) continue;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(s);
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([date, items]) => ({
        date,
        total: items.length,
        adminCount: items.filter(i => i.system_role === 'admin').length,
        employeeCount: items.filter(i => i.effective_role === 'EMPLOYEE').length,
        nullCount: items.filter(i => !i.effective_role).length,
      }));
  }, [snapshots]);

  // Latest snapshot stats
  const latest = dailySummaries[0];

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  if (!snapshots.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-slate-500">Geen snapshots gevonden. De eerste snapshot wordt vannacht om 02:00 gemaakt.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Totaal users" value={latest?.total || 0} color="blue" />
        <StatCard icon={ShieldCheck} label="Admin" value={latest?.adminCount || 0} color="emerald" />
        <StatCard icon={User} label="Employee" value={latest?.employeeCount || 0} color="indigo" />
        <StatCard icon={UserX} label="Null effective_role" value={latest?.nullCount || 0} color={latest?.nullCount > 0 ? "amber" : "slate"} />
      </div>

      {/* 7-day trend table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Laatste 7 dagen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Datum</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Totaal</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Admin</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Employee</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Null role</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.map((row, idx) => {
                  const prev = dailySummaries[idx + 1];
                  const totalChanged = prev && row.total !== prev.total;
                  const adminChanged = prev && row.adminCount !== prev.adminCount;
                  return (
                    <tr key={row.date} className="border-b hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium">{format(new Date(row.date), 'dd-MM-yyyy')}</td>
                      <td className={`py-2.5 px-3 text-right ${totalChanged ? 'font-bold text-orange-600' : ''}`}>{row.total}</td>
                      <td className={`py-2.5 px-3 text-right ${adminChanged ? 'font-bold text-red-600' : ''}`}>{row.adminCount}</td>
                      <td className="py-2.5 px-3 text-right">{row.employeeCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        {row.nullCount > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700">{row.nullCount}</Badge>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-50 text-slate-700',
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}