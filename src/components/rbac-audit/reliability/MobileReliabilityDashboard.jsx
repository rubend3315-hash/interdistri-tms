import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

import ReliabilityKPICards from "./ReliabilityKPICards";
import ReliabilityCharts from "./ReliabilityCharts";
import ReliabilityAlerts from "./ReliabilityAlerts";
import ReliabilityDetailModal from "./ReliabilityDetailModal";

const TIME_FILTERS = [
  { key: "1h", label: "1 uur", hours: 1 },
  { key: "24h", label: "24 uur", hours: 24 },
  { key: "7d", label: "7 dagen", hours: 168 },
];

const QUICK_FILTERS = [
  { key: "all", label: "Alles" },
  { key: "errors_only", label: "Alleen Errors" },
  { key: "network_error", label: "NETWORK_ERROR" },
  { key: "client_timeout", label: "CLIENT_TIMEOUT" },
  { key: "not_deployed", label: "Not Deployed" },
];

export default function MobileReliabilityDashboard() {
  const [timeFilter, setTimeFilter] = useState("24h");
  const [quickFilter, setQuickFilter] = useState("all");
  const [modalType, setModalType] = useState(null);

  // Fetch both ClientSubmitLog and MobileEntrySubmissionLog
  const { data: clientLogs = [], isLoading: loadingClient } = useQuery({
    queryKey: ["reliability-client-logs"],
    queryFn: () => base44.entities.ClientSubmitLog.list("-created_date", 200),
  });
  const { data: submissionLogs = [], isLoading: loadingSub } = useQuery({
    queryKey: ["reliability-submission-logs"],
    queryFn: () => base44.entities.MobileEntrySubmissionLog.list("-timestamp_received", 200),
  });

  // Merge and deduplicate by submission_id, prefer client logs (richer data)
  const allLogs = useMemo(() => {
    const bySubId = new Map();
    // Client logs first (have browser, device, payload_size etc)
    clientLogs.forEach(l => {
      const key = l.submission_id || l.id;
      bySubId.set(key, {
        ...l,
        _source: "client",
        _ts: l.clicked_at || l.created_date,
      });
    });
    // Submission logs — only add if not already present
    submissionLogs.forEach(l => {
      const key = l.submission_id || l.id;
      if (!bySubId.has(key)) {
        bySubId.set(key, {
          ...l,
          _source: "backend",
          _ts: l.timestamp_received || l.created_date,
        });
      }
    });
    return Array.from(bySubId.values()).sort((a, b) => 
      new Date(b._ts || 0) - new Date(a._ts || 0)
    );
  }, [clientLogs, submissionLogs]);

  // Apply time filter
  const timeFiltered = useMemo(() => {
    const tf = TIME_FILTERS.find(f => f.key === timeFilter);
    if (!tf) return allLogs;
    const cutoff = Date.now() - tf.hours * 3600 * 1000;
    return allLogs.filter(l => new Date(l._ts || 0).getTime() >= cutoff);
  }, [allLogs, timeFilter]);

  // Apply quick filter
  const filtered = useMemo(() => {
    if (quickFilter === "all") return timeFiltered;
    if (quickFilter === "errors_only") {
      return timeFiltered.filter(l => 
        l.status === "RESPONSE_ERROR" || l.status === "FAILED" || l.status === "ABORTED"
      );
    }
    if (quickFilter === "network_error") {
      return timeFiltered.filter(l => 
        (l.error_message || "").toLowerCase().includes("network") ||
        (l.error_code || "").includes("NETWORK")
      );
    }
    if (quickFilter === "client_timeout") {
      return timeFiltered.filter(l => 
        (l.error_message || "").toLowerCase().includes("timeout") ||
        (l.response_time_ms || l.latency_ms || 0) > 15000
      );
    }
    if (quickFilter === "not_deployed") {
      return timeFiltered.filter(l => 
        (l.error_message || "").toLowerCase().includes("not deployed") ||
        (l.error_code || "").includes("DEPLOYMENT")
      );
    }
    return timeFiltered;
  }, [timeFiltered, quickFilter]);

  const isLoading = loadingClient || loadingSub;

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Mobile Reliability Overview
            <span className="text-xs font-normal text-slate-400 ml-2">
              {filtered.length} submissions in scope
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 font-medium">Periode:</span>
            {TIME_FILTERS.map(tf => (
              <Button
                key={tf.key}
                size="sm"
                variant={timeFilter === tf.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setTimeFilter(tf.key)}
              >
                {tf.label}
              </Button>
            ))}
            <span className="text-xs text-slate-500 font-medium ml-4">Filter:</span>
            {QUICK_FILTERS.map(qf => (
              <Button
                key={qf.key}
                size="sm"
                variant={quickFilter === qf.key ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setQuickFilter(qf.key)}
              >
                {qf.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <ReliabilityAlerts logs={filtered} />

      {/* KPI Cards */}
      <ReliabilityKPICards 
        logs={filtered} 
        onKPIClick={(type) => setModalType(type)} 
      />

      {/* Charts */}
      <ReliabilityCharts logs={filtered} />

      {/* Detail Modal */}
      <ReliabilityDetailModal
        open={!!modalType}
        onClose={() => setModalType(null)}
        filterType={modalType || "all"}
        logs={filtered}
      />
    </div>
  );
}