import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Mail, FileSpreadsheet, Smartphone, Clock, BookOpen } from 'lucide-react';

export function EmailGuide() {
  return (
    <AccordionItem value="email-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Mail className="w-4 h-4 mr-2" />
        Hoe verstuur ik e-mails naar medewerkers?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Overzicht</h4>
            <p className="text-sm text-slate-600 mb-3">Via de Communicatie-pagina kun je e-mails versturen naar individuele medewerkers of in bulk per afdeling via Gmail.</p>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">1. E-mail versturen</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Ga naar <strong>"Communicatie"</strong> → <strong>"E-mail versturen"</strong></li>
              <li>• Kies <strong>Individueel</strong> of <strong>Per afdeling</strong></li>
              <li>• Optioneel: selecteer een sjabloon</li>
              <li>• Vul onderwerp en inhoud in, stel Reply-To in (standaard info@interdistri.nl)</li>
              <li>• Klik <strong>"Verzenden"</strong></li>
            </ul>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">2. E-mail sjablonen</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Maak herbruikbare sjablonen aan via tabblad "Sjablonen"</li>
              <li>• Categoriseer per Algemeen, HR, Planning, Contract, Overig</li>
              <li>• Sjablonen vullen automatisch onderwerp, inhoud en Reply-To in</li>
            </ul>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700">⚠️ E-mails worden alleen verstuurd naar medewerkers met een ingevuld e-mailadres.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function SystemEmailTemplatesGuide() {
  return (
    <AccordionItem value="system-email-templates-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Mail className="w-4 h-4 mr-2" />
        Hoe beheer ik systeem e-mail sjablonen?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Systeem-sjablonen worden automatisch gebruikt door functies (welkomstmail, contract, afkeuring). Beheer via <strong>HRM-instellingen → E-mail Sjablonen</strong>.</p>
          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-2">Template keys</h4>
            <ul className="text-sm text-slate-600 space-y-1 ml-4">
              <li>• <code>stamkaart</code> — Stamkaart naar loonadministratie</li>
              <li>• <code>welkomstmail</code> — Welkomstmail nieuwe medewerker</li>
              <li>• <code>contract_ter_ondertekening</code> — Contract verzenden</li>
              <li>• <code>dienst_afgekeurd</code> — Afkeuring notificatie</li>
              <li>• <code>contract_ondertekend_door_medewerker</code> — Melding admin</li>
              <li>• <code>contract_geactiveerd</code> — Bevestiging medewerker</li>
              <li>• <code>nieuw_document</code> — Nieuw HR-document</li>
            </ul>
          </div>
          <p className="text-sm text-slate-600">Gebruik <code className="bg-slate-100 px-1 rounded">{"{{placeholder}}"}</code> syntax. Zonder actief sjabloon wordt het standaard systeem-sjabloon gebruikt.</p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function BackupsGuide() {
  return (
    <AccordionItem value="backups-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Shield className="w-4 h-4 mr-2" />
        Hoe werken Back-ups & Supabase Export?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Twee backup-strategieën: <strong>interne back-ups</strong> (JSON in Base44) en <strong>Supabase export</strong> (PostgreSQL).</p>
          <ul className="text-sm text-slate-600 space-y-2 ml-4">
            <li>• <strong>Handmatige Back-up:</strong> Alle entities als JSON, download en per-entity herstel</li>
            <li>• <strong>Supabase SQL:</strong> Genereer CREATE TABLE statements, plak in Supabase SQL Editor</li>
            <li>• <strong>Export:</strong> Alle entities naar Supabase (bestaande data wordt eerst verwijderd)</li>
            <li>• <strong>Herstel:</strong> Import terug uit Supabase of interne backup (typ HERSTEL-BEVESTIGD)</li>
          </ul>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">💡 Dagelijks interne backup, wekelijks Supabase export als extra vangnet.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function EmailChangeGuide() {
  return (
    <AccordionItem value="email-change-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Users className="w-4 h-4 mr-2" />
        E-mailadres wijzigen en medewerker herkoppelen
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Koppeling is op basis van e-mailadres. Bij wijziging: (1) E-mail wijzigen bij medewerker, (2) Nieuw account uitnodigen, (3) Oud account opruimen. <strong>Alle data blijft behouden</strong> — gekoppeld aan Employee ID.</p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">💡 Controleer na wijziging het Koppelingen-tabblad op de Gebruikerspagina.</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function SecurityArchitectureGuide() {
  return (
    <AccordionItem value="security-architecture">
      <AccordionTrigger className="text-base font-semibold">
        <Shield className="w-4 h-4 mr-2" />
        Security Architectuur — Sleutelkast
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Onboarding = juridisch dossier. Sleutelkastbeheer = operationeel, losgekoppeld. Pincode beheer via HRM-instellingen → Pincodebeheer.</p>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✗ Nooit in onboarding, print of PDF</li>
            <li>✓ Alleen via beveiligd HR-tabblad, 30s zichtbaarheid, audit logging</li>
          </ul>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function MultidayGuide() {
  return (
    <AccordionItem value="multiday-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Smartphone className="w-4 h-4 mr-2" />
        Meerdaagse Mobiele App
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Aparte versie voor meerdaagse diensten (charterritten). Activeer via medewerker profiel → Type mobiele app → "multi_day". Max 7 dagen, alle overige functies identiek.</p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ShiftTypeGuide() {
  return (
    <AccordionItem value="shifttype-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Clock className="w-4 h-4 mr-2" />
        Automatisch Diensttype (Dag / Avond / Nacht)
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Automatisch bepaald op basis van start- en eindtijd:</p>
          <ul className="text-sm text-slate-600 space-y-1 ml-4">
            <li>• <strong>Dag:</strong> 05:00–15:59</li>
            <li>• <strong>Avond:</strong> 16:00–20:59</li>
            <li>• <strong>Nacht:</strong> 21:00–04:59 (of avonddienst die na 21:00 eindigt)</li>
          </ul>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function HRImportGuide() {
  return (
    <AccordionItem value="hr-import-guide">
      <AccordionTrigger className="text-base font-semibold">
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        HR Import
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm text-slate-600">Upload een Excel-bestand, koppel kolommen aan medewerkersvelden, bekijk preview en bevestig import. Handig bij opzet of grote wijzigingen.</p>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ReglementGuide() {
  return (
    <AccordionItem value="reglement-mobile-guide">
      <AccordionTrigger className="text-base font-semibold">
        <BookOpen className="w-4 h-4 mr-2" />
        Bedrijfsreglement in de mobiele app
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm text-slate-600">Medewerkers zien het bedrijfsreglement via tabblad "Reglement" in de mobiele app. Artikelen gegroepeerd per hoofdstuk, zoekbaar, uitklapbaar. Beheer via de pagina "Bedrijfsreglement".</p>
      </AccordionContent>
    </AccordionItem>
  );
}

export function EmployeeTogglesGuide() {
  return (
    <AccordionItem value="employee-toggles-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Users className="w-4 h-4 mr-2" />
        Medewerker-toggles (Chauffeur, Planner, Loonrapport)
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Drie toggles onder "Overige gegevens" (standaard aan):</p>
          <ul className="text-sm text-slate-600 space-y-1 ml-4">
            <li>• <strong>Chauffeur:</strong> Nachttoeslag (21:00-05:00) berekenen ja/nee</li>
            <li>• <strong>Tonen in planner:</strong> Zichtbaar in planning ja/nee</li>
            <li>• <strong>Opnemen in loonrapport:</strong> Loonrapport genereren ja/nee</li>
          </ul>
          <p className="text-xs text-slate-500">Onafhankelijk van medewerkerstatus (Actief/Inactief).</p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function TipsGuide() {
  return (
    <AccordionItem value="tips">
      <AccordionTrigger className="text-base font-semibold">
        💡 Algemene Tips & Tricks
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• <strong>Dashboard:</strong> Snelle overview</li>
            <li>• <strong>Zoeken:</strong> Gebruik zoekvelden en filters op afdeling/status/datum</li>
            <li>• <strong>Export:</strong> Planning naar PDF, rapportages voor analyse</li>
            <li>• <strong>Audit Trail:</strong> Alle wijzigingen gelogd — wie, wat, wanneer</li>
          </ul>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}