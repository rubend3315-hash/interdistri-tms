import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Plus, Pencil, Printer, Search, ChevronDown, ChevronRight,
  FileText, Trash2, Eye
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import ReglementArtikelEditor from "../components/reglement/ReglementArtikelEditor";
import ReglementLegenda from "../components/reglement/ReglementLegenda";
import ReglementPrintView from "../components/reglement/ReglementPrintView";

export default function Bedrijfsreglement() {
  const [editingArtikel, setEditingArtikel] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHoofdstuk, setExpandedHoofdstuk] = useState(null);
  const [selectedArtikel, setSelectedArtikel] = useState(null);
  const [deleteArtikel, setDeleteArtikel] = useState(null);
  const queryClient = useQueryClient();

  const { data: artikelen = [], isLoading } = useQuery({
    queryKey: ["bedrijfsreglementArtikelen"],
    queryFn: () => base44.entities.BedrijfsreglementArtikel.list(),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (id) {
        // Existing article - save old version
        const existing = artikelen.find(a => a.id === id);
        const versieGeschiedenis = [...(existing.versie_geschiedenis || [])];
        versieGeschiedenis.push({
          versie: existing.versie || 1,
          datum: new Date().toISOString(),
          bewerkt_door: user?.full_name || user?.email || "Onbekend",
          oude_inhoud: existing.inhoud,
          oude_titel: existing.titel,
        });
        return base44.entities.BedrijfsreglementArtikel.update(id, {
          ...data,
          versie: (existing.versie || 1) + 1,
          versie_geschiedenis: versieGeschiedenis,
        });
      } else {
        return base44.entities.BedrijfsreglementArtikel.create({
          ...data,
          versie: 1,
          versie_geschiedenis: [],
          status: "Actief",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bedrijfsreglementArtikelen"] });
      setEditingArtikel(null);
      setIsCreating(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BedrijfsreglementArtikel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bedrijfsreglementArtikelen"] });
      setDeleteArtikel(null);
    },
  });

  const sorted = [...artikelen]
    .sort((a, b) => a.artikel_nummer - b.artikel_nummer);

  const filtered = sorted.filter((art) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.titel?.toLowerCase().includes(q) ||
      art.hoofdstuk?.toLowerCase().includes(q) ||
      art.inhoud?.toLowerCase().includes(q) ||
      String(art.artikel_nummer).includes(q)
    );
  });

  // Group by hoofdstuk
  const hoofdstukken = {};
  filtered.forEach((art) => {
    const h = art.hoofdstuk || "Overig";
    if (!hoofdstukken[h]) hoofdstukken[h] = [];
    hoofdstukken[h].push(art);
  });

  const handleSave = async (data) => {
    const id = editingArtikel?.id || null;
    await saveMutation.mutateAsync({ id, data });
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 500);
  };

  if (editingArtikel || isCreating) {
    return (
      <div className="max-w-5xl mx-auto">
        <ReglementArtikelEditor
          artikel={editingArtikel}
          onSave={handleSave}
          onClose={() => { setEditingArtikel(null); setIsCreating(false); }}
        />
      </div>
    );
  }

  if (showPrint) {
    return (
      <div>
        <div className="print:hidden mb-4 flex gap-2">
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Afdrukken
          </Button>
          <Button variant="outline" onClick={() => setShowPrint(false)}>
            Terug
          </Button>
        </div>
        <ReglementPrintView artikelen={sorted} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Bedrijfsreglement
          </h1>
          <p className="text-slate-500 mt-1">
            Algemene overeenkomst Interdistri • {sorted.length} artikelen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Printen als PDF
          </Button>
          <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Nieuw artikel
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Zoek in artikelen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Legenda */}
        <div className="lg:col-span-1">
          <ReglementLegenda artikelen={sorted} onArtikelClick={(art) => {
            setExpandedHoofdstuk(art.hoofdstuk || "Overig");
            setSelectedArtikel(art.id);
            setTimeout(() => {
              document.getElementById(`artikel-${art.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }} />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-3">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-slate-500">Laden...</CardContent></Card>
          ) : Object.keys(hoofdstukken).length === 0 ? (
            <Card><CardContent className="py-8 text-center text-slate-500">Geen artikelen gevonden</CardContent></Card>
          ) : (
            Object.entries(hoofdstukken).map(([hoofdstuk, arts]) => (
              <Card key={hoofdstuk}>
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50 transition-colors py-3"
                  onClick={() => setExpandedHoofdstuk(expandedHoofdstuk === hoofdstuk ? null : hoofdstuk)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      {expandedHoofdstuk === hoofdstuk ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      {hoofdstuk}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">{arts.length} artikelen</Badge>
                  </div>
                </CardHeader>
                {expandedHoofdstuk === hoofdstuk && (
                  <CardContent className="pt-0 space-y-2">
                    {arts.map((art) => (
                      <div
                        key={art.id}
                        id={`artikel-${art.id}`}
                        className={`border rounded-lg p-3 hover:bg-slate-50 transition-colors ${selectedArtikel === art.id ? "ring-2 ring-blue-400 bg-blue-50/50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">
                                Art. {art.artikel_nummer}
                              </Badge>
                              <span className="text-sm font-medium text-slate-900">{art.titel}</span>
                              <Badge variant="outline" className="text-[10px]">v{art.versie || 1}</Badge>
                            </div>
                            {selectedArtikel === art.id ? (
                              <div
                                className="text-sm text-slate-600 prose prose-sm max-w-none mt-2"
                                dangerouslySetInnerHTML={{ __html: art.inhoud }}
                              />
                            ) : (
                              <p className="text-xs text-slate-500 line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: art.inhoud?.replace(/<[^>]*>/g, " ").slice(0, 150) + "..."
                                }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setSelectedArtikel(selectedArtikel === art.id ? null : art.id); }}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setEditingArtikel(art); }}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setDeleteArtikel(art); }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteArtikel} onOpenChange={() => setDeleteArtikel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Artikel verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u artikel {deleteArtikel?.artikel_nummer} "{deleteArtikel?.titel}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteArtikel?.id)}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}