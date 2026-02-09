import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function ReglementLegenda({ artikelen }) {
  // Group by hoofdstuk
  const hoofdstukken = {};
  artikelen
    .sort((a, b) => a.artikel_nummer - b.artikel_nummer)
    .forEach((art) => {
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
                <div
                  key={art.id}
                  className="text-xs text-slate-600 flex items-center gap-2"
                >
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 min-w-[28px] justify-center">
                    {art.artikel_nummer}
                  </Badge>
                  <span>{art.titel}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}