import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectHoursChart({ projectTotals }) {
  const maxHours = Math.max(...projectTotals.map(p => Math.max(p.hours, p.budget || 0)), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Uren vs Budget per Project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectTotals.map(p => {
          const budgetH = p.budget || 0;
          const pct = budgetH > 0 ? Math.round((p.hours / budgetH) * 100) : null;
          const barMax = Math.max(p.hours, budgetH) || 1;
          const hoursWidth = Math.max((p.hours / barMax) * 100, 2);
          const budgetWidth = budgetH > 0 ? (budgetH / barMax) * 100 : 0;
          const isOver = budgetH > 0 && p.hours > budgetH;

          return (
            <div key={p.project_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-400">{p.employeeCount} mdw</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{p.hours}u</span>
                  {budgetH > 0 && (
                    <>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{budgetH}u budget</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        isOver ? "bg-red-50 text-red-600" : pct > 80 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                      }`}>
                        {pct}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
                {budgetH > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-slate-200 rounded-full"
                    style={{ width: `${budgetWidth}%` }}
                  />
                )}
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                    isOver ? "bg-red-500" : pct !== null && pct > 80 ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${hoursWidth}%` }}
                />
                {budgetH > 0 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-slate-900/30"
                    style={{ left: `${budgetWidth}%` }}
                    title={`Budget: ${budgetH}u`}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /> Gewerkte uren</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-200" /> Budget</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500" /> &gt;80%</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Over budget</div>
        </div>
      </CardContent>
    </Card>
  );
}