import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Users, FileText } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import { format } from "date-fns";

export default function SalaryExportStamgegevens({ employees }) {
  const activeEmployees = employees.filter(e => e.status === "Actief");

  const getInServiceDate = (emp) => {
    if (emp.in_service_since) return emp.in_service_since;
    if (emp.contract_start_date) return emp.contract_start_date;
    const earliest = (emp.contractregels || [])
      .filter(c => c.startdatum)
      .sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum))[0];
    return earliest?.startdatum || "";
  };

  const getActiveContract = (emp) => {
    return (emp.contractregels || [])
      .filter(c => c.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  };

  const getActiveReiskosten = (emp) => {
    return (emp.reiskostenregels || [])
      .filter(r => r.status !== "Inactief")
      .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0] || {};
  };

  const exportStamgegevensCSV = () => {
    const headers = [
      "Personeelsnummer", "Voorletters", "Voornaam", "Tussenvoegsel", "Achternaam",
      "Geboortedatum", "BSN", "Email", "Telefoon",
      "Adres", "Postcode", "Woonplaats",
      "IBAN", "In dienst sinds", "Uit dienst datum",
      "Afdeling", "Functie", "Status",
      "Contract type", "Loonschaal", "Uren per week",
      "Reisafstand km", "Reisvergoeding per dag"
    ];

    const rows = activeEmployees.map(emp => {
      const contract = getActiveContract(emp);
      const reiskosten = getActiveReiskosten(emp);
      return [
        emp.employee_number || "",
        emp.initials || "",
        emp.first_name || "",
        emp.prefix || "",
        emp.last_name || "",
        emp.date_of_birth || "",
        emp.bsn || "",
        emp.email || "",
        emp.phone || "",
        emp.address || "",
        emp.postal_code || "",
        emp.city || "",
        emp.bank_account || "",
        getInServiceDate(emp),
        emp.contract_end_date || "",
        emp.department || "",
        emp.function || "",
        emp.status || "",
        contract.type_contract || emp.contract_type || "",
        contract.loonschaal || emp.salary_scale || "",
        contract.uren_per_week || emp.contract_hours || "",
        reiskosten.afstand_km || "",
        reiskosten.vergoeding_per_dag || ""
      ];
    });

    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
    ).join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stamgegevens_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
            <Users className="w-3 h-3 mr-1" /> {activeEmployees.length} actieve medewerkers
          </Badge>
        </div>
        <Button onClick={exportStamgegevensCSV} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Export Stamgegevens CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Medewerker Stamgegevens
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nr</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Geboortedatum</TableHead>
                  <TableHead>Afdeling</TableHead>
                  <TableHead>Functie</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Loonschaal</TableHead>
                  <TableHead className="text-right">Uren/wk</TableHead>
                  <TableHead>In dienst</TableHead>
                  <TableHead className="text-right">Reis km</TableHead>
                  <TableHead className="text-right">Reis €/dag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                      Geen actieve medewerkers gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  activeEmployees.map(emp => {
                    const contract = getActiveContract(emp);
                    const reiskosten = getActiveReiskosten(emp);
                    const inService = getInServiceDate(emp);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="text-slate-600">{emp.employee_number || "-"}</TableCell>
                        <TableCell className="font-medium">{getFullName(emp)}</TableCell>
                        <TableCell className="text-slate-600">
                          {emp.date_of_birth ? format(new Date(emp.date_of_birth), "dd-MM-yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-slate-600">{emp.department || "-"}</TableCell>
                        <TableCell className="text-slate-600">{emp.function || "-"}</TableCell>
                        <TableCell className="text-slate-600">{contract.type_contract || emp.contract_type || "-"}</TableCell>
                        <TableCell className="text-slate-600">{contract.loonschaal || emp.salary_scale || "-"}</TableCell>
                        <TableCell className="text-right text-slate-600">{contract.uren_per_week || emp.contract_hours || "-"}</TableCell>
                        <TableCell className="text-slate-600">
                          {inService ? format(new Date(inService), "dd-MM-yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">{reiskosten.afstand_km || "-"}</TableCell>
                        <TableCell className="text-right text-slate-600">
                          {reiskosten.vergoeding_per_dag ? `€${reiskosten.vergoeding_per_dag}` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}