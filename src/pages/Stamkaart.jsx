import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFullName } from "@/components/utils/employeeUtils";
import StamkaartForm from "@/components/stamkaart/StamkaartForm";
import StamkaartPrintView from "@/components/stamkaart/StamkaartPrintView";

export default function Stamkaart() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [printMode, setPrintMode] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees_stamkaart'],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }, '-last_name'),
  });

  const departments = ['Management', 'Transport', 'PakketDistributie', 'Charters'];

  const filtered = employees.filter(emp => {
    const name = getFullName(emp).toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search || name.includes(search) || emp.email?.toLowerCase().includes(search) || emp.employee_number?.toLowerCase().includes(search);
    const matchesDept = filterDepartment === "all" || emp.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  if (selectedEmployee && printMode) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="no-print flex gap-2 mb-4">
          <Button variant="outline" onClick={() => setPrintMode(false)}>
            ← Terug naar formulier
          </Button>
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
            <FileText className="w-4 h-4 mr-2" /> Afdrukken
          </Button>
        </div>
        <StamkaartPrintView employee={selectedEmployee} />
      </div>
    );
  }

  if (selectedEmployee) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={() => { setSelectedEmployeeId(null); setPrintMode(false); }}>
            ← Terug naar overzicht
          </Button>
          <Button variant="outline" onClick={() => setPrintMode(true)}>
            <FileText className="w-4 h-4 mr-2" /> Printweergave
          </Button>
        </div>
        <StamkaartForm employee={selectedEmployee} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Stamkaart</h1>
        <p className="text-slate-500">Selecteer een medewerker om de stamkaart te bekijken of bewerken</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Zoek op naam, email of personeelsnummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Afdeling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Laden...</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Geen medewerkers gevonden</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <Card
              key={emp.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEmployeeId(emp.id)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{getFullName(emp)}</p>
                    <p className="text-sm text-slate-500">{emp.function || emp.department} · {emp.employee_number || 'Geen nr.'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-100 text-emerald-700">{emp.department}</Badge>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}