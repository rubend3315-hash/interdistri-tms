import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, X, History, Clock } from "lucide-react";
import ReactQuill from "react-quill";
import { format } from "date-fns";

export default function ReglementArtikelEditor({ artikel, onSave, onClose }) {
  const [titel, setTitel] = useState(artikel?.titel || "");
  const [inhoud, setInhoud] = useState(artikel?.inhoud || "");
  const [hoofdstuk, setHoofdstuk] = useState(artikel?.hoofdstuk || "");
  const [artikelNummer, setArtikelNummer] = useState(artikel?.artikel_nummer || "");
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      artikel_nummer: Number(artikelNummer),
      hoofdstuk,
      titel,
      inhoud,
    });
    setSaving(false);
  };

  const versieGeschiedenis = artikel?.versie_geschiedenis || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            {artikel ? `Artikel ${artikel.artikel_nummer} bewerken` : "Nieuw artikel"}
          </h2>
          {artikel && (
            <Badge variant="outline" className="text-xs">
              Versie {artikel.versie || 1}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {versieGeschiedenis.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="w-4 h-4 mr-1" /> Versiegeschiedenis
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Annuleren
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !titel.trim()}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-medium text-slate-600">Artikelnummer</Label>
          <Input
            type="number"
            value={artikelNummer}
            onChange={(e) => setArtikelNummer(e.target.value)}
            placeholder="Nr"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Hoofdstuk</Label>
          <Input
            value={hoofdstuk}
            onChange={(e) => setHoofdstuk(e.target.value)}
            placeholder="Hoofdstuk"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Titel</Label>
          <Input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Artikel titel"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-slate-600 mb-1 block">Inhoud</Label>
        <ReactQuill
          value={inhoud}
          onChange={setInhoud}
          theme="snow"
          style={{ minHeight: "300px" }}
          modules={{
            toolbar: [
              [{ header: [3, 4, false] }],
              ["bold", "italic", "underline"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["clean"],
            ],
          }}
        />
      </div>

      {/* Versiegeschiedenis dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Versiegeschiedenis - Artikel {artikel?.artikel_nummer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {versieGeschiedenis.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Geen eerdere versies</p>
            ) : (
              [...versieGeschiedenis].reverse().map((v, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Versie {v.versie}
                      </CardTitle>
                      <div className="text-xs text-slate-500">
                        {v.datum ? format(new Date(v.datum), "dd-MM-yyyy HH:mm") : "-"} • {v.bewerkt_door || "Onbekend"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {v.oude_titel && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-slate-500">Titel:</span>
                        <p className="text-sm text-slate-700">{v.oude_titel}</p>
                      </div>
                    )}
                    {v.oude_inhoud && (
                      <div>
                        <span className="text-xs font-medium text-slate-500">Inhoud:</span>
                        <div
                          className="text-sm text-slate-700 prose prose-sm max-w-none mt-1 max-h-40 overflow-y-auto border rounded p-2 bg-slate-50"
                          dangerouslySetInnerHTML={{ __html: v.oude_inhoud }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}