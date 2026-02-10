import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, ChevronDown, ChevronRight, DollarSign, Loader2 } from "lucide-react";

export default function ClauseSummaryPanel({ summary, isLoading }) {
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-sm text-slate-500">AI vat het contract samen...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const clausules = summary.clausules || [];
  const kernpunten = summary.kernpunten || [];
  const financieel = summary.financieel_overzicht;
  const displayedClausules = showAll ? clausules : clausules.slice(0, 6);

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-600" />
          AI Clausule-samenvatting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key points */}
        {kernpunten.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
              <Star className="w-3 h-3" /> KERNPUNTEN
            </p>
            <ul className="space-y-1">
              {kernpunten.map((punt, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  {punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Financial overview */}
        {financieel && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> FINANCIEEL OVERZICHT
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {financieel.bruto_uurloon && (
                <div><span className="text-slate-500 text-xs">Uurloon:</span><p className="font-medium">{financieel.bruto_uurloon}</p></div>
              )}
              {financieel.bruto_maandloon && (
                <div><span className="text-slate-500 text-xs">Maandloon:</span><p className="font-medium">{financieel.bruto_maandloon}</p></div>
              )}
              {financieel.vakantiegeld && (
                <div><span className="text-slate-500 text-xs">Vakantiegeld:</span><p className="font-medium">{financieel.vakantiegeld}</p></div>
              )}
              {financieel.toeslagen && (
                <div><span className="text-slate-500 text-xs">Toeslagen:</span><p className="font-medium">{financieel.toeslagen}</p></div>
              )}
              {financieel.reiskosten && (
                <div className="col-span-2"><span className="text-slate-500 text-xs">Reiskosten:</span><p className="font-medium">{financieel.reiskosten}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Clauses */}
        {clausules.length > 0 && (
          <div className="space-y-1.5">
            {displayedClausules.map((clausule, idx) => (
              <div
                key={idx}
                className={`border rounded-lg transition-colors ${clausule.belangrijk ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200'}`}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-left"
                  onClick={() => setExpandedArticle(expandedArticle === idx ? null : idx)}
                >
                  {expandedArticle === idx ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-xs font-mono text-slate-500 flex-shrink-0 w-12">
                    {clausule.artikel}
                  </span>
                  <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                    {clausule.titel}
                  </span>
                  {clausule.belangrijk && (
                    <Star className="w-3 h-3 text-amber-500 flex-shrink-0 fill-amber-500" />
                  )}
                </button>
                {expandedArticle === idx && (
                  <div className="px-3 pb-3 pl-10">
                    <p className="text-sm text-slate-600">{clausule.samenvatting}</p>
                  </div>
                )}
              </div>
            ))}
            {clausules.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-slate-500"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Toon minder' : `Toon alle ${clausules.length} clausules`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}