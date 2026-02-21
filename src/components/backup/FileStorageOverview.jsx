import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, HardDrive, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

export default function FileStorageOverview() {
  const { data: exportBackups = [], isLoading } = useQuery({
    queryKey: ["backup-exports"],
    queryFn: async () => {
      const records = await base44.entities.Backup.filter(
        { entity_name: "_critical_export" },
        "-backup_date",
        50
      );
      return records || [];
    },
  });

  const files = useMemo(() => {
    const allFiles = [];
    for (const backup of exportBackups) {
      try {
        const data = JSON.parse(backup.json_data);
        const exportId = data.export_id || backup.backup_group_id;
        const timestamp = data.timestamp || backup.backup_date;

        // New format: files array
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            allFiles.push({
              name: f.name,
              entity: f.entity,
              format: f.format,
              size: f.size || 0,
              url: f.url,
              export_id: exportId,
              date: timestamp,
              exported_by: data.exported_by,
            });
          }
        } else if (data.entities) {
          // Old format: entities with file_url/csv_url
          for (const [entityName, info] of Object.entries(data.entities)) {
            if (info.file_url) {
              allFiles.push({
                name: `${exportId}_${entityName}.json`,
                entity: entityName,
                format: "JSON",
                size: 0,
                url: info.file_url,
                export_id: exportId,
                date: timestamp,
                exported_by: data.exported_by,
              });
            }
            if (info.csv_url) {
              allFiles.push({
                name: `${exportId}_${entityName}.csv`,
                entity: entityName,
                format: "CSV",
                size: 0,
                url: info.csv_url,
                export_id: exportId,
                date: timestamp,
                exported_by: data.exported_by,
              });
            }
          }
        }
      } catch (_) {}
    }
    return allFiles;
  }, [exportBackups]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + (f.size || 0), 0), [files]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-slate-500" />
          File Storage Overzicht
        </CardTitle>
        <CardDescription>
          Alle exportbestanden opgeslagen in Base44 File Storage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center border">
            <p className="text-2xl font-bold text-slate-700">{files.length}</p>
            <p className="text-xs text-slate-500">Totaal bestanden</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center border">
            <p className="text-2xl font-bold text-slate-700">{formatBytes(totalSize)}</p>
            <p className="text-xs text-slate-500">Totale opslaggrootte</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Geen exportbestanden gevonden</p>
            <p className="text-xs text-slate-400 mt-1">
              Gebruik "Export Kritieke Data" om bestanden aan te maken.
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestandsnaam</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Grootte</TableHead>
                    <TableHead>Export ID</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {f.format === "JSON" ? (
                            <FileJson className="w-4 h-4 text-orange-500 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[220px]">{f.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{f.entity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(f.date).toLocaleDateString("nl-NL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {f.size ? formatBytes(f.size) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[140px] block">
                          {f.export_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(f.url, "_blank")}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {f.format}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-start gap-2 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Let op:</strong> Verwijderen van exportbestanden kan niet ongedaan gemaakt worden.
                Bestanden worden bewaard in Base44 File Storage en blijven beschikbaar zolang ze niet worden verwijderd.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}