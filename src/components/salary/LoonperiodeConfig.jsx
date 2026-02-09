import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save, RotateCcw } from "lucide-react";

// Standaard CAO Beroepsgoederenvervoer: 13 periodes, 52 weken
const DEFAULT_PERIODES = [
  { periode: 1, maand: "Januari", weken: [1, 2, 3, 4, 5] },
  { periode: 2, maand: "Februari", weken: [6, 7, 8, 9] },
  { periode: 3, maand: "Maart", weken: [10, 11, 12, 13] },
  { periode: 4, maand: "April", weken: [14, 15, 16, 17] },
  { periode: 5, maand: "Mei", weken: [18, 19, 20, 21] },
  { periode: 6, maand: "Juni", weken: [22, 23, 24, 25] },
  { periode: 7, maand: "Juli", weken: [26, 27, 28, 29] },
  { periode: 8, maand: "Augustus", weken: [30, 31, 32, 33] },
  { periode: 9, maand: "September", weken: [34, 35, 36, 37] },
  { periode: 10, maand: "Oktober", weken: [38, 39, 40, 41] },
  { periode: 11, maand: "November", weken: [42, 43, 44, 45] },
  { periode: 12, maand: "December (1)", weken: [46, 47, 48, 49] },
  { periode: 13, maand: "December (2)", weken: [50, 51, 52] },
];

export function getDefaultPeriodes() {
  return DEFAULT_PERIODES.map(p => ({ ...p, weken: [...p.weken] }));
}

export default function LoonperiodeConfig({ periodes, onSave }) {
  const [editing, setEditing] = useState(false);
  const [editPeriodes, setEditPeriodes] = useState(periodes.map(p => ({
    ...p,
    wekenStr: p.weken.join(", ")
  })));

  const handleWekenChange = (idx, val) => {
    const updated = [...editPeriodes];
    updated[idx] = { ...updated[idx], wekenStr: val };
    setEditPeriodes(updated);
  };

  const handleSave = () => {
    const parsed = editPeriodes.map(p => ({
      ...p,
      weken: p.wekenStr.split(",").map(w => parseInt(w.trim())).filter(w => !isNaN(w))
    }));
    onSave(parsed);
    setEditing(false);
  };

  const handleReset = () => {
    const defaults = getDefaultPeriodes();
    setEditPeriodes(defaults.map(p => ({ ...p, wekenStr: p.weken.join(", ") })));
    onSave(defaults);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Loonperiodes (13 periodes / 52 weken)
          </CardTitle>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Standaard
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3 h-3 mr-1" /> Opslaan
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Settings className="w-3 h-3 mr-1" /> Aanpassen
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16">Per.</TableHead>
                <TableHead>Loonperiode</TableHead>
                <TableHead>Weken</TableHead>
                <TableHead className="text-right w-20">Aantal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editPeriodes.map((p, idx) => (
                <TableRow key={p.periode}>
                  <TableCell className="font-medium">{p.periode}</TableCell>
                  <TableCell className="text-slate-600">{p.maand}</TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        value={p.wekenStr}
                        onChange={(e) => handleWekenChange(idx, e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-sm text-slate-700">
                        Week {p.weken[0]} t/m {p.weken[p.weken.length - 1]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">{p.weken.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}