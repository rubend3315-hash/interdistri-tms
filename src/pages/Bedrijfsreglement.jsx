import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Plus, Pencil, Printer, Search, ChevronDown, ChevronRight,
  FileText, Trash2, Eye, History, GripVertical
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ReglementArtikelEditor from "../components/reglement/ReglementArtikelEditor";
import ReglementLegenda from "../components/reglement/ReglementLegenda";
import ReglementPrintView from "../components/reglement/ReglementPrintView";
import VersionHistoryPanel from "../components/reglement/VersionHistoryPanel";
import { getSortedWithNumbers, getNextSortOrder } from "../components/reglement/artikelNummering";

export default function Bedrijfsreglement() {
  const [editingArtikel, setEditingArtikel] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedHoofdstuk, setExpandedHoofdstuk] = useState(null);
  const [selectedArtikel, setSelectedArtikel] = useState(null);
  const [deleteArtikel, setDeleteArtikel] = useState(null);
  const [historyArtikel, setHistoryArtikel] = useState(null);
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
        const sortOrder = getNextSortOrder(artikelen, data.hoofdstuk);
        return base44.entities.BedrijfsreglementArtikel.create({
          ...data,
          sort_order: sortOrder,
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
    mutationFn: async (id) => {
      await base44.entities.BedrijfsreglementArtikel.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bedrijfsreglementArtikelen"] });
      setDeleteArtikel(null);
    },
  });

  // Sorted list with auto-calculated article numbers
  const sorted = useMemo(() => getSortedWithNumbers(artikelen), [artikelen]);

  const filtered = useMemo(() => sorted.filter((art) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.titel?.toLowerCase().includes(q) ||
      art.hoofdstuk?.toLowerCase().includes(q) ||
      art.inhoud?.toLowerCase().includes(q) ||
      String(art.artikelNummer).includes(q)
    );
  }), [sorted, searchQuery]);

  // Group by hoofdstuk (preserving sort order)
  const hoofdstukken = useMemo(() => {
    const map = {};
    filtered.forEach((art) => {
      const h = art.hoofdstuk || "Overig";
      if (!map[h]) map[h] = [];
      map[h].push(art);
    });
    return map;
  }, [filtered]);

  const handleSave = async (data) => {
    const id = editingArtikel?.id || null;
    await saveMutation.mutateAsync({ id, data });
  };

  // Drag & drop: herschik sort_order binnen een sectie
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const hoofdstuk = result.source.droppableId;
    const arts = [...(hoofdstukken[hoofdstuk] || [])];
    const [moved] = arts.splice(result.source.index, 1);
    arts.splice(result.destination.index, 0, moved);

    // Update sort_order sequentieel
    const updates = arts.map((a, i) => ({ id: a.id, sort_order: i + 1 }));
    // Optimistic: invalidate after all updates
    for (const u of updates) {
      await base44.entities.BedrijfsreglementArtikel.update(u.id, { sort_order: u.sort_order });
    }
    queryClient.invalidateQueries({ queryKey: ["bedrijfsreglementArtikelen"] });
  };

  const handleRevert = async (artikel, versionData) => {
    // Revert saves current as history then applies old version data
    const existing = artikelen.find(a => a.id === artikel.id);
    const versieGeschiedenis = [...(existing.versie_geschiedenis || [])];
    versieGeschiedenis.push({
      versie: existing.versie || 1,
      datum: new Date().toISOString(),
      bewerkt_door: user?.full_name || user?.email || "Onbekend",
      oude_inhoud: existing.inhoud,
      oude_titel: existing.titel,
    });
    await base44.entities.BedrijfsreglementArtikel.update(artikel.id, {
      titel: versionData.titel,
      inhoud: versionData.inhoud,
      versie: (existing.versie || 1) + 1,
      versie_geschiedenis: versieGeschiedenis,
    });
    queryClient.invalidateQueries({ queryKey: ["bedrijfsreglementArtikelen"] });
    setHistoryArtikel(null);
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 500);
  };

  if (historyArtikel) {
    // Re-fetch fresh data for the article being viewed
    const freshArtikel = artikelen.find(a => a.id === historyArtikel.id) || historyArtikel;
    return (
      <div className="max-w-5xl mx-auto">
        <VersionHistoryPanel
          artikel={freshArtikel}
          onRevert={(versionData) => handleRevert(freshArtikel, versionData)}
          onClose={() => setHistoryArtikel(null)}
        />
      </div>
    );
  }

  if (editingArtikel || isCreating) {
    return (
      <div className="max-w-5xl mx-auto">
        <ReglementArtikelEditor
          artikel={editingArtikel}
          onSave={handleSave}
          onClose={() => { setEditingArtikel(null); setIsCreating(false); }}
          onShowHistory={() => { setHistoryArtikel(editingArtikel); setEditingArtikel(null); }}
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
            // Legenda receives sorted list with artikelNummer already set
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
            <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(hoofdstukken).map(([hoofdstuk, arts]) => (
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
                  <CardContent className="pt-0">
                    <Droppable droppableId={hoofdstuk}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                          {arts.map((art, index) => (
                            <Draggable key={art.id} draggableId={art.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  id={`artikel-${art.id}`}
                                  className={`border rounded-lg p-3 hover:bg-slate-50 transition-colors ${selectedArtikel === art.id ? "ring-2 ring-blue-400 bg-blue-50/50" : ""} ${snapshot.isDragging ? "shadow-lg bg-white" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div {...provided.dragHandleProps} className="pt-1 cursor-grab">
                                      <GripVertical className="w-4 h-4 text-slate-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">
                                          Art. {art.artikelNummer}
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
                                        title="Bekijken"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                      </Button>
                                      {(art.versie_geschiedenis || []).length > 0 && (
                                        <Button
                                          variant="ghost" size="icon"
                                          className="h-7 w-7"
                                          onClick={(e) => { e.stopPropagation(); setHistoryArtikel(art); }}
                                          title="Versiegeschiedenis"
                                        >
                                          <History className="w-3.5 h-3.5 text-blue-400" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost" size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); setEditingArtikel(art); }}
                                        title="Bewerken"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); setDeleteArtikel(art); }}
                                        title="Verwijderen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                )}
              </Card>
            ))
            }
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteArtikel} onOpenChange={() => setDeleteArtikel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Artikel verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u Art. {deleteArtikel?.artikelNummer} "{deleteArtikel?.titel}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
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