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
  const [selectedStartDate, setSelectedStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEndDate, setSelectedEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showPrint, setShowPrint] = useState(false);

  const cOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-dagstaat"],
    queryFn: () => base44.entities.Employee.filter({ status: "Actief" }),
    ...cOpts,
  });

  const { data: timeEntries = [], isLoading: loadingTime } = useQuery({
    queryKey: ["dagstaat-time", selectedEmployeeId, selectedStartDate, selectedEndDate],
    queryFn: () => base44.entities.TimeEntry.filter({
      employee_id: selectedEmployeeId,
      date: { $gte: selectedStartDate, $lte: selectedEndDate },
    }),
    enabled: !!selectedEmployeeId && !!selectedStartDate && !!selectedEndDate,
    ...cOpts,
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ["dagstaat-trips", selectedEmployeeId, selectedStartDate, selectedEndDate],
    queryFn: () => base44.entities.Trip.filter({
      employee_id: selectedEmployeeId,
      date: { $gte: selectedStartDate, $lte: selectedEndDate },
    }, 'date'),
    enabled: !!selectedEmployeeId && !!selectedStartDate && !!selectedEndDate,
    ...cOpts,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-dagstaat"],
    queryFn: () => base44.entities.Vehicle.list(),
    ...cOpts,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-dagstaat"],
    queryFn: () => base44.entities.Customer.list(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const sortedEmployees = [...employees].sort((a, b) =>
    getFullName(a).localeCompare(getFullName(b))
  );

  const handlePrint = (empty = false) => {
    if (empty) {
      setShowPrint("empty");
    } else {
      setShowPrint("filled");
    }
  };

  if (showPrint) {
    const isEmptyForm = showPrint === "empty";
    return (
      <DagstaatPrintView
        employee={isEmptyForm ? null : selectedEmployee}
        date={isEmptyForm ? null : selectedStartDate}
        endDate={isEmptyForm ? null : selectedEndDate}
        timeEntries={isEmptyForm ? [] : timeEntries}
        trips={isEmptyForm ? [] : trips}
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
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Einddatum</Label>
              <Input
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            {selectedEmployeeId && selectedStartDate && selectedEndDate && (
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
                  onClick={() => handlePrint(false)}
                  disabled={timeEntries.length === 0 && trips.length === 0}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Dagstaat Printen
                </Button>
              </div>
            )}

            {selectedEmployeeId && selectedStartDate && selectedEndDate && timeEntries.length === 0 && trips.length === 0 && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Geen gegevens gevonden voor deze medewerker op deze datum.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => handlePrint(true)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Leeg Formulier Printen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}