import React from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

export default function HelpMobileEntryCard() {
  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-600" />
          Mobiele Invoer
        </CardTitle>
        <CardDescription>Onderweg uren, ritten en standplaatswerk registreren</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Complete mobiele app voor chauffeurs:
        </p>
        <ul className="text-sm space-y-2 text-slate-600">
          <li>✓ <strong>Dienstregels:</strong> Ritten én standplaatswerk invoeren — rit is niet verplicht</li>
          <li>✓ <strong>Geldige dienst:</strong> Minimaal één dienstregel (rit of standplaats), of "geen rit" aanvinken met reden</li>
          <li>✓ <strong>Meerdere diensten per dag:</strong> Na het indienen kun je een nieuwe dienst op dezelfde dag starten</li>
          <li>✓ <strong>Overzicht ingediende diensten:</strong> Banner met eerder ingediende diensten van dezelfde dag</li>
          <li>✓ <strong>PostNL auto-rit:</strong> Automatisch een open rit aanmaken (start = dienst +1 min, dienst-eind synct +2 min bij afsluiten)</li>
          <li>✓ Voertuiginspectie met foto's</li>
          <li>✓ Declaraties indienen</li>
          <li>✓ <strong>Planning:</strong> Weekoverzicht met shift, route, voertuig, opmerkingen en afwezigheid per dag</li>
          <li>✓ <strong>Feestdagen en vrije dagen:</strong> Automatisch weergegeven in de planning</li>
          <li>✓ Shifttijd weergave</li>
          <li>✓ Offline synchronisatie</li>
          <li>✓ Handtekening functionaliteit</li>
          <li>✓ Berichten en notificaties</li>
          <li>✓ Meerdaagse diensten (profielgestuurd, standaard aan voor geautoriseerde medewerkers)</li>
          <li>✓ <strong>Bedrijfsreglement:</strong> Artikelen doorzoeken en lezen per hoofdstuk</li>
        </ul>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">⏱ Tijdregels:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Regels mogen niet overlappen</li>
            <li>• Regels moeten binnen de diensttijd vallen</li>
            <li>• Dienst-eindtijd mag niet vóór de laatste regel liggen</li>
            <li>• Geen 5-minutenmarge — tijden moeten exact binnen dienst vallen</li>
          </ul>
        </div>
      </CardContent>
    </>
  );
}