import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, X, History } from "lucide-react";
import ReactQuill from "react-quill";

export default function ReglementArtikelEditor({ artikel, onSave, onClose, onShowHistory }) {
  const [titel, setTitel] = useState(artikel?.titel || "");
  const [inhoud, setInhoud] = useState(artikel?.inhoud || "");
  const [hoofdstuk, setHoofdstuk] = useState(artikel?.hoofdstuk || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      hoofdstuk,
      titel,
      inhoud,
    });
    setSaving(false);
  };

  const hasHistory = (artikel?.versie_geschiedenis || []).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            {artikel ? `Art. ${artikel.artikelNummer || artikel.artikel_nummer || ""} bewerken` : "Nieuw artikel"}
          </h2>
          {artikel && (
            <Badge variant="outline" className="text-xs">
              Versie {artikel.versie || 1}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasHistory && onShowHistory && (
            <Button variant="outline" size="sm" onClick={onShowHistory}>
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

      <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}