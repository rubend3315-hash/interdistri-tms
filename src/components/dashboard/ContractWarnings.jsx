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
    <Card className="border-red-100 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Contractwaarschuwingen ({employeesWithoutContract.length})
          </CardTitle>
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" size="sm" className="text-red-700 h-6 text-[10px] px-2">
              Bekijken <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {employeesWithoutContract.slice(0, 8).map(emp => (
            <Link
              key={emp.id}
              to={createPageUrl(`Employees?id=${emp.id}`)}
              className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-md hover:bg-red-100 transition-colors border border-red-100"
            >
              <span className="text-[11px] font-medium text-slate-800 truncate max-w-[140px]">
                {emp.first_name} {emp.prefix ? emp.prefix + " " : ""}{emp.last_name}
              </span>
              <Badge className="bg-red-100 text-red-600 text-[9px] px-1 py-0">
                {(!emp.contractregels || emp.contractregels.length === 0) ? "Geen" : "Verlopen"}
              </Badge>
            </Link>
          ))}
          {employeesWithoutContract.length > 8 && (
            <span className="text-[10px] text-red-500 self-center ml-1">+{employeesWithoutContract.length - 8} meer</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}