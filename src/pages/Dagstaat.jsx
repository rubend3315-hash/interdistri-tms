import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, FileText } from "lucide-react";
import { getFullName } from "@/components/utils/employeeUtils";
import DagstaatPrintView from "@/components/dagstaat/DagstaatPrintView";

export default function Dagstaat() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showPrint, setShowPrint] = useState(false);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-dagstaat"],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }),
  });

  const { data: timeEntries = [], isLoading: loadingTime } = useQuery({
    queryKey: ["dagstaat-time", selectedEmployeeId, selectedDate],
    queryFn: () =>
      base44.entities.TimeEntry.filter({
        employee_id: selectedEmployeeId,
        date: selectedDate,
      }),
    enabled: !!selectedEmployeeId && !!selectedDate,
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ["dagstaat-trips", selectedEmployeeId, selectedDate],
    queryFn: () =>
      base44.entities.Trip.filter({
        employee_id: selectedEmployeeId,
        date: selectedDate,
      }),
    enabled: !!selectedEmployeeId && !!selectedDate,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-dagstaat"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-dagstaat"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const sortedEmployees = [...employees].sort((a, b) =>
    getFullName(a).localeCompare(getFullName(b))
  );

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (showPrint && selectedEmployee) {
    return (
      <DagstaatPrintView
        employee={selectedEmployee}
        date={selectedDate}
        timeEntries={timeEntries}
        trips={trips}
        vehicles={vehicles}
        customers={customers}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dagstaat</h1>
        <p className="text-slate-500">
          Genereer een printbare dagstaat voor een medewerker
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medewerker</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_number && `${emp.employee_number} - `}
                      {getFullName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {selectedEmployeeId && selectedDate && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <p>
                    <strong>Tijdregistraties:</strong> {timeEntries.length} gevonden
                  </p>
                  <p>
                    <strong>Ritten:</strong> {trips.length} gevonden
                  </p>
                </div>
                <Button
                  onClick={handlePrint}
                  disabled={timeEntries.length === 0 && trips.length === 0}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Dagstaat Printen
                </Button>
              </div>

              {timeEntries.length === 0 && trips.length === 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Geen gegevens gevonden voor deze medewerker op deze datum.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}