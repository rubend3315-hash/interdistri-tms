import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, FileText, Users, Calendar } from "lucide-react";

export default function CompletedContracts() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['completedContracts'],
    queryFn: () => base44.entities.CompletedContract.list('-activated_date')
  });

  const formatDate = (d) => {
    if (!d) return '-';
    return format(new Date(d), 'd MMM yyyy', { locale: nl });
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: nl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Afgeronde Contracten</h1>
        <p className="text-slate-500 mt-1">Overzicht van alle volledig ondertekende en geactiveerde contracten</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal Afgerond</p>
                <p className="text-2xl font-bold text-emerald-600">{entries.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Deze Maand</p>
                <p className="text-2xl font-bold text-blue-600">
                  {entries.filter(e => {
                    if (!e.activated_date) return false;
                    const d = new Date(e.activated_date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Unieke Medewerkers</p>
                <p className="text-2xl font-bold text-violet-600">
                  {new Set(entries.map(e => e.employee_id)).size}
                </p>
              </div>
              <Users className="w-8 h-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nog geen afgeronde contracten.</p>
            <p className="text-sm mt-1">Wanneer een contract volledig is ondertekend, verschijnt het hier automatisch.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-medium text-slate-600">Contractnummer</th>
                    <th className="text-left p-3 font-medium text-slate-600">Medewerker</th>
                    <th className="text-left p-3 font-medium text-slate-600">Type</th>
                    <th className="text-left p-3 font-medium text-slate-600">Afdeling</th>
                    <th className="text-left p-3 font-medium text-slate-600">Startdatum</th>
                    <th className="text-left p-3 font-medium text-slate-600">Medewerker getekend</th>
                    <th className="text-left p-3 font-medium text-slate-600">Management getekend</th>
                    <th className="text-left p-3 font-medium text-slate-600">Geactiveerd op</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{entry.contract_number}</td>
                      <td className="p-3">{entry.employee_name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{entry.contract_type}</Badge>
                      </td>
                      <td className="p-3 text-slate-500">{entry.department || '-'}</td>
                      <td className="p-3">{formatDate(entry.start_date)}</td>
                      <td className="p-3 text-slate-500">{formatDateTime(entry.employee_signed_date)}</td>
                      <td className="p-3">
                        <span className="text-slate-500">{formatDateTime(entry.manager_signed_date)}</span>
                        {entry.manager_signed_by && (
                          <span className="block text-xs text-slate-400">{entry.manager_signed_by}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {formatDateTime(entry.activated_date)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}