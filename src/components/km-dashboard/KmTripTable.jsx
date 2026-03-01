import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function KmTripTable({ trips, vehicleMap, employeeMap, customerMap }) {
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...trips].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === "vehicle") {
      va = vehicleMap[a.vehicle_id]?.license_plate || "";
      vb = vehicleMap[b.vehicle_id]?.license_plate || "";
    }
    if (sortField === "employee") {
      const ea = employeeMap[a.employee_id];
      const eb = employeeMap[b.employee_id];
      va = ea ? `${ea.first_name} ${ea.last_name}` : "";
      vb = eb ? `${eb.first_name} ${eb.last_name}` : "";
    }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, children, className = "" }) => (
    <TableHead className={`cursor-pointer select-none ${className}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3 text-slate-400" />
      </div>
    </TableHead>
  );

  const getEmployeeName = (id) => {
    const e = employeeMap[id];
    if (!e) return "-";
    return `${e.first_name} ${e.prefix ? e.prefix + ' ' : ''}${e.last_name}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ritdetails ({trips.length} ritten)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="date">Datum</SortHeader>
                <SortHeader field="vehicle">Voertuig</SortHeader>
                <SortHeader field="employee">Chauffeur</SortHeader>
                <TableHead>Route</TableHead>
                <SortHeader field="start_km" className="text-right">Begin km</SortHeader>
                <SortHeader field="end_km" className="text-right">Eind km</SortHeader>
                <SortHeader field="total_km" className="text-right">Totaal km</SortHeader>
                <TableHead className="text-right">Brandstof (L)</TableHead>
                <TableHead className="text-right">AdBlue (L)</TableHead>
                <TableHead>Klant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    Geen ritten gevonden voor deze periode
                  </TableCell>
                </TableRow>
              ) : sorted.map(trip => {
                const vehicle = vehicleMap[trip.vehicle_id];
                const customer = customerMap[trip.customer_id];
                return (
                  <TableRow key={trip.id}>
                    <TableCell className="whitespace-nowrap">
                      {trip.date ? format(new Date(trip.date), 'EEE d MMM', { locale: nl }) : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{vehicle?.license_plate || '-'}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{getEmployeeName(trip.employee_id)}</TableCell>
                    <TableCell>
                      {trip.route_name ? (
                        <Badge variant="outline" className="font-normal">{trip.route_name}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trip.start_km != null ? trip.start_km.toLocaleString('nl-NL') : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trip.end_km != null ? trip.end_km.toLocaleString('nl-NL') : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {trip.total_km != null ? trip.total_km.toLocaleString('nl-NL') : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trip.fuel_liters ? trip.fuel_liters.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trip.adblue_liters ? trip.adblue_liters.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) : '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{customer?.company_name || '-'}</TableCell>
                  </TableRow>
                );
              })}
              {sorted.length > 0 && (
                <TableRow className="bg-slate-50 font-semibold border-t-2">
                  <TableCell colSpan={6} className="text-right">Totaal</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sorted.reduce((s, t) => s + (t.total_km || 0), 0).toLocaleString('nl-NL')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sorted.reduce((s, t) => s + (t.fuel_liters || 0), 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sorted.reduce((s, t) => s + (t.adblue_liters || 0), 0).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}