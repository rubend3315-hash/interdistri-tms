import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Satellite, CircleDot, Package, ClipboardList, FileText, FileSpreadsheet,
  LayoutDashboard, Gauge, Fuel, ShieldCheck, CalendarDays, Wrench, Shield,
  FolderKanban, Building2
} from 'lucide-react';

// ======= FUNCTIE KAARTEN (grid in "Functies" tab) =======

export function GpsBuddyImportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-emerald-600" />
          GPS Buddy Import
        </CardTitle>
        <CardDescription>GPS-ritdata synchroniseren vanuit Naiton</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Synchroniseer ritgegevens vanuit het GPS Buddy systeem (Naiton):</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Automatische import van ritten per dag</li>
          <li>✓ Chauffeur koppeling op basis van naam (fuzzy matching)</li>
          <li>✓ Handmatige chauffeur hertoewijzing</li>
          <li>✓ Kenteken, km-stand, rit- en stoptijden</li>
          <li>✓ Depot- en stilstandanalyse per rit</li>
          <li>✓ <strong>Brandstofkosten:</strong> Automatische berekening per km op basis van dieselprijs en voertuigverbruik</li>
          <li>✓ GPS Locatie-instellingen (standplaatsen en depots)</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function StopReportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDot className="w-5 h-5 text-orange-600" />
          Stoprapport
        </CardTitle>
        <CardDescription>Voertuig stop- en stilstandanalyse</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Analyseer stops en stilstand van voertuigen op basis van GPS-data:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Overzicht van alle stops per voertuig per dag</li>
          <li>✓ Depot-stops herkenning met tijdsduur</li>
          <li>✓ Langdurige stilstand detectie (&gt;5 min)</li>
          <li>✓ Filter op datum en voertuig</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function StandplaatsWerkCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          Standplaatswerk
        </CardTitle>
        <CardDescription>Loodswerk en standplaatswerkzaamheden</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Overzicht en beheer van standplaatswerkzaamheden:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Overzicht per medewerker, klant en project</li>
          <li>✓ Start- en eindtijd per werkperiode</li>
          <li>✓ Koppeling met activiteiten en klanten</li>
          <li>✓ Gekoppeld aan tijdregistraties</li>
          <li>✓ Invoer via mobiele app of backoffice</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function DagstaatCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Dagstaat
        </CardTitle>
        <CardDescription>Dagelijkse operationele staat</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Dagelijks overzicht van alle operationele activiteiten:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Gecombineerd overzicht van diensten, ritten en standplaatswerk</li>
          <li>✓ Per medewerker gegroepeerd</li>
          <li>✓ Start- en eindtijden, voertuig en klant</li>
          <li>✓ Print-vriendelijk formaat</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function DocumentenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-600" />
          Documentenbeheer
        </CardTitle>
        <CardDescription>HR-documenten uploaden en beheren</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Centraal documentenmanagement voor HR:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Documenten uploaden per medewerker</li>
          <li>✓ Categorieën: Rijbewijs, ID, Contract, Certificaat, etc.</li>
          <li>✓ Vervaldatum bijhouden met automatische waarschuwing</li>
          <li>✓ <strong>Compliance dashboard:</strong> Overzicht ontbrekende en verlopen documenten</li>
          <li>✓ <strong>Documentmatrix:</strong> Per medewerker zien welke documenten compleet zijn</li>
          <li>✓ Bulk acties voor meerdere documenten tegelijk</li>
          <li>✓ Automatische notificatie bij bijna verlopen documenten</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function KpiReportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          KPI rapportage PostNL
        </CardTitle>
        <CardDescription>Medewerker KPI's en prestatieoverzicht</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Prestatie-indicatoren per medewerker:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ KPI-tabellen per medewerker en week</li>
          <li>✓ KPI-doelen instellen en monitoren</li>
          <li>✓ Import van KPI-data uit Excel</li>
          <li>✓ Trendgrafieken over tijd</li>
          <li>✓ Jaaroverzicht per medewerker</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function MaandcontroleCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-teal-600" />
          Maandcontrole
        </CardTitle>
        <CardDescription>Maandelijks controledashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Maandelijks overzicht voor controle en facturering:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Weekoverzichten per klant</li>
          <li>✓ Uren, ritten en kosten per periode</li>
          <li>✓ Detailweergave per week</li>
          <li>✓ Exporteerbaar voor facturering</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function BusinessDashboardCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          Business Dashboard
        </CardTitle>
        <CardDescription>Commercieel overzicht en omzetanalyse</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Strategisch overzicht voor management:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ KPI-kaarten: uren, omzet, klanten, km</li>
          <li>✓ Omzet per klant (grafiek en tabel)</li>
          <li>✓ Uren trendanalyse over weken</li>
          <li>✓ KM-overzicht per periode</li>
          <li>✓ Filterbaar op week, maand of custom periode</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function KmDashboardCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-slate-600" />
          KM Dashboard
        </CardTitle>
        <CardDescription>Vloot kilometerregistratie en brandstofanalyse</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Vlootbeheer met km- en brandstofdata:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Totaal km per voertuig en chauffeur</li>
          <li>✓ GPS-ritdata naast handmatige ritten</li>
          <li>✓ Brandstofverbruik en kostenberekening</li>
          <li>✓ Dieselprijs grafiek (TLN brandstofmonitor)</li>
          <li>✓ Route-analyse en voertuigsamenvatting</li>
          <li>✓ Print-vriendelijk overzicht</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function FuelSurchargeCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-orange-600" />
          Brandstoftoeslag
        </CardTitle>
        <CardDescription>Brandstoftoeslag berekenen per klant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Bereken brandstoftoeslagen op basis van actuele dieselprijzen:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Klant-specifieke brandstofinstellingen per voertuigtype</li>
          <li>✓ Basisprijs vs. actuele dieselprijs (TLN/CBS)</li>
          <li>✓ Automatische berekening toeslag per dag, week of custom periode</li>
          <li>✓ Gedetailleerde rapportage per rit</li>
          <li>✓ Dieselprijs synchronisatie vanuit TLN en CBS</li>
          <li>✓ Geschiedenis van eerdere berekeningen</li>
          <li>✓ Prijstrendgrafieken</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function PayCheckedAuditCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          PayChecked Audit
        </CardTitle>
        <CardDescription>Loon- en urencontrole</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Auditering van loonberekeningen en urenregistratie:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Normenset controle (CAO-compliance)</li>
          <li>✓ Uren-audit per medewerker</li>
          <li>✓ Ritten-audit en km-controle</li>
          <li>✓ Loonrapport verificatie</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function DagrapportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          Dagrapport (Payroll)
        </CardTitle>
        <CardDescription>Dagelijks loonrapport voor export</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Dagelijkse loonexport voor loonadministratie:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Gedetailleerde dagrapportage per medewerker</li>
          <li>✓ Export naar JSON voor externe systemen</li>
          <li>✓ Automatische verzending naar Azure</li>
          <li>✓ Uursoort-mapping configuratie</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function ActiviteitenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-cyan-600" />
          Activiteiten
        </CardTitle>
        <CardDescription>Activiteiten voor standplaatswerk</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Beheer activiteiten die gekoppeld worden aan standplaatswerk:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Aanmaken en beheren van activiteitnamen</li>
          <li>✓ Koppeling met klanten</li>
          <li>✓ Zichtbaar in mobiele app bij standplaatswerk invoer</li>
          <li>✓ Rapportage per activiteit</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function FeestdagenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-purple-600" />
          Feestdagen
        </CardTitle>
        <CardDescription>Feestdagenbeheer per jaar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Configureer nationale feestdagen:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Feestdagen per jaar instellen</li>
          <li>✓ Automatisch zichtbaar in planning (paarse badge)</li>
          <li>✓ Berekening feestdagtoeslagen in loonrapporten</li>
          <li>✓ Zichtbaar in mobiele app planning</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function HerberekeningenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-red-600" />
          Herberekeningen
        </CardTitle>
        <CardDescription>Systeem herberekeningen en correcties</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Herbereken diensten en loondata na wijzigingen:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ Pauze herberekening op basis van CAO-staffel</li>
          <li>✓ Nachturen en toeslagen herberekenen</li>
          <li>✓ Weekrapportages opnieuw genereren</li>
          <li>✓ Maandsamenvatting herbouwen</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function GovernanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Governance & Security
        </CardTitle>
        <CardDescription>Beveiliging, compliance en risicobeheersing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">Uitgebreide governance- en securitymodules:</p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ <strong>Governance Dashboard:</strong> Overzicht van alle security- en compliancestatus</li>
          <li>✓ <strong>Toegangscontrole (RBAC):</strong> Rolgebaseerde toegangsbeheersing met business roles</li>
          <li>✓ <strong>Rollen & Rechten matrix:</strong> Overzicht welke rol toegang heeft tot welke pagina</li>
          <li>✓ <strong>Audit Log:</strong> Volledig overzicht van alle systeemwijzigingen en acties</li>
          <li>✓ <strong>RBAC Audit:</strong> Monitoring van rol-toewijzingen, submissions en systeem-integriteit</li>
          <li>✓ <strong>Security Samenvatting:</strong> High-level beveiligingsoverzicht</li>
          <li>✓ <strong>Trust & Security:</strong> Publieke vertrouwens- en beveiligingspagina</li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ======= HANDLEIDING ITEMS (accordion in "Handleiding" tab) =======

