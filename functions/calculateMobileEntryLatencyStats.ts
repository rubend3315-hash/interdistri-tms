import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const svc = base44.asServiceRole;

  // Calculate for yesterday (run at 02:10, so yesterday is complete)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Check if already calculated
  const existing = await svc.entities.MobileEntryLatencyDailyStats.filter({ date: dateStr });
  if (existing.length > 0) {
    return Response.json({ success: true, message: `Stats for ${dateStr} already exist`, skipped: true });
  }

  // Fetch all logs for that date (filter by timestamp_received starting with dateStr)
  const allLogs = await svc.entities.MobileEntrySubmissionLog.filter({});
  const dayLogs = allLogs.filter(l => l.timestamp_received && l.timestamp_received.startsWith(dateStr));

  const successLogs = dayLogs.filter(l => l.status === 'SUCCESS');
  const failedLogs = dayLogs.filter(l => l.status === 'FAILED');

  // Latency values from SUCCESS logs
  const latencies = successLogs.map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);

  const iosLatencies = successLogs
    .filter(l => (l.user_agent || '').match(/iPhone|iPad/i))
    .map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);

  const androidLatencies = successLogs
    .filter(l => (l.user_agent || '').match(/Android/i))
    .map(l => l.latency_ms).filter(v => v != null && v > 0).sort((a, b) => a - b);

  const avg = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;

  await svc.entities.MobileEntryLatencyDailyStats.create({
    date: dateStr,
    total_submissions: dayLogs.filter(l => l.status !== 'RECEIVED').length,
    success_count: successLogs.length,
    failed_count: failedLogs.length,
    avg_latency_ms: avg,
    p50_latency_ms: percentile(latencies, 0.50),
    p95_latency_ms: percentile(latencies, 0.95),
    max_latency_ms: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    ios_p95_latency_ms: percentile(iosLatencies, 0.95),
    android_p95_latency_ms: percentile(androidLatencies, 0.95),
  });

  return Response.json({
    success: true,
    date: dateStr,
    total: dayLogs.length,
    success: successLogs.length,
    p95: percentile(latencies, 0.95),
  });
});