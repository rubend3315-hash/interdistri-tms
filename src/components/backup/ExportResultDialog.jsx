import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Download, AlertCircle, FileJson, FileSpreadsheet, HardDrive } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

export default function ExportResultDialog({ open, onClose, data, error }) {
  if (!open) return null;

  const hasError = !!error;
  const files = data?.files || [];
  const failedEntities = data
    ? Object.entries(data.entities || {}).filter(([, v]) => v.status === 'error')
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasError ? (
              <><AlertCircle className="w-5 h-5 text-red-500" /> Export Mislukt</>
            ) : (
              <><CheckCircle2 className="w-5 h-5 text-green-500" /> Export Voltooid</>
            )}
          </DialogTitle>
        </DialogHeader>

        {hasError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">Er is een fout opgetreden bij de export:</p>
            <p className="text-sm text-red-700 mt-1 font-mono">{error}</p>
            <p className="text-sm text-red-600 mt-3">Probeer het opnieuw of neem contact op met de beheerder.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{data?.total_records || 0}</p>
                <p className="text-xs text-blue-600">Records</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{files.length}</p>
                <p className="text-xs text-green-600">Bestanden</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{formatBytes(data?.total_size)}</p>
                <p className="text-xs text-purple-600">Totale grootte</p>
              </div>
            </div>

            {/* Storage location */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 border">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">
                Opgeslagen in: <strong>Base44 File Storage</strong>
              </span>
              <Badge variant="outline" className="ml-auto text-xs">Export ID: {data?.export_id}</Badge>
            </div>

            {/* Failed entities warning */}
            {failedEntities.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Waarschuwing: {failedEntities.length} entiteit(en) mislukt</span>
                </div>
                {failedEntities.map(([name, info]) => (
                  <p key={name} className="text-xs text-amber-700 ml-6">• {name}: {info.error}</p>
                ))}
              </div>
            )}

            {/* File list */}
            {files.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestand</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Grootte</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs flex items-center gap-2">
                        {f.format === 'JSON' ? (
                          <FileJson className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]">{f.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{f.entity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.records}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatBytes(f.size)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(f.url, '_blank')}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {f.format}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <p className="text-xs text-slate-400 text-center">
              Export is ook opgeslagen als Backup record en gelogd in het Audit Log.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}