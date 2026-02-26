import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

function getHealthLevel(failed, p95) {
  if (failed >= 3 || p95 > 4000) return "red";
  if (failed > 0 || (p95 >= 3000 && p95 <= 4000)) return "orange";
  return "green";
}

const HEALTH_STYLES = {
  green: { ring: "ring-emerald-200", dot: "bg-emerald-500", text: "text-emerald-600" },
  orange: { ring: "ring-amber-200", dot: "bg-amber-500", text: "text-amber-600" },
  red: { ring: "ring-red-200", dot: "bg-red-500", text: "text-red-600" },
};

export default function MobileEntryStatusCard() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { data: logs = [] } = useQuery({
    queryKey: ["mobile-entry-today-stats"],
    queryFn: () => base44.entities.MobileEntrySubmissionLog.list("-timestamp_received", 200),
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const todayLogs = logs.filter(l => l.timestamp_received && l.timestamp_received.startsWith(today));
    const total = todayLogs.filter(l => l.status !== "RECEIVED").length;
    const success = todayLogs.filter(l => l.status === "SUCCESS").length;
    const failed = todayLogs.filter(l => l.status === "FAILED" || l.status === "VALIDATION_FAILED").length;

    const latencies = todayLogs
      .filter(l => l.status === "SUCCESS" && l.latency_ms > 0)
      .map(l => l.latency_ms)
      .sort((a, b) => a - b);

    const p95 = latencies.length > 0
      ? latencies[Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1)]
      : 0;

    return { total, success, failed, p95 };
  }, [logs, today]);

  const health = getHealthLevel(stats.failed, stats.p95);
  const s = HEALTH_STYLES[health];

  return (
    <Card className={cn("ring-2", s.ring)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-500">Mobile Entry</span>
          </div>
          <div className={cn("w-2.5 h-2.5 rounded-full", s.dot)} />
        </div>
        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        <p className="text-xs text-slate-500 mt-0.5">submissions vandaag</p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-emerald-600 font-medium">{stats.success} ✓</span>
          <span className={stats.failed > 0 ? "text-red-600 font-medium" : "text-slate-400"}>{stats.failed} ✗</span>
          <span className={cn("font-mono", s.text)}>p95: {stats.p95}ms</span>
        </div>
      </CardContent>
    </Card>
  );
}