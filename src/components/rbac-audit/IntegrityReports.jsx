import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Hash, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function IntegrityReports({ currentUser }) {
  const [exporting, setExporting] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['rbac-integrity-reports'],
    queryFn: () => base44.entities.RBACIntegrityReport.list('-snapshot_date', 30),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all data for export
      const [latestReport, snapshots, findings] = await Promise.all([
        base44.entities.RBACIntegrityReport.list('-snapshot_date', 1),
        base44.entities.UserRoleSnapshot.list('-snapshot_timestamp', 100),
        base44.entities.RBACDecisionLog.list('-timestamp', 100),
      ]);

      const report = latestReport[0];
      const lines = [];

      // Header
      lines.push('RBAC INTEGRITY REPORT');
      lines.push(`Export Date: ${new Date().toISOString()}`);
      lines.push(`Exported by: ${currentUser?.email}`);
      lines.push('');

      // Summary
      if (report) {
        lines.push('=== INTEGRITY SUMMARY ===');
        lines.push(`Snapshot Date: ${report.snapshot_date}`);
        lines.push(`Total Users: ${report.total_users}`);
        lines.push(`Admin Count: ${report.admin_count}`);
        lines.push(`Employee Count: ${report.employee_effective_count}`);
        lines.push(`Null Effective Role: ${report.null_effective_count}`);
        lines.push(`Violations: ${report.violation_count}`);
        lines.push(`Warnings: ${report.warning_count}`);
        lines.push(`Hash Signature: ${report.hash_signature}`);
        if (report.drift_alerts?.length > 0) {
          lines.push(`Drift Alerts: ${report.drift_alerts.join('; ')}`);
        }
        lines.push('');
      }

      // Snapshots CSV
      lines.push('=== USER ROLE SNAPSHOTS ===');
      lines.push('user_id,email,system_role,business_role,employee_id,effective_role,timestamp');
      for (const s of snapshots) {
        lines.push([s.user_id, s.email, s.system_role, s.business_role || '', s.employee_id || '', s.effective_role || '', s.snapshot_timestamp].join(','));
      }
      lines.push('');

      // Findings
      const violations = findings.filter(f => f.result === 'VIOLATION');
      const warnings = findings.filter(f => f.result === 'WARNING');

      lines.push('=== VIOLATIONS ===');
      if (violations.length === 0) {
        lines.push('None');
      } else {
        lines.push('user_id,check_type,result,description,timestamp');
        for (const v of violations) {
          lines.push([v.user_id, v.check_type, v.result, `"${v.description}"`, v.timestamp].join(','));
        }
      }
      lines.push('');

      lines.push('=== WARNINGS ===');
      if (warnings.length === 0) {
        lines.push('None');
      } else {
        lines.push('user_id,check_type,result,description,timestamp');
        for (const w of warnings) {
          lines.push([w.user_id, w.check_type, w.result, `"${w.description}"`, w.timestamp].join(','));
        }
      }

      // Download
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rbac-integrity-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      // Audit log
      base44.entities.AuditLog.create({
        action_type: 'export',
        category: 'Security',
        description: 'EXPORT_RBAC_INTEGRITY_REPORT',
        performed_by_email: currentUser?.email,
        performed_by_name: currentUser?.full_name,
        performed_by_role: currentUser?.role,
        metadata: { report_date: report?.snapshot_date },
      }).catch(() => {});
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExport} disabled={exporting || reports.length === 0} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {exporting ? 'Exporteren...' : 'Download Integrity Report'}
        </Button>
      </div>

      {/* Reports table */}
      {reports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-slate-500">Nog geen integrity reports. Het eerste rapport wordt vannacht gegenereerd.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Integrity Reports (laatste 30)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Datum</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Users</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Admin</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Employee</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Null</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Hash</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => {
                    const prev = reports[idx + 1];
                    const adminChanged = prev && r.admin_count !== prev.admin_count;
                    const hasViolations = r.violation_count > 0;
                    const hasDrift = r.drift_alerts?.length > 0;

                    return (
                      <tr key={r.id} className={`border-b ${hasViolations ? 'bg-red-50' : hasDrift ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="py-2.5 px-3 font-medium">
                          {r.snapshot_date ? format(new Date(r.snapshot_date), 'dd-MM-yyyy') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">{r.total_users}</td>
                        <td className={`py-2.5 px-3 text-right ${adminChanged ? 'font-bold text-red-600' : ''}`}>
                          {r.admin_count}
                        </td>
                        <td className="py-2.5 px-3 text-right">{r.employee_effective_count}</td>
                        <td className="py-2.5 px-3 text-right">
                          {r.null_effective_count > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700">{r.null_effective_count}</Badge>
                          ) : '0'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasViolations ? (
                            <Badge className="bg-red-100 text-red-700">{r.violation_count}V / {r.warning_count}W</Badge>
                          ) : r.warning_count > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700">{r.warning_count}W</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <code className="text-xs text-slate-500 font-mono" title={r.hash_signature}>
                            {r.hash_signature?.slice(0, 16)}...
                          </code>
                        </td>
                        <td className="py-2.5 px-3">
                          {hasDrift ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs text-amber-700">{r.drift_alerts.length}</span>
                            </div>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}