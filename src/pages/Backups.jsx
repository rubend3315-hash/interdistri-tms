import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Download, RotateCcw, Plus, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function BackupsPage() {
  const [showConfirmRestore, setShowConfirmRestore] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [restoreEntityName, setRestoreEntityName] = useState(null);
  const queryClient = useQueryClient();

  // Haal alleen metadata records op
  const { data: backupMetadata = [], isLoading } = useQuery({
    queryKey: ['backups-metadata'],
    queryFn: async () => {
      const all = await base44.entities.Backup.filter({ entity_name: '_metadata' }, '-backup_date', 100);
      return all || [];
    }
  });

  // Haal entity stats op uit metadata
  const getEntityStats = (meta) => {
    try {
      const data = JSON.parse(meta.json_data);
      return data.entities || {};
    } catch { return {}; }
  };

  const getFileUrl = (meta) => {
    try {
      const data = JSON.parse(meta.json_data);
      return data.file_url || null;
    } catch { return null; }
  };

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createBackup');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups-metadata'] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ backup_group_id, confirmation_code, entity_name }) => {
      const payload = { backup_group_id, confirmation_code };
      if (entity_name) payload.entity_name = entity_name;
      const response = await base44.functions.invoke('restoreBackup', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backups-metadata'] });
      setShowConfirmRestore(null);
      setConfirmCode('');
      setRestoreEntityName(null);
      alert(`Herstel voltooid! ${Object.keys(data.restored_entities || {}).length} entities hersteld.`);
    },
    onError: (error) => {
      alert('Fout bij herstellen: ' + (error?.response?.data?.error || error.message));
    }
  });

  const handleDownloadGroup = (meta) => {
    const fileUrl = getFileUrl(meta);
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      alert('Geen backup bestand beschikbaar (oud formaat)');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getEntityMeta = (meta) => {
    try {
      const data = JSON.parse(meta.json_data);
      return data.entities || {};
    } catch { return {}; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Back-ups</h1>
          <p className="text-slate-600">Beheer en herstel van systeemback-ups — opgesplitst per entity</p>
        </div>

        <div className="grid gap-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Gesplitste back-ups (v3)</h3>
                  <p className="text-sm text-blue-800">
                    Elke entity wordt apart opgeslagen. Grote entities worden in delen gesplitst. 
                    Je kunt een volledige backup herstellen of per entity apart.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createBackupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {createBackupMutation.isPending ? 'Back-up maken...' : 'Handmatige Back-up'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Back-up Geschiedenis</CardTitle>
              <CardDescription>Klik op een backup om de details per entity te bekijken</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : backupMetadata.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">Geen back-ups beschikbaar</p>
                  <p className="text-xs text-slate-400 mt-1">Oude backups (v1/v2) worden niet meer getoond</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backupMetadata.map((meta) => {
                    const isExpanded = expandedGroup === meta.backup_group_id;
                    const entityMeta = getEntityMeta(meta);

                    return (
                      <div key={meta.id} className="border rounded-lg overflow-hidden">
                        {/* Header row */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                          onClick={() => setExpandedGroup(isExpanded ? null : meta.backup_group_id)}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <div>
                              <p className="font-medium text-slate-900">
                                {new Date(meta.backup_date).toLocaleString('nl-NL')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(meta.backup_date), { locale: nl, addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-slate-700 font-medium">{meta.entity_count} records</p>
                              <p className="text-xs text-slate-500">{formatBytes(meta.backup_size)}</p>
                            </div>
                            <Badge className={meta.environment === 'production' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                              {meta.environment || 'production'}
                            </Badge>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" title="Download" onClick={() => handleDownloadGroup(meta.backup_group_id)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Alles herstellen"
                                onClick={() => { setShowConfirmRestore(meta.backup_group_id); setRestoreEntityName(null); }}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Detail rows */}
                        {isExpanded && (
                          <div className="border-t bg-slate-50">
                            {groupParts.length === 0 ? (
                              <div className="p-4 text-center">
                                <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-400" />
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Records</TableHead>
                                    <TableHead>Grootte</TableHead>
                                    <TableHead className="text-right">Acties</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {groupParts
                                    .sort((a, b) => a.entity_name.localeCompare(b.entity_name))
                                    .map((part) => (
                                    <TableRow key={part.id}>
                                      <TableCell className="font-medium">{part.entity_name}</TableCell>
                                      <TableCell>{part.record_count}</TableCell>
                                      <TableCell>{formatBytes(part.backup_size)}</TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const baseName = part.entity_name.split('__')[0];
                                            setShowConfirmRestore(meta.backup_group_id);
                                            setRestoreEntityName(baseName);
                                          }}
                                        >
                                          <RotateCcw className="w-3 h-3 mr-1" />
                                          Herstel
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Restore Dialog */}
      <Dialog open={!!showConfirmRestore} onOpenChange={(open) => { if (!open) { setShowConfirmRestore(null); setConfirmCode(''); setRestoreEntityName(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {restoreEntityName
                ? `"${restoreEntityName}" herstellen`
                : 'Volledige back-up herstellen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Waarschuwing</p>
              <p className="text-sm text-red-700">
                {restoreEntityName
                  ? `Alle huidige "${restoreEntityName}" records worden verwijderd en vervangen door de backup-versie.`
                  : 'Alle huidige data wordt verwijderd en vervangen door de backup-versie.'}
              </p>
              <p className="text-sm text-red-700 mt-2 font-semibold">
                User-accounts worden NIET hersteld — nodig gebruikers opnieuw uit.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Typ <span className="font-mono bg-slate-100 px-1 rounded">HERSTEL-BEVESTIGD</span> om te bevestigen:
              </label>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="HERSTEL-BEVESTIGD"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowConfirmRestore(null); setConfirmCode(''); setRestoreEntityName(null); }}>
                Annuleren
              </Button>
              <Button
                onClick={() => restoreMutation.mutate({
                  backup_group_id: showConfirmRestore,
                  confirmation_code: confirmCode,
                  entity_name: restoreEntityName
                })}
                disabled={restoreMutation.isPending || confirmCode !== 'HERSTEL-BEVESTIGD'}
                className="bg-red-600 hover:bg-red-700"
              >
                {restoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {restoreEntityName ? `${restoreEntityName} herstellen` : 'Alles herstellen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}