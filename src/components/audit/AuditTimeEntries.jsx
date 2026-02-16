import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AuditTimeEntries({ entries, employee }) {
  const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const statusIcon = (status) => {
    if (status === "Goedgekeurd") return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
    if (status === "Afgekeurd") return <XCircle className="w-3.5 h-3.5 text-red-600" />;
    if (status === "Ingediend") return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
    return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
  };

  if (sorted.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Geen tijdregistraties in deze periode
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs">
            <TableHead>Datum</TableHead>
            <TableHead>Dag</TableHead>
            <TableHead>Diensttype</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Einde</TableHead>
            <TableHead className="text-right">Uren</TableHead>
            <TableHead className="text-right">Pauze</TableHead>
            <TableHead className="text-right">Nacht</TableHead>
            <TableHead>Vertrek</TableHead>
            <TableHead>Terugkomst</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Handtekening</TableHead>
            <TableHead>Opmerkingen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((entry, idx) => {
            const d = entry.date ? new Date(entry.date) : null;
            const hasSignature = !!entry.signature_url;
            return (
              <TableRow key={entry.id || idx} className="text-xs">
                <TableCell className="whitespace-nowrap">
                  {d ? format(d, "dd-MM-yyyy") : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d ? format(d, "EEEE", { locale: nl }) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-normal">
                    {entry.shift_type || "-"}
                  </Badge>
                </TableCell>
                <TableCell>{entry.start_time || "-"}</TableCell>
                <TableCell>{entry.end_time || "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {entry.total_hours != null ? entry.total_hours.toFixed(2) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {entry.break_minutes || 0} min
                </TableCell>
                <TableCell className="text-right">
                  {entry.night_hours ? entry.night_hours.toFixed(2) : "-"}
                </TableCell>
                <TableCell className="text-xs">{entry.departure_location || "-"}</TableCell>
                <TableCell className="text-xs">{entry.return_location || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {statusIcon(entry.status)}
                    <span className="text-xs">{entry.status || "Concept"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {hasSignature ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileSignature className="w-4 h-4 text-green-600" />
                      <img
                        src={entry.signature_url}
                        alt="Handtekening"
                        className="h-8 max-w-[80px] object-contain border rounded"
                      />
                    </div>
                  ) : (
                    <span className="text-red-500 text-xs font-medium">Ontbreekt</span>
                  )}
                </TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">
                  {entry.notes || "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Samenvatting */}
      <div className="px-4 py-3 bg-slate-50 border-t flex flex-wrap gap-4 text-xs">
        <div>
          <span className="text-slate-500">Totaal regels:</span>{" "}
          <span className="font-semibold">{sorted.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Totaal uren:</span>{" "}
          <span className="font-semibold">{sorted.reduce((s, e) => s + (e.total_hours || 0), 0).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-slate-500">Met handtekening:</span>{" "}
          <span className="font-semibold text-green-600">
            {sorted.filter(e => e.signature_url).length}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Zonder handtekening:</span>{" "}
          <span className={`font-semibold ${sorted.filter(e => !e.signature_url).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {sorted.filter(e => !e.signature_url).length}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Goedgekeurd:</span>{" "}
          <span className="font-semibold">{sorted.filter(e => e.status === "Goedgekeurd").length}</span>
        </div>
      </div>
    </div>
  );
}