import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function getHealthLevel(systemFailures, p95, stuckCount) {
  if (stuckCount > 1 || systemFailures >= 2 || p95 > 8000) return "red";
  if (stuckCount === 1 || systemFailures > 0 || p95 > 6000) return "orange";
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
    const systemFailures = todayLogs.filter(l => l.failure_type === "SYSTEM").length;
    const stuckCount = todayLogs.filter(l => l.stuck_detected === true && l.auto_resolved !== true).length;

    const latencies = todayLogs
      .filter(l => l.status === "SUCCESS" && l.latency_ms > 0)
      .map(l => l.latency_ms)
      .sort((a, b) => a - b);

    const p95 = latencies.length > 0
      ? latencies[Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1)]
      : 0;

    return { total, success, failed, systemFailures, p95, stuckCount };
  }, [logs, today]);

  const health = getHealthLevel(stats.systemFailures, stats.p95, stats.stuckCount);
  const s = HEALTH_STYLES[health];

  const showRing = stats.systemFailures > 0 || stats.stuckCount > 0;

  return (
    <Card className={cn(showRing ? "ring-1" : "", showRing ? s.ring : "")}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Mobile Entry</span>
          </div>
          <div className={cn("w-2 h-2 rounded-full", s.dot)} />
        </div>
        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">submissions vandaag</p>
        <div className="flex items-center gap-2.5 mt-1.5 text-[10px]">
          <span className="text-emerald-600 font-medium">{stats.success} ✓</span>
          <span className={stats.failed > 0 ? "text-red-600 font-medium" : "text-slate-400"}>{stats.failed} ✗</span>
          <span className="text-slate-400 font-mono">p95 {stats.p95}ms</span>
        </div>
        {stats.stuckCount > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md text-[10px] font-medium",
            stats.stuckCount > 1
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>{stats.stuckCount} verwerking{stats.stuckCount !== 1 ? 'en' : ''} vastgelopen</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}