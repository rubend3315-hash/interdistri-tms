import React from "react";
import { format } from "date-fns";

export default function ReglementPrintView({ artikelen }) {
  const sorted = [...artikelen].sort((a, b) => a.artikel_nummer - b.artikel_nummer);

  // Group by hoofdstuk
  const hoofdstukken = {};
  sorted.forEach((art) => {
    const h = art.hoofdstuk || "Overig";
    if (!hoofdstukken[h]) hoofdstukken[h] = [];
    hoofdstukken[h].push(art);
  });

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="reglement-print">
      {/* Title page */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Algemene overeenkomst / Bedrijfsreglement
        </h1>
        <h2 className="text-xl text-slate-600 mb-4">Interdistri</h2>
        <p className="text-sm text-slate-500">
          Gegenereerd op {format(new Date(), "dd-MM-yyyy HH:mm")}
        </p>
      </div>

      {/* Inhoudsopgave */}
      <div className="mb-10 border rounded-lg p-6 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Inhoudsopgave</h2>
        {Object.entries(hoofdstukken).map(([hoofdstuk, arts]) => (
          <div key={hoofdstuk} className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800">{hoofdstuk}</h3>
            <div className="ml-4 space-y-0.5">
              {arts.map((art) => (
                <div key={art.id} className="text-xs text-slate-600 flex items-baseline gap-2">
                  <span className="font-mono min-w-[24px]">Art. {art.artikel_nummer}</span>
                  <span className="flex-1 border-b border-dotted border-slate-300" />
                  <span>{art.titel}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Artikelen */}
      {Object.entries(hoofdstukken).map(([hoofdstuk, arts]) => (
        <div key={hoofdstuk} className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
            {hoofdstuk}
          </h2>
          {arts.map((art) => (
            <div key={art.id} className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Artikel {art.artikel_nummer} – {art.titel}
              </h3>
              <div
                className="text-sm text-slate-700 prose prose-sm max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: art.inhoud }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}