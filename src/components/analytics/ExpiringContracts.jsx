import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, Clock } from "lucide-react";

export default function ExpiringContracts({ contracts, employees }) {
  const today = new Date();

  const expiring = useMemo(() => {
    return contracts
      .filter(c => c.end_date && (c.status === 'Actief' || c.status === 'Ondertekend' || c.status === 'TerOndertekening'))
      .map(c => {
        const days = differenceInDays(new Date(c.end_date), today);
        const emp = employees.find(e => e.id === c.employee_id);
        return { ...c, daysLeft: days, employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Onbekend' };
      })
      .filter(c => c.daysLeft >= 0 && c.daysLeft <= 90)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts, employees]);

  const within30 = expiring.filter(c => c.daysLeft <= 30).length;
  const within60 = expiring.filter(c => c.daysLeft > 30 && c.daysLeft <= 60).length;
  const within90 = expiring.filter(c => c.daysLeft > 60 && c.daysLeft <= 90).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Aflopende Contracten
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{within30}</p>
            <p className="text-xs text-slate-600">Binnen 30 dagen</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{within60}</p>
            <p className="text-xs text-slate-600">30-60 dagen</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{within90}</p>
            <p className="text-xs text-slate-600">60-90 dagen</p>
          </div>
        </div>

        {expiring.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Geen contracten die binnen 90 dagen aflopen.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expiring.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-slate-900">{c.employeeName}</p>
                  <p className="text-xs text-slate-500">{c.contract_type} — {c.contract_number}</p>
                </div>
                <div className="text-right">
                  <Badge className={
                    c.daysLeft <= 30 ? "bg-red-100 text-red-700" :
                    c.daysLeft <= 60 ? "bg-amber-100 text-amber-700" :
                    "bg-yellow-100 text-yellow-700"
                  }>
                    <Clock className="w-3 h-3 mr-1" />
                    {c.daysLeft} dagen
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">{format(new Date(c.end_date), 'd MMM yyyy', { locale: nl })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}