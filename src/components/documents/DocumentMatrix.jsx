import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
import { differenceInDays } from "date-fns";

const ALL_DOC_TYPES = [
  "Rijbewijs", "Code 95", "Identiteitsbewijs", "Arbeidsovereenkomst",
  "Tachograafkaart", "ADR Certificaat", "VCA Certificaat",
];

export default function DocumentMatrix({ documents, employees }) {
  const [deptFilter, setDeptFilter] = useState("all");

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === "Actief")
      .filter(e => deptFilter === "all" || e.department === deptFilter)
      .sort((a, b) => a.last_name.localeCompare(b.last_name)),
    [employees, deptFilter]);

  const departments = [...new Set(employees.filter(e => e.status === "Actief").map(e => e.department).filter(Boolean))];

  const matrix = useMemo(() => {
    const today = new Date();
    return activeEmployees.map(emp => {
      const empDocs = documents.filter(d => d.linked_employee_id === emp.id && d.status !== "Gearchiveerd");
      const cells = ALL_DOC_TYPES.map(docType => {
        const doc = empDocs.find(d => d.document_type === docType);
        if (!doc) return { status: "missing" };
        if (doc.status === "Verlopen") return { status: "expired" };
        if (doc.expiry_date) {
          const days = differenceInDays(new Date(doc.expiry_date), today);
          if (days < 0) return { status: "expired" };
          if (days <= 30) return { status: "expiring", days };
        }
        return { status: "valid" };
      });
      return { employee: emp, cells };
    });
  }, [activeEmployees, documents]);

  const statusIcon = (cell) => {
    switch (cell.status) {
      case "valid": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "expiring": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "expired": return <XCircle className="w-4 h-4 text-red-500" />;
      case "missing": return <Minus className="w-4 h-4 text-slate-300" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Alle afdelingen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle afdelingen</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-4 ml-auto text-xs text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Geldig</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />Verloopt</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" />Verlopen</span>
          <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-slate-300" />Ontbreekt</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[180px]">Medewerker</th>
              {ALL_DOC_TYPES.map(t => (
                <th key={t} className="py-3 px-3 font-medium text-slate-600 text-center whitespace-nowrap text-xs">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ employee, cells }) => (
              <tr key={employee.id} className="border-b hover:bg-slate-50">
                <td className="py-2.5 px-4 sticky left-0 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{employee.first_name} {employee.prefix ? employee.prefix + ' ' : ''}{employee.last_name}</span>
                    <Badge variant="outline" className="text-xs">{employee.department}</Badge>
                  </div>
                </td>
                {cells.map((cell, i) => (
                  <td key={i} className="py-2.5 px-3 text-center">
                    <div className="flex justify-center">{statusIcon(cell)}</div>
                  </td>
                ))}
              </tr>
            ))}
            {matrix.length === 0 && (
              <tr><td colSpan={ALL_DOC_TYPES.length + 1} className="text-center py-8 text-slate-500">Geen medewerkers gevonden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}