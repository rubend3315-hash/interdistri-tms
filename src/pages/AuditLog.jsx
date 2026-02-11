import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Clock, ChevronLeft, ChevronRight, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const CATEGORY_COLORS = {
  Gebruikers: 'bg-purple-100 text-purple-700',
  Permissies: 'bg-blue-100 text-blue-700',
  Medewerkers: 'bg-emerald-100 text-emerald-700',
  Contracten: 'bg-amber-100 text-amber-700',
  Tijdregistratie: 'bg-cyan-100 text-cyan-700',
  Planning: 'bg-indigo-100 text-indigo-700',
  Systeem: 'bg-slate-100 text-slate-700',
  Data: 'bg-orange-100 text-orange-700',
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
    enabled: currentUser?.role === 'admin'
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Geen toegang</h2>
            <p className="text-red-700">Alleen administrators kunnen de audit log bekijken.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchSearch = searchTerm === '' ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 mt-1">Overzicht van alle belangrijke acties binnen de applicatie</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Zoeken op beschrijving, gebruiker, actie..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle categorieën</SelectItem>
                <SelectItem value="Gebruikers">Gebruikers</SelectItem>
                <SelectItem value="Permissies">Permissies</SelectItem>
                <SelectItem value="Medewerkers">Medewerkers</SelectItem>
                <SelectItem value="Contracten">Contracten</SelectItem>
                <SelectItem value="Tijdregistratie">Tijdregistratie</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Systeem">Systeem</SelectItem>
                <SelectItem value="Data">Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 text-sm text-slate-500">
            {filteredLogs.length} resultaten gevonden
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Laden...</div>
          ) : paginatedLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Geen audit logs gevonden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{log.performed_by_name || 'Onbekend'}</span>
                      <Badge className={CATEGORY_COLORS[log.category] || 'bg-slate-100 text-slate-700'}>
                        {log.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{log.description}</p>
                    {(log.old_value || log.new_value) && (
                      <div className="mt-2 text-xs space-y-1">
                        {log.old_value && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-medium">Was:</span>
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">{log.old_value}</span>
                          </div>
                        )}
                        {log.new_value && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-medium">Nieuw:</span>
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{log.new_value}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.created_date ? format(new Date(log.created_date), "d MMM yyyy, HH:mm:ss", { locale: nl }) : '-'}
                      </span>
                      <span>{log.performed_by_email}</span>
                      {log.target_name && (
                        <span>→ {log.target_entity}: {log.target_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Vorige
              </Button>
              <span className="text-sm text-slate-500">
                Pagina {page + 1} van {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Volgende <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}