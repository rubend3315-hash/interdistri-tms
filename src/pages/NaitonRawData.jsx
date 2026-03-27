import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Database, Truck, MapPin } from "lucide-react";

export default function NaitonRawData() {
  const [date, setDate] = useState("2026-03-26");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("fetchRawNaitonData", { date });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setData(res.data);
    }
    setLoading(false);
  };

  const vehicles = data ? [...new Set(data.segments.map(s => s._plate || s.gpsassetid))].sort() : [];

  const filtered = data?.segments?.filter(s => {
    if (vehicleFilter !== "all" && (s._plate || s.gpsassetid) !== vehicleFilter) return false;
    if (typeFilter !== "all" && (s.type || "").toLowerCase() !== typeFilter) return false;
    return true;
  }) || [];

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `naiton_raw_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Naiton Ruwe Data</h1>
          <p className="text-sm text-slate-500">Bekijk de onbewerkte GPS-segmenten van Naiton/GPS Buddy</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Datum</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
            </div>
            <Button onClick={fetchData} disabled={loading || !date}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
              Ophalen
            </Button>
            {data && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-600">Voertuig</label>
                  <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle voertuigen ({vehicles.length})</SelectItem>
                      {vehicles.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle typen</SelectItem>
                      <SelectItem value="drive">Drive</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={exportJson}>
                  <Download className="w-4 h-4 mr-2" /> Export JSON
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.total_segments}</p>
            <p className="text-xs text-slate-500">Segmenten totaal</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.gps_assets}</p>
            <p className="text-xs text-slate-500">GPS Assets</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.total_users}</p>
            <p className="text-xs text-slate-500">Naiton Users</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{filtered.length}</p>
            <p className="text-xs text-slate-500">Gefilterd</p>
          </CardContent></Card>
        </div>
      )}

      {/* Segment table */}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Segmenten ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2 px-2">Voertuig</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Start</th>
                    <th className="py-2 px-2">Stop</th>
                    <th className="py-2 px-2">Duur</th>
                    <th className="py-2 px-2">Afstand</th>
                    <th className="py-2 px-2">Odo start</th>
                    <th className="py-2 px-2">Odo stop</th>
                    <th className="py-2 px-2">GPS</th>
                    <th className="py-2 px-2">Driver</th>
                    <th className="py-2 px-2">Additional</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((seg, idx) => {
                    const startT = seg.start ? new Date(seg.start) : null;
                    const stopT = seg.stop ? new Date(seg.stop) : null;
                    const durMin = startT && stopT ? Math.round((stopT - startT) / 60000) : null;
                    const distKm = seg.distance ? (seg.distance / 1000).toFixed(1) : null;
                    const type = (seg.type || "").toLowerCase();
                    const ad = seg.additionaldata;
                    const adStr = ad ? (typeof ad === 'string' ? ad : JSON.stringify(ad)) : '';
                    const driver = ad?.Driver || seg.driver || '';

                    return (
                      <tr key={idx} className={`border-b hover:bg-slate-50 ${type === 'drive' ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-1.5 px-2 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            {seg._plate || seg.gpsassetid?.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <Badge className={type === 'drive' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                            {seg.type}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap font-mono">{startT ? startT.toISOString().slice(11, 19) : '-'}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap font-mono">{stopT ? stopT.toISOString().slice(11, 19) : '-'}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap">{durMin != null ? `${durMin}m` : '-'}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap">{distKm ? `${distKm} km` : '-'}</td>
                        <td className="py-1.5 px-2 font-mono">{seg.odometerstartkm || '-'}</td>
                        <td className="py-1.5 px-2 font-mono">{seg.odometerstopkm || '-'}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-500">
                          {seg.stoplat ? (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {Number(seg.stoplat).toFixed(4)},{Number(seg.stoplon).toFixed(4)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">{driver || <span className="text-slate-400">-</span>}</td>
                        <td className="py-1.5 px-2 max-w-[300px] truncate text-slate-500" title={adStr}>
                          {adStr.slice(0, 120) || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}