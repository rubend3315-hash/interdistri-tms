import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Package, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function StandplaatsWerk() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["standplaatswerk"],
    queryFn: () => base44.entities.StandplaatsWerk.list("-created_date", 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ["activiteiten"],
    queryFn: () => base44.entities.Activiteit.list(),
  });

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.prefix ? emp.prefix + " " : ""}${emp.last_name}` : "-";
  };

  const getCustomerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? c.company_name : "-";
  };

  const getProjectName = (id) => {
    const p = projects.find((p) => p.id === id);
    return p ? p.name : "-";
  };

  const getActiviteitName = (id) => {
    const a = activiteiten.find((a) => a.id === id);
    return a ? a.name : "-";
  };

  const filtered = records.filter((r) => {
    if (filterEmployee !== "all" && r.employee_id !== filterEmployee) return false;
    if (filterCustomer !== "all" && r.customer_id !== filterCustomer) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const empName = getEmployeeName(r.employee_id).toLowerCase();
      const custName = getCustomerName(r.customer_id).toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      if (!empName.includes(term) && !custName.includes(term) && !notes.includes(term)) return false;
    }
    return true;
  });

  const uniqueEmployees = [...new Set(records.map((r) => r.employee_id).filter(Boolean))];
  const uniqueCustomers = [...new Set(records.map((r) => r.customer_id).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Package className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Standplaatswerk</h1>
          <p className="text-sm text-slate-500">Overzicht van alle standplaatswerk registraties</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Zoeken..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Medewerker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle medewerkers</SelectItem>
                {uniqueEmployees.map((id) => (
                  <SelectItem key={id} value={id}>{getEmployeeName(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCustomer} onValueChange={setFilterCustomer}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Klant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle klanten</SelectItem>
                {uniqueCustomers.map((id) => (
                  <SelectItem key={id} value={id}>{getCustomerName(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{filtered.length}</p>
            <p className="text-sm text-slate-500">Registraties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{uniqueEmployees.length}</p>
            <p className="text-sm text-slate-500">Medewerkers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{uniqueCustomers.length}</p>
            <p className="text-sm text-slate-500">Klanten</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Laden...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Geen standplaatswerk gevonden</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Medewerker</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Activiteit</TableHead>
                    <TableHead>Opmerkingen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {r.date ? format(new Date(r.date), "d MMM yyyy", { locale: nl }) : "-"}
                      </TableCell>
                      <TableCell>{getEmployeeName(r.employee_id)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.start_time && r.end_time
                          ? `${r.start_time} - ${r.end_time}`
                          : r.start_time || r.end_time || "-"}
                      </TableCell>
                      <TableCell>{getCustomerName(r.customer_id)}</TableCell>
                      <TableCell>{getProjectName(r.project_id)}</TableCell>
                      <TableCell>{getActiviteitName(r.activity_id)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}