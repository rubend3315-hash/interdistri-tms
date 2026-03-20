import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Gauge,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CircleParking,
  Clock4,
  UserX,
  UserCheck,
  Pencil,
  Settings
} from "lucide-react";
import Pagination, { usePagination } from "@/components/ui/Pagination";
import { toast } from "sonner";
import DriverReassignDialog from "@/components/tripsync/DriverReassignDialog";
import GpsLocationSettings from "@/components/tripsync/GpsLocationSettings";

const DEFAULT_FROM = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const TODAY = format(new Date(), 'yyyy-MM-dd');

export default function TripSync() {
  const [filterDateFrom, setFilterDateFrom] = useState(DEFAULT_FROM);
  const [filterDateTo, setFilterDateTo] = useState(TODAY);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [reassignRecord, setReassignRecord] = useState(null);
  const queryClient = useQueryClient();
  const pageState = usePagination(20);

  const { data: tripRecords = [], isLoading } = useQuery({
    queryKey: ['tripRecords', filterDateFrom, filterDateTo],
    queryFn: () => {
      const filter = {};
      if (filterDateFrom) filter.date = { ...(filter.date || {}), $gte: filterDateFrom };
      if (filterDateTo) filter.date = { ...(filter.date || {}), $lte: filterDateTo };
      return base44.entities.TripRecord.filter(filter, '-date');
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('syncTripsFromNaiton', {
        date_from: filterDateFrom,
        date_to: filterDateTo,
      });
      setSyncResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['tripRecords'] });
      if (res.data?.created > 0) {
        toast.success(`${res.data.created} ritten gesynchroniseerd, ${res.data.linked} gekoppeld aan medewerkers`);
      } else {
        toast.info(res.data?.message || 'Geen nieuwe ritten gevonden');
      }
    } catch (err) {
      toast.error(`Synchronisatie mislukt: ${err?.response?.data?.error || err.message}`);
    }
    setSyncing(false);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterDateFrom(DEFAULT_FROM);
    setFilterDateTo(TODAY);
    pageState.resetPage();
  };

  const filtered = tripRecords.filter(r => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (r.driver || '').toLowerCase().includes(q) ||
      (r.plate || '').toLowerCase().includes(q) ||
      (r.vehicle || '').toLowerCase().includes(q)
    );
  });

  const paginatedRecords = pageState.paginateItems(filtered);

  const formatTime = (dt) => {
    if (!dt) return '-';
    try { return format(new Date(dt), 'HH:mm'); } catch { return '-'; }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GPS Buddy Import</h1>
          <p className="text-sm text-slate-500">Synchroniseer GPS-ritdata vanuit GPS Buddy</p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {syncing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Synchroniseren...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> Synchroniseer ritten</>
          )}
        </Button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <Card className={syncResult.created > 0 ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}>
          <CardContent className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${syncResult.created > 0 ? 'text-emerald-600' : 'text-blue-600'}`} />
              <div className="text-sm flex flex-wrap gap-x-2 gap-y-0.5">
                {syncResult.assets != null && <span className="text-slate-500">{syncResult.assets} assets</span>}
                {syncResult.segments != null && <span className="text-slate-500">· {syncResult.segments} segmenten</span>}
                {syncResult.rides != null && <span className="text-slate-500">· {syncResult.rides} ritten</span>}
                <span className="text-slate-500">·</span>
                <span className="font-medium text-emerald-700">{syncResult.created} nieuw</span>
                <span className="text-slate-500">·</span>
                <span>{syncResult.skipped} overgeslagen</span>
                <span className="text-slate-500">·</span>
                <span>{syncResult.linked} gekoppeld</span>
                {syncResult.drivers_resolved != null && (
                  <><span className="text-slate-500">·</span><span>{syncResult.drivers_resolved} chauffeurs herkend</span></>
                )}
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{syncResult.ms}ms</span>
              </div>
            </div>
            {syncResult.log && syncResult.log.length > 0 && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer hover:text-slate-700">Sync log ({syncResult.log.length} stappen)</summary>
                <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                  {syncResult.log.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] max-w-[280px]">
              <Label className="text-xs text-slate-500 mb-1 block">Zoeken</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Chauffeur, kenteken..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); pageState.resetPage(); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-slate-500 mb-1 block">Datum van</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); pageState.resetPage(); }} className="h-9 text-sm" />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-slate-500 mb-1 block">Datum tot</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); pageState.resetPage(); }} className="h-9 text-sm" />
            </div>
            {(searchTerm || filterDateFrom !== DEFAULT_FROM || filterDateTo !== TODAY) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500" onClick={resetFilters}>
                <X className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>{filtered.length} ritten</span>
        {(() => {
          const unlinked = filtered.filter(r => !r.driver).length;
          const manual = filtered.filter(r => r.driver_manually_set).length;
          return (
            <>
              {unlinked > 0 && (
                <Badge className="text-[11px] bg-amber-100 text-amber-700">
                  <UserX className="w-3 h-3 mr-1" /> {unlinked} zonder correcte Tag-id koppeling
                </Badge>
              )}
              {manual > 0 && (
                <Badge className="text-[11px] bg-blue-100 text-blue-700">
                  <UserCheck className="w-3 h-3 mr-1" /> {manual} handmatig
                </Badge>
              )}
            </>
          );
        })()}
      </div>

      {/* Trip records list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Geen Naiton-ritten</h3>
          <p className="text-slate-500 mt-1">Klik op "Synchroniseer ritten" om data op te halen.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedRecords.map(rec => (
              <TripRecordCard key={rec.id} rec={rec} formatTime={formatTime} onReassign={setReassignRecord} />
            ))}
          </div>
          <Pagination
            totalItems={filtered.length}
            currentPage={pageState.currentPage}
            pageSize={pageState.pageSize}
            onPageChange={pageState.setCurrentPage}
            onPageSizeChange={pageState.handlePageSizeChange}
          />
        </>
      )}

      {/* Driver reassign dialog */}
      <DriverReassignDialog
        tripRecord={reassignRecord}
        open={!!reassignRecord}
        onOpenChange={(open) => { if (!open) setReassignRecord(null); }}
        onSuccess={() => setReassignRecord(null)}
      />
    </div>
  );
}

function TripRecordCard({ rec, formatTime, onReassign }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-semibold truncate ${rec.driver ? 'text-slate-900' : 'text-amber-600'}`}>
                {rec.driver || 'Onbekende chauffeur'}
              </h3>
              {rec.plate && (
                <Badge className="text-[11px] px-2 py-0 leading-5 bg-slate-100 text-slate-700">
                  {rec.plate}
                </Badge>
              )}
              {rec.driver_manually_set && (
                <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-blue-50 text-blue-600">
                  Handmatig
                </Badge>
              )}
              {!rec.driver && (
                <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-amber-50 text-amber-600">
                  <UserX className="w-3 h-3 mr-0.5" /> Niet gekoppeld
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {rec.date && format(new Date(rec.date), "d MMM", { locale: nl })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatTime(rec.start_time)} – {formatTime(rec.end_time)}
              </span>
              {rec.total_hours > 0 && (
                <span className="font-medium text-blue-600">{rec.total_hours}u</span>
              )}
              {rec.total_km > 0 && (
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">{rec.total_km} km</span>
                </span>
              )}
              {rec.start_km != null && rec.end_km != null && (
                <span className="text-slate-400">{rec.start_km}–{rec.end_km}</span>
              )}
              {rec.depot_time_minutes > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <CircleParking className="w-3.5 h-3.5" />
                  {rec.depot_stops_count || '?'}x / {rec.depot_time_minutes}m depot
                </span>
              )}
              {rec.long_stops_minutes > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <Clock4 className="w-3.5 h-3.5" />
                  {rec.long_stops_count || '?'}x / {rec.long_stops_minutes}m stilstand
                </span>
              )}
            </div>
          </div>
          {/* Reassign button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 text-xs flex-shrink-0 ${!rec.driver ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => onReassign(rec)}
            title="Chauffeur koppelen/wijzigen"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            {rec.driver ? 'Wijzig' : 'Koppel'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}