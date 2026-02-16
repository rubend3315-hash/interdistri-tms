import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AuditTrips({ trips, vehicles = [], customers = [] }) {
  const sorted = [...trips].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const getVehicle = (id) => vehicles.find(v => v.id === id);
  const getCustomer = (id) => customers.find(c => c.id === id);

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Geen ritten in deze periode
      </div>
    );
  }

  const totalKm = sorted.reduce((s, t) => s + (t.total_km || 0), 0);
  const totalFuel = sorted.reduce((s, t) => s + (t.fuel_liters || 0), 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs">
            <TableHead>Datum</TableHead>
            <TableHead>Dag</TableHead>
            <TableHead>Voertuig</TableHead>
            <TableHead>Klant</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Vertrek</TableHead>
            <TableHead>Aankomst</TableHead>
            <TableHead className="text-right">Start km</TableHead>
            <TableHead className="text-right">Eind km</TableHead>
            <TableHead className="text-right">Totaal km</TableHead>
            <TableHead className="text-right">Brandstof (L)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Opmerkingen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((trip, idx) => {
            const d = trip.date ? new Date(trip.date) : null;
            const vehicle = getVehicle(trip.vehicle_id);
            const customer = getCustomer(trip.customer_id);
            return (
              <TableRow key={trip.id || idx} className="text-xs">
                <TableCell className="whitespace-nowrap">
                  {d ? format(d, "dd-MM-yyyy") : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d ? format(d, "EEEE", { locale: nl }) : "-"}
                </TableCell>
                <TableCell>
                  {vehicle ? `${vehicle.license_plate} (${vehicle.brand})` : trip.vehicle_id || "-"}
                </TableCell>
                <TableCell>{customer?.company_name || "-"}</TableCell>
                <TableCell>{trip.route_name || "-"}</TableCell>
                <TableCell>{trip.departure_time || "-"}</TableCell>
                <TableCell>{trip.arrival_time || "-"}</TableCell>
                <TableCell className="text-right">{trip.start_km ?? "-"}</TableCell>
                <TableCell className="text-right">{trip.end_km ?? "-"}</TableCell>
                <TableCell className="text-right font-medium">{trip.total_km ?? "-"}</TableCell>
                <TableCell className="text-right">{trip.fuel_liters ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {trip.status || "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[120px] truncate">{trip.notes || "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Samenvatting */}
      <div className="px-4 py-3 bg-slate-50 border-t flex flex-wrap gap-4 text-xs">
        <div>
          <span className="text-slate-500">Totaal ritten:</span>{" "}
          <span className="font-semibold">{sorted.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Totaal km:</span>{" "}
          <span className="font-semibold">{totalKm.toLocaleString('nl-NL')}</span>
        </div>
        <div>
          <span className="text-slate-500">Totaal brandstof:</span>{" "}
          <span className="font-semibold">{totalFuel.toFixed(1)} L</span>
        </div>
      </div>
    </div>
  );
}