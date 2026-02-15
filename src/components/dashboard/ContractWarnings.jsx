import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, FileText } from "lucide-react";

export default function ContractWarnings({ employees }) {
  const today = new Date().toISOString().split("T")[0];

  const employeesWithoutContract = employees
    .filter(emp => emp.status === "Actief")
    .filter(emp => {
      const regels = emp.contractregels || [];
      if (regels.length === 0) return true;
      // Check if there's at least one rule whose date range covers today
      const hasValid = regels.some(r => {
        if (!r.startdatum || r.startdatum > today) return false;
        if (r.einddatum && r.einddatum !== "" && r.einddatum < today) return false;
        return true;
      });
      return !hasValid;
    })
    .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));

  if (employeesWithoutContract.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Medewerkers zonder geldige contractregel ({employeesWithoutContract.length})
          </CardTitle>
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" size="sm" className="text-red-700">
              Bekijken <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {employeesWithoutContract.map(emp => (
            <Link
              key={emp.id}
              to={createPageUrl(`Employees?id=${emp.id}`)}
              className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-red-50 transition-colors border border-red-100"
            >
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 text-sm truncate">
                  {emp.first_name} {emp.prefix ? emp.prefix + " " : ""}{emp.last_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  #{emp.employee_number} · {emp.department}
                </p>
              </div>
              <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">
                {(!emp.contractregels || emp.contractregels.length === 0) ? "Geen regel" : "Verlopen"}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}