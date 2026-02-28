import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, Smartphone, 
  Monitor, Wifi, Zap 
} from "lucide-react";

function KPICard({ label, value, sub, icon: Icon, color = "slate", onClick }) {
  const colors = {
    green: "border-emerald-200 bg-emerald-50/50",
    red: "border-red-200 bg-red-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    blue: "border-blue-200 bg-blue-50/50",
    purple: "border-purple-200 bg-purple-50/50",
    slate: "border-slate-200",
  };
  const textColors = {
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
    slate: "text-slate-900",
  };
  return (
    <Card 
      className={`${colors[color]} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xl font-bold ${textColors[color]}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
          </div>
          {Icon && <Icon className={`w-4 h-4 ${textColors[color]} opacity-60`} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReliabilityKPICards({ logs, onKPIClick }) {
  const total = logs.length;
  const successLogs = logs.filter(l => l.status === "RESPONSE_OK" || l.status === "SUCCESS");
  const errorLogs = logs.filter(l => l.status === "RESPONSE_ERROR" || l.status === "FAILED");
  const timeoutLogs = logs.filter(l => (l.response_time_ms || l.latency_ms || 0) > 15000);
  const deploymentErrors = logs.filter(l => 
    (l.error_message || "").toLowerCase().includes("not found or not deployed") ||
    (l.error_message || "").toLowerCase().includes("not deployed") ||
    (l.error_code || "").includes("DEPLOYMENT")
  );

  const responseTimes = logs
    .map(l => l.response_time_ms || l.latency_ms || 0)
    .filter(v => v > 0);
  const avgResponse = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length)
    : 0;
  const maxResponse = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

  const safariErrors = logs.filter(l => 
    (l.browser || l.user_agent || "").includes("Safari") && 
    !(l.browser || l.user_agent || "").includes("Chrome") &&
    (l.status === "RESPONSE_ERROR" || l.status === "FAILED" || l.status === "ABORTED")
  );
  const androidErrors = logs.filter(l => 
    (l.user_agent || "").match(/Android/i) &&
    (l.status === "RESPONSE_ERROR" || l.status === "FAILED" || l.status === "ABORTED")
  );

  const successPct = total > 0 ? ((successLogs.length / total) * 100).toFixed(1) : "0.0";
  const errorPct = total > 0 ? ((errorLogs.length / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
      <KPICard 
        label="Totaal" value={total} icon={Zap} color="blue"
        onClick={() => onKPIClick?.("all")}
      />
      <KPICard 
        label="Success %" value={`${successPct}%`} 
        sub={`${successLogs.length} van ${total}`}
        icon={CheckCircle2} color={parseFloat(successPct) >= 95 ? "green" : "amber"}
        onClick={() => onKPIClick?.("success")}
      />
      <KPICard 
        label="Errors %" value={`${errorPct}%`}
        sub={`${errorLogs.length} errors`}
        icon={XCircle} color={errorLogs.length > 0 ? "red" : "green"}
        onClick={() => onKPIClick?.("errors")}
      />
      <KPICard 
        label="Timeouts" value={timeoutLogs.length}
        sub=">15s response"
        icon={Clock} color={timeoutLogs.length > 0 ? "amber" : "slate"}
        onClick={() => onKPIClick?.("timeouts")}
      />
      <KPICard 
        label="Deploy Errors" value={deploymentErrors.length}
        sub="not deployed"
        icon={AlertTriangle} color={deploymentErrors.length > 0 ? "red" : "slate"}
        onClick={() => onKPIClick?.("deployment")}
      />
      <KPICard 
        label="Avg Response" value={`${avgResponse}ms`}
        icon={Zap} color={avgResponse > 5000 ? "red" : avgResponse > 3000 ? "amber" : "slate"}
      />
      <KPICard 
        label="Max Response" value={`${maxResponse}ms`}
        icon={Clock} color={maxResponse > 15000 ? "red" : maxResponse > 10000 ? "amber" : "slate"}
      />
      <KPICard 
        label="Safari Errors" value={safariErrors.length}
        icon={Monitor} color={safariErrors.length > 0 ? "purple" : "slate"}
        onClick={() => onKPIClick?.("safari")}
      />
      <KPICard 
        label="Android Errors" value={androidErrors.length}
        icon={Smartphone} color={androidErrors.length > 0 ? "amber" : "slate"}
        onClick={() => onKPIClick?.("android")}
      />
    </div>
  );
}