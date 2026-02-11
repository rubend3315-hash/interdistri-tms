import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Users } from "lucide-react";

export default function EmployeeContractOverview({ contracts, employees }) {
  const overview = useMemo(() => {
    const byEmployee = {};
    contracts.forEach(c => {
      if (!c.employee_id) return;
      if (!byEmployee[c.employee_id]) byEmployee[c.employee_id] = [];
      byEmployee[c.employee_id].push(c);
    });

    return Object.entries(byEmployee).map(([empId, empContracts]) => {
      const emp = employees.find(e => e.id === empId);
      const name = emp ? `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}` : 'Onbekend';
      
      const tijdelijk = empContracts.filter(c => c.contract_type?.includes('Tijdelijk'));
      const vast = empContracts.filter(c => c.contract_type && !c.contract_type.includes('Tijdelijk'));
      const sorted = [...empContracts].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

      // Ketenregeling: max 3 tijdelijke contracten in max 36 maanden
      const aantalTijdelijk = tijdelijk.length;
      let totaleDuurMaanden = 0;
      if (tijdelijk.length > 0) {
        const earliest = tijdelijk.reduce((min, c) => c.start_date && c.start_date < min ? c.start_date : min, tijdelijk[0].start_date || '9999');
        const latest = tijdelijk.reduce((max, c) => c.end_date && c.end_date > max ? c.end_date : max, tijdelijk[0].end_date || '');
        if (earliest && latest) {
          totaleDuurMaanden = differenceInMonths(new Date(latest), new Date(earliest));
        }
      }

      const heeftVast = vast.some(c => c.status === 'Actief');
      
      // Warnings
      const warnings = [];
      if (aantalTijdelijk >= 3 && !heeftVast) {
        warnings.push('Max 3 tijdelijke contracten bereikt (ketenregeling)');
      }
      if (totaleDuurMaanden >= 36 && !heeftVast) {
        warnings.push('36 maanden overschreden (ketenregeling)');
      }
      if (aantalTijdelijk === 2 && !heeftVast) {
        warnings.push('Let op: nog 1 tijdelijk contract mogelijk');
      }

      return {
        empId,
        name,
        department: emp?.department || '-',
        contracts: sorted,
        aantalTijdelijk,
        aantalVast: vast.length,
        totaleDuurMaanden,
        heeftVast,
        warnings
      };
    }).sort((a, b) => b.warnings.length - a.warnings.length || a.name.localeCompare(b.name));
  }, [contracts, employees]);

  const warningCount = overview.filter(e => e.warnings.length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Ketenregeling Overzicht per Medewerker
          {warningCount > 0 && (
            <Badge className="bg-red-100 text-red-700 ml-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {warningCount} waarschuwingen
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 mb-4">
          Ketenregeling: maximaal 3 opeenvolgende tijdelijke contracten in maximaal 36 maanden. Daarna automatisch vast dienstverband.
        </p>

        {overview.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Geen contracten gevonden.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {overview.map(emp => (
              <div key={emp.empId} className={`border rounded-lg p-4 ${emp.warnings.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.department}</p>
                  </div>
                  <div className="flex gap-2">
                    {emp.heeftVast && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Vast
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{emp.aantalTijdelijk} tijdelijk</Badge>
                    <Badge variant="outline" className="text-xs">{emp.aantalVast} vast</Badge>
                  </div>
                </div>

                {emp.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {w}
                  </div>
                ))}

                <div className="grid gap-1">
                  {emp.contracts.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          c.contract_type?.includes('Tijdelijk') ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        } variant="outline">
                          {c.contract_type}
                        </Badge>
                        <span className="text-slate-600">{c.contract_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          {c.start_date ? format(new Date(c.start_date), 'd MMM yyyy', { locale: nl }) : '?'}
                          {c.end_date ? ` — ${format(new Date(c.end_date), 'd MMM yyyy', { locale: nl })}` : ' — lopend'}
                        </span>
                        <Badge className={
                          c.status === 'Actief' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'Concept' ? 'bg-slate-100 text-slate-700' :
                          c.status === 'TerOndertekening' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        } variant="outline">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {emp.aantalTijdelijk > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Totale duur tijdelijke contracten: <strong>{emp.totaleDuurMaanden} maanden</strong> / 36 maanden max
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}