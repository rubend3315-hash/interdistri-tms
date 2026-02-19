import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Clock, Truck, ClipboardCheck, FileText, CheckCircle,
  CalendarDays, Mail, Menu, ArrowRight, ChevronDown, ChevronUp,
  Smartphone, MapPin, Home
} from "lucide-react";

const sections = [
  {
    id: "inleiding",
    title: "Inleiding",
    icon: Smartphone,
    content: (
      <div className="space-y-2">
        <p className="text-xs">De Interdistri TMS mobiele app is jouw dagelijkse tool om werktijden, ritten, inspecties en declaraties in te dienen.</p>
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-semibold text-xs text-blue-800">📱 Single Day</p>
          <p className="text-xs text-blue-700">Voor dagdiensten: één datum met start- en eindtijd.</p>
        </div>
        <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
          <p className="font-semibold text-xs text-purple-800">📱 Multi Day</p>
          <p className="text-xs text-purple-700">Voor meerdaagse diensten: startdatum én einddatum.</p>
        </div>
      </div>
    )
  },
  {
    id: "diensttijd",
    title: "Diensttijd invoeren",
    icon: Clock,
    content: (
      <div className="space-y-2">
        <div className="flex gap-2 items-start">
          <Badge className="bg-blue-600 text-white text-xs flex-shrink-0">1</Badge>
          <p className="text-xs"><strong>Starttijd invoeren</strong> — Ga naar Diensttijd en vul je starttijd in (UU:MM).</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-emerald-600 text-white text-xs flex-shrink-0">2</Badge>
          <p className="text-xs"><strong>Ritten invoeren</strong> — Tik op "Volgende → Ritten invoeren".</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-600 text-white text-xs flex-shrink-0">3</Badge>
          <p className="text-xs"><strong>Eindtijd & pauze</strong> — Ga terug naar Diensttijd, vul eindtijd en pauze in.</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-blue-600 text-white text-xs flex-shrink-0">4</Badge>
          <p className="text-xs"><strong>Indienen</strong> — Tik "Met Handtekening Indienen" en teken je handtekening.</p>
        </div>
        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-xs text-emerald-800">💾 Je kunt tussentijds opslaan als concept.</p>
        </div>
        <div className="p-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-800">⚠️ Minimaal één rit vereist. Rittijden mogen niet buiten diensttijd vallen.</p>
        </div>
      </div>
    )
  },
  {
    id: "ritten",
    title: "Ritten invoeren",
    icon: Truck,
    content: (
      <div className="space-y-2">
        <p className="text-xs">Per rit vul je in:</p>
        <div className="text-xs space-y-1">
          <p>• <strong>Start/Eind rit</strong> — Tijdstip (UU:MM)</p>
          <p>• <strong>Kenteken</strong> — Selecteer voertuig</p>
          <p>• <strong>Begin/Eind km</strong> — Kilometerstanden</p>
          <p>• <strong>Brandstof/AdBlue</strong> — Alleen bij tanken</p>
          <p>• <strong>Klant & Route</strong> — Selecteer klant, routenaam, stops</p>
          <p>• <strong>Schade?</strong> — Bij "Ja" opent Bumper automatisch</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">➕ Tik "Regel Toevoegen" voor extra ritten.</p>
        </div>
        <div className="p-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-800">⚠️ Rittijden moeten binnen je diensttijd vallen. Bij een fout zie je een rode waarschuwing bovenaan het scherm.</p>
        </div>
      </div>
    )
  },
  {
    id: "standplaatswerk",
    title: "Standplaatswerk invoeren",
    icon: MapPin,
    content: (
      <div className="space-y-2">
        <p className="text-xs">Standplaatswerk (loodswerk) registreer je naast je ritten. Zo wordt bijgehouden welk werk je op de standplaats hebt gedaan.</p>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">1</Badge>
          <p className="text-xs"><strong>Ga naar Standplaatswerk</strong> — Tik op "Standplaatswerk" in het hoofdmenu.</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">2</Badge>
          <p className="text-xs"><strong>Regel toevoegen</strong> — Tik op "Standplaatswerk toevoegen".</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">3</Badge>
          <p className="text-xs"><strong>Tijden invullen</strong> — Vul begintijd en eindtijd in (UU:MM).</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">4</Badge>
          <p className="text-xs"><strong>Klant & Project</strong> — Selecteer optioneel een klant en bijbehorend project.</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">5</Badge>
          <p className="text-xs"><strong>Activiteit kiezen</strong> — Kies een activiteit uit de lijst of typ een vrije invoer.</p>
        </div>
        <div className="flex gap-2 items-start">
          <Badge className="bg-amber-700 text-white text-xs flex-shrink-0">6</Badge>
          <p className="text-xs"><strong>Opmerkingen</strong> — Voeg eventueel een opmerking toe.</p>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">➕ Je kunt meerdere regels toevoegen als je verschillende werkzaamheden hebt gedaan.</p>
        </div>
        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-xs text-emerald-800">💾 Standplaatswerk wordt automatisch opgeslagen bij het indienen van je dienst.</p>
        </div>
        <div className="p-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-800">⚠️ De tijden van je standplaatswerk moeten binnen je diensttijd vallen! Bij een fout zie je een oranje waarschuwing bovenaan het scherm.</p>
        </div>
      </div>
    )
  },
  {
    id: "inspectie",
    title: "Voertuiginspectie",
    icon: ClipboardCheck,
    content: (
      <div className="space-y-2 text-xs">
        <p>• Selecteer voertuig en voer kilometerstand in</p>
        <p>• Loop de checklist door (verlichting, banden, remmen, etc.)</p>
        <p>• Groen = OK, Rood = niet OK</p>
        <p>• Bij schade: omschrijving invullen en foto's maken</p>
        <p>• Tik "Inspectie indienen"</p>
      </div>
    )
  },
  {
    id: "declaratie",
    title: "Declaraties",
    icon: FileText,
    content: (
      <div className="space-y-2 text-xs">
        <p>• Datum, categorie, omschrijving en bedrag invullen</p>
        <p>• Upload een foto van je bon (aanbevolen)</p>
        <p>• Categorieën: Brandstof, Parkeren, Tol, Maaltijd, Verblijf, Materiaal, Overig</p>
      </div>
    )
  },
  {
    id: "overig",
    title: "Overige functies",
    icon: BookOpen,
    content: (
      <div className="space-y-2 text-xs">
        <p><strong>Planning</strong> — Bekijk je weekrooster per dag met uurcodes en afdelingen.</p>
        <p><strong>Berichten</strong> — Ontvang berichten van je leidinggevende. Ongelezen berichten hebben een blauw bolletje.</p>
        <p><strong>Overzicht</strong> — Bekijk je goedgekeurde diensten.</p>
        <p><strong>Mijn Contracten</strong> — Bekijk en onderteken contracten.</p>
        <p><strong>Links</strong> — Bumper (schademelden) en Werknemersloket.</p>
      </div>
    )
  },
  {
    id: "tips",
    title: "Handige tips",
    icon: BookOpen,
    content: (
      <div className="space-y-2">
        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-xs text-emerald-800">📶 <strong>Offline:</strong> De app werkt zonder internet. Gegevens worden automatisch verstuurd bij verbinding.</p>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">⏰ <strong>Tijdformaat:</strong> Typ 4 cijfers (bijv. 0830), de dubbele punt wordt automatisch toegevoegd.</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">🔄 <strong>Swipen:</strong> Swipe links/rechts om tussen tabs te wisselen.</p>
        </div>
      </div>
    )
  }
];

export default function MobileHandleidingTab() {
  const [openSections, setOpenSections] = useState(["inleiding"]);

  const toggleSection = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-2">
      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-3">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Handleiding Mobiele App
          </h2>
          <p className="text-xs text-slate-500 mt-1">Tik op een onderwerp om meer te lezen</p>
        </CardContent>
      </Card>

      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections.includes(section.id);
        return (
          <Card key={section.id}>
            <button onClick={() => toggleSection(section.id)} className="w-full text-left">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">{section.title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </CardContent>
            </button>
            {isOpen && (
              <CardContent className="px-3 pb-3 pt-0">
                {section.content}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}