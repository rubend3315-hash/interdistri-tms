import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Zap, Layers, Users, Clock, CheckSquare, Truck, CalendarDays, Shield } from 'lucide-react';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('functions');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Help & Documentatie</h1>
        <p className="text-slate-500 mt-2">Leer hoe je het Interdistri TMS-systeem gebruikt</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
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
                Hoe keur ik uren goed?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">1. Ingediende uren zien</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      Ga naar "Goedkeuringen" en bekijk het tabblad "Ter goedkeuring". Alle ingediende uren staan hier.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">2. Details bekijken</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik op "Bekijken" om alle details te zien</li>
                      <li>• Controleer start-/eindtijd, pauze en totaal uren</li>
                      <li>• Kijk naar opmerkingen en gekoppelde projecten</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">3. Goedkeuren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik "Goedkeuren" knop</li>
                      <li>• Bevestig</li>
                      <li>• Status verandert naar "Goedgekeurd"</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">4. Afkeuren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik "Afkeuren" knop</li>
                      <li>• Vul een reden in (verplicht)</li>
                      <li>• Status verandert naar "Afgekeurd"</li>
                      <li>• Medewerker kan het corrigeren</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">5. Uren corrigeren</h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li>• Klik "Bekijken" en dan "Bewerken"</li>
                      <li>• Wijzig start-/eindtijd of pauze</li>
                      <li>• <strong>Voer een reden in</strong> (audit trail)</li>
                      <li>• Sla op - wijziging is gelogd</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">
                      💡 <strong>Belangrijk:</strong> Alle wijzigingen worden vastgelegd met datum, auteur en reden. Afgewezen uren gaan terug naar "Concept" zodat de medewerker kan corrigeren.
                    </p>
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
      </Tabs>
    </div>
  );
}