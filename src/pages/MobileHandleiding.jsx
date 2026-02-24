import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Clock, Truck, ClipboardCheck, FileText, CheckCircle,
  CalendarDays, Mail, ExternalLink, Home, Send, Save, Menu,
  ArrowRight, ArrowLeft, ChevronDown, ChevronUp, LogOut,
  Smartphone, AlertTriangle, MapPin, Camera, Plus, Trash2
} from "lucide-react";

const sections = [
  {
    id: "inleiding",
    title: "Inleiding",
    icon: Smartphone,
    color: "bg-blue-100 text-blue-700",
    content: (
      <div className="space-y-3">
        <p>De Interdistri TMS mobiele app is jouw dagelijkse tool om werktijden, ritten, voertuiginspecties en declaraties in te dienen. Er zijn twee versies:</p>
        <div className="grid gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-800">📱 Single Day (Dagdienst)</p>
            <p className="text-sm text-blue-700 mt-1">Voor medewerkers die op dezelfde dag beginnen en eindigen. Je voert één datum in met start- en eindtijd.</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="font-semibold text-purple-800">📱 Multi Day (Meerdaagse dienst)</p>
            <p className="text-sm text-purple-700 mt-1">Voor chauffeurs die meerdere dagen achter elkaar rijden (bijv. internationaal transport). Je voert een startdatum én einddatum in.</p>
          </div>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800"><strong>💡 Tip:</strong> Welke versie je krijgt wordt ingesteld door je leidinggevende. Dit kun je niet zelf wijzigen.</p>
        </div>
      </div>
    )
  },
  {
    id: "navigatie",
    title: "Navigatie & Menu",
    icon: Menu,
    color: "bg-slate-100 text-slate-700",
    content: (
      <div className="space-y-3">
        <p>De app heeft een duidelijke navigatie:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
            <Home className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Home</p>
              <p className="text-xs text-slate-600">Overzichtspagina met welkomstbericht en snelle knoppen naar alle onderdelen.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
            <Menu className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Hamburger menu (≡)</p>
              <p className="text-xs text-slate-600">Tik op het menu-icoon rechtsboven om alle onderdelen te zien. Het menu schuift van rechts naar binnen.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
            <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Swipen</p>
              <p className="text-xs text-slate-600">Je kunt ook naar links of rechts swipen om tussen tabs te wisselen.</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800"><strong>Dienst starttijd:</strong> In de blauwe balk bovenaan zie je altijd de datum, huidige tijd, en (indien ingesteld) je dienst starttijd in een geel blok.</p>
        </div>
      </div>
    )
  },
  {
    id: "diensttijd",
    title: "Dienst starten",
    icon: Clock,
    color: "bg-blue-100 text-blue-700",
    content: (
      <div className="space-y-3">
        <p className="font-medium">Volg deze stappen om je dienst te registreren:</p>
        
        <div className="space-y-2">
          <div className="flex gap-3 items-start">
            <Badge className="bg-blue-600 text-white flex-shrink-0">1</Badge>
            <div>
              <p className="font-medium text-sm">Kies datum en starttijd</p>
              <p className="text-xs text-slate-600">Ga naar <strong>Diensttijd</strong> en voer je starttijd in (UU:MM). De datum staat standaard op vandaag.</p>
              <p className="text-xs text-slate-500 mt-1"><em>PostNL: vink aan om automatisch een open rit aan te maken.</em></p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <Badge className="bg-emerald-600 text-white flex-shrink-0">2</Badge>
            <div>
              <p className="font-medium text-sm">Dienstregels invoeren</p>
              <p className="text-xs text-slate-600">Voeg <strong>ritten en/of standplaatswerk</strong> toe via "Regel toevoegen". Rit is niet verplicht — alleen standplaatswerk is ook geldig.</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-600 text-white flex-shrink-0">3</Badge>
            <div>
              <p className="font-medium text-sm">Eindtijd & pauze invoeren</p>
              <p className="text-xs text-slate-600">Vul je eindtijd en pauze (minuten) in. Het totaal wordt automatisch berekend.</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <Badge className="bg-blue-600 text-white flex-shrink-0">4</Badge>
            <div>
              <p className="font-medium text-sm">Indienen met handtekening</p>
              <p className="text-xs text-slate-600">Tik op <strong>"Dienst Indienen"</strong>. Teken je handtekening en bevestig.</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm text-emerald-800"><strong>💾 Tussentijds opslaan:</strong> Je kunt altijd op "Tussentijds Opslaan" tikken. Je gegevens worden als concept bewaard.</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800"><strong>📝 Geen rit:</strong> Gebruik "Geen rit / standplaats" voor kantoorwerk of opleiding. Vul een duidelijke reden in (minimaal 5 tekens).</p>
        </div>
      </div>
    )
  },
  {
    id: "ritten",
    title: "Ritten invoeren",
    icon: Truck,
    color: "bg-emerald-100 text-emerald-700",
    content: (
      <div className="space-y-3">
        <p>Voer per rit de volgende gegevens in. <strong>Rit is niet verplicht</strong> — alleen standplaatswerk is ook geldig.</p>
        
        <div className="space-y-2">
          {[
            { label: "Start/Eind rit", desc: "Starttijd wordt automatisch ingevuld. Eindtijd kan later worden ingevoerd.", required: true },
            { label: "Kenteken", desc: "Selecteer het voertuig uit de lijst", required: true },
            { label: "Begin/Eind km", desc: "Begin km verplicht, eind km verplicht bij afsluiten rit", required: true },
            { label: "Schade gereden?", desc: "Kies 'Ja' als er schade is ontstaan", required: false },
            { label: "Vertreklocatie", desc: "Bijv. 'Standplaats' of depot naam", required: false },
            { label: "Brandstof/AdBlue", desc: "Alleen invullen als je hebt getankt", required: false },
            { label: "Km-stand tanken", desc: "Kilometerstand op moment van tanken", required: false },
            { label: "E-laden (kWh)", desc: "Alleen bij elektrisch voertuig aan laadpaal", required: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label} {item.required && <span className="text-red-500">*</span>}</p>
                <p className="text-xs text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <p className="font-medium text-sm mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Route Details
          </p>
          <div className="space-y-1">
            <p className="text-xs text-slate-600">• <strong>Klant</strong> - Selecteer de klant uit de lijst</p>
            <p className="text-xs text-slate-600">• <strong>Route</strong> - Naam van de gereden route</p>
            <p className="text-xs text-slate-600">• <strong>Bestelde stops</strong> - Aantal geplande afleveradressen</p>
            <p className="text-xs text-slate-600">• <strong>Opmerkingen</strong> - Bijzonderheden, vertragingen, problemen</p>
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800"><strong>➕ Meerdere ritten:</strong> Tik op "Regel Toevoegen" om een extra rit toe te voegen.</p>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800"><strong>🚗 Schade?</strong> Als je "Ja" selecteert bij schade, wordt na het indienen automatisch de Bumper schadepagina geopend.</p>
        </div>

        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800"><strong>⚠️ Tijdregels:</strong> Regels moeten binnen de diensttijd vallen en mogen niet overlappen. Er is géén 5-minutenmarge.</p>
        </div>
      </div>
    )
  },
  {
    id: "standplaatswerk",
    title: "Standplaatswerk invoeren",
    icon: MapPin,
    color: "bg-amber-100 text-amber-700",
    content: (
      <div className="space-y-3">
        <p>Standplaatswerk (loodswerk) registreer je naast je ritten. Zo wordt bijgehouden welk werk je op de standplaats hebt gedaan.</p>
        
        <div className="space-y-2">
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">1</Badge>
            <div>
              <p className="font-medium text-sm">Ga naar Standplaatswerk</p>
              <p className="text-xs text-slate-600">Tik op <strong>"Standplaatswerk"</strong> in het hoofdmenu of op de homepagina.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">2</Badge>
            <div>
              <p className="font-medium text-sm">Regel toevoegen</p>
              <p className="text-xs text-slate-600">Tik op <strong>"Standplaatswerk toevoegen"</strong> om een nieuwe regel aan te maken.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">3</Badge>
            <div>
              <p className="font-medium text-sm">Tijden invullen</p>
              <p className="text-xs text-slate-600">Vul de <strong>begintijd</strong> en <strong>eindtijd</strong> in (formaat UU:MM, bijv. 08:00 - 10:30).</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">4</Badge>
            <div>
              <p className="font-medium text-sm">Klant & Project</p>
              <p className="text-xs text-slate-600">Selecteer optioneel een <strong>klant</strong> uit de lijst. Als de klant projecten heeft, kun je ook een <strong>project</strong> kiezen.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">5</Badge>
            <div>
              <p className="font-medium text-sm">Activiteit kiezen</p>
              <p className="text-xs text-slate-600">Kies een <strong>activiteit</strong> uit de lijst (bijv. laden, lossen, sorteren). Je kunt ook <strong>"Vrije invoer"</strong> kiezen om zelf een activiteit te typen.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-700 text-white flex-shrink-0">6</Badge>
            <div>
              <p className="font-medium text-sm">Opmerkingen</p>
              <p className="text-xs text-slate-600">Voeg eventueel een opmerking toe met bijzonderheden over het werk.</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800"><strong>➕ Meerdere regels:</strong> Je kunt meerdere standplaatswerkregels toevoegen als je verschillende werkzaamheden hebt gedaan. Elke regel heeft eigen tijden, klant en activiteit.</p>
        </div>

        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm text-emerald-800"><strong>💾 Opslaan:</strong> Standplaatswerk wordt automatisch opgeslagen wanneer je je dienst indient.</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800"><strong>🗑️ Verwijderen:</strong> Tik op het prullenbak-icoon om een regel te verwijderen. Ingevulde regels klappen automatisch in; tik erop om ze weer te openen.</p>
        </div>

        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800"><strong>⚠️ Let op:</strong> De tijden van je standplaatswerk moeten binnen je diensttijd vallen. Als de tijden niet kloppen, verschijnt er een <strong>oranje waarschuwing</strong> bovenaan het Standplaatswerk-scherm met precies welke regels buiten je dienst vallen.</p>
        </div>
      </div>
    )
  },
  {
    id: "inspectie",
    title: "Voertuiginspectie",
    icon: ClipboardCheck,
    color: "bg-amber-100 text-amber-700",
    content: (
      <div className="space-y-3">
        <p>Voer voor je vertrek een voertuiginspectie uit:</p>
        
        <div className="space-y-2">
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-600 text-white flex-shrink-0">1</Badge>
            <div>
              <p className="font-medium text-sm">Voertuig & kilometerstand</p>
              <p className="text-xs text-slate-600">Selecteer je voertuig en voer de huidige kilometerstand in.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-600 text-white flex-shrink-0">2</Badge>
            <div>
              <p className="font-medium text-sm">Checklist doorlopen</p>
              <p className="text-xs text-slate-600">Controleer alle punten: verlichting, banden, remmen, oliepeil, spiegels, EHBO-kit, brandblusser, gevarendriehoek en veiligheidsvest. Tik op een punt om het groen (OK) of rood (niet OK) te markeren.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-600 text-white flex-shrink-0">3</Badge>
            <div>
              <p className="font-medium text-sm">Schade melden</p>
              <p className="text-xs text-slate-600">Vink "Schade aanwezig" aan als er schade is. Beschrijf de schade en maak foto's met je camera.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="bg-amber-600 text-white flex-shrink-0">4</Badge>
            <div>
              <p className="font-medium text-sm">Indienen</p>
              <p className="text-xs text-slate-600">Tik op "Inspectie indienen". Bij schade krijgt de inspectie de status "Actie vereist".</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "declaratie",
    title: "Declaraties",
    icon: FileText,
    color: "bg-purple-100 text-purple-700",
    content: (
      <div className="space-y-3">
        <p>Kosten die je onderweg maakt kun je declareren:</p>
        
        <div className="space-y-2">
          <p className="text-xs text-slate-600">• <strong>Datum</strong> - Datum van de uitgave</p>
          <p className="text-xs text-slate-600">• <strong>Categorie</strong> - Brandstof, Parkeren, Tol, Maaltijd, Verblijf, Materiaal of Overig</p>
          <p className="text-xs text-slate-600">• <strong>Omschrijving</strong> - Korte beschrijving van de kosten</p>
          <p className="text-xs text-slate-600">• <strong>Bedrag</strong> - Het bedrag in euro's</p>
          <p className="text-xs text-slate-600">• <strong>Bon/Factuur</strong> - Upload een foto van de bon (optioneel maar aanbevolen)</p>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800"><strong>📸 Tip:</strong> Maak altijd een foto van je bon! Dit versnelt de goedkeuring.</p>
        </div>
      </div>
    )
  },
  {
    id: "overzicht",
    title: "Overzicht",
    icon: CheckCircle,
    color: "bg-teal-100 text-teal-700",
    content: (
      <div className="space-y-3">
        <p>In het overzicht zie je al je <strong>goedgekeurde diensten</strong>. Per dienst zie je:</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">• De datum (en einddatum bij meerdaagse diensten)</p>
          <p className="text-xs text-slate-600">• Start- en eindtijd</p>
          <p className="text-xs text-slate-600">• Totaal aantal uren</p>
        </div>
        <p className="text-xs text-slate-500">De laatste 10 goedgekeurde diensten worden getoond.</p>
      </div>
    )
  },
  {
    id: "planning",
    title: "Planning",
    icon: CalendarDays,
    color: "bg-indigo-100 text-indigo-700",
    content: (
      <div className="space-y-3">
        <p>Bekijk je weekplanning:</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">• Per dag zie je je <strong>uurcode</strong> (dienst, vrij, etc.)</p>
          <p className="text-xs text-slate-600">• De huidige dag wordt <strong>blauw gemarkeerd</strong></p>
          <p className="text-xs text-slate-600">• Weekenddagen hebben een grijze achtergrond</p>
          <p className="text-xs text-slate-600">• De afdeling wordt per dag getoond als die is ingesteld</p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-sm text-indigo-800"><strong>🔄 Live updates:</strong> Als je leidinggevende je planning wijzigt, wordt dit automatisch bijgewerkt in de app.</p>
        </div>
      </div>
    )
  },
  {
    id: "berichten",
    title: "Berichten",
    icon: Mail,
    color: "bg-rose-100 text-rose-700",
    content: (
      <div className="space-y-3">
        <p>Berichten van je leidinggevende verschijnen hier:</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">• <strong>Ongelezen berichten</strong> hebben een blauw bolletje en blauwe achtergrond</p>
          <p className="text-xs text-slate-600">• Tik op een bericht om het als gelezen te markeren</p>
          <p className="text-xs text-slate-600">• Berichten met prioriteit <strong>Urgent</strong> of <strong>Hoog</strong> hebben een gekleurd label</p>
          <p className="text-xs text-slate-600">• Het aantal ongelezen berichten staat als badge op het menu-item</p>
        </div>
      </div>
    )
  },
  {
    id: "contracten",
    title: "Mijn Contracten",
    icon: FileText,
    color: "bg-gray-100 text-gray-700",
    content: (
      <div className="space-y-3">
        <p>Via het menu kun je naar <strong>"Mijn Contracten"</strong> navigeren. Hier kun je:</p>
        <div className="space-y-1">
          <p className="text-xs text-slate-600">• Je actieve contracten bekijken</p>
          <p className="text-xs text-slate-600">• Contracten die ter ondertekening klaarstaan ondertekenen</p>
          <p className="text-xs text-slate-600">• Eerdere contracten inzien</p>
        </div>
      </div>
    )
  },
  {
    id: "tips",
    title: "Handige tips",
    icon: BookOpen,
    color: "bg-green-100 text-green-700",
    content: (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-medium text-sm text-blue-800">💾 Tussentijds opslaan</p>
            <p className="text-xs text-blue-700 mt-1">Sla je werk regelmatig tussentijds op als je nog niet klaar bent. Bij de Single Day versie worden concept-gegevens automatisch geladen als je de app heropent.</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="font-medium text-sm text-emerald-800">📶 Offline werken</p>
            <p className="text-xs text-emerald-700 mt-1">De app werkt ook als je even geen internet hebt. Je gegevens worden opgeslagen en automatisch verstuurd zodra je weer verbinding hebt. Een indicator bovenaan toont je verbindingsstatus.</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="font-medium text-sm text-amber-800">⏰ Tijdformaat</p>
            <p className="text-xs text-amber-700 mt-1">Voer tijden altijd in als UU:MM (bijv. 08:30 of 16:45). De dubbele punt (:) wordt automatisch toegevoegd als je vier cijfers typt.</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="font-medium text-sm text-purple-800">🔗 Snelle links</p>
            <p className="text-xs text-purple-700 mt-1">Via het menu → "Links" vind je snelle links naar Bumper (schade melden) en het Werknemersloket.</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="font-medium text-sm text-red-800">🚪 Afmelden</p>
            <p className="text-xs text-red-700 mt-1">Tik op het menu (≡) en scroll naar beneden. Daar vind je de knop "Afmelden" om uit te loggen.</p>
          </div>
        </div>
      </div>
    )
  }
];

export default function MobileHandleiding() {
  const [openSections, setOpenSections] = useState(["inleiding"]);

  const toggleSection = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => setOpenSections(sections.map(s => s.id));
  const collapseAll = () => setOpenSections([]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Handleiding Mobiele App
        </h1>
        <p className="text-slate-500 mt-1">
          Gebruikshandleiding voor de Interdistri TMS mobiele tijdregistratie app
        </p>
      </div>

      {/* Version badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1">
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          Single Day (Dagdienst)
        </Badge>
        <Badge className="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1">
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          Multi Day (Meerdaagse dienst)
        </Badge>
      </div>

      {/* Expand/Collapse buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={expandAll}>
          <ChevronDown className="w-4 h-4 mr-1" /> Alles openen
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <ChevronUp className="w-4 h-4 mr-1" /> Alles sluiten
        </Button>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections.includes(section.id);
          return (
            <Card key={section.id} className={isOpen ? "border-blue-200" : ""}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left"
              >
                <CardHeader className="pb-0 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${section.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {isOpen && (
                <CardContent className="pt-4 px-4 pb-4 text-sm text-slate-700">
                  {section.content}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <Card className="bg-slate-50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-slate-500">
            Heb je nog vragen? Neem contact op met je leidinggevende of stuur een bericht via de app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}