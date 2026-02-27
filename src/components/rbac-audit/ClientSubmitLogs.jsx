import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Monitor, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

const STATUS_CONFIG = {
  CLICKED:        { label: "Clicked",       color: "bg-blue-100 text-blue-800",   icon: Clock },
  REQUEST_STARTED:{ label: "Request sent",  color: "bg-yellow-100 text-yellow-800", icon: Loader2 },
  RESPONSE_OK:    { label: "OK",            color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  RESPONSE_ERROR: { label: "Error",         color: "bg-red-100 text-red-800",     icon: XCircle },
  ABORTED:        { label: "Aborted",       color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

export default function ClientSubmitLogs() {
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["clientSubmitLogs"],
    queryFn: () => base44.entities.ClientSubmitLog.list("-created_date", 200),
  });

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (emailFilter && !log.user_email?.toLowerCase().includes(emailFilter.toLowerCase())) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (browserFilter !== "all" && log.browser !== browserFilter) return false;
      return true;
    });
  }, [logs, emailFilter, statusFilter, browserFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const ok = logs.filter(l => l.status === "RESPONSE_OK").length;
    const errors = logs.filter(l => l.status === "RESPONSE_ERROR").length;
    const aborted = logs.filter(l => l.status === "ABORTED").length;
    const stuck = logs.filter(l => l.status === "CLICKED" || l.status === "REQUEST_STARTED").length;
    const safariIssues = logs.filter(l => l.browser?.includes("Safari") && l.status !== "RESPONSE_OK").length;
    return { total, ok, errors, aborted, stuck, safariIssues };
  }, [logs]);

  const browsers = useMemo(() => {
    const set = new Set(logs.map(l => l.browser).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Totaal" value={stats.total} />
        <StatCard label="OK" value={stats.ok} color="text-green-600" />
        <StatCard label="Errors" value={stats.errors} color="text-red-600" />
        <StatCard label="Aborted" value={stats.aborted} color="text-orange-600" />
        <StatCard label="Stuck" value={stats.stuck} color="text-yellow-600" />
        <StatCard label="Safari issues" value={stats.safariIssues} color="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter op e-mail..."
          value={emailFilter}
          onChange={e => setEmailFilter(e.target.value)}
          className="w-56"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {Object.keys(STATUS_CONFIG).map(s => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={browserFilter} onValueChange={setBrowserFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Browser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle browsers</SelectItem>
            {browsers.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">Tijdstip</th>
                  <th className="text-left p-3 font-medium">Gebruiker</th>
                  <th className="text-left p-3 font-medium">Datum dienst</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Browser</th>
                  <th className="text-left p-3 font-medium">Apparaat</th>
                  <th className="text-right p-3 font-medium">Payload KB</th>
                  <th className="text-right p-3 font-medium">Sig KB</th>
                  <th className="text-right p-3 font-medium">Response ms</th>
                  <th className="text-left p-3 font-medium">Fout</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center p-6 text-slate-400">Geen logs gevonden</td>
                  </tr>
                )}
                {filtered.map(log => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.CLICKED;
                  const Icon = cfg.icon;
                  const isSafari = log.browser?.includes("Safari");
                  const isProblematic = log.status !== "RESPONSE_OK";
                  return (
                    <tr
                      key={log.id}
                      className={`border-b hover:bg-slate-50 ${isSafari && isProblematic ? "bg-orange-50/50" : ""}`}
                    >
                      <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                        {log.clicked_at ? new Date(log.clicked_at).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                      </td>
                      <td className="p-3 text-xs truncate max-w-[160px]" title={log.user_email}>
                        {log.user_email || "-"}
                      </td>
                      <td className="p-3 text-xs">{log.entry_date || "-"}</td>
                      <td className="p-3">
                        <Badge className={`${cfg.color} text-xs flex items-center gap-1 w-fit`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">
                        <span className={isSafari ? "font-medium text-purple-700" : ""}>
                          {log.browser || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {log.device === "iPhone" || log.device === "iPad" ? (
                          <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{log.device}</span>
                        ) : log.device === "Mac" || log.device === "Windows" ? (
                          <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{log.device}</span>
                        ) : log.device || "-"}
                      </td>
                      <td className="p-3 text-xs text-right">{log.payload_size_kb?.toFixed(1) || "-"}</td>
                      <td className="p-3 text-xs text-right">
                        <span className={log.signature_size_kb > 1200 ? "text-red-600 font-bold" : ""}>
                          {log.signature_size_kb?.toFixed(1) || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-right">
                        <span className={log.response_time_ms > 10000 ? "text-red-600 font-bold" : log.response_time_ms > 5000 ? "text-orange-600" : ""}>
                          {log.response_time_ms ? `${Math.round(log.response_time_ms)}` : "-"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-red-600 max-w-[200px] truncate" title={log.error_message}>
                        {log.error_message || "-"}
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

function StatCard({ label, value, color = "text-slate-900" }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}