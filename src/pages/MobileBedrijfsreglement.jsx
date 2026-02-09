import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileBedrijfsreglement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedArticle, setExpandedArticle] = useState(null);
  const navigate = useNavigate();

  const { data: artikelen = [], isLoading } = useQuery({
    queryKey: ['bedrijfsreglementArtikelen'],
    queryFn: () => base44.entities.BedrijfsreglementArtikel.filter({ status: "Actief" }),
  });

  const filtered = artikelen
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.titel?.toLowerCase().includes(q) ||
        a.inhoud?.toLowerCase().includes(q) ||
        a.hoofdstuk?.toLowerCase().includes(q) ||
        String(a.artikel_nummer).includes(q)
      );
    })
    .sort((a, b) => (a.artikel_nummer || 0) - (b.artikel_nummer || 0));

  // Group by chapter
  const chapters = {};
  filtered.forEach(a => {
    const ch = a.hoofdstuk || "Overig";
    if (!chapters[ch]) chapters[ch] = [];
    chapters[ch].push(a);
  });

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <h1 className="font-bold text-lg">Bedrijfsreglement</h1>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek in artikelen..."
            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-blue-200 focus:bg-white/30"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 pb-20 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Laden...</div>
        ) : Object.keys(chapters).length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {searchQuery ? "Geen artikelen gevonden" : "Geen artikelen beschikbaar"}
          </div>
        ) : (
          Object.entries(chapters).map(([chapter, articles]) => (
            <Card key={chapter}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">
                  {chapter}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {articles.map(article => (
                  <div
                    key={article.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedArticle(
                        expandedArticle === article.id ? null : article.id
                      )}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Art. {article.artikel_nummer}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {article.titel}
                        </span>
                      </div>
                      {expandedArticle === article.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {expandedArticle === article.id && (
                      <div className="px-3 pb-3 border-t bg-slate-50">
                        <div
                          className="text-sm text-slate-700 prose prose-sm max-w-none mt-2
                            [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
                            [&_p]:my-1 [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: article.inhoud }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}