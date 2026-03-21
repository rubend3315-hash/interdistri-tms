import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, CalendarDays, CheckSquare, Users, Truck, CircleDot, FileText, Building2, FileSpreadsheet, Smartphone } from 'lucide-react';

export default function HelpHandleidingGuides() {
  return (
    <>
      {/* Tijdregistratie */}
      <AccordionItem value="timetracking-guide">
        <AccordionTrigger className="text-base font-semibold"><Clock className="w-4 h-4 mr-2" />Hoe gebruik ik Tijdregistratie?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">1. De wekelijks weergave</h4>
              <p className="text-sm text-slate-600 mb-3">Navigeer naar de gewenste week. Je ziet alle medewerkers en hun uren per dag.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">2. Een uur toevoegen</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Klik op "Uur toevoegen"</li><li>• Selecteer medewerker, datum, start- en eindtijd</li><li>• Kies diensttype, project, klant</li><li>• Sla op als "Concept" of dien direct in</li></ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">3. Status veranderen</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Concept → Ingediend: klaar voor goedkeuring</li><li>• Ingediend → Concept: terugtrekken</li><li>• Afgekeurd → Concept: opnieuw bewerken</li></ul>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><p className="text-sm text-blue-700">💡 De pauze wordt automatisch berekend. Je kunt dit handmatig aanpassen.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Planning */}
      <AccordionItem value="planning-guide">
        <AccordionTrigger className="text-base font-semibold"><CalendarDays className="w-4 h-4 mr-2" />Hoe plan ik roosters?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">1. Planning openen</h4>
              <p className="text-sm text-slate-600">Selecteer week/jaar, schakel tussen afdelingen via tabs.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">2. Diensten toekennen</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Klik op cel → shift-dialoog</li><li>• Tijdblokken, route, voertuig, 2 notitievelden</li><li>• Kopieer naar meerdere dagen</li></ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">3. Afwezigheid</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Ziek, Verlof, ATV, Opleiding: automatische badge</li><li>• Feestdagen: paarse badge</li><li>• Vrij: contractuele vrije dag badge</li></ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">4. Drag & drop</h4>
              <p className="text-sm text-slate-600">Versleep diensten tussen cellen. Sleep middelen vanuit "Beschikbare middelen" paneel.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">5. Voorplanning & Templates</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Automatisch genereren op basis van templates</li><li>• Templates opslaan/laden</li><li>• Bestaande cellen niet overschreven</li></ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">6. Kopiëren</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Week kopiëren (optioneel meerdere weken, met keuze)</li><li>• Dag kopiëren naar andere dagen</li></ul>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200"><p className="text-sm text-green-700">💡 PDF export beschikbaar. Contract-uren per dag/week zichtbaar.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Goedkeuringen */}
      <AccordionItem value="approvals-guide">
        <AccordionTrigger className="text-base font-semibold"><CheckSquare className="w-4 h-4 mr-2" />Hoe keur ik uren goed of af?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Drie stappen: bekijken, goedkeuren/afkeuren, corrigeren. Alle wijzigingen in audit trail.</p>
            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-2">1. Bekijken</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Tabblad "Ter goedkeuring"</li><li>• Controleer tijden, pauze, totaal, GPS-data</li><li>• Tijdlijn met ritten, standplaatswerk en GPS Buddy</li></ul>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-2">2. Goedkeuren</h4>
              <p className="text-sm text-slate-600">Klik "Goedkeuren" → status wordt Goedgekeurd.</p>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-2">3. Afkeuren</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Klik "Afkeuren" → verplichte reden opgeven</li><li>• Status terug naar Concept</li><li>• Automatische e-mail naar medewerker</li></ul>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-2">4. Corrigeren (audit trail)</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• "Bekijken" → "Bewerken" → wijzigen → reden verplicht</li><li>• Alle wijzigingen gelogd (wie, wanneer, voor/na)</li></ul>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Afkeuren stuurt automatisch e-mail</li>
                <li>• Alle wijzigingen gelogd in audit trail</li>
                <li>• Tijdoverlap detectie bij conflicterende diensten</li>
              </ul>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Medewerkers */}
      <AccordionItem value="employees-guide">
        <AccordionTrigger className="text-base font-semibold"><Users className="w-4 h-4 mr-2" />Hoe beheer ik medewerkers?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">1. Toevoegen</h4>
              <p className="text-sm text-slate-600">Medewerkers → Toevoegen → Persoonlijke, contract- en voertuiggegevens invullen.</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">2. Belangrijke velden</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Personeelsnummer, afdeling, contracttype, uren</li><li>• Chauffeur-toggle (nachttoeslag ja/nee)</li><li>• Tonen in planner, Opnemen in loonrapport</li></ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">3. Automatische uitdiensttreding</h4>
              <ul className="text-sm text-slate-600 space-y-1"><li>• Dagelijkse controle om 06:00</li><li>• Verlopen contract → Uit dienst</li><li>• Contractregels/reiskostenregels automatisch afgesloten</li><li>• 30-dagen waarschuwing voor contractafloop</li></ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200"><p className="text-sm text-red-700">⚠️ Zonder actieve contractregels kunnen geen diensten worden ingevoerd.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Voertuigen */}
      <AccordionItem value="vehicles-guide">
        <AccordionTrigger className="text-base font-semibold"><Truck className="w-4 h-4 mr-2" />Hoe beheer ik voertuigen?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 space-y-1"><li>• Kenteken, merk, model, vervaldatums invoeren</li><li>• Status: Beschikbaar / In onderhoud / Defect / Uit dienst</li><li>• Dashboard toont verlopen documenten</li></ul>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200"><p className="text-sm text-orange-700">💡 APK en verzekering worden automatisch gemonitord.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Dienst-Shifttijd */}
      <AccordionItem value="shifttime-guide">
        <AccordionTrigger className="text-base font-semibold"><CircleDot className="w-4 h-4 mr-2" />Hoe gebruik ik Dienst-Shifttijd?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 space-y-1"><li>• Stel starttijden per afdeling per datum in</li><li>• Optioneel: geldige shifttijden en bericht</li><li>• Zichtbaar in mobiele app (amber blok in header)</li></ul>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Onboarding */}
      <AccordionItem value="onboarding-guide">
        <AccordionTrigger className="text-base font-semibold"><Users className="w-4 h-4 mr-2" />Hoe werkt de Onboarding?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">6-stappen wizard voor nieuwe medewerkers:</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Stap 1:</strong> Persoonsgegevens en pasfoto</li>
              <li>• <strong>Stap 2:</strong> Stamkaart (rijbewijs, ID, loonschaal, IBAN, loonheffing)</li>
              <li>• <strong>Stap 3:</strong> Verklaringen (sleutelkast, GPS, reglement, handtekening)</li>
              <li>• <strong>Stap 4:</strong> Contract genereren uit sjabloon</li>
              <li>• <strong>Stap 5:</strong> Uitnodigen voor mobiele app</li>
              <li>• <strong>Stap 6:</strong> Samenvatting en afronden</li>
            </ul>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><p className="text-sm text-blue-700">💡 Bij afronden wordt automatisch een sleutelkastpincode aangemaakt.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Stamkaart */}
      <AccordionItem value="stamkaart-guide">
        <AccordionTrigger className="text-base font-semibold"><FileText className="w-4 h-4 mr-2" />Hoe gebruik ik de Stamkaart?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Los van onboarding, voor bestaande medewerkers:</p>
            <ul className="text-sm text-slate-600 space-y-1"><li>• Zoek medewerker → bewerk alle velden</li><li>• Loonheffingsverklaring met handtekening</li><li>• Opslaan, printen of mailen naar loonadministratie</li></ul>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Contracten */}
      <AccordionItem value="contracts-guide">
        <AccordionTrigger className="text-base font-semibold"><FileText className="w-4 h-4 mr-2" />Hoe beheer ik contracten?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Contractregels:</strong> Start/eind, loonschaal, uren, rooster</li>
              <li>• <strong>Reiskostenregels:</strong> Afstand en dagvergoeding</li>
              <li>• <strong>Contract genereren:</strong> Uit sjabloon met automatische invulling</li>
              <li>• <strong>Verzenden:</strong> E-mail met ondertekeningslink</li>
              <li>• <strong>Ondertekeningsflow:</strong> Medewerker → Management → Actief</li>
              <li>• <strong>Herinneringen:</strong> Herinnering versturen bij openstaande contracten</li>
              <li>• <strong>Sjablonen:</strong> Per contracttype beheren met standaard</li>
            </ul>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200"><p className="text-sm text-amber-700">⚠️ Medewerker moet als app-gebruiker uitgenodigd zijn voor contractondertekening.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Klanten */}
      <AccordionItem value="customers-guide">
        <AccordionTrigger className="text-base font-semibold"><Building2 className="w-4 h-4 mr-2" />Hoe beheer ik klanten?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 space-y-1"><li>• Bedrijfsgegevens, KvK, BTW</li><li>• Artikelen en prijsregels per klant</li><li>• TI-Model Routes met normen</li><li>• Excel import en omzetberekening</li></ul>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* PostNL */}
      <AccordionItem value="postnl-calculations-guide">
        <AccordionTrigger className="text-base font-semibold"><Building2 className="w-4 h-4 mr-2" />Hoe gebruik ik PostNL Berekeningen?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Vier rapporttypes op basis van importdata:</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Weekrapport:</strong> Omzet per dag, maandagtarief apart</li>
              <li>• <strong>Besteltijd & Uurtarief:</strong> Efficiency per rit</li>
              <li>• <strong>Samenvatting:</strong> Geaggregeerd per route/chauffeur</li>
              <li>• <strong>Activiteitenrapport:</strong> Dagelijks detail, dagfilter</li>
            </ul>
            <p className="text-sm text-slate-600">Auto-detectie laatste import. Print/PDF per rapport.</p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Loonrapporten */}
      <AccordionItem value="salary-reports-guide">
        <AccordionTrigger className="text-base font-semibold"><FileSpreadsheet className="w-4 h-4 mr-2" />Hoe gebruik ik loonrapporten?</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Selecteer week en medewerker(s)</li>
              <li>• Automatische berekening: gewerkte uren, overuren, nacht, weekend, feestdag</li>
              <li>• Toeslagen, reiskosten, verblijfskosten, inhoudingen</li>
              <li>• <strong>Chauffeur-toggle:</strong> Bepaalt nachttoeslag berekening</li>
              <li>• <strong>Opnemen in loonrapport:</strong> Uitsluiten van rapport</li>
            </ul>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200"><p className="text-sm text-amber-700">⚠️ Toggles instellen bij medewerker profiel → Overige gegevens.</p></div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </>
  );
}