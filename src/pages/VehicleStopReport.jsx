import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  Clock,
  MapPin,
  Gauge,
  Loader2,
  CircleParking,
  Clock4,
  Home,
  FileText,
} from "lucide-react";

const TODAY = format(new Date(), 'yyyy-MM-dd');

export default function VehicleStopReport() {
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState(TODAY);
  const [queryParams, setQueryParams] = useState(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => base44.entities.Vehicle.filter({ status: { $ne: 'Uit dienst' } }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: report, isLoading, error, isFetching } = useQuery({
    queryKey: ['vehicleStopReport', queryParams?.plate, queryParams?.date],
    queryFn: async () => {
      const res = await base44.functions.invoke('vehicleStopReport', {
        plate: queryParams.plate,
        date: queryParams.date,
      });
      return res.data;
    },
    enabled: !!queryParams,
    retry: false,
    staleTime: 0,
  });

  const handleGenerate = () => {
    if (!plate || !date) return;
    setQueryParams({ plate, date });
  };

  return (
    <div className="space-y-4 max-w-[1000px] mx-auto pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Voertuig Stoprapport</h1>
        <p className="text-sm text-slate-500">Gedetailleerd overzicht van stilstandmomenten per voertuig en datum</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="px-4 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 max-w-[300px]">
              <Label className="text-xs text-slate-500 mb-1 block">Kenteken</Label>
              <Input
                placeholder="bijv. V-06-LVJ"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="h-9 text-sm"
                list="plate-suggestions"
              />
              <datalist id="plate-suggestions">
                {vehicles.map(v => (
                  <option key={v.id} value={v.license_plate}>
                    {v.brand} {v.model}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs text-slate-500 mb-1 block">Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!plate || !date || isFetching}
              className="bg-blue-600 hover:bg-blue-700 h-9"
            >
              {isFetching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Laden...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" /> Genereer rapport</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="px-4 py-3 text-sm text-red-700">
            {error?.response?.data?.error || error.message}
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && !isLoading && (
        <div className="space-y-4" id="stop-report">
          {/* Summary header */}
          <Card>
            <CardContent className="px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{report.plate}</h2>
                  <p className="text-sm text-slate-500">{report.asset_name} — {format(new Date(report.date), "EEEE d MMMM yyyy", { locale: nl })}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Rit: <strong>{report.ride.start || '?'} – {report.ride.end || '?'}</strong></span>
                </div>
                {report.ride.total_km && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-slate-400" />
                    <span><strong>{report.ride.total_km} km</strong></span>
                    {report.ride.start_km && report.ride.end_km && (
                      <span className="text-slate-400">({report.ride.start_km} → {report.ride.end_km})</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Depot */}
          <Card>
            <CardHeader className="px-4 py-3 pb-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CircleParking className="w-4 h-4 text-amber-500" />
                Depot
                <Badge className="bg-amber-100 text-amber-700 text-xs ml-1">
                  {report.depot.count}x — {report.depot.total_minutes} min
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-2">
              {report.depot.count === 0 ? (
                <p className="text-sm text-slate-400 py-2">Geen depot-stops gevonden</p>
              ) : (
                <StopTable stops={report.depot.stops} showName />
              )}
            </CardContent>
          </Card>

          {/* Stilstand */}
          <Card>
            <CardHeader className="px-4 py-3 pb-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock4 className="w-4 h-4 text-orange-500" />
                Stilstand &gt;5 min
                <Badge className="bg-orange-100 text-orange-700 text-xs ml-1">
                  {report.stilstand.count}x — {report.stilstand.total_minutes} min
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-2">
              {report.stilstand.count === 0 ? (
                <p className="text-sm text-slate-400 py-2">Geen stilstandmomenten gevonden</p>
              ) : (
                <StopTable stops={report.stilstand.stops} showCoords />
              )}
            </CardContent>
          </Card>

          {/* Standplaats */}
          {report.standplaats.count > 0 && (
            <Card>
              <CardHeader className="px-4 py-3 pb-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-500" />
                  Standplaats ({report.standplaats.count}x)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-2">
                <StandplaatsTable stops={report.standplaats.stops} />
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center">
            Tijden in lokale tijd (Europa/Amsterdam) · {report.total_segments} GPS-segmenten verwerkt
          </p>
        </div>
      )}
    </div>
  );
}

function StandplaatsTable({ stops }) {
  const formatDuration = (min) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}u ${m}m` : `${h}u`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-3 w-8">#</th>
            <th className="py-2 pr-3">Van</th>
            <th className="py-2 pr-3">Tot</th>
            <th className="py-2 pr-3 w-24">Duur</th>
          </tr>
        </thead>
        <tbody>
          {stops.map((s) => (
            <tr key={s.nr} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2 pr-3 text-slate-400 font-mono text-xs">{s.nr}</td>
              <td className="py-2 pr-3 font-medium">
                {s.start}
                {s.start_date && <span className="text-xs text-slate-400 ml-1">({s.start_date})</span>}
              </td>
              <td className="py-2 pr-3 font-medium">
                {s.stop}
                {s.stop_date && <span className="text-xs text-slate-400 ml-1">({s.stop_date})</span>}
              </td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className="text-xs font-mono">
                  {formatDuration(s.duration_min)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StopTable({ stops, showCoords = true, showName = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-3 w-8">#</th>
            <th className="py-2 pr-3">Tijd</th>
            <th className="py-2 pr-3 w-20">Duur</th>
            {showName && <th className="py-2 pr-3">Locatie</th>}
            {showCoords && <th className="py-2">Coördinaten</th>}
          </tr>
        </thead>
        <tbody>
          {stops.map((s) => (
            <tr key={s.nr} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2 pr-3 text-slate-400 font-mono text-xs">{s.nr}</td>
              <td className="py-2 pr-3 font-medium">{s.start}–{s.stop}</td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className="text-xs font-mono">
                  {s.duration_min} min
                </Badge>
              </td>
              {showName && <td className="py-2 pr-3 text-slate-600">{s.name}</td>}
              {showCoords && (
                <td className="py-2 text-slate-500 font-mono text-xs">
                  {s.lat && s.lon ? (
                    <a
                      href={`https://www.google.com/maps?q=${s.lat},${s.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 hover:underline"
                    >
                      {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
                    </a>
                  ) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}