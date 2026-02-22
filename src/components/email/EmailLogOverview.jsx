import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subHours, isAfter } from "date-fns";
import { nl } from "date-fns/locale";
import {
  CheckCircle2, XCircle, Mail, AlertTriangle, Bug,
  Search, RefreshCw, Download, Clock, TrendingUp, Loader2, RotateCcw
} from "lucide-react";
import { toast } from "sonner";

const SOURCE_LABELS = {
  sendStamkaartEmail: "Stamkaart",
  sendWelcomeEmail: "Onboarding",
  sendEmployeeEmail: "Medewerker e-mail",
  sendContractForSigning: "Contract",
  notifyContractSigned: "Contract notificatie",
  sendContractToPayroll: "Loonadministratie",
  testEmailSend: "Test",
  sendTimeEntryRejectionEmail: "Dienst afgekeurd",
  processContractWijziging: "Contractwijziging",
  mailService: "Mail Service",
  gmail_import: "Gmail import",
};

const STATUS_CONFIG = {
  success: { label: "Verzonden", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Mislukt", color: "bg-red-100 text-red-700", icon: XCircle },
  pending: { label: "Wachtend", color: "bg-amber-100 text-amber-700", icon: Clock },
  sending: { label: "Verzenden...", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  retrying: { label: "Opnieuw proberen", color: "bg-orange-100 text-orange-700", icon: RotateCcw },
};

/** Parse timestamp — nlTimestamp() stores "YYYY-MM-DDTHH:mm:ss" in Europe/Amsterdam without offset.
 *  If the string has no 'Z' or offset we treat it as local (NL) time already. */
function parseNlDate(str) {
  if (!str) return null;
  // If the string already has timezone info (Z or +/-), parse as-is
  if (/[Z+]/.test(str) || /\d{2}-\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  // Otherwise it's a naive NL timestamp — append a fake offset so Date doesn't shift it
  // We display it directly, no conversion needed
  return new Date(str);
}

function LogRow({ log, onRetry, isRetrying }) {
  const dateStr = log.sent_at || log.created_date;
  const d = parseNlDate(dateStr);
  const sourceLabel = SOURCE_LABELS[log.source_function] || log.source_function || "—";
  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const canRetry = log.status === "failed" || log.status === "retrying";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-slate-900 text-sm truncate max-w-[400px]">
                {log.subject || "(geen onderwerp)"}
              </h4>
              <Badge className={`${statusCfg.color} text-xs gap-1`}>
                <StatusIcon className="w-3 h-3" /> {statusCfg.label}
              </Badge>
              <Badge variant="outline" className="text-xs">{sourceLabel}</Badge>
              {log.retry_count > 0 && (
                <Badge variant="outline" className="text-xs text-orange-600">
                  {log.retry_count}x retry
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span><strong>Aan:</strong> {log.to}</span>
              {log.cc && <span><strong>CC:</strong> {log.cc}</span>}
              {log.message_id && (
                <span className="text-slate-400 font-mono text-[10px]">ID: {log.message_id.substring(0, 12)}...</span>
              )}
            </div>
            {log.error_message && (
              <div className="mt-1.5 text-xs text-red-600 bg-red-50 p-2 rounded flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{log.error_message}</span>
              </div>
            )}
            {log.resent_by && (
              <div className="mt-1 text-xs text-slate-400">
                Opnieuw verzonden door: {log.resent_by}
              </div>
            )}
          </div>
          <div className="flex items-start gap-2">
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 h-7"
                disabled={isRetrying}
                onClick={() => onRetry(log.id)}
              >
                {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Retry
              </Button>
            )}
            <div className="text-right text-xs text-slate-400 whitespace-nowrap">
              {d ? format(d, "d MMM yyyy", { locale: nl }) : "—"}
              <br />
              {d ? format(d, "HH:mm") : ""}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailLogOverview() {
  const [tab, setTab] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retryingId, setRetryingId] = useState(null);

  const queryClient = useQueryClient();

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => base44.entities.EmailLog.list("-created_date", 200),
  });

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date();
    const h24 = subHours(now, 24);
    const last24h = emailLogs.filter(l => {
      const d = new Date(l.sent_at || l.created_date);
      return isAfter(d, h24);
    });
    const total = emailLogs.length;
    const failed = emailLogs.filter(l => l.status === "failed").length;
    const errorRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0";
    return {
      total,
      last24h: last24h.length,
      errorRate,
      failed,
      success: emailLogs.filter(l => l.status === "success").length,
    };
  }, [emailLogs]);

  // Get unique sources
  const sources = useMemo(() => {
    const s = new Set(emailLogs.map(l => l.source_function).filter(Boolean));
    return Array.from(s).sort();
  }, [emailLogs]);

  // Filtered logs
  const displayed = useMemo(() => {
    let filtered = emailLogs;
    if (tab === "success") filtered = filtered.filter(l => l.status === "success");
    else if (tab === "failed") filtered = filtered.filter(l => l.status === "failed" || l.status === "retrying");
    if (sourceFilter !== "all") filtered = filtered.filter(l => l.source_function === sourceFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        (l.subject || "").toLowerCase().includes(q) ||
        (l.to || "").toLowerCase().includes(q) ||
        (l.cc || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [emailLogs, tab, sourceFilter, searchQuery]);

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: (logId) => base44.functions.invoke('retryEmail', { log_id: logId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      toast.success(res.data?.success ? "E-mail opnieuw verzonden" : "Retry mislukt");
      setRetryingId(null);
    },
    onError: () => {
      toast.error("Retry mislukt");
      setRetryingId(null);
    },
  });

  const handleRetry = (logId) => {
    setRetryingId(logId);
    retryMutation.mutate(logId);
  };

  const handleExportCSV = () => {
    const headers = ["Datum", "Aan", "CC", "Onderwerp", "Status", "Bron", "MessageID", "Fout"];
    const rows = displayed.map(l => [
      l.sent_at || l.created_date || "",
      l.to || "",
      l.cc || "",
      (l.subject || "").replace(/"/g, '""'),
      l.status || "",
      SOURCE_LABELS[l.source_function] || l.source_function || "",
      l.message_id || "",
      (l.error_message || "").replace(/"/g, '""'),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-log-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDebug = () => {
    const last5 = emailLogs.slice(0, 5);
    console.log("=== Laatste 5 EmailLog records ===");
    last5.forEach((l, i) => console.log(`[${i + 1}]`, { to: l.to, subject: l.subject, status: l.status, source: l.source_function, message_id: l.message_id, retry_count: l.retry_count }));
    console.log("=================================");
    toast.info(`${last5.length} logs getoond in console (F12)`);
  };

  return (
    <div className="space-y-4">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Totaal</p>
              <p className="text-xl font-bold">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Verzonden</p>
              <p className="text-xl font-bold text-emerald-700">{kpis.success}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Laatste 24u</p>
              <p className="text-xl font-bold text-blue-700">{kpis.last24h}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Foutpercentage</p>
              <p className="text-xl font-bold text-red-700">{kpis.errorRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Alle ({emailLogs.length})</TabsTrigger>
            <TabsTrigger value="success">Verzonden ({kpis.success})</TabsTrigger>
            <TabsTrigger value="failed">Fouten ({kpis.failed})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Alle bronnen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle bronnen</SelectItem>
            {sources.map(s => (
              <SelectItem key={s} value={s}>{SOURCE_LABELS[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoeken op onderwerp, e-mail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1 text-xs h-9">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleDebug} className="gap-1 text-xs h-9">
            <Bug className="w-3.5 h-3.5" /> Debug
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Laden...</div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Geen verzonden e-mails gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{displayed.length} resultaten</p>
          {displayed.map(log => (
            <LogRow
              key={log.id}
              log={log}
              onRetry={handleRetry}
              isRetrying={retryingId === log.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}