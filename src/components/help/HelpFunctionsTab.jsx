import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Clock, CalendarDays, CheckSquare, Truck, Users, CircleDot, FileText, Building2, FolderKanban, FileSpreadsheet, DollarSign, BookOpen, Settings, Mail, Car, Smartphone, Shield } from 'lucide-react';
import HelpMobileEntryCard from './HelpMobileEntryCard';
import {
  GpsBuddyImportCard, StopReportCard, StandplaatsWerkCard, DagstaatCard, DocumentenCard,
  KpiReportCard, MaandcontroleCard, BusinessDashboardCard, KmDashboardCard, FuelSurchargeCard,
  PayCheckedAuditCard, DagrapportCard, ActiviteitenCard, FeestdagenCard, HerberekeningenCard,
  GovernanceCard
} from './HelpMissingModules';

export default function HelpFunctionsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-blue-600" />Dashboard</CardTitle>
          <CardDescription>Overzicht en statistieken</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Het centrale overzichtscherm waar je op een oogopslag ziet:</p>
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
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" />Tijdregistratie</CardTitle>
          <CardDescription>Werk- en diensten registreren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Beheer alle uren van medewerkers per week:</p>
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
          <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-green-600" />Planning</CardTitle>
          <CardDescription>Roosters en capaciteit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Maak en beheer wekelijkse roosters voor je team:</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Per-dag planning (per medewerker)</li>
            <li>✓ Tabs per afdeling</li>
            <li>✓ Route- en voertuigtoewijzing per cel</li>
            <li>✓ Drag & drop diensten</li>
            <li>✓ Voorplanning met shift-templates</li>
            <li>✓ Afwezigheid, feestdagen en vrije dagen automatisch</li>
            <li>✓ Weken en dagen kopiëren</li>
            <li>✓ Export naar PDF</li>
          </ul>
        </CardContent>
      </Card>

      {/* Goedkeuringen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-600" />Goedkeuringen</CardTitle>
          <CardDescription>Keur uren goed of af</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Beheer alle ingediende uren voor goedkeuring:</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Overzicht ter goedkeuring met tijdlijn (ritten, standplaatswerk, GPS)</li>
            <li>✓ Goedkeuren of afkeuren</li>
            <li>✓ Reden afkeuring vastleggen</li>
            <li>✓ Uren corrigeren met audit trail</li>
            <li>✓ Tijdoverlap detectie</li>
            <li>✓ GPS Buddy ritdata vergelijking</li>
            <li>✓ Brandstofkosten per km weergave</li>
          </ul>
        </CardContent>
      </Card>

      {/* GPS Buddy Import - NIEUW */}
      <GpsBuddyImportCard />

      {/* Stoprapport - NIEUW */}
      <StopReportCard />

      {/* Ritten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-orange-600" />Ritten</CardTitle>
          <CardDescription>Trip- en routebeheer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Log alle ritten en transportgegevens:</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Ritten per chauffeur en voertuig</li>
            <li>✓ Route en kilometers</li>
            <li>✓ Brandstof en laadgegevens</li>
            <li>✓ Status volgen (gepland, onderweg, voltooid)</li>
            <li>✓ Koppeling met klanten en projecten</li>
            <li>✓ Tijdoverlap detectie</li>
          </ul>
        </CardContent>
      </Card>

      {/* Standplaatswerk - NIEUW */}
      <StandplaatsWerkCard />

      {/* Dagstaat - NIEUW */}
      <DagstaatCard />

      {/* Dienst-Shifttijd */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CircleDot className="w-5 h-5 text-red-600" />Dienst-Shifttijd</CardTitle>
          <CardDescription>Starttijden per afdeling beheren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Beheer de officiële starttijden per afdeling:</p>
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
      <Card><HelpMobileEntryCard /></Card>

      {/* Medewerkers & Beheer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" />Beheer</CardTitle>
          <CardDescription>Medewerkers, voertuigen, regels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Centraal beheer van alle basisgegevens:</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Medewerkergegevens en contracten</li>
            <li>✓ ID-document: Nummer en geldigheidsdatum</li>
            <li>✓ Voertuigen en onderhoudstermijnen</li>
            <li>✓ CAO-regels en toeslagen</li>
            <li>✓ Loontabellen</li>
            <li>✓ Chauffeur-toggle, Tonen in planner, Opnemen in loonrapport</li>
            <li>✓ Audit Log</li>
          </ul>
        </CardContent>
      </Card>

      {/* Contracten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" />Contracten</CardTitle>
          <CardDescription>Contractbeheer en digitale ondertekening</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Beheer contractgegevens, genereer en laat digitaal ondertekenen:</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Contractregels met start-/einddatum, loonschaal, rooster</li>
            <li>✓ Reiskostenregels per medewerker</li>
            <li>✓ Automatische waarschuwing en uitdiensttreding</li>
            <li>✓ Contract genereren op basis van sjablonen</li>
            <li>✓ Digitale handtekening (medewerker + management)</li>
            <li>✓ Contract Analytics, Afgeronde Contracten, Contractwijzigingen</li>
          </ul>
        </CardContent>
      </Card>

      {/* Onboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" />Onboarding</CardTitle>
          <CardDescription>Nieuwe medewerkers inwerkproces</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">6-stappen wizard: Persoonsgegevens → Stamkaart → Verklaringen → Contract → Uitnodigen → Samenvatting</p>
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Loonheffingsverklaring met digitale handtekening</li>
            <li>✓ Stamkaart printen of mailen</li>
            <li>✓ Validatie verplichte velden per stap</li>
            <li>✓ Automatische pincode-aanmaak bij afronden</li>
          </ul>
        </CardContent>
      </Card>

      {/* Stamkaart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-600" />Stamkaart</CardTitle>
          <CardDescription>Medewerker stamkaart apart beheren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Los van onboarding, voor bestaande medewerkers</li>
            <li>✓ Alle persoonsgegevens, BSN, IBAN bewerken</li>
            <li>✓ Loonheffingsverklaring met handtekening</li>
            <li>✓ Opslaan, printen of mailen naar loonadministratie</li>
          </ul>
        </CardContent>
      </Card>

      {/* Documentenbeheer - NIEUW */}
      <DocumentenCard />

      {/* Klanten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-600" />Klanten</CardTitle>
          <CardDescription>Klantbeheer en artikelen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Bedrijfsgegevens, KvK en BTW</li>
            <li>✓ Artikelen en prijsregels per klant</li>
            <li>✓ TI-Model routes met normen</li>
            <li>✓ PostNL Berekeningen: Weekrapport, Besteltijd, Samenvatting</li>
            <li>✓ Excel import en rapportage</li>
          </ul>
        </CardContent>
      </Card>

      {/* Projecten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderKanban className="w-5 h-5 text-cyan-600" />Projecten</CardTitle>
          <CardDescription>Projectbeheer en -tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Projecten per klant, budget en looptijd</li>
            <li>✓ Status volgen, koppeling met tijdregistraties</li>
            <li>✓ Excel import en datavalidatie</li>
          </ul>
        </CardContent>
      </Card>

      {/* Activiteiten - NIEUW */}
      <ActiviteitenCard />

      {/* Loonrapport */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600" />Loonrapporten</CardTitle>
          <CardDescription>Loonverwerking en rapportages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Weekoverzichten per medewerker</li>
            <li>✓ Overuren, nachturen, weekenduren, toeslagen</li>
            <li>✓ Reiskostenvergoeding, verblijfskosten</li>
            <li>✓ Export naar PDF en e-mail</li>
          </ul>
        </CardContent>
      </Card>

      {/* PayChecked Audit - NIEUW */}
      <PayCheckedAuditCard />

      {/* Dagrapport - NIEUW */}
      <DagrapportCard />

      {/* Loontabellen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-600" />Loontabellen</CardTitle>
          <CardDescription>CAO-loontabellen beheren</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ CAO Beroepsgoederenvervoer tabellen</li>
            <li>✓ Loonschalen met tredes, uurloon en maandloon</li>
            <li>✓ Geldig vanaf/tot periodes</li>
          </ul>
        </CardContent>
      </Card>

      {/* CAO-regels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-rose-600" />CAO-regels</CardTitle>
          <CardDescription>Toeslagen en vergoedingsregels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Bijzondere arbeid toeslagen (nacht, weekend, feestdag)</li>
            <li>✓ Overwerkvergoedingen en percentages</li>
            <li>✓ Verblijfskosten en reiskosten</li>
            <li>✓ Pauzeregels per dienstlengte</li>
          </ul>
        </CardContent>
      </Card>

      {/* KPI rapportage - NIEUW */}
      <KpiReportCard />

      {/* Maandcontrole - NIEUW */}
      <MaandcontroleCard />

      {/* Business Dashboard - NIEUW */}
      <BusinessDashboardCard />

      {/* KM Dashboard - NIEUW */}
      <KmDashboardCard />

      {/* Brandstoftoeslag - NIEUW */}
      <FuelSurchargeCard />

      {/* HRM-instellingen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600" />HRM-instellingen</CardTitle>
          <CardDescription>Configuratie en e-mail sjablonen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Urensoorten en uurcodes</li>
            <li>✓ Afdelingen, functies, activiteiten</li>
            <li>✓ Pauzeregels configuratie</li>
            <li>✓ Loonadministratie e-mailinstellingen</li>
            <li>✓ E-mail sjablonen beheer</li>
            <li>✓ Pincodebeheer (sleutelkast)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Communicatie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-sky-600" />Communicatie</CardTitle>
          <CardDescription>Berichten, e-mails & sjablonen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Interne berichten met prioriteit</li>
            <li>✓ E-mail verzenden (individueel of per afdeling via Gmail)</li>
            <li>✓ E-mail sjablonen met categorieën</li>
            <li>✓ Rich text editor</li>
            <li>✓ Reply-To adres instellen</li>
          </ul>
        </CardContent>
      </Card>

      {/* Charters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-violet-600" />Charters</CardTitle>
          <CardDescription>Charterbeheer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Charter overzicht en planning</li>
            <li>✓ Koppeling met voertuigen en chauffeurs</li>
          </ul>
        </CardContent>
      </Card>

      {/* Voertuigen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-amber-600" />Voertuigen</CardTitle>
          <CardDescription>Wagenpark beheer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Kenteken, merk, model, brandstoftype</li>
            <li>✓ APK, verzekering, tachograaf vervaldatums</li>
            <li>✓ Voertuiginspecties met foto's</li>
            <li>✓ NIWO vergunningen koppeling</li>
            <li>✓ Onderhoud en leasecontracten</li>
          </ul>
        </CardContent>
      </Card>

      {/* NIWO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-slate-600" />NIWO Vergunningen</CardTitle>
          <CardDescription>Eurovergunningen beheer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Vergunningsnummers en geldigheid</li>
            <li>✓ Toewijzing aan voertuigen</li>
            <li>✓ Vervaldatum monitoring</li>
          </ul>
        </CardContent>
      </Card>

      {/* Feestdagen - NIEUW */}
      <FeestdagenCard />

      {/* Resultaat & Ontwikkeling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-pink-600" />Resultaat & Ontwikkeling</CardTitle>
          <CardDescription>Beoordelingen en ontwikkeling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Periodieke beoordelingen</li>
            <li>✓ Notities en ontwikkelafspraken</li>
            <li>✓ PDF generatie</li>
          </ul>
        </CardContent>
      </Card>

      {/* Back-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-red-600" />Back-ups & Datamigratie</CardTitle>
          <CardDescription>Gegevensbeveiliging en migratie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Handmatige back-ups met per-entity herstel</li>
            <li>✓ Export naar Supabase PostgreSQL</li>
            <li>✓ Genereer Supabase SQL</li>
            <li>✓ Test database (productie/test gescheiden)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Gebruikers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-gray-600" />Gebruikers & Permissies</CardTitle>
          <CardDescription>Toegangsbeheer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-2 text-slate-600">
            <li>✓ Gebruikers uitnodigen en beheren</li>
            <li>✓ Rollen: Admin en Gebruiker + business roles</li>
            <li>✓ Welkomstmail via Gmail bij uitnodigen</li>
          </ul>
        </CardContent>
      </Card>

      {/* Herberekeningen - NIEUW */}
      <HerberekeningenCard />

      {/* Governance - NIEUW */}
      <GovernanceCard />
    </div>
  );
}