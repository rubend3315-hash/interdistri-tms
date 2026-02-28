import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Clock, Server } from "lucide-react";

export default function ReliabilityAlerts({ logs, registryStatus }) {
  const alerts = useMemo(() => {
    const result = [];

    // 1. Error bursts: ≥3 failures within 5 min
    const errors = logs
      .filter(l => l.status === "RESPONSE_ERROR" || l.status === "FAILED")
      .map(l => ({
        ts: new Date(l.clicked_at || l.timestamp_received || l.created_date).getTime(),
        msg: l.error_message,
      }))
      .sort((a, b) => a.ts - b.ts);

    for (let i = 0; i < errors.length - 2; i++) {
      if (errors[i + 2].ts - errors[i].ts <= 5 * 60 * 1000) {
        const burstTime = new Date(errors[i].ts).toLocaleString("nl-NL", { 
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
        });
        result.push({
          type: "burst",
          icon: Zap,
          color: "red",
          title: "Error Burst Detected",
          description: `≥3 fouten binnen 5 minuten rond ${burstTime}`,
        });
        break; // Only report first burst
      }
    }

    // 2. Timeout spikes (>15s)
    const timeouts = logs.filter(l => (l.response_time_ms || l.latency_ms || 0) > 15000);
    if (timeouts.length > 0) {
      result.push({
        type: "timeout",
        icon: Clock,
        color: "amber",
        title: "Timeout Events Detected",
        description: `${timeouts.length} submissions met >15s response time`,
      });
    }

    // 3. Slow submits (potential UI stuck)
    const slowSuccessful = logs.filter(l => 
      (l.status === "RESPONSE_OK" || l.status === "SUCCESS") &&
      (l.response_time_ms || l.latency_ms || 0) > 15000 &&
      (l.retry_count || 0) > 0
    );
    if (slowSuccessful.length > 0) {
      result.push({
        type: "stuck",
        icon: AlertTriangle,
        color: "amber",
        title: `⚠️ Potential UI Stuck Events (${slowSuccessful.length})`,
        description: "Status OK maar >15s response + retries — gebruiker zag mogelijk laadscherm",
      });
    }

    // 4. Deployment errors
    const deployErrors = logs.filter(l => 
      (l.error_message || "").toLowerCase().includes("not deployed") ||
      (l.error_code || "").includes("DEPLOYMENT")
    );
    if (deployErrors.length > 0) {
      result.push({
        type: "deployment",
        icon: Server,
        color: "red",
        title: "Backend Deployment Errors",
        description: `${deployErrors.length} submissions met "not deployed" fout`,
      });
    }

    // 5. Registry drift correlation
    if (registryStatus && registryStatus !== "GREEN" && deployErrors.length > 0) {
      result.push({
        type: "drift",
        icon: Server,
        color: "red",
        title: "🔴 Possible Registry Drift Impact",
        description: `Registry status: ${registryStatus} — én er zijn deployment errors. Controleer verifyFunctionRegistry.`,
      });
    }

    return result;
  }, [logs, registryStatus]);

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-3 flex items-center gap-2 text-sm text-emerald-700">
          <span className="text-lg">✅</span>
          Geen reliability alerts — alles stabiel
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        const borderColor = alert.color === "red" ? "border-red-300 bg-red-50/70" : "border-amber-300 bg-amber-50/70";
        const textColor = alert.color === "red" ? "text-red-800" : "text-amber-800";
        return (
          <Card key={i} className={borderColor}>
            <CardContent className="py-2.5 px-4 flex items-start gap-3">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${textColor}`} />
              <div>
                <p className={`text-sm font-semibold ${textColor}`}>{alert.title}</p>
                <p className="text-xs text-slate-600">{alert.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}