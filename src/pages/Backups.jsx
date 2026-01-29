import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, RotateCcw, Plus, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function BackupsPage() {
  const [showConfirmRestore, setShowConfirmRestore] = useState(null);
  const queryClient = useQueryClient();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const result = await base44.entities.Backup.list('-backup_date', 100);
      return result || [];
    }
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createBackup');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (backup_id) => {
      const response = await base44.functions.invoke('restoreBackup', { backup_id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setShowConfirmRestore(null);
    }
  });

  const handleDownloadBackup = (backup) => {
    const data = JSON.parse(backup.json_data);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)));
    element.setAttribute("download", `backup-${new Date(backup.backup_date).toISOString().split('T')[0]}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Back-ups</h1>
          <p className="text-slate-600">Beheer en herstel van systeemback-ups</p>
        </div>

        <div className="grid gap-6">
          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Automatische dagelijkse back-ups</h3>
                  <p className="text-sm text-blue-800">Back-ups worden automatisch elke dag om 02:00 UTC gemaakt en opgeslagen in het systeem.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-between">
            <Button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createBackupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {createBackupMutation.isPending ? 'Back-up maken...' : 'Handmatige Back-up'}
            </Button>
          </div>

          {/* Backups Table */}
          <Card>
            <CardHeader>
              <CardTitle>Back-up Geschiedenis</CardTitle>
              <CardDescription>Alle beschikbare back-ups</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : backups && backups.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Grootte</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">
                                {new Date(backup.backup_date).toLocaleString('nl-NL')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(backup.backup_date), { locale: nl, addSuffix: true })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatBytes(backup.backup_size)}</TableCell>
                          <TableCell>{backup.entity_count}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.backup_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={backup.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadBackup(backup)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Dialog open={showConfirmRestore === backup.id} onOpenChange={(open) => !open && setShowConfirmRestore(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowConfirmRestore(backup.id)}
                                  disabled={restoreMutation.isPending}
                                  title="Herstellen"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Back-up Herstellen</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Waarschuwing</p>
                                    <p className="text-sm text-red-700">
                                      Dit zal alle huidige gegevens overschrijven met de gegevens van deze back-up. Deze actie kan niet ongedaan worden gemaakt.
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-600">
                                    Back-up van {new Date(backup.backup_date).toLocaleString('nl-NL')}
                                  </p>
                                  <div className="flex gap-3 justify-end">
                                    <Button variant="outline" onClick={() => setShowConfirmRestore(null)}>
                                      Annuleren
                                    </Button>
                                    <Button
                                      onClick={() => restoreMutation.mutate(backup.id)}
                                      disabled={restoreMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {restoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                      Herstellen
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">Geen back-ups beschikbaar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}