import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfHour, parseISO } from "date-fns";

export default function ReliabilityCharts({ logs }) {
  const chartData = useMemo(() => {
    if (!logs.length) return [];

    // Group by hour
    const buckets = {};
    logs.forEach(log => {
      const ts = log.clicked_at || log.timestamp_received || log.created_date;
      if (!ts) return;
      const hour = format(startOfHour(parseISO(ts)), "MM-dd HH:00");
      if (!buckets[hour]) {
        buckets[hour] = { hour, total: 0, errors: 0, totalMs: 0, countMs: 0 };
      }
      buckets[hour].total++;
      const isError = log.status === "RESPONSE_ERROR" || log.status === "FAILED" || log.status === "ABORTED";
      if (isError) buckets[hour].errors++;
      const ms = log.response_time_ms || log.latency_ms || 0;
      if (ms > 0) {
        buckets[hour].totalMs += ms;
        buckets[hour].countMs++;
      }
    });

    return Object.values(buckets)
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .map(b => ({
        hour: b.hour,
        avgResponseMs: b.countMs > 0 ? Math.round(b.totalMs / b.countMs) : 0,
        errorRate: b.total > 0 ? Math.round((b.errors / b.total) * 100) : 0,
        total: b.total,
        errors: b.errors,
      }));
  }, [logs]);

  if (chartData.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-400">
          Onvoldoende data voor grafieken (minimaal 2 uur nodig)
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Response Time (avg per uur)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="ms" />
                <Tooltip 
                  formatter={(v) => [`${v} ms`, "Avg Response"]}
                  labelFormatter={(l) => `Uur: ${l}`}
                />
                <Line 
                  type="monotone" dataKey="avgResponseMs" 
                  stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} 
                  name="Avg ms"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Error Rate (% per uur)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip 
                  formatter={(v, name) => [
                    name === "errorRate" ? `${v}%` : v, 
                    name === "errorRate" ? "Error Rate" : "Totaal"
                  ]}
                  labelFormatter={(l) => `Uur: ${l}`}
                />
                <Line 
                  type="monotone" dataKey="errorRate" 
                  stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }}
                  name="errorRate"
                />
                <Line 
                  type="monotone" dataKey="total" 
                  stroke="#94a3b8" strokeWidth={1} dot={false}
                  name="total" strokeDasharray="4 4"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}