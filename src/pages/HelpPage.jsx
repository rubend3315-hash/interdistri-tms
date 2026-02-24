import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Layers, Users, Clock, CheckSquare, Truck, CalendarDays, Shield, Smartphone, CircleDot, Download, FileText, Building2, FolderKanban, DollarSign, FileSpreadsheet, Mail, Car, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import HelpMobileEntryCard from '../components/help/HelpMobileEntryCard';
import HelpMobileEntryGuide from '../components/help/HelpMobileEntryGuide';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('functions');

  const handleDownloadPDF = () => {
    toast.info('Het document wordt voorbereid voor download...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadHTML = () => {
    const content = document.getElementById('help-content');
    if (!content) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interdistri TMS - Help & Documentatie</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #1e293b; }
    h1 { color: #0f172a; font-size: 2em; margin-top: 1.5em; border-bottom: 2px solid #3b82f6; padding-bottom: 0.3em; }
    h2 { color: #1e293b; font-size: 1.5em; margin-top: 1.2em; }
    h3 { color: #334155; font-size: 1.2em; margin-top: 1em; }
    h4 { color: #475569; font-size: 1em; margin-top: 0.8em; font-weight: 600; }
    ul { margin-left: 20px; }
    li { margin-bottom: 0.5em; }
    .tip { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 1em 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 1em 0; }
    .important { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 1em 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 500; }
    .badge-concept { background: #f1f5f9; color: #475569; }
    .badge-submitted { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    .section { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>📚 Interdistri TMS - Help & Documentatie</h1>
  <p style="color: #64748b; margin-bottom: 2em;">Versie: ${new Date().toLocaleDateString('nl-NL')}</p>
  ${content.innerHTML}
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interdistri_TMS_Documentatie_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('HTML document gedownload');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Help & Documentatie</h1>
          <p className="text-slate-500 mt-2">Leer hoe je het Interdistri TMS-systeem gebruikt</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadHTML} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Download HTML
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Opslaan als PDF
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          h1 { page-break-before: always; }
          h1:first-of-type { page-break-before: avoid; }
        }
      `}</style>

      {/* Security Architectuur link */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Security Architectuur</p>
            <p className="text-xs text-slate-500">Formele beveiligingsdocumentatie — alleen voor Admin</p>
          </div>
        </div>
        <Link to={createPageUrl("SecurityArchitecture")}>
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="w-4 h-4" /> Bekijken
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 no-print">
          <TabsTrigger value="functions" className="gap-2">
            <Zap className="w-4 h-4" />
            Functies
          </TabsTrigger>
          <TabsTrigger value="system-rules" className="gap-2">
            <Shield className="w-4 h-4" />
            Systeemregels
          </TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2">
            <Layers className="w-4 h-4" />
            Opbouw
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Handleiding
          </TabsTrigger>
        </TabsList>

        <div id="help-content">

        {/* SYSTEEMREGELS TAB */}
        <TabsContent value="system-rules" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Systeemregels & Afspraken
              </CardTitle>
              <CardDescription>
                Vastgelegde regels die door het hele systeem worden gehanteerd. Deze regels gelden voor alle rapporten, berekeningen en overzichten.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Weekdefinitie */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Weekdefinitie (ISO 8601)
                </h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <p>
                    <strong>Het systeem werkt altijd met volle ISO-weken:</strong>
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• Een week loopt van <strong>maandag t/m zondag</strong></li>
                    <li>• De weeknummering volgt de <strong>ISO 8601 standaard</strong></li>
                    <li>• Filtering en rapportage gebeurt op basis van het <strong>werkelijke datumbereik</strong> van de week, niet op basis van het kalenderjaar</li>
                    <li>• Dit betekent dat week 1 van een jaar kan starten in december van het vorige jaar (bijv. week 1 van 2026 = 29-12-2025 t/m 04-01-2026)</li>
                    <li>• Alle data die binnen het datumbereik ma-zo valt wordt meegenomen, <strong>ongeacht het kalenderjaar</strong> van de individuele datums</li>
                  </ul>
                </div>
              </div>

              {/* Automatische controles */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Automatische Medewerkercontroles
                </h3>
                <div className="space-y-3 text-sm text-red-800">
                  <p>
                    <strong>Dagelijks om 06:00 wordt automatisch gecontroleerd:</strong>
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• Medewerkers waarvan het <strong>contract is verlopen</strong> worden automatisch op "Uit dienst" gezet</li>
                    <li>• Bijbehorende <strong>contractregels en reiskostenregels</strong> worden automatisch afgesloten</li>
                    <li>• Medewerkers met status "Inactief" of "Uit dienst" <strong>verliezen direct de toegang</strong> tot het systeem</li>
                    <li>• <strong>30 dagen voor contractafloop</strong> ontvangen admins een waarschuwing (urgent bij ≤7 dagen)</li>
                    <li>• Zonder actieve contractregel of reiskostenregel <strong>kunnen geen diensten of ritten worden ingevoerd</strong></li>
                  </ul>
                </div>
              </div>

              {/* Rapportageregels */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Rapportageregels
                </h3>
                <div className="space-y-3 text-sm text-green-800">
                  <ul className="space-y-2 ml-4">
                    <li>• Alle weekrapporten (Medewerkersrapport, PostNL Berekeningen, Loonrapporten) hanteren dezelfde weekdefinitie</li>
                    <li>• Import-data wordt gefilterd op het <strong>datumbereik van de geselecteerde week</strong>, niet op het weeknummerveld uit het bronbestand</li>
                    <li>• Bij cross-year weken worden datums uit beide jaren correct meegenomen</li>
                    <li>• Maandagtarieven worden apart berekend (apart artikel voor stoptarief op maandag)</li>
                  </ul>
                </div>
              </div>

              {/* Naamconventies */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Naamconventies
                </h3>
                <div className="space-y-3 text-sm text-amber-800">
                  <ul className="space-y-2 ml-4">
                    <li>• Chauffeursnamen worden genormaliseerd bij het matchen (komma's worden verwijderd)</li>
                    <li>• "Biersteker, J." en "Biersteker J." worden als dezelfde persoon behandeld</li>
                    <li>• Bij KPI-matching wordt een flexibele vergelijking gebruikt (contains-match)</li>
                  </ul>
                </div>
              </div>

              {/* Data ophalen */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Data ophalen
                </h3>
                <div className="space-y-3 text-sm text-purple-800">
                  <ul className="space-y-2 ml-4">
                    <li>• Grote datasets (bijv. PostNL imports) worden met paginering opgehaald om alle records te laden</li>
                    <li>• Er geldt een maximum van 500 records per batch, met automatisch doorgaan tot alle data geladen is</li>
                    <li>• Deduplicatie vindt plaats op basis van de combinatie: datum + chauffeur + ritnaam + vrijgavetijd</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNCTIES TAB */}
        <TabsContent value="functions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Dashboard
                </CardTitle>
                <CardDescription>Overzicht en statistieken</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Het centrale overzichtscherm waar je op een oogopslag ziet:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Aantal actieve medewerkers en beschikbare voertuigen</li>
                  <li>✓ Uren ter goedkeuring</li>
                  <li>✓ Ritten vandaag</li>
                  <li>✓ Documenten die binnenkort verlopen (rijbewijs, APK, etc.)</li>
                  <li>✓ Recente tijdregistraties</li>
                </ul>
              </CardContent>
            </Card>

            {/* Tijdregistratie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Tijdregistratie
                </CardTitle>
                <CardDescription>Werk- en diensten registreren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer alle uren van medewerkers per week:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Invoer van start- en eindtijd</li>
                  <li>✓ Automatische berekening pauzes</li>
                  <li>✓ Project en klant koppelen</li>
                  <li>✓ Reiskosten en toeslagen</li>
                  <li>✓ Concept / Ingediend / Goedgekeurd statussen</li>
                </ul>
              </CardContent>
            </Card>

            {/* Planning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-green-600" />
                  Planning
                </CardTitle>
                <CardDescription>Roosters en capaciteit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Maak en beheer wekelijkse roosters voor je team:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Per-dag planning (per medewerker)</li>
                  <li>✓ <strong>Tabs per afdeling:</strong> Management, Transport, PD Shift 3/4/5, Charters</li>
                  <li>✓ Route- en voertuigtoewijzing per cel</li>
                  <li>✓ <strong>Opmerkingen:</strong> Twee notitievelden per dag per medewerker</li>
                  <li>✓ <strong>Drag & drop:</strong> Diensten verslepen tussen medewerkers en dagen</li>
                  <li>✓ <strong>Afwezigheid:</strong> Ziek, Verlof, ATV en Opleiding worden automatisch als gekleurde badge getoond in de planningcel (op basis van tijdregistratie)</li>
                  <li>✓ <strong>Feestdagen:</strong> Worden automatisch als paarse badge weergegeven</li>
                  <li>✓ <strong>Vrij-status:</strong> Dagen waarop een medewerker contractueel vrij is tonen "Vrij" badge</li>
                  <li>✓ <strong>Contract-uren:</strong> Uren per dag en totaal per week worden getoond op basis van het actieve contractrooster (week 1/week 2)</li>
                  <li>✓ <strong>Voorplanning:</strong> Genereer automatisch een weekplanning op basis van shift-templates, contractroosters en per-dag shift-keuze</li>
                  <li>✓ <strong>Shift-templates:</strong> Sla per medewerker een voorkeursshift per dag op, laad en bewaar templates</li>
                  <li>✓ Capaciteitsoverzicht per week</li>
                  <li>✓ Routehistorie per medewerker</li>
                  <li>✓ Beschikbaarheidskalender</li>
                  <li>✓ Weken en dagen kopiëren naar andere periodes</li>
                  <li>✓ Export naar PDF</li>
                </ul>
              </CardContent>
            </Card>

            {/* Goedkeuringen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  Goedkeuringen
                </CardTitle>
                <CardDescription>Keur uren goed of af</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer alle ingediende uren voor goedkeuring:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Overzicht ter goedkeuring</li>
                  <li>✓ Goedkeuren of afkeuren</li>
                  <li>✓ Reden afkeuring vastleggen</li>
                  <li>✓ Uren corrigeren met audit trail</li>
                  <li>✓ Historiek van wijzigingen</li>
                  <li>✓ <strong>Tijdoverlap detectie:</strong> Waarschuwing bij overlappende diensten van dezelfde medewerker op dezelfde dag</li>
                </ul>
              </CardContent>
            </Card>

            {/* Ritten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-600" />
                  Ritten
                </CardTitle>
                <CardDescription>Trip- en routebeheer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Log alle ritten en transportgegevens:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Ritten per chauffeur en voertuig</li>
                  <li>✓ Route en kilometers</li>
                  <li>✓ Brandstof en laadgegevens</li>
                  <li>✓ Status volgen (gepland, onderweg, voltooid)</li>
                  <li>✓ Koppeling met klanten en projecten</li>
                  <li>✓ <strong>Tijdoverlap detectie:</strong> Waarschuwing bij overlappende ritten van dezelfde medewerker op dezelfde dag</li>
                </ul>
              </CardContent>
            </Card>

            {/* Medewerkers & Voertuigen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Beheer
                </CardTitle>
                <CardDescription>Medewerkers, voertuigen, regels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Centraal beheer van alle basisgegevens:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Medewerkergegevens en contracten</li>
                  <li>✓ <strong>ID-document:</strong> Nummer en geldigheidsdatum (paspoort/ID-kaart)</li>
                  <li>✓ Voertuigen en onderhoudstermijnen</li>
                  <li>✓ CAO-regels en toeslagen</li>
                  <li>✓ Loontabellen</li>
                  <li>✓ Gebruikers en permissies</li>
                  <li>✓ <strong>Chauffeur-toggle:</strong> Bepaalt of nachttoeslag (21:00-05:00) wordt berekend</li>
                  <li>✓ <strong>Tonen in planner:</strong> Bepaalt of medewerker zichtbaar is in de planning</li>
                  <li>✓ <strong>Opnemen in loonrapport:</strong> Bepaalt of er een loonrapport wordt gegenereerd</li>
                  <li>✓ <strong>Audit Log:</strong> Volledig overzicht van alle systeemwijzigingen</li>
                </ul>
              </CardContent>
            </Card>

            {/* Dienst-Shifttijd */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-red-600" />
                  Dienst-Shifttijd
                </CardTitle>
                <CardDescription>Starttijden per afdeling beheren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer de officiële starttijden per afdeling:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Starttijd per afdeling instellen</li>
                  <li>✓ Geldige shifttijden (van-tot)</li>
                  <li>✓ Berichten voor medewerkers</li>
                  <li>✓ Per datum configureren</li>
                  <li>✓ Zichtbaar in mobiele app</li>
                </ul>
              </CardContent>
            </Card>

            {/* Mobile Entry */}
            <Card>
              <HelpMobileEntryCard />
            </Card>

            {/* Contracten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Contracten
                </CardTitle>
                <CardDescription>Contractbeheer en digitale ondertekening</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer contractgegevens, genereer contracten en laat ze digitaal ondertekenen:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Contractregels met start-/einddatum</li>
                      <li>✓ Loonschaal en uren per week</li>
                      <li>✓ Tweewekelijks roosterschema (week 1/week 2)</li>
                      <li>✓ Reiskostenregels per medewerker</li>
                      <li>✓ <strong>Automatische waarschuwing</strong> 30 dagen voor contractafloop</li>
                      <li>✓ <strong>Automatische uitdiensttreding</strong> bij verlopen contract (contractregels en reiskostenregels worden afgesloten)</li>
                      <li>✓ <strong>Invoerblokkering</strong> bij ontbrekende actieve contractregel of reiskostenregel</li>
                  <li>✓ <strong>Contract genereren</strong> op basis van sjablonen — medewerkergegevens worden automatisch ingevuld</li>
                  <li>✓ <strong>Sjabloon selectie per contracttype</strong> — kies uit actieve sjablonen, standaardsjabloon wordt automatisch voorgeselecteerd</li>
                  <li>✓ <strong>Contractinhoud bewerken</strong> voor verzending</li>
                  <li>✓ <strong>Verzenden ter ondertekening</strong> met automatische e-mail</li>
                  <li>✓ <strong>Digitale handtekening</strong> door medewerker en management</li>
                  <li>✓ <strong>Automatisch uitnodigen</strong> medewerker als app-gebruiker bij verzenden</li>
                  <li>✓ Ondertekeningsflow: Medewerker eerst → Management → Actief</li>
                  <li>✓ Herinneringen versturen voor openstaande contracten</li>
                  <li>✓ Contract sjablonen per contracttype beheren</li>
                  <li>✓ <strong>Contract Analytics:</strong> Statistieken, verdeling per type, proeftijden, verloopdatums en sjabloongebruik</li>
                  <li>✓ <strong>Afgeronde Contracten:</strong> Archief van volledig ondertekende en geactiveerde contracten</li>
                  <li>✓ <strong>Contractwijzigingen:</strong> Wijzigingsaanvragen bijhouden en doorvoeren</li>
                </ul>
              </CardContent>
            </Card>

            {/* Onboarding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  Onboarding
                </CardTitle>
                <CardDescription>Nieuwe medewerkers inwerkproces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Volledige onboarding wizard voor nieuwe medewerkers in 6 stappen:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ <strong>Stap 1 — Persoonsgegevens:</strong> Naam, adres, contact, afdeling, functie en pasfoto invoeren</li>
                  <li>✓ <strong>Stap 2 — Stamkaart:</strong> Rijbewijs, ID-document (incl. geldigheidsdatum), loonschaal uit loontabellen, uurloon, IBAN</li>
                  <li>✓ <strong>Loonheffingsverklaring:</strong> Ja/Nee keuze met datum, digitale handtekening — conform officieel formulier</li>
                  <li>✓ <strong>Stap 3 — Verklaringen:</strong> Ontvangst sleutelkast, sleutelverklaring, GPS Buddy, dienstbetrekking, bedrijfsreglement</li>
                  <li>✓ <strong>Stap 4 — Contract:</strong> Contracttype selecteren, sjabloon kiezen, contract automatisch genereren met medewerkergegevens</li>
                  <li>✓ <strong>Stap 5 — Uitnodigen:</strong> Medewerker uitnodigen voor de mobiele app (e-mail)</li>
                  <li>✓ <strong>Stap 6 — Samenvatting:</strong> Overzicht alle stappen, checklist, handtekening en afronden</li>
                  <li>✓ Stamkaart printen of mailen naar loonadministratie</li>
                  <li>✓ Validatie van verplichte velden per stap</li>
                  <li>✓ Overzicht van alle lopende en afgeronde onboardings</li>
                </ul>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-1">🔐 Architectuur:</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• Onboarding bevat uitsluitend juridische verklaringen (geen concrete pincode).</li>
                    <li>• De sleutelkastverklaring bevestigt verantwoordelijkheid — de pincode wordt afzonderlijk verstrekt.</li>
                    <li>• Operationeel pincodebeheer is losgekoppeld en wordt beheerd via <strong>HRM-instellingen → Pincodebeheer</strong>.</li>
                    <li>• Bij afronden onboarding wordt automatisch een pincode aangemaakt in de KeylockerPincode module.</li>
                  </ul>
                </div>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">📄 Print & PDF bevatten:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>✓ Stamkaart, contract, verklaringen, handtekening</li>
                    <li>✗ Geen sleutelkastpincode</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Stamkaart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  Stamkaart
                </CardTitle>
                <CardDescription>Medewerker stamkaart apart beheren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  De stamkaart is ook los beschikbaar (buiten de onboarding) voor bestaande medewerkers:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Selecteer een medewerker uit het overzicht</li>
                  <li>✓ Alle persoonsgegevens, BSN, IBAN, adres bewerken</li>
                  <li>✓ <strong>ID-document:</strong> Nummer én geldigheidsdatum</li>
                  <li>✓ Rijbewijs, Code 95 en categorieën</li>
                  <li>✓ Loonschaal selectie uit loontabellen met automatisch uurloon</li>
                  <li>✓ <strong>Loonheffingsverklaring:</strong> Ja/Nee met datum en digitale handtekening</li>
                  <li>✓ LKV-beoordeling en financiële situatie</li>
                  <li>✓ <strong>Validatie verplichte velden</strong> (naam, BSN, adres, IBAN, ID-document, etc.)</li>
                  <li>✓ Stamkaart opslaan, printen of e-mailen naar loonadministratie</li>
                  <li>✓ Handig bij wijzigingen in persoonlijke gegevens of verlenging ID-documenten</li>
                </ul>
              </CardContent>
            </Card>

            {/* Klanten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  Klanten
                </CardTitle>
                <CardDescription>Klantbeheer en artikelen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Centraal klantbeheer met uitgebreide opties:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Bedrijfsgegevens, KvK en BTW</li>
                  <li>✓ Artikelen en prijsregels per klant</li>
                  <li>✓ TI-Model routes met normen</li>
                  <li>✓ Excel import van klantdata</li>
                  <li>✓ Berekeningen en omzetoverzicht</li>
                  <li>✓ Import historie en rapportage</li>
                  <li>✓ <strong>PostNL Berekeningen:</strong> Weekrapport, Besteltijd & Uurtarief, Samenvatting en Activiteitenrapport</li>
                  <li>✓ Auto-detectie laatste import — opent direct het rapport</li>
                  <li>✓ Dagfilter in Activiteitenrapport (standaard laatste importdag)</li>
                  <li>✓ Print / PDF export per rapporttype</li>
                </ul>
              </CardContent>
            </Card>

            {/* Projecten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-cyan-600" />
                  Projecten
                </CardTitle>
                <CardDescription>Projectbeheer en -tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer projecten gekoppeld aan klanten:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Projecten per klant aanmaken</li>
                  <li>✓ Budget en looptijd bijhouden</li>
                  <li>✓ Status volgen (Actief, Voltooid, etc.)</li>
                  <li>✓ Koppeling met tijdregistraties en ritten</li>
                  <li>✓ Excel import en datavalidatie</li>
                </ul>
              </CardContent>
            </Card>

            {/* Loonrapport */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Loonrapporten
                </CardTitle>
                <CardDescription>Loonverwerking en rapportages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Genereer overzichten voor loonverwerking:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Weekoverzichten per medewerker</li>
                  <li>✓ Berekening overuren, nachturen, weekenduren</li>
                  <li>✓ Toeslagen conform CAO</li>
                  <li>✓ Reiskostenvergoeding berekening</li>
                  <li>✓ Verblijfskosten en inhoudingen</li>
                  <li>✓ Export naar PDF en e-mail</li>
                </ul>
              </CardContent>
            </Card>

            {/* Loontabellen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  Loontabellen
                </CardTitle>
                <CardDescription>CAO-loontabellen beheren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer loonschalen en uurlonen:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ CAO Beroepsgoederenvervoer tabellen</li>
                  <li>✓ Loonschalen met tredes</li>
                  <li>✓ Uurloon en maandloon</li>
                  <li>✓ Geldig vanaf/tot periodes</li>
                </ul>
              </CardContent>
            </Card>

            {/* CAO-regels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-rose-600" />
                  CAO-regels
                </CardTitle>
                <CardDescription>Toeslagen en vergoedingsregels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Configureer alle CAO-gerelateerde regels:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Bijzondere arbeid toeslagen (nacht, weekend, feestdag)</li>
                  <li>✓ Overwerkvergoedingen en percentages</li>
                  <li>✓ Verblijfskosten en reiskosten</li>
                  <li>✓ Pauzeregels per dienstlengte</li>
                  <li>✓ Prioriteiten en geldigheidsperiodes</li>
                </ul>
              </CardContent>
            </Card>

            {/* HRM-instellingen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  HRM-instellingen
                </CardTitle>
                <CardDescription>Urensoorten, uurcodes, loonadministratie & e-mail sjablonen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Configureer de basis voor tijdregistratie en e-mailcommunicatie:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Urensoorten (Gewerkt, Verlof, ATV, Ziek, etc.)</li>
                  <li>✓ Uurcodes per urensoort</li>
                  <li>✓ Afdelingen en functies beheren</li>
                  <li>✓ Activiteiten (standplaatswerk)</li>
                  <li>✓ Pauzeregels configuratie</li>
                  <li>✓ <strong>Loonadministratie:</strong> Stel het e-mailadres, CC-adres en onderwerp in voor stamkaart-mailings</li>
                  <li>✓ <strong>E-mail Sjablonen:</strong> Beheer de HTML-opmaak van alle automatische systeemmails</li>
                  <li>✓ <strong>Pincodebeheer (Sleutelkast):</strong> Beheer persoonlijke sleutelkastpincodes per medewerker</li>
                </ul>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-2">🔐 Sleutelkastbeheer (Pincodebeheer)</p>
                  <p className="text-xs text-slate-600 mb-2">Beheer van persoonlijke sleutelkastpincodes per medewerker:</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>✓ Automatische aanmaak bij afronden onboarding</li>
                    <li>✓ Handmatig genereren of instellen</li>
                    <li>✓ Wijzigen van bestaande pincode</li>
                    <li>✓ 30 seconden beveiligde weergave</li>
                    <li>✓ Audit logging van alle acties (view, wijzig, aanmaak)</li>
                    <li>✓ Geen zichtbaarheid in print of PDF</li>
                    <li>✓ Geen verzending naar loonadministratie</li>
                  </ul>
                  <p className="text-xs text-slate-600 mt-2 font-medium">Beveiliging:</p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>✓ Alleen zichtbaar voor Admin/HR</li>
                    <li>✓ Elke view en wijziging wordt gelogd</li>
                    <li>✓ Niet zichtbaar in onboarding, print of HR-documenten</li>
                    <li>✓ Verboden pincodes (0000, 1234, etc.) worden geblokkeerd</li>
                    <li>✓ Duplicaatcontrole — elke actieve pincode is uniek</li>
                  </ul>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">📧 Beschikbare e-mail sjablonen:</p>
                  <ul className="text-xs space-y-1 text-blue-800">
                    <li>• <strong>stamkaart</strong> — Stamkaart naar loonadministratie (placeholders: naam, bsn, adres, iban, afdeling, functie, etc.)</li>
                    <li>• <strong>welkomstmail</strong> — Welkomstmail nieuwe medewerker (placeholders: naam, email)</li>
                    <li>• <strong>contract_ter_ondertekening</strong> — Contract ter ondertekening verzenden (placeholders: naam, contractnummer, startdatum, einddatum, functie)</li>
                    <li>• <strong>dienst_afgekeurd</strong> — Dienst afgekeurd notificatie (placeholders: naam, datum, starttijd, eindtijd, reden, link)</li>
                    <li>• <strong>contract_ondertekend_door_medewerker</strong> — Melding aan admin na ondertekening (placeholders: naam, contractnummer, admin_naam)</li>
                    <li>• <strong>contract_geactiveerd</strong> — Bevestiging aan medewerker na activering (placeholders: naam, contractnummer)</li>
                    <li>• <strong>nieuw_document</strong> — Nieuw HR-document beschikbaar (placeholders: naam, document_naam, document_type, vervaldatum)</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">💡 Gebruik {"{{placeholder}}"} syntax in je sjablonen. Als er geen sjabloon is, wordt het standaard systeem-sjabloon gebruikt.</p>
                </div>
              </CardContent>
            </Card>

            {/* Communicatie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-600" />
                  Communicatie
                </CardTitle>
                <CardDescription>Berichten, e-mails & sjablonen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Communiceer met medewerkers via interne berichten en e-mail:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Interne berichten sturen naar medewerkers</li>
                  <li>✓ Prioriteit instellen (Normaal, Hoog, Urgent)</li>
                  <li>✓ Gelezen/ongelezen status</li>
                  <li>✓ Welkomstberichten per afdeling</li>
                  <li>✓ Zichtbaar in mobiele app</li>
                  <li>✓ <strong>E-mail verzenden:</strong> Stuur e-mails naar individuele medewerkers of in bulk per afdeling via Gmail</li>
                  <li>✓ <strong>Reply-To adres:</strong> Stel een antwoordadres in (bijv. info@interdistri.nl) zodat antwoorden naar het juiste adres gaan</li>
                  <li>✓ <strong>E-mail sjablonen (berichten):</strong> Maak herbruikbare sjablonen aan met onderwerp, inhoud en standaard Reply-To adres</li>
                  <li>✓ <strong>Sjabloon categorieën:</strong> Organiseer sjablonen per categorie (Algemeen, HR, Planning, Contract, Overig)</li>
                  <li>✓ <strong>Rich text editor:</strong> Maak e-mails op met opmaak (vet, cursief, lijsten, etc.)</li>
                </ul>
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <strong>Let op:</strong> Naast de berichtensjablonen hierboven zijn er ook <strong>systeem e-mail sjablonen</strong> (welkomstmail, stamkaart, contract, afkeuring, etc.). 
                    Deze beheer je via <strong>HRM-instellingen → E-mail Sjablonen</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Charters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-violet-600" />
                  Charters
                </CardTitle>
                <CardDescription>Charterbeheer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer charter opdrachten:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Charter overzicht en planning</li>
                  <li>✓ Koppeling met voertuigen en chauffeurs</li>
                  <li>✓ Klant- en routegegevens</li>
                </ul>
              </CardContent>
            </Card>

            {/* Voertuigen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-amber-600" />
                  Voertuigen
                </CardTitle>
                <CardDescription>Wagenpark beheer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer je complete wagenpark:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Kenteken, merk, model en bouwjaar</li>
                  <li>✓ Brandstoftype (Diesel, Elektrisch, Hybride, etc.)</li>
                  <li>✓ APK, verzekering en tachograaf vervaldatums</li>
                  <li>✓ Voertuiginspecties met foto's</li>
                  <li>✓ NIWO vergunningen koppeling</li>
                  <li>✓ Status monitoring (Beschikbaar, In onderhoud, etc.)</li>
                  <li>✓ <strong>Onderhoud:</strong> Onderhoudshistorie, kosten en facturen bijhouden</li>
                  <li>✓ <strong>Leasecontracten:</strong> Leasemaatschappij, looptijd, maandbedrag, km-limiet en document-upload</li>
                </ul>
              </CardContent>
            </Card>

            {/* NIWO Vergunningen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  NIWO Vergunningen
                </CardTitle>
                <CardDescription>Eurovergunningen beheer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer NIWO vergunningen:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Vergunningsnummers en geldigheid</li>
                  <li>✓ Toewijzing aan voertuigen</li>
                  <li>✓ Status (Beschikbaar, Toegewezen, Verlopen)</li>
                  <li>✓ Vervaldatum monitoring</li>
                </ul>
              </CardContent>
            </Card>

            {/* Resultaat & Ontwikkeling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pink-600" />
                  Resultaat & Ontwikkeling
                </CardTitle>
                <CardDescription>Beoordelingen en ontwikkeling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer beoordelingen en ontwikkeling van medewerkers:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Periodieke beoordelingen</li>
                  <li>✓ Notities en ontwikkelafspraken</li>
                  <li>✓ PDF generatie van beoordelingen</li>
                </ul>
              </CardContent>
            </Card>

            {/* Back-ups & Beheer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Back-ups & Datamigratie
                </CardTitle>
                <CardDescription>Gegevensbeveiliging, Supabase sync en migratie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Bescherm en migreer je data met meerdere backup-strategieën:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ <strong>Handmatige back-ups:</strong> Per entity opgeslagen met download en per-entity herstel</li>
                  <li>✓ <strong>Volledig herstel:</strong> Herstel alle data of één specifieke entity uit een backup</li>
                  <li>✓ <strong>Export naar Supabase:</strong> Exporteer alle 42 entities naar een externe Supabase PostgreSQL database als tweede backup-laag</li>
                  <li>✓ <strong>Herstel vanuit Supabase:</strong> Importeer data terug uit Supabase als primaire backup niet beschikbaar is</li>
                  <li>✓ <strong>Genereer Supabase SQL:</strong> Automatisch CREATE TABLE statements genereren voor alle entities — kopieer en plak in Supabase SQL Editor</li>
                  <li>✓ <strong>Datamigratie tools:</strong> Migreer data tussen omgevingen</li>
                  <li>✓ <strong>Test database:</strong> Aparte productie- en testomgeving</li>
                </ul>
              </CardContent>
            </Card>

            {/* Gebruikers & Permissies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Gebruikers & Permissies
                </CardTitle>
                <CardDescription>Toegangsbeheer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer wie wat mag zien en doen:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Gebruikers uitnodigen en beheren</li>
                  <li>✓ Rollen: Admin en Gebruiker</li>
                  <li>✓ Permissies per pagina/module</li>
                  <li>✓ Mobiele app type toewijzing (standaard/meerdaags)</li>
                  <li>✓ <strong>Welkomstmail via Gmail:</strong> Bij uitnodigen van een medewerker via de Gebruikers-pagina wordt automatisch een Interdistri welkomstmail verzonden via Gmail</li>
                  <li>✓ <strong>CC naar admin:</strong> Elke welkomstmail bevat een CC naar ruben@interdistri.nl zodat je een kopie ontvangt</li>
                  <li>✓ <strong>Voorwaarde:</strong> De welkomstmail wordt alleen verstuurd als je een medewerker selecteert uit de lijst (niet bij handmatig ingevoerd e-mailadres zonder gekoppelde medewerker)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OPBOUW TAB */}
        <TabsContent value="architecture" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hoe het systeem werkt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">🏗️ Architectuur</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Het Interdistri TMS bestaat uit drie hoofdlagen:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Frontend</h4>
                    <p className="text-sm text-blue-700">
                      React-applicatie met gebruikersinterface. Je ziet hier alle pagina's en formulieren.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Database</h4>
                    <p className="text-sm text-green-700">
                      Alle gegevens (medewerkers, uren, ritten, voertuigen) worden opgeslagen in entities.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">Backend</h4>
                    <p className="text-sm text-purple-700">
                      Verwerkingslogica voor geavanceerde berekeningen en integraties.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">📊 Entities (Gegevenstructuur)</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Het systeem organiseert gegevens in de volgende entiteiten:
                </p>
                <Accordion type="single" collapsible>
                  <AccordionItem value="employee">
                    <AccordionTrigger>👤 Employee - Medewerkers</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Persoonlijke gegevens, contracten, rijbewijs, loonschaal, afdeling, ID-document (nummer + geldigheidsdatum), loonheffingsverklaring (ja/nee + datum + handtekening).
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="onboarding-process">
                    <AccordionTrigger>🚀 OnboardingProcess - Onboarding</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Vastlegging van het onboardingproces per medewerker: huidige stap, status, verklaringen, contract, uitnodiging en handtekening. Pincode wordt niet opgeslagen — beheer via KeylockerPincode.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="keylocker-pincode">
                    <AccordionTrigger>🔐 KeylockerPincode - Sleutelkastpincodes</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Beveiligde opslag van persoonlijke sleutelkastpincodes per medewerker. Losgekoppeld van onboarding. Audit logging op elke view en wijziging. Beheer via HRM-instellingen → Pincodebeheer.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="contract">
                    <AccordionTrigger>📝 Contract - Contracten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Contractgegevens per medewerker: type, start-/einddatum, uurloon, afdeling, contractinhoud (HTML), ondertekeningen (medewerker + management), status (Concept → Ter Ondertekening → Actief).
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="contract-template">
                    <AccordionTrigger>📋 ContractTemplate - Contract Sjablonen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Sjablonen per contracttype met placeholders die automatisch worden ingevuld. Markeer één sjabloon als standaard per type.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="completed-contract">
                    <AccordionTrigger>✅ CompletedContract - Afgeronde Contracten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Archief van volledig ondertekende en geactiveerde contracten, met data van ondertekening door medewerker en management.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="timeentry">
                    <AccordionTrigger>⏱️ TimeEntry - Tijdregistraties</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Start- en eindtijd, pauzes, totaal uren, overwerk, project, klant, status (Concept/Ingediend/Goedgekeurd/Afgekeurd).
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="trip">
                    <AccordionTrigger>🚚 Trip - Ritten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Routegegevens, kilometers, brandstof, laadgegevens, voertuig, chauffeur, klant.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="schedule">
                    <AccordionTrigger>📅 Schedule - Roosters</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Wekelijkse roosters per medewerker (per dagtype: Dag, Avond, Nacht, Vrij, Verlof, Ziek), voertuig- en routetoewijzing.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="vehicle">
                    <AccordionTrigger>🚗 Vehicle - Voertuigen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Kenteken, merk, model, brandstoftype, APK-vervaldatum, verzekering, tachograaf, status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="customer">
                    <AccordionTrigger>🏢 Customer - Klanten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Bedrijfsgegevens, contactpersonen, KvK-nummer, BTW-nummer, betalingstermijn.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="project">
                    <AccordionTrigger>📂 Project - Projecten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Projectnaam, klant, startdatum, einddatum, budget, status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cao">
                    <AccordionTrigger>📋 CaoRule - CAO-regels</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Toeslagen, vergoedingen, werktijdregels en pauzeregels volgens de CAO.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="shifttime">
                    <AccordionTrigger>🚨 ShiftTime - Dienst-Shifttijd</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Officiële starttijden per afdeling, geldige shifttijden, en berichten voor medewerkers per werkdag.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="vehicle-inspection">
                    <AccordionTrigger>🔍 VehicleInspection - Voertuiginspecties</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Inspectiegegevens per voertuig: checklist items, schade-omschrijving, foto's, handtekening en status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="expense">
                    <AccordionTrigger>💰 Expense - Declaraties</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Kosten en declaraties per medewerker: brandstof, parkeren, tol, maaltijden, met bonnen/facturen en goedkeuringsstatus.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="niwo">
                    <AccordionTrigger>📄 NiwoPermit - NIWO Vergunningen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Eurovergunningen met vergunningsnummer, geldigheid, toewijzing aan voertuigen en status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="salary-table">
                    <AccordionTrigger>💵 SalaryTable - Loontabellen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        CAO-loontabellen met loonschalen, tredes, uurloon, maandloon en geldigheidsperiodes.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="holiday">
                    <AccordionTrigger>🎄 Holiday - Feestdagen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Nationale feestdagen per jaar, gebruikt voor berekening van feestdagtoeslagen.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="message">
                    <AccordionTrigger>✉️ Message - Berichten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Interne berichten tussen medewerkers met onderwerp, inhoud, prioriteit en gelezen-status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="email-template">
                    <AccordionTrigger>📧 EmailTemplate - E-mail Sjablonen</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-slate-600 space-y-2">
                        <p>
                          Er zijn twee soorten e-mail sjablonen in het systeem:
                        </p>
                        <p><strong>1. Bericht-sjablonen</strong> (via Berichten pagina): Herbruikbare sjablonen met naam, onderwerp, HTML-inhoud, Reply-To adres en categorie voor handmatige e-mails naar medewerkers.</p>
                        <p><strong>2. Systeem-sjablonen</strong> (via HRM-instellingen → E-mail Sjablonen): Sjablonen met een <code>template_key</code> die automatisch worden gebruikt door systeemfuncties. Gebruik {"{{placeholder}}"} syntax voor dynamische waarden.</p>
                        <p className="mt-2"><strong>Beschikbare systeem template_keys:</strong></p>
                        <ul className="ml-4 space-y-1">
                          <li>• <code>stamkaart</code> — Stamkaart naar loonadministratie</li>
                          <li>• <code>welkomstmail</code> — Welkomstmail nieuwe medewerker</li>
                          <li>• <code>contract_ter_ondertekening</code> — Contract verzenden ter ondertekening</li>
                          <li>• <code>dienst_afgekeurd</code> — Notificatie bij afkeuring dienst</li>
                          <li>• <code>contract_ondertekend_door_medewerker</code> — Melding aan admin</li>
                          <li>• <code>contract_geactiveerd</code> — Bevestiging aan medewerker</li>
                          <li>• <code>nieuw_document</code> — Nieuw HR-document beschikbaar</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="supervisor-message">
                    <AccordionTrigger>📢 SupervisorMessage - Welkomstberichten</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Welkomstberichten van managers, per afdeling of specifieke medewerker, met geldigheidsperiode. Getoond op het startscherm van de mobiele app.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="article">
                    <AccordionTrigger>📦 Article - Artikelen</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Artikelen per klant met artikelnummer, omschrijving, eenheid en prijsregels met geldigheidsperiodes.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="timodel-route">
                    <AccordionTrigger>🛣️ TIModelRoute - TI-Model Routes</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Routemodellen per klant: ritcode, ritnaam, rittijd, aantal stops, norm per uur en geldigheidsperiode.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="customer-import">
                    <AccordionTrigger>📥 CustomerImport - Klant Imports</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Geïmporteerde Excel-data per klant met kolomtoewijzing, berekende omzetgegevens en status.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="notification">
                    <AccordionTrigger>🔔 Notification - Notificaties</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Systeemnotificaties voor gebruikers, gegenereerd bij aflopende documenten, goedkeuringen en andere events.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="break-schedule">
                    <AccordionTrigger>☕ BreakSchedule - Pauzeregels</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-slate-600">
                        Configureerbare pauzeregels op basis van het aantal gewerkte uren per dienst.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  </Accordion>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">🔄 Statusverloop</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tijdregistraties doorlopen verschillende statussen:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-slate-100 text-slate-700">Concept</Badge>
                    <p className="text-sm text-slate-600">Nog niet ingediend, medewerker bewerkt nog</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-100 text-amber-700">Ingediend</Badge>
                    <p className="text-sm text-slate-600">Wacht op goedkeuring door manager</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-100 text-emerald-700">Goedgekeurd</Badge>
                    <p className="text-sm text-slate-600">Geaccepteerd en afgerond</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-700">Afgekeurd</Badge>
                    <p className="text-sm text-slate-600">Geweigerd met reden, terug naar Concept</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HANDLEIDING TAB */}
        <TabsContent value="guide" className="space-y-6 mt-6">
          <Accordion type="single" collapsible>
            {/* Tijdregistratie Handleiding */}
            <AccordionItem value="timetracking-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Clock className="w-4 h-4 mr-2" />
                Hoe gebruik ik Tijdregistratie?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. De wekelijks weergave</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Navigeer naar de gewenste week. Je ziet alle medewerkers en hun uren per dag.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Een uur toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op "Uur toevoegen" knop</li>
                      <li>• Selecteer medewerker, datum, start- en eindtijd</li>
                      <li>• Kies dienst type (Dag, Avond, Nacht, etc.)</li>
                      <li>• Voeg optioneel project, klant en kosten toe</li>
                      <li>• Sla op als "Concept" of dien direct in</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Uur bewerken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op het uur in de tabel</li>
                      <li>• Wijzig de gegevens</li>
                      <li>• Voeg een opmerking toe (optioneel)</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Status veranderen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Concept → Ingediend:</strong> Uur klaar voor goedkeuring</li>
                      <li>• <strong>Ingediend → Concept:</strong> Terugtrekken voor wijzigingen</li>
                      <li>• <strong>Afgekeurd → Concept:</strong> Opnieuw bewerken</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> De pauze wordt automatisch berekend op basis van de totale werktijd. Je kunt dit handmatig aanpassen.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Planning Handleiding */}
            <AccordionItem value="planning-guide">
              <AccordionTrigger className="text-base font-semibold">
                <CalendarDays className="w-4 h-4 mr-2" />
                Hoe plan ik roosters?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Planning openen</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Ga naar Planning en selecteer de week en jaar die je wilt plannen. Gebruik de tabs bovenaan om te schakelen tussen afdelingen: Management, Transport, PD Shift 3/4/5 en Charters.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Diensten toekennen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op een cel in het planningscherm om de shift-dialoog te openen</li>
                      <li>• Selecteer tijdblokken (Dag, Avond, Nacht) of speciale types (Stand-by, Opleiding)</li>
                      <li>• Wijs een route en voertuig toe</li>
                      <li>• Voeg opmerkingen toe (twee velden beschikbaar)</li>
                      <li>• Kies optioneel een geplande afdeling als de medewerker op een andere afdeling wordt ingezet</li>
                      <li>• Kopieer de dienst naar meerdere dagen in één keer</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Afwezigheid en vrije dagen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Ziek, Verlof, ATV, Opleiding:</strong> Worden automatisch als gekleurde badge getoond wanneer een bijbehorende tijdregistratie bestaat</li>
                      <li>• <strong>Feestdagen:</strong> Worden automatisch als paarse "Feestdag" badge weergegeven</li>
                      <li>• <strong>Vrij:</strong> Dagen waarop de medewerker contractueel vrij is tonen een "Vrij" badge</li>
                      <li>• Afwezigheidsbadges overrulen de geplande shift visueel — de shift blijft opgeslagen</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Drag & drop</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Versleep diensten tussen cellen via het grip-icoon links van de shift-badge</li>
                      <li>• Sleep beschikbare voertuigen en routes vanuit het "Beschikbare middelen" paneel onder de planning</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">5. Voorplanning genereren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op <strong>"Voorplanning"</strong> om automatisch diensten in te vullen</li>
                      <li>• Wijs per medewerker per dag een shift toe (Dag, Avond, Nacht, etc.)</li>
                      <li>• PakketDistributie-medewerkers krijgen per dag een Shift-keuze (Shift 3/4/5)</li>
                      <li>• De contractroosters (even/oneven week) worden getoond zodat je weet welke dagen werkdagen zijn</li>
                      <li>• <strong>Templates opslaan:</strong> Bewaar je shift-keuzes als template voor hergebruik</li>
                      <li>• <strong>Templates laden:</strong> Laad eerder opgeslagen templates voor snelle planning</li>
                      <li>• Bestaande ingevulde cellen worden niet overschreven</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">6. Week en dag kopiëren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Week kopiëren:</strong> Kopieer de hele planning naar een andere week (optioneel meerdere weken tegelijk, met keuze routes/voertuigen/opmerkingen)</li>
                      <li>• <strong>Dag kopiëren:</strong> Kopieer één specifieke dag naar andere dagen in dezelfde week</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">7. Extra tabs</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Capaciteit & Bezetting:</strong> Visueel overzicht van bezettingsgraad, werkende/afwezige medewerkers per dag</li>
                      <li>• <strong>Routehistorie:</strong> Zoek en filter welke routes een medewerker eerder heeft gereden</li>
                      <li>• <strong>Beschikbaarheid:</strong> Weekkalender met beschikbaarheidsstatus per chauffeur</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      💡 <strong>Tip:</strong> Gebruik de PDF export om planning af te drukken of te delen. Contract-uren worden per dag en per week getoond.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Goedkeuringen Handleiding */}
            <AccordionItem value="approvals-guide">
              <AccordionTrigger className="text-base font-semibold">
                <CheckSquare className="w-4 h-4 mr-2" />
                Hoe keur ik uren goed of af?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Het goedkeuringsproces bevat drie stappen: bekijken, goedkeuren/afkeuren, en eventueel corrigeren. 
                      Alle wijzigingen worden gelogd in een audit trail voor controle en naleving.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. Ingediende uren bekijken</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Ga naar <strong>"Goedkeuringen"</strong> en bekijk het tabblad <strong>"Ter goedkeuring"</strong>. Hier staan alle ingediende tijdregistraties die wachten op goedkeuring.
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• De tabel toont medewerker, datum, uren, project en klant</li>
                      <li>• Klik op <strong>"Bekijken"</strong> om alle details te zien</li>
                      <li>• Controleer start-/eindtijd, pauze, totaal uren en berekeningen</li>
                      <li>• Bekijk opmerkingen, gekoppelde projecten en eventuele kosten</li>
                      <li>• Check ritten en verblijfskosten indien van toepassing</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Uren goedkeuren</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Als alle gegevens correct zijn, keur je de tijdregistratie goed:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op de knop <strong>"Goedkeuren"</strong></li>
                      <li>• Bevestig de actie in de dialoog</li>
                      <li>• De status verandert automatisch naar <strong>"Goedgekeurd"</strong></li>
                      <li>• De tijdregistratie verdwijnt uit het "Ter goedkeuring" tabblad</li>
                      <li>• Je vindt het terug in het tabblad <strong>"Goedgekeurd"</strong></li>
                      <li>• De medewerker ziet de goedkeuring in zijn overzicht</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Uren afkeuren</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Als de tijdregistratie onjuist is of aanpassing nodig heeft, keur je deze af:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op de knop <strong>"Afkeuren"</strong></li>
                      <li>• Een dialoog verschijnt waar je een <strong>reden moet opgeven</strong> (verplicht veld)</li>
                      <li>• Wees duidelijk in je reden, bijvoorbeeld:
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>→ "Eindtijd klopt niet, je was eerder klaar"</li>
                          <li>→ "Pauze niet correct ingevoerd"</li>
                          <li>→ "Verkeerd project gekoppeld"</li>
                          <li>→ "Overwerk niet vooraf goedgekeurd"</li>
                        </ul>
                      </li>
                      <li>• Na bevestiging verandert de status naar <strong>"Afgekeurd"</strong></li>
                      <li>• De tijdregistratie gaat automatisch terug naar <strong>"Concept"</strong> status</li>
                      <li>• De medewerker ontvangt automatisch een <strong>e-mail</strong> met:
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>→ Melding dat de uren zijn afgekeurd</li>
                          <li>→ De reden die jij hebt opgegeven</li>
                          <li>→ Details van de afgekeurde tijdregistratie</li>
                          <li>→ Instructie om de uren te corrigeren en opnieuw in te dienen</li>
                        </ul>
                      </li>
                      <li>• De medewerker kan nu de tijdregistratie corrigeren en opnieuw indienen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Uren corrigeren (met audit trail)</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Als manager kun je ook zelf tijdregistraties aanpassen. Alle wijzigingen worden automatisch gelogd:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op <strong>"Bekijken"</strong> en dan op <strong>"Bewerken"</strong></li>
                      <li>• Wijzig de benodigde velden (start-/eindtijd, pauze, project, etc.)</li>
                      <li>• Scroll naar beneden en vul het veld <strong>"Reden voor correctie"</strong> in (verplicht)</li>
                      <li>• Bijvoorbeeld: "Eindtijd gecorrigeerd op basis van werkbon"</li>
                      <li>• Klik op <strong>"Opslaan"</strong></li>
                      <li>• De wijziging wordt automatisch opgeslagen in de <strong>edit_history</strong>:
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>→ Wie de wijziging heeft gemaakt</li>
                          <li>→ Wanneer de wijziging is gemaakt</li>
                          <li>→ De opgegeven reden</li>
                          <li>→ Originele waarden (voor vergelijking)</li>
                          <li>→ Nieuwe waarden</li>
                        </ul>
                      </li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">5. Correctie geschiedenis bekijken</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Je kunt alle wijzigingen aan een tijdregistratie terugzien:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Open de tijdregistratie via "Bekijken"</li>
                      <li>• Scroll naar beneden naar het gedeelte <strong>"Correctie Geschiedenis"</strong></li>
                      <li>• Hier zie je alle wijzigingen chronologisch geordend</li>
                      <li>• Per wijziging zie je: datum, wie, reden en wat er is gewijzigd</li>
                      <li>• Dit zorgt voor volledige transparantie en traceerbaarheid</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">6. Goedgekeurde uren beheren</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Ga naar het tabblad <strong>"Goedgekeurd"</strong> om alle goedgekeurde tijdregistraties te zien:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Filter op week, maand of medewerker</li>
                      <li>• Bekijk totalen en overzichten</li>
                      <li>• Exporteer naar Excel voor loonverwerking</li>
                      <li>• Goedgekeurde uren kunnen indien nodig nog steeds aangepast worden (met audit trail)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700 font-medium mb-2">
                      💡 Belangrijk om te onthouden:
                    </p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• <strong>Afkeuren</strong> stuurt automatisch een e-mail naar de medewerker met jouw reden</li>
                      <li>• Afgekeurde uren gaan terug naar <strong>"Concept"</strong> zodat de medewerker kan corrigeren</li>
                      <li>• Alle wijzigingen door managers worden <strong>gelogd in de audit trail</strong></li>
                      <li>• Een reden opgeven bij afkeuren of corrigeren is <strong>verplicht</strong></li>
                      <li>• De correctie geschiedenis is <strong>altijd zichtbaar</strong> voor controle en naleving</li>
                      <li>• <strong>Tijdoverlap detectie:</strong> Bij overlappende diensten van dezelfde medewerker op dezelfde dag wordt een oranje waarschuwing getoond met de tijden van de conflicterende dienst(en)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                    <p className="text-sm text-blue-700 font-medium mb-2">
                      ✅ Werkwijze tips:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Keur uren tijdig goed om vertraging in de loonverwerking te voorkomen</li>
                      <li>• Wees specifiek in je afkeuringsreden zodat de medewerker weet wat te corrigeren</li>
                      <li>• Gebruik de audit trail om patronen of terugkerende fouten te signaleren</li>
                      <li>• Check bij twijfel altijd de ritten en werkbonnen voordat je goedkeurt</li>
                      <li>• Communiceer met medewerkers bij onduidelijkheden voordat je afkeurt</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Medewerkers Handleiding */}
            <AccordionItem value="employees-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Users className="w-4 h-4 mr-2" />
                Hoe beheer ik medewerkers?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Medewerker toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar "Medewerkers"</li>
                      <li>• Klik "Medewerker toevoegen"</li>
                      <li>• Vul persoonlijke gegevens in</li>
                      <li>• Voeg contact-, contract- en voertuiggegevens toe</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Belangrijke velden</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Personeelsnummer:</strong> Unieke ID</li>
                      <li>• <strong>Afdeling:</strong> Management, Transport, PakketDistributie, Charters</li>
                      <li>• <strong>Contracttype:</strong> Vast, Tijdelijk, Oproep, Uitzend</li>
                      <li>• <strong>Contract uren:</strong> Uren per week</li>
                      <li>• <strong>Rijbewijs:</strong> Categorieën en vervaldatum</li>
                      <li>• <strong>Chauffeur:</strong> Aan/uit — bepaalt of nachttoeslag (21:00-05:00) berekend wordt</li>
                      <li>• <strong>Tonen in planner:</strong> Aan/uit — medewerker wordt niet getoond in de planning als dit uitstaat</li>
                      <li>• <strong>Opnemen in loonrapport:</strong> Aan/uit — geen loonrapport als dit uitstaat</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Status beheren</h4>
                    <p className="text-sm text-slate-600">
                      Status kan zijn: Actief, Inactief, of Uit dienst. Dit bepaalt of de medewerker zichtbaar is in planningen en tijdregistraties.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Automatische uitdiensttreding</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Het systeem voert elke ochtend (06:00) automatisch de volgende controles uit:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Contract verlopen:</strong> Als de contracteinddatum is gepasseerd, wordt de medewerker automatisch op <strong>"Uit dienst"</strong> gezet</li>
                      <li>• <strong>Contractregels afsluiten:</strong> Actieve contractregels worden automatisch beëindigd op de uitdienstdatum</li>
                      <li>• <strong>Reiskostenregels afsluiten:</strong> Actieve reiskostenregels worden automatisch beëindigd op de uitdienstdatum</li>
                      <li>• <strong>Toegang geblokkeerd:</strong> Medewerkers met status "Inactief" of "Uit dienst" worden automatisch uitgelogd en hebben geen toegang meer</li>
                      <li>• <strong>Notificatie:</strong> Admins ontvangen een melding bij automatische uitdiensttreding</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">5. Tijdige waarschuwingen aflopende contracten</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>30 dagen voor afloop:</strong> Admins ontvangen een melding dat het contract binnenkort afloopt</li>
                      <li>• <strong>≤ 7 dagen:</strong> Melding krijgt urgente prioriteit</li>
                      <li>• Maximaal 1 waarschuwing per week per medewerker om spam te voorkomen</li>
                      <li>• Bevat het aantal resterende dagen en de einddatum</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">6. Invoerblokkering bij verlopen contract/reiskosten</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Bij het invoeren van <strong>diensten</strong> (Tijdregistratie) wordt gecontroleerd of er een actieve contractregel bestaat voor de geselecteerde datum</li>
                      <li>• Bij het invoeren van <strong>ritten</strong> wordt dezelfde controle uitgevoerd</li>
                      <li>• Als er geen actieve contractregel is, wordt de invoer <strong>geblokkeerd</strong> met een duidelijke melding</li>
                      <li>• Ook het ontbreken van een actieve reiskostenregel wordt gemeld</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700">
                      💡 <strong>Tip:</strong> Vergeet niet rijbewijs en vervaldatum op te geven, deze worden gemonitord voor vervaldatums.
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      ⚠️ <strong>Belangrijk:</strong> Zorg ervoor dat contractregels en reiskostenregels tijdig worden verlengd. Zonder actieve regels kunnen er geen diensten of ritten worden ingevoerd voor de medewerker.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Voertuigen Handleiding */}
            <AccordionItem value="vehicles-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Truck className="w-4 h-4 mr-2" />
                Hoe beheer ik voertuigen?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Voertuig toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar "Voertuigen"</li>
                      <li>• Klik "Voertuig toevoegen"</li>
                      <li>• Vul kenteken, merk en model in</li>
                      <li>• Voeg vervaldatums in (APK, verzekering, tachograaf)</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Status controleren</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Status kan zijn: Beschikbaar, In gebruik, In onderhoud, Defect, Uit dienst
                    </p>
                    <p className="text-sm text-slate-600">
                      Dit bepaalt of het voertuig kan gebruikt worden voor planning en ritten.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Vervaldatums monitoren</h4>
                    <p className="text-sm text-slate-600">
                      Op het Dashboard zie je alle documenten die binnen 30 dagen vervallen.
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700">
                      💡 <strong>Tip:</strong> Bijhouden van APK en verzekering is wettelijk verplicht. Het systeem herinnert je wanneer deze vervallen.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Dienst-Shifttijd Handleiding */}
            <AccordionItem value="shifttime-guide">
              <AccordionTrigger className="text-base font-semibold">
                <CircleDot className="w-4 h-4 mr-2" />
                Hoe gebruik ik Dienst-Shifttijd?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Dienst-Shifttijd instellen</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Ga naar "Dienst-Shifttijd" om de officiële starttijden per afdeling in te stellen.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Shifttijd toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik "Shifttijd toevoegen" knop</li>
                      <li>• Selecteer de datum</li>
                      <li>• Kies de afdeling (Management, Transport, PakketDistributie, Charters)</li>
                      <li>• Voer de service starttijd in</li>
                      <li>• Optioneel: voeg geldige shifttijden toe (van-tot)</li>
                      <li>• Optioneel: voeg een bericht toe voor medewerkers</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Shifttijd bewerken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Zoek de shifttijd in de lijst</li>
                      <li>• Klik erop om details te openen</li>
                      <li>• Wijzig de gegevens</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Shifttijd verwijderen</h4>
                    <p className="text-sm text-slate-600">
                      Klik op de shifttijd en kies "Verwijderen". Dit kan altijd ongedaan gemaakt worden.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">5. In de mobiele app</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Medewerkers zien de shifttijd op hun mobiele app:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Automatisch weergegeven in geel/amber blok in header</li>
                      <li>• Toont service starttijd voor vandaag of volgende werkdag (na 12:00 uur)</li>
                      <li>• Eventueel bericht wordt weergegeven</li>
                      <li>• Helpt medewerkers op tijd aan de slag te gaan</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      💡 <strong>Tip:</strong> Stel de shifttijd in voordat medewerkers hun dienst starten. Dit zorgt ervoor dat ze direct kunnen zien wanneer hun dienst start.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Mobile Entry Handleiding */}
            <HelpMobileEntryGuide />

            {/* Onboarding Handleiding */}
            <AccordionItem value="onboarding-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Users className="w-4 h-4 mr-2" />
                Hoe werkt de Onboarding?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      De onboarding wizard begeleidt je door alle stappen om een nieuwe medewerker volledig in het systeem op te nemen. Van persoonsgegevens tot contract en app-uitnodiging.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 1 — Persoonsgegevens</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Voornaam, achternaam, tussenvoegsel, voorletters</li>
                      <li>• E-mail, telefoon, geboortedatum, BSN</li>
                      <li>• Adres, postcode, woonplaats</li>
                      <li>• Afdeling en functie selecteren</li>
                      <li>• Pasfoto uploaden</li>
                      <li>• Verplichte velden worden gecontroleerd</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 2 — Stamkaart</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Rijbewijsnummer, categorieën en vervaldatums</li>
                      <li>• <strong>ID-document:</strong> Nummer én geldigheidsdatum (verplicht)</li>
                      <li>• Code 95 vervaldatum</li>
                      <li>• Contracttype, uren per week</li>
                      <li>• <strong>Loonschaal:</strong> Kies uit loontabellen — uurloon wordt automatisch ingevuld</li>
                      <li>• IBAN bankrekening</li>
                      <li>• <strong>Loonheffingsverklaring:</strong> Ja/Nee met datum, conform officieel formulier</li>
                      <li>• Digitale handtekening in handtekeningvak</li>
                      <li>• LKV-beoordeling en financiële bijzonderheden</li>
                      <li>• Stamkaart printen of e-mailen naar loonadministratie</li>
                      <li>• <strong>Verplichte velden worden gecontroleerd</strong> bij "Volgende"</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 3 — Verklaringen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Ontvangstverklaring sleutelkast:</strong> Verantwoordelijkheidsverklaring — geen concrete pincode zichtbaar</li>
                      <li>• <strong>Sleutelverklaring:</strong> Sleutelnummer en toegang vastleggen</li>
                      <li>• <strong>GPS Buddy toestemming:</strong> Akkoord voor GPS-tracking</li>
                      <li>• <strong>Verklaring dienstbetrekking:</strong> Bevestiging dienstverband</li>
                      <li>• <strong>Bedrijfsreglement:</strong> Ontvangst bevestigen</li>
                      <li>• Alle verklaringen moeten afgevinkt zijn om door te gaan</li>
                      <li>• Digitale handtekening van de medewerker</li>
                    </ul>
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500">
                      <strong>Let op:</strong> Pincodebeheer vindt plaats via HRM-instellingen → Pincodebeheer. Bij afronden van de onboarding wordt automatisch een pincode aangemaakt.
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 4 — Contract</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Contracttype selecteren (Vast, Tijdelijk, Nul Uren, etc.)</li>
                      <li>• Start- en einddatum, proeftijd instellen</li>
                      <li>• <strong>Sjabloon kiezen:</strong> Actieve sjablonen worden gefilterd op contracttype</li>
                      <li>• Standaardsjabloon wordt automatisch voorgeselecteerd</li>
                      <li>• <strong>Contract genereren:</strong> Medewerkergegevens uit stap 1 worden automatisch ingevuld</li>
                      <li>• Contract bekijken in preview</li>
                      <li>• Stap kan ook overgeslagen worden</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 5 — Uitnodigen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Medewerker uitnodigen voor de mobiele app</li>
                      <li>• E-mail wordt automatisch verzonden</li>
                      <li>• Type app (standaard of meerdaags) wordt getoond</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stap 6 — Samenvatting</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Overzicht van alle ingevulde gegevens en voltooide stappen</li>
                      <li>• Checklist met groene vinkjes per afgerond onderdeel</li>
                      <li>• Handtekening preview</li>
                      <li>• Knop "Onboarding Afronden" om het proces te voltooien</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Je kunt altijd teruggaan naar eerdere stappen om gegevens aan te passen. De wizard onthoudt alle ingevulde gegevens.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stamkaart Handleiding */}
            <AccordionItem value="stamkaart-guide">
              <AccordionTrigger className="text-base font-semibold">
                <FileText className="w-4 h-4 mr-2" />
                Hoe gebruik ik de Stamkaart?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      De Stamkaart-pagina is een losstaande functie (buiten de onboarding) waarmee je de stamkaart van bestaande medewerkers kunt bekijken, bewerken en bijwerken. Handig bij wijzigingen in persoonsgegevens, vernieuwing van ID-documenten of nieuwe loonheffingsverklaring.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. Medewerker selecteren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"Stamkaart"</strong> in het menu onder HR & Beheer</li>
                      <li>• Zoek op naam, e-mail of personeelsnummer</li>
                      <li>• Filter op afdeling</li>
                      <li>• Klik op een medewerker om de stamkaart te openen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Gegevens bewerken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Alle velden zijn direct bewerkbaar</li>
                      <li>• <strong>Verplichte velden</strong> worden aangegeven met * en gecontroleerd bij opslaan</li>
                      <li>• Verplicht: voornaam, achternaam, geboortedatum, BSN, adres, postcode, woonplaats, e-mail, IBAN, afdeling, ID-documentnummer en geldigheid</li>
                      <li>• Ontbrekende velden worden rood gemarkeerd</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Loonheffingsverklaring</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Sectie "Loonheffingskorting toepassen" conform het officiële formulier</li>
                      <li>• Keuze: <strong>Ja, vanaf [datum]</strong> of <strong>Nee, vanaf [datum]</strong></li>
                      <li>• Digitale handtekening in het handtekeningvak</li>
                      <li>• Zonder keuze: waarschuwing dat anoniementarief geldt</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Opslaan en verzenden</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Opslaan:</strong> Slaat alle wijzigingen op bij de medewerker (incl. loonheffingsgegevens)</li>
                      <li>• <strong>Printen:</strong> Print de stamkaart</li>
                      <li>• <strong>Versturen naar Loonadministratie:</strong> Verstuurt een e-mail met alle stamkaartgegevens</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Wijzigingen in de stamkaart worden direct opgeslagen bij de medewerker. Controleer de gegevens voordat je opslaat.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contracten Handleiding */}
            <AccordionItem value="contracts-guide">
              <AccordionTrigger className="text-base font-semibold">
                <FileText className="w-4 h-4 mr-2" />
                Hoe beheer ik contracten?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Contractregels toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar een medewerker en open het tabblad "Contractregels"</li>
                      <li>• Voeg een nieuwe contractregel toe met start- en einddatum</li>
                      <li>• Stel het type contract, loonschaal en uren per week in</li>
                      <li>• Configureer het tweewekelijks rooster (week 1 en week 2)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Reiskostenregels</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Voeg reiskostenregels toe per medewerker</li>
                      <li>• Stel afstand en dagvergoeding in</li>
                      <li>• Reiskosten worden automatisch berekend bij tijdregistratie</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Contract genereren en bewerken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"Contracten"</strong> en klik op <strong>"Nieuw Contract"</strong></li>
                      <li>• Selecteer de medewerker, contracttype, startdatum en uren per week</li>
                      <li>• Optioneel: kies een contractsjabloon (of gebruik het standaardsjabloon)</li>
                      <li>• Klik op <strong>"Voorbeeld bekijken"</strong> om het contract te zien</li>
                      <li>• Je kunt de contracttekst <strong>bewerken met de rich text editor</strong> voordat je opslaat</li>
                      <li>• Klik op <strong>"Contract Opslaan"</strong> — het contract krijgt status "Concept"</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Contract verzenden ter ondertekening</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Bij een concept-contract klik je op de <strong>verzendknop</strong> (envelop-icoon)</li>
                      <li>• Het systeem controleert of de medewerker een <strong>geregistreerde app-gebruiker</strong> is</li>
                      <li>• <strong>Wel geregistreerd:</strong> Contract wordt direct verzonden per e-mail, status wordt "Ter Ondertekening"</li>
                      <li>• <strong>Niet geregistreerd:</strong> Je krijgt een duidelijke foutmelding met de optie om de medewerker <strong>direct uit te nodigen als app-gebruiker</strong></li>
                      <li>• Na uitnodigen moet de medewerker eerst de uitnodiging accepteren, daarna kun je het contract opnieuw versturen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">5. Ondertekeningsflow</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Het ondertekenen verloopt in twee stappen:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Stap 1 — Medewerker tekent:</strong> De medewerker ontvangt een e-mail en kan in de app het contract bekijken en digitaal ondertekenen</li>
                      <li>• <strong>Stap 2 — Management tekent:</strong> Pas nadat de medewerker heeft getekend, kan de admin/manager het contract ondertekenen</li>
                      <li>• <strong>Resultaat:</strong> Na beide handtekeningen wordt het contract automatisch <strong>"Actief"</strong></li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">6. Herinneringen versturen</h4>
                    <p className="text-sm text-slate-600">
                      Bij contracten met status "Ter Ondertekening" kun je een <strong>herinnering</strong> versturen via de herhalingsknop. Het systeem houdt bij hoeveel herinneringen zijn verstuurd.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">7. Contract sjablonen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"Contract Sjablonen"</strong> in het menu</li>
                      <li>• Maak sjablonen per contracttype (Vast, Tijdelijk, Nul Uren, etc.)</li>
                      <li>• Gebruik placeholders die automatisch worden ingevuld met medewerkergegevens</li>
                      <li>• Stel één sjabloon per type in als <strong>standaard</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-700">
                      💡 <strong>Tip:</strong> Het roosterschema bepaalt hoeveel uren per dag verwacht worden. Dit wordt gebruikt voor het berekenen van overuren en verlofuren.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> E-mails kunnen alleen worden verstuurd naar medewerkers die als app-gebruiker zijn uitgenodigd. Uitgenodigde medewerkers met de rol "gebruiker" hebben alleen toegang tot de mobiele app en contractondertekening — niet tot het backoffice.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Klanten Handleiding */}
            <AccordionItem value="customers-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Building2 className="w-4 h-4 mr-2" />
                Hoe beheer ik klanten?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Klant toevoegen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar "Klanten" en klik "Klant toevoegen"</li>
                      <li>• Vul bedrijfsnaam, contactgegevens, KvK en BTW in</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Artikelen en prijsregels</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Voeg artikelen toe per klant met prijsregels</li>
                      <li>• Prijsregels hebben een geldigheidsperiode</li>
                      <li>• Wordt gebruikt voor omzetberekeningen bij imports</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. TI-Model Routes</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Definieer routes met rittijd, stops en normen</li>
                      <li>• Norm per besteluur wordt automatisch berekend</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Data importeren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Importeer Excel-bestanden met klantdata</li>
                      <li>• Koppel kolommen aan velden</li>
                      <li>• Bereken automatisch omzet op basis van artikelprijzen</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* PostNL Berekeningen Handleiding */}
            <AccordionItem value="postnl-calculations-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Building2 className="w-4 h-4 mr-2" />
                Hoe gebruik ik PostNL Berekeningen?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      De Berekeningen-tab bij klant PostNL biedt vier rapporttypes die automatisch worden gegenereerd op basis van geïmporteerde PostNL data. Bij het openen wordt automatisch de week van de <strong>laatste import</strong> geselecteerd en het Activiteitenrapport getoond.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. Automatische weekselectie</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Je hoeft niet zelf een week te kiezen. Het systeem:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Detecteert automatisch de <strong>meest recente datum</strong> in de geïmporteerde data</li>
                      <li>• Selecteert het bijbehorende <strong>jaar en weeknummer</strong></li>
                      <li>• Vult start- en einddatum automatisch in</li>
                      <li>• Opent direct het <strong>Activiteitenrapport</strong></li>
                    </ul>
                    <p className="text-sm text-slate-600 mt-2">
                      Je kunt altijd handmatig een ander jaar of week kiezen en op "Uitvoeren" klikken.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Weekrapport</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Toont een gedetailleerd omzetoverzicht per dag:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Overzicht per chauffeur en rit met stops, stuks, BML, PBA en collectie</li>
                      <li>• Automatische berekening van <strong>stoptarief, stukstarief, BML-tarief, PBA-tarief en collectietarief</strong></li>
                      <li>• Totale <strong>omzet per dag en per week</strong></li>
                      <li>• <strong>Maandagtarief</strong> wordt apart berekend (apart stopsartikel)</li>
                      <li>• Filter op: Hele week, Alleen Maandag, of Dinsdag t/m Zaterdag</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Besteltijd & Uurtarief</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Analyseert de efficiency per rit:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Besteltijd norm, bruto en netto per rit</li>
                      <li>• Voorbereiding en totale rittijd</li>
                      <li>• Stops en stuks per rit</li>
                      <li>• <strong>Omzet en uurtarief</strong> per rit</li>
                      <li>• Sorteerbaar op route of chauffeur</li>
                      <li>• Koppeling met <strong>TI-Model Routes</strong> voor norm per uur</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Samenvatting per week</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Geeft een geaggregeerd overzicht:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Groepeerbaar op <strong>route</strong> of <strong>chauffeur</strong></li>
                      <li>• Gemiddelde besteltijd, stops, stuks per groep</li>
                      <li>• Totale en gemiddelde omzet en uurtarief</li>
                      <li>• Weekoverzicht met vergelijking tussen groepen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">5. Activiteitenrapport</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Detailoverzicht van dagelijkse activiteiten:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Toont standaard <strong>alleen de laatste importdag</strong></li>
                      <li>• <strong>Dagfilter</strong>: selecteer een specifieke dag of bekijk de hele week</li>
                      <li>• Kolommen: ritnaam, chauffeur, totaal rit, geen scan, besteltijden, stops, stuks en meer</li>
                      <li>• <strong>Totalen onderaan</strong> voor alle zichtbare kolommen</li>
                      <li>• Knop "Toon hele week" om de dagfilter te resetten</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">6. Tarieven en artikelen</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Onder het rapport wordt een overzicht getoond van de gebruikte tarieven:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Alle actieve artikelen met hun huidige prijs</li>
                      <li>• Prijzen worden bepaald op basis van de <strong>prijsregels en geldigheidsperiode</strong></li>
                      <li>• Beheer artikelen en prijsregels via het tabblad "Artikelen" bij de klant</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">7. Print / PDF</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Elk rapport kan worden afgedrukt of als PDF worden opgeslagen:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op de knop <strong>"Print / PDF"</strong> rechtsboven</li>
                      <li>• Alle filters en navigatie worden verborgen bij het printen</li>
                      <li>• Het rapport wordt netjes opgemaakt voor A4 formaat</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> De berekeningen gebruiken de artikelprijzen die je hebt ingesteld bij de klant. Zorg ervoor dat prijsregels actueel zijn en de juiste geldigheidsperiode hebben.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Het maandagtarief voor stops wordt apart berekend. Zorg dat het artikel "Aantal afgeleverd - Stops Maandagtarief" is aangemaakt bij de klant.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Loonrapporten Handleiding */}
            <AccordionItem value="salary-reports-guide">
              <AccordionTrigger className="text-base font-semibold">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Hoe gebruik ik loonrapporten?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Rapport genereren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar "Loonrapporten"</li>
                      <li>• Selecteer week/periode en medewerker(s)</li>
                      <li>• Het systeem berekent automatisch alle uursoorten</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Wat wordt berekend</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Gewerkte uren, overuren (130%)</li>
                      <li>• Nachturen, weekenduren, feestdaguren</li>
                      <li>• Verlof, ATV, ziekte, opleiding</li>
                      <li>• Toeslagen: nachttoeslag (19%), zaterdag-, zondag- en feestdagtoeslagen</li>
                      <li>• Reiskostenvergoeding</li>
                      <li>• Verblijfskosten conform CAO art. 40</li>
                      <li>• Inhoudingen en WKR</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Medewerker-instellingen die het loonrapport beïnvloeden</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Chauffeur (aan/uit):</strong> Bepaalt of de <strong>nachttoeslag (toeslagenmatrix 19%)</strong> berekend wordt. Als deze toggle uit staat, worden nachturen (21:00-05:00) niet meegenomen in het loonrapport.</li>
                      <li>• <strong>Opnemen in loonrapport (aan/uit):</strong> Als deze toggle uit staat, wordt de medewerker <strong>volledig uitgesloten</strong> uit het loonrapport overzicht, de printversie en de urenbalans. Gebruik dit voor medewerkers die niet via dit systeem verloond worden.</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      💡 <strong>Tip:</strong> Het weekoverzicht in Tijdregistratie toont ook een uitgebreide weeksamenvatting met alle berekeningen die je kunt afdrukken.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> De Chauffeur- en Loonrapport-toggles stel je in bij het medewerker profiel onder "Overige gegevens". Standaard staan alle toggles aan.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Bedrijfsreglement in mobiele app */}
            <AccordionItem value="reglement-mobile-guide">
              <AccordionTrigger className="text-base font-semibold">
                <BookOpen className="w-4 h-4 mr-2" />
                Bedrijfsreglement in de mobiele app
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Wat is het?</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Medewerkers kunnen het bedrijfsreglement inzien via de mobiele app. Dit is een apart tabblad "Reglement" in zowel de standaard als de meerdaagse mobiele app.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Functionaliteit</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Alle actieve artikelen worden getoond, gegroepeerd per <strong>hoofdstuk</strong></li>
                      <li>• Medewerkers kunnen <strong>zoeken</strong> op titel of inhoud</li>
                      <li>• Artikelen zijn uitklapbaar om de volledige inhoud te lezen</li>
                      <li>• Alleen artikelen met status <strong>"Actief"</strong> worden getoond</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Beheer</h4>
                    <p className="text-sm text-slate-600">
                      Het bedrijfsreglement wordt beheerd via de pagina <strong>"Bedrijfsreglement"</strong> in het hoofdmenu. Daar kun je artikelen toevoegen, bewerken en de versiegeschiedenis bekijken.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Medewerker Toggles */}
            <AccordionItem value="employee-toggles-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Users className="w-4 h-4 mr-2" />
                Medewerker-toggles (Chauffeur, Planner, Loonrapport)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Bij elk medewerkersprofiel staan drie toggles onder "Overige gegevens" die bepalen hoe de medewerker in het systeem behandeld wordt. Standaard staan alle drie aan.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">🚛 Chauffeur (is_chauffeur)</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Bepaalt of <strong>nachttoeslag (toeslagenmatrix 19%)</strong> berekend wordt</li>
                      <li>• Nachturen zijn uren gewerkt tussen <strong>21:00 en 05:00</strong></li>
                      <li>• <strong>Uit:</strong> Nachturen worden op 0 gezet in het loonrapport</li>
                      <li>• <strong>Aan (standaard):</strong> Nachturen worden normaal berekend</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">📅 Tonen in planner (tonen_in_planner)</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Bepaalt of de medewerker <strong>zichtbaar is in de Planning</strong></li>
                      <li>• <strong>Uit:</strong> Medewerker verschijnt niet in het planningsscherm en kan niet ingepland worden</li>
                      <li>• <strong>Aan (standaard):</strong> Medewerker is zichtbaar en inplanbaar</li>
                      <li>• Gebruik dit voor medewerkers die je niet wilt inplannen (bijv. kantoorpersoneel)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">💰 Opnemen in loonrapport (opnemen_in_loonrapport)</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Bepaalt of er een <strong>loonrapport gegenereerd</strong> wordt voor deze medewerker</li>
                      <li>• <strong>Uit:</strong> Geen loonrapport, geen printversie, niet in urenbalans</li>
                      <li>• <strong>Aan (standaard):</strong> Normaal opgenomen in alle loonrapporten</li>
                      <li>• Gebruik dit voor medewerkers die niet via dit systeem verloond worden</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Deze toggles zijn onafhankelijk van de medewerkerstatus (Actief/Inactief). Een medewerker kan Actief zijn maar toch niet in de planner staan of geen loonrapport krijgen.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* E-mail verzenden */}
            <AccordionItem value="email-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Mail className="w-4 h-4 mr-2" />
                Hoe verstuur ik e-mails naar medewerkers?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Via de Communicatie-pagina kun je e-mails versturen naar individuele medewerkers of in bulk per afdeling. E-mails worden verzonden via de gekoppelde Gmail-connector.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. E-mail versturen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"Communicatie"</strong> (voorheen Berichten) in het menu</li>
                      <li>• Klik op <strong>"E-mail versturen"</strong> of ga naar het tabblad "E-mail"</li>
                      <li>• Kies tussen <strong>Individueel</strong> (medewerkers selecteren) of <strong>Per afdeling</strong> (hele afdeling)</li>
                      <li>• Optioneel: selecteer een <strong>sjabloon</strong> om onderwerp en inhoud automatisch in te vullen</li>
                      <li>• Vul het onderwerp en de e-mailinhoud in (met rich text editor)</li>
                      <li>• Stel het <strong>antwoordadres (Reply-To)</strong> in — standaard info@interdistri.nl</li>
                      <li>• Klik op <strong>"Verzenden"</strong></li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Individueel verzenden</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Kies het tabblad <strong>"Individueel"</strong></li>
                      <li>• Vink een of meer medewerkers aan in de lijst</li>
                      <li>• Alleen actieve medewerkers met een e-mailadres worden getoond</li>
                      <li>• Je ziet het aantal geselecteerde ontvangers</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Bulk verzenden per afdeling</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Kies het tabblad <strong>"Per afdeling"</strong></li>
                      <li>• Selecteer een afdeling (Management, Transport, PakketDistributie, Charters)</li>
                      <li>• Alle actieve medewerkers van die afdeling ontvangen de e-mail</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Reply-To adres</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Het Reply-To adres bepaalt waar antwoorden naartoe gaan:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• De e-mail wordt verstuurd vanaf het gekoppelde Gmail-account</li>
                      <li>• Als de ontvanger op <strong>"Beantwoorden"</strong> klikt, gaat het antwoord naar het opgegeven Reply-To adres</li>
                      <li>• Standaard: <strong>info@interdistri.nl</strong></li>
                      <li>• Je kunt dit per e-mail aanpassen (bijv. ruben@interdistri.nl)</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">5. E-mail sjablonen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar het tabblad <strong>"Sjablonen"</strong> op de Communicatie-pagina</li>
                      <li>• Klik op <strong>"Nieuw sjabloon"</strong> om een sjabloon aan te maken</li>
                      <li>• Vul naam, onderwerp, inhoud en Reply-To adres in</li>
                      <li>• Kies een categorie (Algemeen, HR, Planning, Contract, Overig)</li>
                      <li>• Sjablonen kunnen worden <strong>bewerkt en verwijderd</strong></li>
                      <li>• Bij het versturen van een e-mail kun je een sjabloon selecteren — de velden worden automatisch ingevuld</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Maak sjablonen aan voor terugkerende e-mails zoals welkomstberichten, contractverlengingen of afdelingsupdates. Dit bespaart tijd en zorgt voor consistente communicatie.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> E-mails worden alleen verstuurd naar medewerkers met een ingevuld e-mailadres. Medewerkers zonder e-mail worden overgeslagen.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Systeem E-mail Sjablonen */}
            <AccordionItem value="system-email-templates-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Mail className="w-4 h-4 mr-2" />
                Hoe beheer ik systeem e-mail sjablonen?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Naast de handmatige bericht-sjablonen (via de Communicatie-pagina) heeft het systeem ook <strong>automatische e-mail sjablonen</strong>. 
                      Dit zijn de sjablonen die worden gebruikt door systeem-functies zoals welkomstmails, contractverzending, afkeuringsmails, etc.
                      Je kunt de HTML-opmaak, onderwerp en inhoud van al deze systeemmails volledig aanpassen.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. Sjablonen beheren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>HRM-instellingen → E-mail Sjablonen</strong></li>
                      <li>• Je ziet een overzicht van alle aangemaakte systeem-sjablonen</li>
                      <li>• Klik op <strong>"Nieuw sjabloon"</strong> om een sjabloon aan te maken</li>
                      <li>• Kies de juiste <strong>template_key</strong> (bijv. "stamkaart", "welkomstmail")</li>
                      <li>• Vul het <strong>onderwerp</strong> en de <strong>HTML-inhoud</strong> in via de rich text editor</li>
                      <li>• Activeer het sjabloon met de <strong>Actief</strong>-toggle</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Beschikbare template keys</h4>
                    <div className="overflow-x-auto">
                      <table className="text-sm w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-2 border border-slate-200 font-medium">Template Key</th>
                            <th className="text-left p-2 border border-slate-200 font-medium">Wordt gebruikt bij</th>
                            <th className="text-left p-2 border border-slate-200 font-medium">Placeholders</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-600">
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">stamkaart</td><td className="p-2 border border-slate-200">Stamkaart naar loonadministratie</td><td className="p-2 border border-slate-200 text-xs">naam, geboortedatum, bsn, adres, iban, afdeling, functie, contract_type, uren_per_week, loonschaal, uurloon, loonheffingskorting, id_document_nummer, id_document_geldig</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">welkomstmail</td><td className="p-2 border border-slate-200">Welkomstmail nieuwe medewerker</td><td className="p-2 border border-slate-200 text-xs">naam, email</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">contract_ter_ondertekening</td><td className="p-2 border border-slate-200">Contract verzenden ter ondertekening</td><td className="p-2 border border-slate-200 text-xs">naam, contractnummer, contract_type, startdatum, einddatum, functie</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">dienst_afgekeurd</td><td className="p-2 border border-slate-200">Notificatie bij afkeuring dienst</td><td className="p-2 border border-slate-200 text-xs">naam, datum, starttijd, eindtijd, pauze, totaal_uren, reden, link</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">contract_ondertekend_door_medewerker</td><td className="p-2 border border-slate-200">Melding aan admin na ondertekening</td><td className="p-2 border border-slate-200 text-xs">naam, contractnummer, admin_naam</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">contract_geactiveerd</td><td className="p-2 border border-slate-200">Bevestiging aan medewerker na activering</td><td className="p-2 border border-slate-200 text-xs">naam, contractnummer</td></tr>
                          <tr><td className="p-2 border border-slate-200 font-mono text-xs">nieuw_document</td><td className="p-2 border border-slate-200">Nieuw HR-document beschikbaar</td><td className="p-2 border border-slate-200 text-xs">naam, document_naam, document_type, vervaldatum</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Placeholders gebruiken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Gebruik de syntax <code className="bg-slate-100 px-1 rounded">{"{{placeholder_naam}}"}</code> in je sjabloon</li>
                      <li>• Placeholders worden bij het verzenden automatisch vervangen door de echte waarden</li>
                      <li>• Voorbeeld: <code className="bg-slate-100 px-1 rounded">{"Beste {{naam}}, je contract {{contractnummer}} staat klaar."}</code></li>
                      <li>• Onbekende placeholders worden vervangen door "—"</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Standaard vs. aangepast</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Als er <strong>geen actief sjabloon</strong> bestaat voor een template_key, wordt het <strong>standaard systeem-sjabloon</strong> gebruikt (hardcoded in de backend)</li>
                      <li>• Zodra je een actief sjabloon aanmaakt met de juiste template_key, wordt dat <strong>in plaats van</strong> het standaard-sjabloon gebruikt</li>
                      <li>• Je kunt een sjabloon <strong>deactiveren</strong> om tijdelijk terug te vallen op het standaard-sjabloon</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Test je sjabloon door een stamkaart of welkomstmail te verzenden na het aanmaken. Zo zie je direct hoe de placeholders worden ingevuld.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> De template_key moet exact overeenkomen. Typ de key precies zoals in de tabel hierboven (kleine letters, underscores).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Back-ups & Supabase Handleiding */}
            <AccordionItem value="backups-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Shield className="w-4 h-4 mr-2" />
                Hoe werken Back-ups & Supabase Export?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Het systeem biedt twee backup-strategieën: <strong>interne back-ups</strong> (opgeslagen als JSON in Base44) en <strong>Supabase export</strong> (externe PostgreSQL database). Samen zorgen ze voor maximale dataveiligheid.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">1. Handmatige Back-up (Intern)</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"Back-ups"</strong> in het menu</li>
                      <li>• Klik op <strong>"Handmatige Back-up"</strong></li>
                      <li>• Alle 42 entities worden opgehaald en als JSON-bestand opgeslagen</li>
                      <li>• De backup verschijnt in de lijst met datum, aantal records en bestandsgrootte</li>
                      <li>• Klik op een backup om de <strong>details per entity</strong> te bekijken</li>
                      <li>• Download de backup als JSON-bestand via het download-icoon</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">2. Back-up Herstellen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Volledige herstel:</strong> Klik op het herstel-icoon naast een backup om <strong>alle data</strong> te herstellen</li>
                      <li>• <strong>Per entity:</strong> Klik op een backup, open de details en klik "Herstel" naast een specifieke entity</li>
                      <li>• Typ <strong>HERSTEL-BEVESTIGD</strong> als bevestigingscode</li>
                      <li>• ⚠️ Alle huidige data wordt verwijderd en vervangen door de backup-versie</li>
                      <li>• ⚠️ User-accounts worden NIET hersteld — nodig gebruikers opnieuw uit</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">3. Supabase SQL Genereren</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Voordat je data naar Supabase kunt exporteren, moeten de tabellen bestaan:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op <strong>"Genereer Supabase SQL"</strong></li>
                      <li>• Een dialoog toont de SQL met DROP TABLE + CREATE TABLE statements voor alle 42 tabellen</li>
                      <li>• Klik <strong>"Kopieer SQL"</strong> om de SQL naar je klembord te kopiëren</li>
                      <li>• Ga naar je <strong>Supabase Dashboard → SQL Editor</strong></li>
                      <li>• Plak de SQL en voer het uit</li>
                      <li>• Dit vervangt bestaande tabellen met dezelfde naam</li>
                      <li>• ⚠️ Voer dit uit <strong>voordat</strong> je voor het eerst exporteert, of wanneer er entities zijn gewijzigd</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">4. Export naar Supabase</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op <strong>"Export naar Supabase"</strong></li>
                      <li>• Het systeem exporteert alle 42 entities naar de gekoppelde Supabase database</li>
                      <li>• Bestaande data in Supabase wordt eerst verwijderd, daarna worden nieuwe records ingevoegd</li>
                      <li>• Na afloop zie je hoeveel records zijn geëxporteerd en eventuele fouten</li>
                      <li>• Base44 ID's worden opgeslagen als <strong>base44_id</strong> in Supabase (UUID-conflict voorkomen)</li>
                      <li>• Complexe velden (arrays, objecten) worden als <strong>tekst</strong> opgeslagen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">5. Herstel vanuit Supabase</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op <strong>"Herstel vanuit Supabase"</strong></li>
                      <li>• Typ <strong>SUPABASE-HERSTEL</strong> als bevestigingscode</li>
                      <li>• Alle data wordt opgehaald uit Supabase en teruggezet in Base44</li>
                      <li>• Gebruik dit alleen als de primaire Base44 backup niet beschikbaar is</li>
                      <li>• ⚠️ Alle huidige data wordt vervangen</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">6. Aanbevolen werkwijze</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Maak <strong>dagelijks</strong> een handmatige back-up óf stel een automatische backup in</li>
                      <li>• Exporteer <strong>wekelijks</strong> naar Supabase als extra vangnet</li>
                      <li>• Na wijzigingen aan entities: genereer opnieuw SQL en voer uit in Supabase</li>
                      <li>• Controleer of de export <strong>0 fouten</strong> meldt</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> De Supabase export dient als tweede backup-laag. Je kunt de data ook rechtstreeks in Supabase bekijken via de Table Editor.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Bij "Export naar Supabase" worden alle tabellen eerst leeggemaakt. Zorg dat je niet per ongeluk exporteert met een lege database.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* HR Import */}
            <AccordionItem value="hr-import-guide">
              <AccordionTrigger className="text-base font-semibold">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                HR Import
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Wat is het?</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Met HR Import kun je medewerkersgegevens in bulk importeren vanuit een Excel-bestand. Dit is handig bij het opzetten van het systeem of bij grote wijzigingen.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Hoe gebruik je het?</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar <strong>"HR Import"</strong> in het menu onder HR & Beheer</li>
                      <li>• Upload een Excel-bestand (.xlsx of .csv)</li>
                      <li>• Het systeem detecteert automatisch de kolommen</li>
                      <li>• Koppel de kolommen aan de juiste medewerkersvelden</li>
                      <li>• Bekijk de preview van de te importeren data</li>
                      <li>• Bevestig de import</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Meerdaagse Mobiele App */}
            <AccordionItem value="multiday-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Smartphone className="w-4 h-4 mr-2" />
                Meerdaagse Mobiele App
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Wat is het?</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Een aparte versie van de mobiele app voor medewerkers die diensten over meerdere dagen draaien (bijv. charterritten). Deze app heeft dezelfde functionaliteit als de standaard app, maar met een start- en einddatum.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Hoe activeer ik het?</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Ga naar "Medewerkers" en open het profiel van de medewerker</li>
                      <li>• Stel het veld <strong>"Type mobiele app"</strong> in op <strong>"multi_day"</strong></li>
                      <li>• De medewerker wordt automatisch doorgestuurd naar de meerdaagse app</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Verschil met standaard app</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Startdatum en einddatum in te stellen (max 7 dagen)</li>
                      <li>• Uren worden correct berekend over meerdere dagen</li>
                      <li>• Alle overige functies (ritten, inspectie, declaratie, etc.) zijn identiek</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Deze instelling is per medewerker. Zet alleen medewerkers op "multi_day" die daadwerkelijk meerdaagse diensten draaien.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Automatisch Diensttype */}
            <AccordionItem value="shifttype-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Clock className="w-4 h-4 mr-2" />
                Automatisch Diensttype (Dag / Avond / Nacht)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Hoe werkt het?</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Het diensttype (Dag, Avond of Nachtdienst) wordt <strong>automatisch bepaald</strong> op basis van de starttijd en eindtijd van de dienst. Je hoeft dit niet handmatig in te vullen.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Regels</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm font-medium text-amber-900">☀️ Dagdienst</p>
                        <p className="text-sm text-amber-700">Starttijd tussen <strong>05:00</strong> en <strong>15:59</strong></p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm font-medium text-orange-900">🌆 Avonddienst</p>
                        <p className="text-sm text-orange-700">Starttijd tussen <strong>16:00</strong> en <strong>20:59</strong></p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm font-medium text-indigo-900">🌙 Nachtdienst</p>
                        <p className="text-sm text-indigo-700">Starttijd tussen <strong>21:00</strong> en <strong>04:59</strong></p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Avonddienst → Nachtdienst</h4>
                    <p className="text-sm text-slate-600">
                      Een avonddienst die <strong>na 21:00 eindigt</strong> wordt automatisch omgezet naar een <strong>Nachtdienst</strong>. Dit geldt ook als de eindtijd vóór 05:00 valt (bijv. 02:00).
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Dit geldt zowel in de mobiele app als in de tijdregistratie op desktop. Het diensttype wordt pas definitief bepaald wanneer zowel start- als eindtijd zijn ingevuld.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Voorbeelden</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-slate-200 rounded-lg">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-2 border-b">Starttijd</th>
                            <th className="text-left p-2 border-b">Eindtijd</th>
                            <th className="text-left p-2 border-b">Diensttype</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-600">
                          <tr><td className="p-2 border-b">05:00</td><td className="p-2 border-b">14:00</td><td className="p-2 border-b"><Badge className="bg-amber-100 text-amber-700">Dag</Badge></td></tr>
                          <tr><td className="p-2 border-b">08:30</td><td className="p-2 border-b">17:00</td><td className="p-2 border-b"><Badge className="bg-amber-100 text-amber-700">Dag</Badge></td></tr>
                          <tr><td className="p-2 border-b">16:00</td><td className="p-2 border-b">20:30</td><td className="p-2 border-b"><Badge className="bg-orange-100 text-orange-700">Avond</Badge></td></tr>
                          <tr><td className="p-2 border-b">17:00</td><td className="p-2 border-b">22:00</td><td className="p-2 border-b"><Badge className="bg-indigo-100 text-indigo-700">Nachtdienst</Badge></td></tr>
                          <tr><td className="p-2 border-b">21:00</td><td className="p-2 border-b">05:00</td><td className="p-2 border-b"><Badge className="bg-indigo-100 text-indigo-700">Nachtdienst</Badge></td></tr>
                          <tr><td className="p-2">02:00</td><td className="p-2">10:00</td><td className="p-2"><Badge className="bg-indigo-100 text-indigo-700">Nachtdienst</Badge></td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* E-mailadres wijzigen en herkoppelen */}
            <AccordionItem value="email-change-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Users className="w-4 h-4 mr-2" />
                E-mailadres wijzigen en medewerker herkoppelen
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      De koppeling tussen een medewerker en een gebruikersaccount is gebaseerd op het <strong>e-mailadres</strong>. Als een medewerker een nieuw e-mailadres krijgt, moet het account opnieuw worden gekoppeld. <strong>Er gaan geen medewerkergegevens verloren</strong>, want contracten, tijdregistraties, ritten en overige data zijn gekoppeld aan het Employee-record via het ID, niet via het e-mailadres.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Stappen bij e-mailadres wijziging</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li><strong>Stap 1 — E-mail wijzigen:</strong> Ga naar Medewerkers, open het profiel en pas het e-mailadres aan naar het nieuwe adres. Sla op.</li>
                      <li><strong>Stap 2 — Nieuw account uitnodigen:</strong> Ga naar Gebruikersbeheer en nodig de medewerker opnieuw uit met het nieuwe e-mailadres. De medewerker krijgt dan een nieuw gebruikersaccount.</li>
                      <li><strong>Stap 3 — Oud account opruimen:</strong> Het oude gebruikersaccount (met het vorige e-mailadres) blijft bestaan. Dit verschijnt automatisch onder "Accounts zonder medewerker" in het tabblad <strong>Koppelingen</strong> op de Gebruikerspagina, zodat je het kunt identificeren en eventueel opruimen.</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Wat gebeurt er met de data?</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Contracten:</strong> Blijven behouden — gekoppeld aan Employee ID</li>
                      <li>• <strong>Tijdregistraties:</strong> Blijven behouden — gekoppeld aan Employee ID</li>
                      <li>• <strong>Ritten:</strong> Blijven behouden — gekoppeld aan Employee ID</li>
                      <li>• <strong>Contractregels en reiskostenregels:</strong> Blijven behouden</li>
                      <li>• <strong>Planning:</strong> Blijft behouden</li>
                      <li>• <strong>Permissies:</strong> Het nieuwe account krijgt standaard permissies bij uitnodiging. Pas eventueel de permissies aan via Gebruikersbeheer.</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Koppelingen controleren</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Gebruik het tabblad <strong>"Koppelingen"</strong> op de Gebruikerspagina om een overzicht te krijgen van:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Gekoppeld:</strong> Medewerkers die correct zijn gekoppeld aan een gebruikersaccount</li>
                      <li>• <strong>Medewerkers zonder account:</strong> Medewerkers die nog geen gebruikersaccount hebben (na e-mailwijziging verschijnen ze hier)</li>
                      <li>• <strong>Accounts zonder medewerker:</strong> Gebruikersaccounts die niet gekoppeld zijn aan een medewerker (het oude account verschijnt hier)</li>
                      <li>• <strong>Status mismatch:</strong> Gevallen waarbij een medewerker inactief/uit dienst is maar het account nog actief</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Controleer na het wijzigen van een e-mailadres altijd het Koppelingen-tabblad om te bevestigen dat de nieuwe koppeling correct is en het oude account zichtbaar is voor opruiming.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Belangrijk:</strong> Alleen het gebruikersaccount (inloggegevens en permissies) moet opnieuw worden aangemaakt. Alle medewerkergegevens in het systeem blijven volledig intact.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Security Architectuur */}
            <AccordionItem value="security-architecture">
              <AccordionTrigger className="text-base font-semibold">
                <Shield className="w-4 h-4 mr-2" />
                Security Architectuur — Sleutelkast
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Architectuurscheiding</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">📋 Onboarding</p>
                        <p className="text-xs text-blue-700">Juridisch dossier: verklaringen, handtekeningen, contracten. Bevat geen operationele gegevens zoals pincodes.</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-medium text-purple-900 mb-1">🔐 Sleutelkastbeheer</p>
                        <p className="text-xs text-purple-700">Operationeel beveiligingsbeheer: pincodegeneratie, wijziging, audit logging. Volledig losgekoppeld van onboarding.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">Processchema: Onboarding & Sleutelkastbeheer</h4>
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-700 space-y-1 font-mono">
                      <p>1. HR start onboarding</p>
                      <p>2. Medewerker doorloopt stappen (gegevens, stamkaart, verklaringen, contract, uitnodiging)</p>
                      <p>3. Onboarding wordt afgerond (status: "Afgerond")</p>
                      <p>4. Systeem controleert: bestaat er een actieve pincode?</p>
                      <p>   → Nee: automatische pincode aanmaken in KeylockerPincode</p>
                      <p>   → Ja: geen actie</p>
                      <p>5. HR beheert pincodes via HRM-instellingen → Pincodebeheer</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic">Pincode is geen onderdeel van het juridische dossier.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900 mb-2">De pincode wordt:</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>✗ Nooit getoond in onboarding</li>
                      <li>✗ Nooit opgenomen in print of PDF</li>
                      <li>✗ Nooit meegestuurd naar loonadministratie</li>
                      <li>✓ Alleen zichtbaar via beveiligd HR-tabblad (Pincodebeheer)</li>
                      <li>✓ Elke actie (view, wijzig, aanmaak) wordt gelogd in audit trail</li>
                      <li>✓ 30 seconden zichtbaarheid na bevestiging</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      ⚠️ <strong>Belangrijk:</strong> De pincode mag nooit worden gecommuniceerd via e-mail, print, PDF of enig ander onbeveiligd kanaal. Gebruik uitsluitend het Pincodebeheer-tabblad.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Algemene Tips */}
            <AccordionItem value="tips">
              <AccordionTrigger className="text-base font-semibold">
                💡 Algemene Tips & Tricks
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Snelkoppelingen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Dashboard:</strong> Ga hier voor een snelle overview</li>
                      <li>• <strong>TimeTracking:</strong> Voer en beheer uren in</li>
                      <li>• <strong>Planning:</strong> Maak roosters</li>
                      <li>• <strong>Approvals:</strong> Keur uren goed af</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Zoeken en Filteren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Gebruik zoekvelden om medewerkers/voertuigen snel te vinden</li>
                      <li>• Filter op afdeling, status, of datum</li>
                      <li>• Sorteer op kolommen door erop te klikken</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Export & Rapportage</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Planning kan naar PDF geëxporteerd worden</li>
                      <li>• Rapportages geven inzicht in uren, kosten en capaciteit</li>
                      <li>• Gebruik deze voor analyse en planning</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Audit Trail</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Alle wijzigingen aan uren worden gelogd</li>
                      <li>• Zie wie wat en wanneer heeft aangepast</li>
                      <li>• Dit helpt bij naleving en controle</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}