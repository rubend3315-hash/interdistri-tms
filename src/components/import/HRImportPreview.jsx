import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, UserPlus, RefreshCw, Loader2 } from "lucide-react";

const DEPARTMENT_MAP = {
  "management": "Management",
  "transport": "Transport",
  "pakketdistributie": "PakketDistributie",
  "pakket distributie": "PakketDistributie",
  "charters": "Charters",
};

function mapDepartment(val) {
  if (!val) return "Transport";
  const lower = val.toLowerCase().trim();
  return DEPARTMENT_MAP[lower] || val;
}

function mapStatus(val) {
  if (!val) return "Actief";
  const lower = val.toLowerCase().trim();
  if (lower.includes("actief") && !lower.includes("in")) return "Actief";
  if (lower.includes("inactief")) return "Inactief";
  if (lower.includes("uit dienst") || lower.includes("uitdienst")) return "Uit dienst";
  return "Actief";
}

function mapToEmployee(row) {
  return {
    employee_number: row.personeelsnummer || "",
    initials: row.voorletters || "",
    first_name: row.voornaam || "",
    prefix: row.tussenvoegsel || "",
    last_name: row.achternaam || "",
    date_of_birth: row.geboortedatum || "",
    email: row.email || "",
    phone: row.telefoon || "",
    address: row.adres || "",
    postal_code: row.postcode || "",
    city: row.woonplaats || "",
    department: mapDepartment(row.afdeling),
    function: row.functie || "",
    in_service_since: row.in_dienst_sinds || "",
    contract_type: row.contract_type || "",
    contract_hours: row.uren_per_week || null,
    salary_scale: row.loonschaal || "",
    bsn: row.bsn || "",
    bank_account: row.iban || "",
    emergency_contact_name: row.noodcontact_naam || "",
    emergency_contact_phone: row.noodcontact_telefoon || "",
    status: mapStatus(row.status),
  };
}

export default function HRImportPreview({ data, existingEmployees, onImport, isImporting }) {
  const [selectedRows, setSelectedRows] = useState(() => new Set(data.map((_, i) => i)));

  const mappedData = useMemo(() => data.map(mapToEmployee), [data]);

  const existingNumbers = useMemo(() => {
    return new Set(existingEmployees.map(e => e.employee_number).filter(Boolean));
  }, [existingEmployees]);

  const existingEmails = useMemo(() => {
    return new Set(existingEmployees.map(e => e.email?.toLowerCase()).filter(Boolean));
  }, [existingEmployees]);

  const rowStatuses = useMemo(() => {
    return mappedData.map((emp) => {
      if (!emp.first_name || !emp.last_name) return { status: "error", message: "Naam ontbreekt" };
      if (emp.employee_number && existingNumbers.has(emp.employee_number)) return { status: "duplicate", message: "Personeelsnr bestaat al" };
      if (emp.email && existingEmails.has(emp.email.toLowerCase())) return { status: "duplicate", message: "Email bestaat al" };
      return { status: "new", message: "Nieuw" };
    });
  }, [mappedData, existingNumbers, existingEmails]);

  const toggleRow = (idx) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  };

  const newCount = rowStatuses.filter(r => r.status === "new").length;
  const dupCount = rowStatuses.filter(r => r.status === "duplicate").length;
  const errCount = rowStatuses.filter(r => r.status === "error").length;

  const handleImport = () => {
    const toImport = mappedData.filter((_, i) => selectedRows.has(i) && rowStatuses[i].status !== "error");
    // Clean empty strings to null
    const cleaned = toImport.map(emp => {
      const obj = {};
      Object.entries(emp).forEach(([k, v]) => {
        obj[k] = (typeof v === "string" && v.trim() === "") ? null : v;
      });
      return obj;
    });
    onImport(cleaned);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3">
        <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
          {data.length} rijen gevonden
        </Badge>
        <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">
          <CheckCircle2 className="w-3 h-3 mr-1" /> {newCount} nieuw
        </Badge>
        {dupCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 px-3 py-1">
            <RefreshCw className="w-3 h-3 mr-1" /> {dupCount} duplicaten
          </Badge>
        )}
        {errCount > 0 && (
          <Badge className="bg-red-100 text-red-700 px-3 py-1">
            <AlertTriangle className="w-3 h-3 mr-1" /> {errCount} fouten
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-3 py-2 text-left">
                    <Checkbox checked={selectedRows.size === data.length} onCheckedChange={toggleAll} />
                  </th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Nr</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Naam</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Email</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Afdeling</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Functie</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">In dienst</th>
                  <th className="px-3 py-2 text-left text-slate-600 font-medium">Uren/week</th>
                </tr>
              </thead>
              <tbody>
                {mappedData.map((emp, idx) => {
                  const rs = rowStatuses[idx];
                  const bgColor = rs.status === "error" ? "bg-red-50" : rs.status === "duplicate" ? "bg-amber-50" : "";
                  return (
                    <tr key={idx} className={`border-b hover:bg-slate-50 ${bgColor}`}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedRows.has(idx)}
                          onCheckedChange={() => toggleRow(idx)}
                          disabled={rs.status === "error"}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={
                          rs.status === "new" ? "bg-emerald-100 text-emerald-700" :
                          rs.status === "duplicate" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }>
                          {rs.message}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{emp.employee_number || "-"}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {[emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{emp.email || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.department}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.function || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.in_service_since || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.contract_hours || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Import button */}
      <div className="flex gap-3">
        <Button
          className="flex-1 bg-blue-900 hover:bg-blue-800 h-12"
          onClick={handleImport}
          disabled={selectedRows.size === 0 || isImporting}
        >
          {isImporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importeren...</>
          ) : (
            <><UserPlus className="w-4 h-4 mr-2" /> {selectedRows.size} medewerker(s) importeren</>
          )}
        </Button>
      </div>
    </div>
  );
}