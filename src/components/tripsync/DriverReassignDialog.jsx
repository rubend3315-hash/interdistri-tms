import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, User, Loader2, Truck, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

export default function DriverReassignDialog({ tripRecord, open, onOpenChange, onSuccess }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => base44.entities.Employee.filter({ status: 'Actief' }),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => {
      const name = `${e.first_name || ''} ${e.prefix || ''} ${e.last_name || ''}`.toLowerCase();
      return name.includes(q) || (e.employee_number || '').toLowerCase().includes(q);
    });
  }, [employees, search]);

  const reassignMutation = useMutation({
    mutationFn: async (employeeId) => {
      const res = await base44.functions.invoke('reassignTripRecordDriver', {
        trip_record_id: tripRecord.id,
        employee_id: employeeId,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Koppeling mislukt');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tripRecords'] });
      queryClient.invalidateQueries({ queryKey: ['tripRecordLinks'] });
      const naitonMsg = data.naiton_writeback === 'success'
        ? ' (ook bijgewerkt in Naiton)'
        : ' (Naiton niet bijgewerkt)';
      toast.success(`Chauffeur gewijzigd naar ${data.driver}${naitonMsg}`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Koppeling mislukt: ${err.message}`);
    },
  });

  const formatTime = (dt) => {
    if (!dt) return '-';
    try { return format(new Date(dt), 'HH:mm'); } catch { return '-'; }
  };

  if (!tripRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chauffeur koppelen</DialogTitle>
        </DialogHeader>

        {/* Trip info */}
        <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-slate-600">
            <Truck className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{tripRecord.vehicle || tripRecord.plate || 'Onbekend voertuig'}</span>
            {tripRecord.plate && <Badge className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600">{tripRecord.plate}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {tripRecord.date && format(new Date(tripRecord.date), "d MMM yyyy", { locale: nl })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(tripRecord.start_time)} – {formatTime(tripRecord.end_time)}
            </span>
          </div>
          {tripRecord.driver && (
            <p className="text-xs text-slate-400">
              Huidige chauffeur: <span className="text-slate-600">{tripRecord.driver}</span>
              {tripRecord.driver_source && <span className="ml-1">({tripRecord.driver_source})</span>}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoek medewerker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            autoFocus
          />
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Geen medewerkers gevonden</p>
          ) : (
            filtered.map(emp => {
              const name = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
              return (
                <button
                  key={emp.id}
                  onClick={() => reassignMutation.mutate(emp.id)}
                  disabled={reassignMutation.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                    <p className="text-xs text-slate-500">{emp.department}{emp.employee_number ? ` · ${emp.employee_number}` : ''}</p>
                  </div>
                  {reassignMutation.isPending && reassignMutation.variables === emp.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}