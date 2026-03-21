import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Layers, Shield, Download, FileText, CalendarDays, Users, FileSpreadsheet, Lock, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import HelpStabilisatieUpdates from '../components/help/HelpStabilisatieUpdates';
import HelpFunctionsTab from '../components/help/HelpFunctionsTab';
import HelpHandleidingTab from '../components/help/HelpHandleidingTab';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('functions');

  const handleDownloadPDF = () => {
    toast.info('Het document wordt voorbereid voor download...');
    setTimeout(() => window.print(), 100);
  };

  const handleDownloadHTML = () => {
    const content = document.getElementById('help-content');
    if (!content) return;
    const htmlContent = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Interdistri TMS - Help</title><style>body{font-family:Arial,sans-serif;line-height:1.6;max-width:1200px;margin:0 auto;padding:20px;color:#1e293b}h1{border-bottom:2px solid #3b82f6;padding-bottom:.3em}ul{margin-left:20px}li{margin-bottom:.5em}</style></head><body><h1>Interdistri TMS - Help & Documentatie</h1><p style="color:#64748b">Versie: ${new Date().toLocaleDateString('nl-NL')}</p>${content.innerHTML}</body></html>`;
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Help & Documentatie</h1>
          <p className="text-slate-500 mt-2">Leer hoe je het Interdistri TMS-systeem gebruikt</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadHTML} variant="outline" className="gap-2"><FileText className="w-4 h-4" />Download HTML</Button>
          <Button onClick={handleDownloadPDF} className="gap-2 bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4" />Opslaan als PDF</Button>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } h1 { page-break-before: always; } h1:first-of-type { page-break-before: avoid; } }`}</style>
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Lock className="w-5 h-5 text-blue-700" /></div>
          <div><p className="text-sm font-semibold text-slate-900">Security Architectuur</p><p className="text-xs text-slate-500">Formele beveiligingsdocumentatie — alleen voor Admin</p></div>
        </div>
        <Link to={createPageUrl("SecurityArchitecture")}><Button variant="outline" size="sm" className="gap-2"><Shield className="w-4 h-4" /> Bekijken</Button></Link>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 no-print">
          <TabsTrigger value="functions" className="gap-2"><Zap className="w-4 h-4" />Functies</TabsTrigger>
          <TabsTrigger value="system-rules" className="gap-2"><Shield className="w-4 h-4" />Systeemregels</TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2"><Layers className="w-4 h-4" />Opbouw</TabsTrigger>
          <TabsTrigger value="guide" className="gap-2"><BookOpen className="w-4 h-4" />Handleiding</TabsTrigger>
          <TabsTrigger value="updates" className="gap-2"><Wrench className="w-4 h-4" />Updates</TabsTrigger>
        </TabsList>

        <div id="help-content">

        {/* SYSTEEMREGELS TAB */}
        <TabsContent value="system-rules" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" />Systeemregels & Afspraken</CardTitle>
              <CardDescription>Vastgelegde regels die door het hele systeem worden gehanteerd.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><CalendarDays className="w-5 h-5" />Weekdefinitie (ISO 8601)</h3>
                <ul className="space-y-2 ml-4 text-sm text-blue-800">
                  <li>• Week loopt van <strong>maandag t/m zondag</strong> (ISO 8601)</li>
                  <li>• Filtering op <strong>werkelijke datumbereik</strong> van de week</li>
                  <li>• Cross-year weken worden correct meegenomen</li>
                </ul>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2"><Shield className="w-5 h-5" />Automatische Medewerkercontroles</h3>
                <ul className="space-y-2 ml-4 text-sm text-red-800">
                  <li>• Dagelijks om 06:00: verlopen contracten → "Uit dienst"</li>
                  <li>• Contractregels en reiskostenregels automatisch afgesloten</li>
                  <li>• Inactief/Uit dienst = geen toegang</li>
                  <li>• 30-dagen waarschuwing voor contractafloop</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Rapportageregels</h3>
                <ul className="space-y-2 ml-4 text-sm text-green-800">
                  <li>• Alle weekrapporten hanteren dezelfde weekdefinitie</li>
                  <li>• Import-data gefilterd op datumbereik, niet weeknummerveld</li>
                  <li>• Maandagtarieven apart berekend</li>
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2"><Users className="w-5 h-5" />Naamconventies</h3>
                <ul className="space-y-2 ml-4 text-sm text-amber-800">
                  <li>• Chauffeursnamen worden genormaliseerd (komma's verwijderd)</li>
                  <li>• GPS Buddy: suffix "(8045)" wordt gestript, fuzzy matching op voornaam en achternaam</li>
                  <li>• KPI-matching: flexibele contains-vergelijking</li>
                </ul>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2"><Layers className="w-5 h-5" />Data ophalen</h3>
                <ul className="space-y-2 ml-4 text-sm text-purple-800">
                  <li>• Grote datasets met paginering (max 500/batch)</li>
                  <li>• Deduplicatie op datum + chauffeur + ritnaam + vrijgavetijd</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNCTIES TAB */}
        <TabsContent value="functions" className="space-y-6 mt-6">
          <HelpFunctionsTab />
        </TabsContent>

        {/* OPBOUW TAB */}
        <TabsContent value="architecture" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Hoe het systeem werkt</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">🏗️ Architectuur</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200"><h4 className="font-medium text-blue-900 mb-2">Frontend</h4><p className="text-sm text-blue-700">React-applicatie met alle pagina's en formulieren.</p></div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200"><h4 className="font-medium text-green-900 mb-2">Database</h4><p className="text-sm text-green-700">Alle gegevens opgeslagen in entities.</p></div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200"><h4 className="font-medium text-purple-900 mb-2">Backend</h4><p className="text-sm text-purple-700">Verwerkingslogica en integraties.</p></div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">📊 Entities (Gegevenstructuur)</h3>
                <Accordion type="single" collapsible>
                  {[
                    ["employee", "👤 Employee", "Persoonlijke gegevens, contracten, rijbewijs, loonschaal, afdeling, ID-document, loonheffingsverklaring."],
                    ["onboarding", "🚀 OnboardingProcess", "Onboardingproces per medewerker: stap, status, verklaringen, contract, handtekening."],
                    ["keylocker", "🔐 KeylockerPincode", "Beveiligde sleutelkastpincodes. Losgekoppeld van onboarding. Audit logging."],
                    ["contract", "📝 Contract", "Contractgegevens: type, datum, uurloon, inhoud (HTML), ondertekeningen, status."],
                    ["template", "📋 ContractTemplate", "Sjablonen per contracttype met placeholders."],
                    ["completed", "✅ CompletedContract", "Archief volledig ondertekende contracten."],
                    ["timeentry", "⏱️ TimeEntry", "Start/eind, pauzes, uren, overwerk, project, klant, status."],
                    ["trip", "🚚 Trip", "Routes, km, brandstof, voertuig, chauffeur, klant."],
                    ["triprecord", "📡 TripRecord", "GPS Buddy ritdata: chauffeur, kenteken, km, start/eind, depot, stilstand."],
                    ["triprecordlink", "🔗 TripRecordLink", "Koppeling GPS-rit aan medewerker."],
                    ["standplaats", "📦 StandplaatsWerk", "Standplaatswerkzaamheden: klant, project, activiteit, start/eind."],
                    ["schedule", "📅 Schedule", "Wekelijkse roosters per medewerker, route en voertuig."],
                    ["vehicle", "🚗 Vehicle", "Kenteken, merk, brandstof, APK, verzekering, tachograaf, status."],
                    ["customer", "🏢 Customer", "Bedrijfsgegevens, contactpersonen, KvK, BTW, artikelen."],
                    ["project", "📂 Project", "Projectnaam, klant, budget, status."],
                    ["cao", "📋 CaoRule", "Toeslagen, vergoedingen, werktijd- en pauzeregels."],
                    ["shifttime", "🚨 ShiftTime", "Starttijden per afdeling, berichten voor medewerkers."],
                    ["fuelsettings", "⛽ CustomerFuelSettings", "Brandstofverbruik per klant/voertuigtype, basisprijs."],
                    ["fuelsurcharge", "📊 FuelSurcharge", "Berekende brandstoftoeslagen per klant/periode."],
                    ["dieselprice", "💰 DieselPrice", "TLN dieselprijzen excl. BTW per datum."],
                    ["cbsprice", "📈 CbsDieselPrice", "CBS pompprijzen per datum."],
                    ["document", "📄 Document", "HR-documenten per medewerker met vervaldatum."],
                    ["notification", "🔔 Notification", "Systeemnotificaties bij events."],
                    ["auditlog", "📋 AuditLog", "Alle systeemwijzigingen gelogd."],
                    ["message", "✉️ Message", "Interne berichten."],
                    ["emailtemplate", "📧 EmailTemplate", "E-mail sjablonen (bericht + systeem)."],
                    ["break", "☕ BreakSchedule", "Pauzeregels per dienstlengte."],
                    ["holiday", "🎄 Holiday", "Feestdagen per jaar."],
                    ["salary", "💵 SalaryTable", "CAO-loontabellen."],
                    ["inspection", "🔍 VehicleInspection", "Voertuiginspecties met foto's."],
                    ["expense", "💰 Expense", "Declaraties met bonnen."],
                    ["niwo", "📄 NiwoPermit", "Eurovergunningen."],
                    ["gpslocation", "📍 GpsLocation", "GPS standplaatsen en depots voor ritherkenning."],
                    ["loonperiode", "📆 LoonperiodeStatus", "Status van loonperiodes (open/definitief)."],
                  ].map(([key, title, desc]) => (
                    <AccordionItem key={key} value={key}>
                      <AccordionTrigger>{title}</AccordionTrigger>
                      <AccordionContent><p className="text-sm text-slate-600">{desc}</p></AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">🔄 Statusverloop</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3"><Badge className="bg-slate-100 text-slate-700">Concept</Badge><p className="text-sm text-slate-600">Nog niet ingediend</p></div>
                  <div className="flex items-center gap-3"><Badge className="bg-amber-100 text-amber-700">Ingediend</Badge><p className="text-sm text-slate-600">Wacht op goedkeuring</p></div>
                  <div className="flex items-center gap-3"><Badge className="bg-emerald-100 text-emerald-700">Goedgekeurd</Badge><p className="text-sm text-slate-600">Geaccepteerd en afgerond</p></div>
                  <div className="flex items-center gap-3"><Badge className="bg-red-100 text-red-700">Afgekeurd</Badge><p className="text-sm text-slate-600">Geweigerd, terug naar Concept</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HANDLEIDING TAB */}
        <TabsContent value="guide" className="space-y-6 mt-6">
          <HelpHandleidingTab />
        </TabsContent>

        {/* UPDATES TAB */}
        <TabsContent value="updates" className="space-y-6 mt-6">
          <HelpStabilisatieUpdates />
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}