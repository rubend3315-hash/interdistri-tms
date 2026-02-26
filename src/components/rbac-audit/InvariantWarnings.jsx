import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";

export default function InvariantWarnings() {
  const [filterResult, setFilterResult] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['rbac-decision-logs'],
    queryFn: () => base44.entities.RBACDecisionLog.list('-timestamp', 100),
  });

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterResult !== 'all' && l.result !== filterResult) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchable = [l.user_id, l.description, l.effective_role, l.system_role, l.metadata?.email]
          .filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [logs, filterResult, searchTerm]);

  const violationCount = logs.filter(l => l.result === 'VIOLATION').length;
  const warningCount = logs.filter(l => l.result === 'WARNING').length;

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Integrity Status */}
      {violationCount === 0 && warningCount === 0 ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
            <p className="text-lg font-bold text-emerald-900">RBAC Integrity: OK</p>
            <p className="text-sm text-emerald-700">Geen invariant afwijkingen gevonden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Card className={violationCount > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              {violationCount > 0 ? <XCircle className="w-6 h-6 text-red-600" /> : <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              <div>
                <p className="text-2xl font-bold">{violationCount}</p>
                <p className="text-xs text-slate-600">Violations</p>
              </div>
            </CardContent>
          </Card>
          <Card className={warningCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              {warningCount > 0 ? <AlertTriangle className="w-6 h-6 text-amber-600" /> : <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              <div>
                <p className="text-2xl font-bold">{warningCount}</p>
                <p className="text-xs text-slate-600">Warnings</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoek op email, user ID of beschrijving..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle resultaten</SelectItem>
                <SelectItem value="VIOLATION">Violations</SelectItem>
                <SelectItem value="WARNING">Warnings</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Findings ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Geen findings gevonden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Resultaat</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Beschrijving</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => (
                    <tr key={log.id || idx} className={`border-b ${
                      log.result === 'VIOLATION' ? 'bg-red-50' : 
                      log.result === 'WARNING' ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-2.5 px-3">
                        <Badge className={
                          log.result === 'VIOLATION' ? 'bg-red-100 text-red-700' :
                          log.result === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }>
                          {log.result}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-xs">{log.check_type}</Badge>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{log.metadata?.email || log.user_id}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">{log.description}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {log.timestamp ? format(new Date(log.timestamp), 'dd-MM-yyyy HH:mm') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}