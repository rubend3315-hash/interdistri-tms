import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, Crosshair, ArrowRight, History, Truck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import MileageCalibrationDialog from "./MileageCalibrationDialog";

export default function KmRegistratieTab({ vehicle, userName }) {
  const [calibrationOpen, setCalibrationOpen] = useState(false);

  // Fetch trips for this vehicle to show km history
  const { data: trips = [] } = useQuery({
    queryKey: ['vehicleTrips', vehicle?.id],
    queryFn: () => base44.entities.Trip.filter({ vehicle_id: vehicle.id }, '-date', 50),
    enabled: !!vehicle?.id,
  });

  if (!vehicle) return null;

  const history = vehicle.mileage_calibration_history || [];
  const tripsWithKm = trips.filter(t => t.start_km || t.end_km);

  return (
    <div className="space-y-6 pt-4">
      {/* Huidige stand */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Gauge className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Huidige kilometerstand</p>
            <p className="text-2xl font-bold text-slate-900">
              {vehicle.current_mileage ? vehicle.current_mileage.toLocaleString('nl-NL') : "—"} km
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={() => setCalibrationOpen(true)}
        >
          <Crosshair className="w-4 h-4" />
          KM-stand IJken
        </Button>
      </div>

      {/* IJkingsgeschiedenis */}
      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            IJkingsgeschiedenis ({history.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...history].reverse().map((entry, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">
                    {entry.date ? format(new Date(entry.date), "d MMM yyyy HH:mm", { locale: nl }) : "-"}
                  </span>
                  <Badge variant="outline" className="text-xs">{entry.calibrated_by}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1.5 font-medium">
                  <span className="text-slate-600">{entry.old_mileage?.toLocaleString('nl-NL')} km</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-900">{entry.new_mileage?.toLocaleString('nl-NL')} km</span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({entry.new_mileage > entry.old_mileage ? "+" : ""}{(entry.new_mileage - entry.old_mileage).toLocaleString('nl-NL')} km)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recente ritten met km */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4" />
          Recente ritten met km-registratie ({tripsWithKm.length})
        </h4>
        {tripsWithKm.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Geen ritten met km-registratie gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 text-xs">
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Begin km</th>
                  <th className="py-2 pr-3">Eind km</th>
                  <th className="py-2 pr-3">Totaal</th>
                  <th className="py-2">Chauffeur</th>
                </tr>
              </thead>
              <tbody>
                {tripsWithKm.map(trip => {
                  const totalKm = trip.start_km && trip.end_km ? trip.end_km - trip.start_km : null;
                  return (
                    <tr key={trip.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-3">{trip.date ? format(new Date(trip.date), "d MMM yyyy", { locale: nl }) : "-"}</td>
                      <td className="py-2 pr-3 font-mono">{trip.start_km?.toLocaleString('nl-NL') || "-"}</td>
                      <td className="py-2 pr-3 font-mono">{trip.end_km?.toLocaleString('nl-NL') || "-"}</td>
                      <td className="py-2 pr-3 font-medium">
                        {totalKm != null ? (
                          <span className={totalKm > 400 ? "text-red-600" : totalKm > 250 ? "text-amber-600" : "text-slate-900"}>
                            {totalKm.toLocaleString('nl-NL')} km
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-2 text-slate-500">{trip.route_name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MileageCalibrationDialog
        open={calibrationOpen}
        onOpenChange={setCalibrationOpen}
        vehicle={vehicle}
        userName={userName}
      />
    </div>
  );
}