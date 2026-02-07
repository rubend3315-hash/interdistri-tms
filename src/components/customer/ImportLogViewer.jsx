import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileSpreadsheet, ChevronDown, ChevronRight, Trash2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function ImportLogViewer({ imports, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Group imports by bestandsnaam + import_datum
  const grouped = {};
  imports.forEach(imp => {
    const key = `${imp.bestandsnaam}_${imp.import_datum}`;
    if (!grouped[key]) {
      grouped[key] = {
        bestandsnaam: imp.bestandsnaam,
        import_datum: imp.import_datum,
        starttijd_shift: imp.starttijd_shift,
        project_naam: imp.project_naam,
        records: [],
        dates: new Set(),
        chauffeurs: new Set(),
      };
    }
    grouped[key].records.push(imp);
    if (imp.datum) grouped[key].dates.add(imp.datum);
    if (imp.data?.Chauffeur) grouped[key].chauffeurs.add(imp.data.Chauffeur);
  });

  const groups = Object.values(grouped).sort((a, b) => 
    (b.import_datum || '').localeCompare(a.import_datum || '')
  );

  const filtered = groups.filter(g =>
    g.bestandsnaam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    [...g.chauffeurs].some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (imports.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Geen import logs</h3>
        <p className="text-slate-500 mt-1">Er zijn nog geen PostNL imports uitgevoerd.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Zoeken op bestandsnaam of chauffeur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="text-xs text-slate-500">
        {groups.length} import(s) • {imports.length} totale records
      </div>

      <div className="space-y-2">
        {filtered.map((group, idx) => {
          const key = `${group.bestandsnaam}_${group.import_datum}`;
          const isExpanded = expandedId === key;
          const uniqueDates = [...group.dates].sort();

          return (
            <Card key={idx} className="overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : key)}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{group.bestandsnaam}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {group.import_datum ? format(new Date(group.import_datum), 'dd MMM yyyy', { locale: nl }) : '-'}
                    </span>
                    <span>{group.records.length} ritten</span>
                    <span>{group.chauffeurs.size} chauffeur(s)</span>
                    {group.starttijd_shift && <span>Shift: {group.starttijd_shift}</span>}
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Geïmporteerd
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Alle ${group.records.length} records van "${group.bestandsnaam}" verwijderen?`)) {
                      group.records.forEach(r => onDelete(r.id));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {isExpanded && (
                <div className="border-t bg-slate-50 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-slate-500">Datums</p>
                      <p className="text-sm font-semibold">
                        {uniqueDates.length > 0 ? `${uniqueDates[0]}${uniqueDates.length > 1 ? ` t/m ${uniqueDates[uniqueDates.length - 1]}` : ''}` : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-slate-500">Chauffeurs</p>
                      <p className="text-sm font-semibold">{group.chauffeurs.size}</p>
                    </div>
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-slate-500">Ritten</p>
                      <p className="text-sm font-semibold">{group.records.length}</p>
                    </div>
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-slate-500">Project</p>
                      <p className="text-sm font-semibold">{group.project_naam || '-'}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Datum</TableHead>
                          <TableHead className="text-xs">Chauffeur</TableHead>
                          <TableHead className="text-xs">Route</TableHead>
                          <TableHead className="text-xs">Stops</TableHead>
                          <TableHead className="text-xs">Stuks</TableHead>
                          <TableHead className="text-xs"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.records.map(rec => (
                          <TableRow key={rec.id}>
                            <TableCell className="text-xs">{rec.datum || rec.data?.Datum || '-'}</TableCell>
                            <TableCell className="text-xs">{rec.data?.Chauffeur || '-'}</TableCell>
                            <TableCell className="text-xs">{rec.ritnaam || '-'}</TableCell>
                            <TableCell className="text-xs">{rec.data?.['Aantal afgeleverd - stops'] || '-'}</TableCell>
                            <TableCell className="text-xs">{rec.data?.['Aantal afgeleverd - stuks'] || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(rec.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}