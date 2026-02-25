import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function ReglementLegenda({ artikelen, onArtikelClick }) {
  // Group by hoofdstuk
  const hoofdstukken = {};
  artikelen.forEach((art) => {
      const h = art.hoofdstuk || "Overig";
      if (!hoofdstukken[h]) hoofdstukken[h] = [];
      hoofdstukken[h].push(art);
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Inhoudsopgave
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(hoofdstukken).map(([hoofdstuk, arts]) => (
          <div key={hoofdstuk}>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">{hoofdstuk}</h3>
            <div className="space-y-0.5 ml-2">
              {arts.map((art) => (
                <button
                  key={art.id}
                  onClick={() => onArtikelClick?.(art)}
                  className="text-xs text-slate-600 flex items-center gap-2 hover:text-blue-600 hover:bg-blue-50 rounded px-1 py-0.5 -mx-1 transition-colors w-full text-left"
                >
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 min-w-[28px] justify-center">
                    {art.artikelNummer ?? art.artikel_nummer}
                  </Badge>
                  <span>{art.titel}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}