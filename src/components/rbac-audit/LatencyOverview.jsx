import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

function latencyColor(ms) {
  if (ms == null || ms === 0) return "text-slate-400";
  if (ms < 2500) return "text-emerald-600";
  if (ms <= 4000) return "text-amber-600";
  return "text-red-600";
}

function latencyBg(ms) {
  if (ms == null || ms === 0) return "border-slate-200";
  if (ms < 2500) return "border-emerald-200";
  if (ms <= 4000) return "border-amber-200";
  return "border-red-200";
}

export default function LatencyOverview() {
  const { data: logs = [] } = useQuery({
    queryKey: ['submission-logs-latency'],
    queryFn: () => base44.entities.MobileEntrySubmissionLog.list('-timestamp_received', 200),
  });

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const stats = useMemo(() => {
    const todayLogs = logs.filter(l => l.timestamp_received && l.timestamp_received.startsWith(today));
    const successLogs = todayLogs.filter(l => l.status === 'SUCCESS');
    const failedLogs = todayLogs.filter(l => l.status === 'FAILED');
    const total = todayLogs.filter(l => l.status !== 'RECEIVED').length;

    const latencies = successLogs.map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);
    const iosLat = successLogs.filter(l => (l.user_agent || '').match(/iPhone|iPad/i)).map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);
    const androidLat = successLogs.filter(l => (l.user_agent || '').match(/Android/i)).map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);

    const pct = (arr, p) => arr.length > 0 ? arr[Math.min(Math.floor(p * arr.length), arr.length - 1)] : 0;
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;

    return {
      total,
      success: successLogs.length,
      failed: failedLogs.length,
      avg,
      p50: pct(latencies, 0.50),
      p95: pct(latencies, 0.95),
      max: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      iosP95: pct(iosLat, 0.95),
      androidP95: pct(androidLat, 0.95),
    };
  }, [logs, today]);

  const items = [
    { label: "Submissions", value: stats.total, sub: `${stats.success} success / ${stats.failed} failed` },
    { label: "Avg Latency", value: `${stats.avg}ms`, ms: stats.avg },
    { label: "p50", value: `${stats.p50}ms`, ms: stats.p50 },
    { label: "p95", value: `${stats.p95}ms`, ms: stats.p95 },
    { label: "Max", value: `${stats.max}ms`, ms: stats.max },
    { label: "iOS p95", value: `${stats.iosP95}ms`, ms: stats.iosP95 },
    { label: "Android p95", value: `${stats.androidP95}ms`, ms: stats.androidP95 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Latency Overview (Vandaag)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {items.map(item => (
            <div key={item.label} className={`rounded-lg border p-3 ${item.ms != null ? latencyBg(item.ms) : 'border-slate-200'}`}>
              <p className={`text-lg font-bold ${item.ms != null ? latencyColor(item.ms) : 'text-slate-900'}`}>{item.value}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
              {item.sub && <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}