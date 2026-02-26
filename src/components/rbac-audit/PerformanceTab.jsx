import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Activity, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

function colorClass(ms) {
  if (ms == null || ms === 0) return "text-slate-400";
  if (ms < 2500) return "text-emerald-600";
  if (ms <= 4000) return "text-amber-600";
  return "text-red-600";
}

function bgClass(ms) {
  if (ms == null || ms === 0) return "border-slate-200 bg-slate-50";
  if (ms < 2500) return "border-emerald-200 bg-emerald-50";
  if (ms <= 4000) return "border-amber-200 bg-amber-50";
  return "border-red-200 bg-red-50";
}

function pct(arr, p) {
  if (!arr.length) return 0;
  return arr[Math.min(Math.floor(p * arr.length), arr.length - 1)];
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

export default function PerformanceTab() {
  const [dateFilter, setDateFilter] = useState("7d");
  const [minMs, setMinMs] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["perf-logs"],
    queryFn: () => base44.entities.MobileEntryPerformanceLog.list("-created_date", 100),
  });

  const cutoff = useMemo(() => {
    const d = new Date();
    if (dateFilter === "today") d.setHours(0, 0, 0, 0);
    else if (dateFilter === "7d") d.setDate(d.getDate() - 7);
    else if (dateFilter === "30d") d.setDate(d.getDate() - 30);
    else return null;
    return d.toISOString();
  }, [dateFilter]);

  const filtered = useMemo(() => {
    let rows = logs;
    if (cutoff) rows = rows.filter(r => r.created_date >= cutoff);
    if (minMs > 0) rows = rows.filter(r => (r.total_ms || 0) >= minMs);
    return rows;
  }, [logs, cutoff, minMs]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      sortDesc ? (b.total_ms || 0) - (a.total_ms || 0) : (a.total_ms || 0) - (b.total_ms || 0)
    );
  }, [filtered, sortDesc]);

  // KPI stats over latest 50 (from filtered)
  const kpi = useMemo(() => {
    const subset = filtered.slice(0, 50);
    const totals = subset.map(r => r.total_ms).filter(v => v != null).sort((a, b) => a - b);
    const creates = subset.map(r => r.timeentry_create_ms).filter(v => v != null);
    const verifies = subset.map(r => r.write_verify_ms).filter(v => v != null);
    return {
      avgTotal: avg(totals),
      p95Total: pct(totals, 0.95),
      avgCreate: avg(creates),
      avgVerify: avg(verifies),
    };
  }, [filtered]);

  const kpiItems = [
    { label: "Avg Total", value: kpi.avgTotal, ms: kpi.avgTotal },
    { label: "p95 Total", value: kpi.p95Total, ms: kpi.p95Total },
    { label: "Avg Create", value: kpi.avgCreate, ms: kpi.avgCreate },
    { label: "Avg Verify", value: kpi.avgVerify, ms: kpi.avgVerify },
  ];

  const fmtMs = (v) => v != null ? `${Math.round(v)}` : "–";

  if (isLoading) {
    return <div className="text-sm text-slate-500 py-8 text-center">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiItems.map(item => (
          <div key={item.label} className={`rounded-lg border p-3 ${bgClass(item.ms)}`}>
            <p className={`text-xl font-bold ${colorClass(item.ms)}`}>{item.value} ms</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">Periode:</span>
        {[
          { key: "today", label: "Vandaag" },
          { key: "7d", label: "7 dagen" },
          { key: "30d", label: "30 dagen" },
          { key: "all", label: "Alles" },
        ].map(opt => (
          <Button
            key={opt.key}
            size="sm"
            variant={dateFilter === opt.key ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setDateFilter(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
        <span className="text-xs text-slate-500 font-medium ml-4">Min ms:</span>
        {[
          { key: 0, label: "Alles" },
          { key: 2000, label: "> 2000" },
          { key: 3000, label: "> 3000" },
          { key: 5000, label: "> 5000" },
        ].map(opt => (
          <Button
            key={opt.key}
            size="sm"
            variant={minMs === opt.key ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setMinMs(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Logs ({sorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="text-xs py-2">Datum</TableHead>
                  <TableHead className="text-xs py-2">User</TableHead>
                  <TableHead className="text-xs py-2">
                    <button className="flex items-center gap-1" onClick={() => setSortDesc(!sortDesc)}>
                      Total ms <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs py-2">Auth</TableHead>
                  <TableHead className="text-xs py-2">Emp Lookup</TableHead>
                  <TableHead className="text-xs py-2">Overlap</TableHead>
                  <TableHead className="text-xs py-2">TE Create</TableHead>
                  <TableHead className="text-xs py-2">Trips/SPW</TableHead>
                  <TableHead className="text-xs py-2">Commit</TableHead>
                  <TableHead className="text-xs py-2">Verify</TableHead>
                  <TableHead className="text-xs py-2">Post Guard</TableHead>
                  <TableHead className="text-xs py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-sm text-slate-400 py-6">
                      Geen performance logs gevonden
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map(row => (
                  <TableRow key={row.id} className="text-xs h-8">
                    <TableCell className="py-1 whitespace-nowrap">
                      {row.created_date ? format(new Date(row.created_date), "dd MMM HH:mm", { locale: nl }) : "–"}
                    </TableCell>
                    <TableCell className="py-1 truncate max-w-[140px]" title={row.user_email}>
                      {row.user_email || "–"}
                    </TableCell>
                    <TableCell className={`py-1 font-bold ${colorClass(row.total_ms)}`}>
                      {fmtMs(row.total_ms)}
                    </TableCell>
                    <TableCell className="py-1">{fmtMs(row.auth_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.employee_lookup_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.overlap_check_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.timeentry_create_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.trips_and_spw_create_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.commit_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.write_verify_ms)}</TableCell>
                    <TableCell className="py-1">{fmtMs(row.post_commit_guard_ms)}</TableCell>
                    <TableCell className="py-1">
                      <span className={row.outcome === "SUCCESS" ? "text-emerald-600" : "text-red-600"}>
                        {row.outcome || "–"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}