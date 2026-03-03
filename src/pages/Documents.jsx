import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, AlertTriangle, CheckCircle, Clock, Filter, Shield, CalendarClock, Grid3X3, Layers } from "lucide-react";
import { differenceInDays } from "date-fns";
import DocumentUploadDialog from "../components/documents/DocumentUploadDialog";
import DocumentTable from "../components/documents/DocumentTable";
import ComplianceDashboard from "../components/documents/ComplianceDashboard";
import ExpiryTimeline from "../components/documents/ExpiryTimeline";
import DocumentMatrix from "../components/documents/DocumentMatrix";
import BulkActions from "../components/documents/BulkActions";

export default function Documents() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] })
  });

  const handleEdit = (doc) => {
    setEditDoc(doc);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditDoc(null);
    setDialogOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    let total = documents.length;
    let expiringSoon = 0;
    let expired = 0;
    let active = 0;

    documents.forEach(d => {
      if (d.status === 'Actief') active++;
      if (d.expiry_date) {
        const days = differenceInDays(new Date(d.expiry_date), today);
        if (days < 0) expired++;
        else if (days <= 30) expiringSoon++;
      }
    });
    return { total, active, expiringSoon, expired };
  }, [documents]);

  // Filtering
  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
          !(d.linked_entity_name || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (linkFilter === "employee" && !d.linked_employee_id) return false;
      if (linkFilter === "vehicle" && !d.linked_vehicle_id) return false;
      if (linkFilter === "none" && (d.linked_employee_id || d.linked_vehicle_id)) return false;
      return true;
    });
  }, [documents, search, typeFilter, statusFilter, linkFilter]);

  const documentTypes = [...new Set(documents.map(d => d.document_type).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HR Document Control Center</h1>
          <p className="text-slate-500 mt-1">Compliance, vervaldatumcontrole en centraal documentenbeheer</p>
        </div>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Document toevoegen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Totaal</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              <p className="text-xs text-slate-500">Actief</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.expiringSoon}</p>
              <p className="text-xs text-slate-500">Verloopt &lt;30d</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.expired}</p>
              <p className="text-xs text-slate-500">Verlopen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-1" /> Documenten
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-1" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <CalendarClock className="w-4 h-4 mr-1" /> Vervaldatums
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Grid3X3 className="w-4 h-4 mr-1" /> Matrix
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Layers className="w-4 h-4 mr-1" /> Bulkacties
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Zoeken op naam of koppeling..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Alle types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="Actief">Actief</SelectItem>
                    <SelectItem value="Verlopen">Verlopen</SelectItem>
                    <SelectItem value="Gearchiveerd">Gearchiveerd</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={linkFilter} onValueChange={setLinkFilter}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle koppelingen</SelectItem>
                    <SelectItem value="employee">Medewerkers</SelectItem>
                    <SelectItem value="vehicle">Voertuigen</SelectItem>
                    <SelectItem value="none">Niet gekoppeld</SelectItem>
                  </SelectContent>
                </Select>
                {(search || typeFilter !== "all" || statusFilter !== "all" || linkFilter !== "all") && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setLinkFilter("all"); }}>
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <DocumentTable
              documents={filtered}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ComplianceDashboard documents={documents} employees={employees} />
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-600" />
                Vervaldatum Overzicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : <ExpiryTimeline documents={documents} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-blue-600" />
                Document Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : <DocumentMatrix documents={documents} employees={employees} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Actions Tab */}
        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Bulkacties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : <BulkActions documents={documents} employees={employees} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <DocumentUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        vehicles={vehicles}
        editDocument={editDoc}
      />
    </div>
  );
}