export function GpsBuddyGuide() {
  return (
    <AccordionItem value="gps-buddy-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Satellite className="w-4 h-4 mr-2" />
        Hoe gebruik ik GPS Buddy Import?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">1. Ritten synchroniseren</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Ga naar <strong>"GPS Buddy Import"</strong></li>
              <li>• Selecteer een datum en klik <strong>"Synchroniseren"</strong></li>
              <li>• Het systeem haalt ritten op uit Naiton GPS Buddy</li>
              <li>• Chauffeurs worden automatisch gekoppeld op basis van naam</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">2. Chauffeur hertoewijzen</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Als de automatische koppeling niet klopt, klik op de chauffeursnaam</li>
              <li>• Zoek de juiste medewerker en selecteer</li>
              <li>• De koppeling wordt opgeslagen in TripRecordLink</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">3. Naammatching</h4>
            <p className="text-sm text-slate-600 mb-2">Het systeem gebruikt fuzzy matching:</p>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Suffixen zoals "(8045)" worden automatisch verwijderd</li>
              <li>• Afgekorte voornamen worden herkend (bijv. "Kim" → "Kimberley")</li>
              <li>• Tussenvoegels in achternamen worden overgeslagen (bijv. "Szulc Danlowski" → "Danlowski")</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">4. Brandstofkosten</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Kosten per km worden automatisch berekend op basis van voertuigtype en actuele dieselprijs</li>
              <li>• Configureer verbruiksinstellingen via <strong>Brandstoftoeslag → Instellingen</strong></li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">5. In Goedkeuringen</h4>
            <p className="text-sm text-slate-600">GPS-ritten worden automatisch getoond bij de goedkeuring van diensten, zodat je de ingediende uren kunt vergelijken met de GPS-data.</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm text-emerald-700">💡 <strong>Tip:</strong> Synchroniseer dagelijks voor de meest actuele data. GPS-ritten worden gefilterd op de shift-tijden van de medewerker.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function FuelSurchargeGuide() {
  return (
    <AccordionItem value="fuel-surcharge-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Fuel className="w-4 h-4 mr-2" />
        Hoe bereken ik brandstoftoeslagen?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">1. Instellingen configureren</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Ga naar <strong>"Brandstoftoeslag"</strong> → tabblad <strong>"Instellingen"</strong></li>
              <li>• Voeg per klant en voertuigtype een configuratie toe</li>
              <li>• Stel de <strong>basisprijs</strong> in (de afgesproken dieselprijs met de klant)</li>
              <li>• Kies de berekeningswijze: <strong>per km</strong> of <strong>per uur</strong></li>
              <li>• Configureer het brandstofverbruik (bijv. 1 op 7 = 0.143 L/km)</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">2. Toeslag berekenen</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Selecteer een klant en periode (dag, week of custom)</li>
              <li>• Klik <strong>"Berekenen"</strong></li>
              <li>• Het systeem gebruikt GPS-ritdata en de actuele dieselprijs</li>
              <li>• De toeslag = verschil tussen actuele kosten en kosten bij basisprijs</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">3. Dieselprijzen</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• <strong>TLN Brandstofmonitor:</strong> Wekelijkse dieselprijs excl. BTW, synchroniseer via de knop</li>
              <li>• <strong>CBS Pompprijs:</strong> Dagelijkse CBS pompprijs als backup-bron</li>
              <li>• Prijsgrafieken tonen trends over tijd</li>
            </ul>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-700">💡 <strong>Tip:</strong> Synchroniseer de TLN-prijzen regelmatig. Het systeem zoekt automatisch de dichtstbijzijnde beschikbare prijs per ritdatum.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function KmDashboardGuide() {
  return (
    <AccordionItem value="km-dashboard-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Gauge className="w-4 h-4 mr-2" />
        Hoe gebruik ik het KM Dashboard?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
            <p className="text-sm text-slate-600 mb-3">Het KM Dashboard combineert handmatige ritdata met GPS-data om een compleet beeld te geven van het wagenpark.</p>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">Functies</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• <strong>Samenvatting:</strong> Totaal km, uren, ritten en gemiddelden</li>
              <li>• <strong>Voertuig analyse:</strong> Km per voertuig met GPS-vergelijking</li>
              <li>• <strong>Route analyse:</strong> Km per route geaggregeerd</li>
              <li>• <strong>Brandstofkosten:</strong> Geschatte kosten op basis van verbruik en dieselprijs</li>
              <li>• <strong>Dieselprijs grafiek:</strong> TLN historische prijzen met trend</li>
              <li>• <strong>Rit details:</strong> Volledige tabel met alle ritten</li>
            </ul>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">💡 Filter op dag, week of custom periode. Gebruik voertuig- en chauffeurfilters voor specifieke analyses.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function DocumentenGuide() {
  return (
    <AccordionItem value="documenten-guide">
      <AccordionTrigger className="text-base font-semibold">
        <FileText className="w-4 h-4 mr-2" />
        Hoe gebruik ik Documentenbeheer?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">1. Documenten uploaden</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Ga naar <strong>"Documentenbeheer"</strong></li>
              <li>• Klik <strong>"Document uploaden"</strong></li>
              <li>• Selecteer medewerker, type en vervaldatum</li>
              <li>• Upload het bestand (PDF, afbeelding, etc.)</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">2. Compliance dashboard</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Overzicht van <strong>verlopen</strong>, <strong>bijna verlopen</strong> en <strong>ontbrekende</strong> documenten</li>
              <li>• <strong>Documentmatrix</strong> per medewerker — groen/rood per documenttype</li>
              <li>• Automatische notificaties bij bijna verlopen documenten</li>
            </ul>
          </div>
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <p className="text-sm text-violet-700">💡 <strong>Tip:</strong> Gebruik de documentmatrix om snel te zien welke medewerkers incomplete dossiers hebben.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function GovernanceGuide() {
  return (
    <AccordionItem value="governance-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Shield className="w-4 h-4 mr-2" />
        Hoe werken Governance & Rollen?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Rolmodel (RBAC)</h4>
            <p className="text-sm text-slate-600 mb-3">Het systeem gebruikt rolgebaseerde toegang met de volgende rollen:</p>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• <strong>SUPER_ADMIN:</strong> Volledige toegang tot alle functies</li>
              <li>• <strong>OPERATIONS_MANAGER:</strong> Operationeel beheer, goedkeuringen, planning</li>
              <li>• <strong>HR_MANAGER:</strong> Medewerkers, contracten, onboarding, documenten</li>
              <li>• <strong>SUPERVISOR:</strong> Goedkeuringen, tijdregistratie, ritten</li>
              <li>• <strong>PLANNER:</strong> Planning, voertuigen, routes</li>
              <li>• <strong>FINANCE:</strong> Loonrapporten, klanten, facturering</li>
              <li>• <strong>EMPLOYEE:</strong> Alleen mobiele app</li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">Audit & Monitoring</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• <strong>Audit Log:</strong> Elke wijziging wordt gelogd met gebruiker, actie en tijdstip</li>
              <li>• <strong>RBAC Audit:</strong> Monitor rol-wijzigingen en verdachte patronen</li>
              <li>• <strong>Submission monitoring:</strong> Real-time overzicht van mobiele indieningen</li>
            </ul>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-700">💡 Rollen worden ingesteld via <strong>Gebruikers</strong> pagina → business_role veld. Bekijk de Rollen & Rechten matrix voor een compleet overzicht.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}