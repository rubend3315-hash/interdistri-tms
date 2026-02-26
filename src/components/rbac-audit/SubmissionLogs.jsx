import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Smartphone, Clock, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import LatencyOverview from "./LatencyOverview";
import { format } from "date-fns";

const STATUS_CONFIG = {
  SUCCESS: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  FAILED: { color: 'bg-red-100 text-red-700', icon: XCircle },
  IDEMPOTENT_HIT: { color: 'bg-blue-100 text-blue-700', icon: RotateCcw },
  VALIDATION_FAILED: { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  RECEIVED: { color: 'bg-slate-100 text-slate-700', icon: Clock },
};

export default function SubmissionLogs() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDevice, setFilterDevice] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['submission-logs'],
    queryFn: () => base44.entities.MobileEntrySubmissionLog.list('-timestamp_received', 100),
  });

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      if (filterDevice === 'ios' && !(l.user_agent || '').match(/iPhone|iPad/i)) return false;
      if (filterDevice === 'android' && !(l.user_agent || '').match(/Android/i)) return false;
      if (filterDevice === 'desktop' && (l.user_agent || '').match(/iPhone|iPad|Android/i)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const s = [l.email, l.submission_id, l.error_message].filter(Boolean).join(' ').toLowerCase();
        if (!s.includes(term)) return false;
      }
      return true;
    });
  }, [logs, filterStatus, filterDevice, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter(l => l.status === 'SUCCESS').length;
    const failed = logs.filter(l => l.status === 'FAILED').length;
    const idempotent = logs.filter(l => l.status === 'IDEMPOTENT_HIT').length;
    const iosLogs = logs.filter(l => (l.user_agent || '').match(/iPhone|iPad/i));
    const iosFailed = iosLogs.filter(l => l.status === 'FAILED').length;
    const avgLatency = logs.filter(l => l.latency_ms > 0).length > 0
      ? Math.round(logs.filter(l => l.latency_ms > 0).reduce((s, l) => s + l.latency_ms, 0) / logs.filter(l => l.latency_ms > 0).length)
      : 0;
    const p95Latency = (() => {
      const sorted = logs.filter(l => l.latency_ms > 0).map(l => l.latency_ms).sort((a, b) => a - b);
      return sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    })();

    return { total, success, failed, idempotent, iosTotal: iosLogs.length, iosFailed, avgLatency, p95Latency };
  }, [logs]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Latency Overview */}
      <LatencyOverview />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Totaal" value={stats.total} sub={`${stats.success} success`} color="blue" />
        <MiniStat label="Failed" value={stats.failed} sub={stats.failed > 0 ? `${((stats.failed / Math.max(stats.total, 1)) * 100).toFixed(1)}%` : '0%'} color={stats.failed > 0 ? 'red' : 'emerald'} />
        <MiniStat label="iOS" value={stats.iosTotal} sub={`${stats.iosFailed} failed`} color={stats.iosFailed > 0 ? 'amber' : 'slate'} />
        <MiniStat label="Latency" value={`${stats.avgLatency}ms`} sub={`p95: ${stats.p95Latency}ms`} color={stats.p95Latency > 5000 ? 'red' : 'slate'} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Zoek op email of submission ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="IDEMPOTENT_HIT">Idempotent</SelectItem>
                <SelectItem value="VALIDATION_FAILED">Validatie</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle devices</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Submission Logs ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Geen logs gevonden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Datum</th>
                    <th className="text-right py-2 px-2.5 font-semibold text-slate-700">Latency</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Device</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Error</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-slate-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.RECEIVED;
                    const isIOS = (log.user_agent || '').match(/iPhone|iPad/i);
                    const isAndroid = (log.user_agent || '').match(/Android/i);
                    const isHighLatency = log.latency_ms > 5000;

                    return (
                      <tr key={log.id} className={`border-b ${log.status === 'FAILED' ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="py-2 px-2.5">
                          <Badge className={cfg.color}>{log.status}</Badge>
                        </td>
                        <td className="py-2 px-2.5 font-medium text-slate-800">{log.email || '-'}</td>
                        <td className="py-2 px-2.5 text-slate-600">{log.entry_date || '-'}</td>
                        <td className={`py-2 px-2.5 text-right font-mono text-xs ${isHighLatency ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {log.latency_ms ? `${log.latency_ms}ms` : '-'}
                        </td>
                        <td className="py-2 px-2.5">
                          {isIOS ? <Badge variant="outline" className="text-xs">iOS</Badge> :
                           isAndroid ? <Badge variant="outline" className="text-xs">Android</Badge> :
                           <Badge variant="outline" className="text-xs">Desktop</Badge>}
                        </td>
                        <td className="py-2 px-2.5 text-xs text-slate-500 max-w-[200px] truncate">
                          {log.error_message || '-'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap text-xs">
                          {log.timestamp_received ? format(new Date(log.timestamp_received), 'dd-MM HH:mm:ss') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, sub, color }) {
  const colors = {
    blue: 'border-blue-200', emerald: 'border-emerald-200', red: 'border-red-200',
    amber: 'border-amber-200', slate: 'border-slate-200',
  };
  return (
    <Card className={colors[color]}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}