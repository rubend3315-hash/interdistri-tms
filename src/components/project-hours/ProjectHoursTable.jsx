import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectHoursTable({ rows, projMap, custMap }) {
  // Group by project
  const byProject = {};
  rows.forEach(r => {
    const pid = r.project_id;
    if (!byProject[pid]) byProject[pid] = { project: r.project, rows: [], total: 0 };
    byProject[pid].rows.push(r);
    byProject[pid].total += r.hours;
  });

  const projectGroups = Object.values(byProject).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-3">
      {projectGroups.map(group => {
        const proj = group.project;
        const projName = proj?.name || "Onbekend project";
        const customer = proj?.customer_id ? custMap[proj.customer_id] : null;
        const budget = proj?.budget || 0;
        const pct = budget > 0 ? Math.round((group.total / budget) * 100) : null;

        return (
          <Card key={group.project?.id || "unknown"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{projName}</CardTitle>
                  {customer && <p className="text-xs text-slate-500">{customer.company_name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-900">{Math.round(group.total * 100) / 100}u</p>
                  {budget > 0 && (
                    <p className={`text-xs ${pct > 100 ? "text-red-600" : pct > 80 ? "text-amber-600" : "text-slate-500"}`}>
                      {pct}% van {budget}u budget
                    </p>
                  )}
                </div>
              </div>
              {budget > 0 && (
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="text-left py-1.5 font-medium">Medewerker</th>
                    <th className="text-left py-1.5 font-medium">Afdeling</th>
                    <th className="text-right py-1.5 font-medium">Diensten</th>
                    <th className="text-right py-1.5 font-medium">Uren</th>
                    {budget > 0 && <th className="text-right py-1.5 font-medium">% Budget</th>}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map(r => {
                    const empPct = budget > 0 ? Math.round((r.hours / budget) * 100) : null;
                    return (
                      <tr key={`${r.employee_id}_${r.project_id}`} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-900 font-medium">
                          {r.employee?.first_name} {r.employee?.prefix ? r.employee.prefix + " " : ""}{r.employee?.last_name}
                        </td>
                        <td className="py-2 text-slate-500">{r.employee?.department || "-"}</td>
                        <td className="py-2 text-right text-slate-600">{r.entries}</td>
                        <td className="py-2 text-right font-medium text-slate-900">{r.hours}u</td>
                        {budget > 0 && (
                          <td className="py-2 text-right text-slate-500">{empPct}%</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}