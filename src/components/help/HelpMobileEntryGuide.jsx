import React from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Smartphone } from "lucide-react";

export default function HelpMobileEntryGuide() {
  return (
    <AccordionItem value="mobile-entry-guide">
      <AccordionTrigger className="text-base font-semibold">
        <Smartphone className="w-4 h-4 mr-2" />
        Hoe gebruik ik de Mobiele App?
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">1. Dienst starten</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Kies de datum</li>
              <li>• Vul je starttijd in</li>
              <li>• (Optioneel) Vink PostNL aan — er wordt automatisch een open rit aangemaakt</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">2. Ritten invoeren</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Starttijd wordt automatisch ingevuld</li>
              <li>• Eindtijd kan later worden ingevoerd</li>
              <li>• Kenteken, begin km en route zijn verplicht</li>
              <li>• Eind km is verplicht bij het afsluiten van een rit</li>
              <li>• Optioneel: brandstof, AdBlue, laadgegevens, opmerkingen</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">3. Standplaatswerk invoeren</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Voeg standplaats toe via "Regel toevoegen"</li>
              <li>• Standplaats telt als geldige dienstregel — <strong>rit is niet verplicht</strong></li>
              <li>• Selecteer klant, project en activiteit</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">4. Geen rit / standplaats</h4>
            <p className="text-sm text-slate-600 mb-2">
              Gebruik "Geen rit / standplaats" wanneer:
            </p>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Kantoorwerk, opleiding of overige werkzaamheden</li>
              <li>• Een duidelijke reden (minimaal 5 tekens) is verplicht</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">5. Tijdregels</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Regels mogen niet overlappen</li>
              <li>• Regels moeten binnen de diensttijd vallen</li>
              <li>• Dienst-eindtijd mag niet vóór de laatste regel liggen</li>
              <li>• Er is géén 5-minutenmarge</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">6. Dienst indienen</h4>
            <p className="text-sm text-slate-600 mb-2">
              Je kunt een dienst indienen wanneer:
            </p>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Er minimaal één dienstregel is (rit of standplaats)</li>
              <li>• OF "geen rit" is aangevinkt met een geldige reden</li>
              <li>• Handtekening is verplicht bij indienen</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">7. PostNL logica</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• Bij aanvinken wordt automatisch een open rit aangemaakt</li>
              <li>• Starttijd rit = dienst start + 1 minuut</li>
              <li>• Dienst-eindtijd wordt automatisch gesynchroniseerd bij afsluiten rit (+2 minuten)</li>
              <li>• Eindtijd rit kan later op de dag worden ingevuld</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">8. Meerdaagse dienst</h4>
            <p className="text-sm text-slate-600">
              Alleen beschikbaar indien dit in je profiel is toegestaan. De toggle staat standaard aan voor geautoriseerde medewerkers. Maximaal 7 dagen per dienst.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">9. Overige functies</h4>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>• <strong>Voertuiginspectie:</strong> Controleer je voertuig en maak foto's van schade</li>
              <li>• <strong>Declaratie:</strong> Dien kosten in met bon/foto</li>
              <li>• <strong>Overzicht:</strong> Bekijk goedgekeurde diensten</li>
              <li>• <strong>Planning:</strong> Zie je weekrooster met shift, route, voertuig, opmerkingen en afwezigheid</li>
              <li>• <strong>Berichten:</strong> Ontvang berichten van je manager</li>
              <li>• <strong>Offline:</strong> De app werkt offline — data wordt automatisch verstuurd bij verbinding</li>
            </ul>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> Gebruik "Tussentijds Opslaan" om je gegevens veilig op te slaan voordat je verder gaat.
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}