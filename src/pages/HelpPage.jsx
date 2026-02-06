import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Layers, Users, Clock, CheckSquare, Truck, CalendarDays, Shield, Smartphone, CircleDot, Download, FileText, Building2, FolderKanban, DollarSign, FileSpreadsheet, Mail, Car, Settings } from 'lucide-react';
import { toast } from 'sonner';

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 no-print">
          <TabsTrigger value="functions" className="gap-2">
            <Zap className="w-4 h-4" />
            Functies
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
                  <li>✓ Route- en voertuigtoewijzing</li>
                  <li>✓ Capaciteitsoverzicht per week</li>
                  <li>✓ Weken kopiëren naar andere periodes</li>
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
                  <li>✓ Voertuigen en onderhoudstermijnen</li>
                  <li>✓ CAO-regels en toeslagen</li>
                  <li>✓ Loontabellen</li>
                  <li>✓ Gebruikers en permissies</li>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  Mobiele Invoer
                </CardTitle>
                <CardDescription>Onderweg uren en ritten registreren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Complete mobiele app voor chauffeurs:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Diensttijd en ritten invoeren</li>
                  <li>✓ Voertuiginspectie met foto's</li>
                  <li>✓ Declaraties indienen</li>
                  <li>✓ Planning bekijken</li>
                  <li>✓ Shifttijd weergave</li>
                  <li>✓ Offline synchronisatie</li>
                  <li>✓ Handtekening functionaliteit</li>
                  <li>✓ Berichten en notificaties</li>
                  <li>✓ Meerdaagse diensten (aparte app via profiel)</li>
                </ul>
              </CardContent>
            </Card>

            {/* Contracten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Contracten
                </CardTitle>
                <CardDescription>Contractbeheer per medewerker</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Beheer contractgegevens en -regels:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Contractregels met start-/einddatum</li>
                  <li>✓ Loonschaal en uren per week</li>
                  <li>✓ Tweewekelijks roosterschema (week 1/week 2)</li>
                  <li>✓ Reiskostenregels per medewerker</li>
                  <li>✓ Contract PDF generatie</li>
                  <li>✓ Automatische herinneringen bij afloop</li>
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
                <CardDescription>Urensoorten en uurcodes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Configureer de basis voor tijdregistratie:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Urensoorten (Gewerkt, Verlof, ATV, Ziek, etc.)</li>
                  <li>✓ Uurcodes per urensoort</li>
                  <li>✓ Feestdagen beheer per jaar</li>
                  <li>✓ Pauzeregels configuratie</li>
                </ul>
              </CardContent>
            </Card>

            {/* Berichten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-600" />
                  Berichten
                </CardTitle>
                <CardDescription>Interne communicatie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Communiceer met medewerkers:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Berichten sturen naar medewerkers</li>
                  <li>✓ Prioriteit instellen (Normaal, Hoog, Urgent)</li>
                  <li>✓ Gelezen/ongelezen status</li>
                  <li>✓ Welkomstberichten per afdeling</li>
                  <li>✓ Zichtbaar in mobiele app</li>
                </ul>
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
                <CardDescription>Gegevensbeveiliging en migratie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Bescherm en migreer je data:
                </p>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li>✓ Handmatige en automatische back-ups</li>
                  <li>✓ Back-up herstellen</li>
                  <li>✓ Datamigratie tools</li>
                  <li>✓ Test database ondersteuning</li>
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
                        Persoonlijke gegevens, contracten, rijbewijs, loonschaal, afdeling, enzovoort.
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
                      Ga naar Planning en selecteer de week en jaar die je wilt plannen.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Diensten toekennen</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op een lege cel in de dagkolom</li>
                      <li>• Selecteer een dienst type (Dag, Avond, Nacht, Vrij, Verlof, Ziek)</li>
                      <li>• Wijs optioneel voertuig en route toe</li>
                      <li>• Sla op</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Week kopiëren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik "Week kopiëren" knop</li>
                      <li>• Kies naar welke week je het wilt kopiëren</li>
                      <li>• Bevestig</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Capaciteit controleren</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Zie het "Capaciteitsoverzicht" om:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Totale uren per medewerker te checken</li>
                      <li>• Over- of onderwerk te signaleren</li>
                      <li>• Vergelijking met contract uren</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      💡 <strong>Tip:</strong> Gebruik de PDF export om planning af te drukken of te delen.
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
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Status beheren</h4>
                    <p className="text-sm text-slate-600">
                      Status kan zijn: Actief, Inactief, of Uit dienst. Dit bepaalt of de medewerker zichtbaar is in planningen en tijdregistraties.
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700">
                      💡 <strong>Tip:</strong> Vergeet niet rijbewijs en vervaldatum op te geven, deze worden gemonitord voor vervaldatums.
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
            <AccordionItem value="mobile-entry-guide">
              <AccordionTrigger className="text-base font-semibold">
                <Smartphone className="w-4 h-4 mr-2" />
                Hoe gebruik ik de Mobiele App?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Toegang tot de mobiele app</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      De mobiele app opent automatisch wanneer je de app bezoekt op je smartphone. Op desktop zie je een link "Mobiele Invoer" in het menu.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Starttijd van dienst checken</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      De app toont je automatisch:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• De officiële service starttijd (geel/amber blok)</li>
                      <li>• Dit is ingesteld per afdeling door je manager</li>
                      <li>• Het bericht van vandaag (indien ingesteld)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Diensttijd registreren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Stap 1:</strong> Voer je starttijd in bij "Diensttijd"</li>
                      <li>• <strong>Stap 2:</strong> Ga naar "Ritten" en voeg minimaal één rit toe</li>
                      <li>• <strong>Stap 3:</strong> Terug naar "Diensttijd" en voer eindtijd in</li>
                      <li>• <strong>Stap 4:</strong> Plaats je handtekening en dien in</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Ritten invoeren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Voeg een rit toe met "Regel Toevoegen"</li>
                      <li>• Vul starttijd en eindtijd van de rit in</li>
                      <li>• Selecteer kenteken en klant</li>
                      <li>• Voer begin- en eind kilometerstand in</li>
                      <li>• Optioneel: brandstof, AdBlue, laadgegevens</li>
                      <li>• Voeg route details en opmerkingen toe</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">5. Validaties</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      De app controleert automatisch:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Minimaal één rit moet zijn ingevoerd</li>
                      <li>• Elke rit moet een start- én eindtijd hebben</li>
                      <li>• Rit tijden moeten binnen dienst tijden vallen</li>
                      <li>• Handtekening is verplicht bij indienen</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">6. Overige functies</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• <strong>Voertuiginspectie:</strong> Controleer je voertuig en maak foto's van schade</li>
                      <li>• <strong>Declaratie:</strong> Dien kosten in met bon/foto</li>
                      <li>• <strong>Overzicht:</strong> Bekijk goedgekeurde diensten</li>
                      <li>• <strong>Planning:</strong> Zie je rooster voor deze week</li>
                      <li>• <strong>Berichten:</strong> Ontvang berichten van je manager</li>
                      <li>• <strong>Links:</strong> Snelle toegang tot Bumper en Werknemersloket</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">7. Offline werken</h4>
                    <p className="text-sm text-slate-600">
                      De app werkt ook offline. Je gegevens worden automatisch gesynchroniseerd zodra je weer online bent. Een indicator toont je verbindingsstatus.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Tip:</strong> Gebruik "Tussentijds Opslaan" bij het invoeren van ritten om je gegevens veilig op te slaan voordat je verder gaat.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      ⚠️ <strong>Let op:</strong> Als je schade rijdt, wordt automatisch de Bumper-link geopend na het indienen.
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