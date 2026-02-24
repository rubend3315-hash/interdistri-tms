import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const sections = [
  {
    id: "vandaag",
    title: "1. Wat moet ik vandaag doen?",
    bullets: [
      "Open de app en ga naar Diensttijd",
      "Vul je starttijd in (PostNL? Vink aan voor automatische rit)",
      "Voeg dienstregels toe: ritten en/of standplaatswerk",
      "Vul eindtijd en pauze in",
      "Teken je handtekening en dien in"
    ]
  },
  {
    id: "dagdienst",
    title: "2. Dienst invoeren",
    bullets: [
      "Kies datum en vul starttijd in",
      "Voeg ritten en/of standplaatswerk toe — rit is niet verplicht",
      "Vul eindtijd en pauze in",
      "Controleer het totaal aantal uren",
      "Tik Dienst Indienen → handtekening"
    ]
  },
  {
    id: "rit",
    title: "3. Rit toevoegen",
    bullets: [
      "Ga naar Dienstregels → Regel toevoegen → Rit",
      "Starttijd wordt automatisch ingevuld, eindtijd kan later",
      "Selecteer voertuig en vul begin km in",
      "Eind km verplicht bij afsluiten rit",
      "Kies klant en route (optioneel)"
    ]
  },
  {
    id: "standplaats",
    title: "4. Standplaats toevoegen",
    bullets: [
      "Ga naar Dienstregels → Regel toevoegen → Standplaats",
      "Standplaats telt als geldige dienstregel — rit is niet verplicht",
      "Vul start- en eindtijd in",
      "Selecteer klant, project en activiteit",
      "Voeg eventueel een opmerking toe"
    ]
  },
  {
    id: "geenrit",
    title: "5. Geen rit / standplaats",
    bullets: [
      "Gebruik bij kantoorwerk, opleiding of overige werkzaamheden",
      "Vink 'Geen rit / standplaats' aan in het diensttijd-scherm",
      "Vul een duidelijke reden in (minimaal 5 tekens)",
      "Je kunt indienen zonder dienstregels"
    ]
  },
  {
    id: "tijdregels",
    title: "6. Tijdregels",
    bullets: [
      "Regels mogen niet overlappen",
      "Regels moeten binnen de diensttijd vallen",
      "Dienst-eindtijd mag niet vóór de laatste regel liggen",
      "Er is géén 5-minutenmarge meer"
    ]
  },
  {
    id: "indienen",
    title: "7. Dienst indienen",
    bullets: [
      "Minimaal één dienstregel (rit of standplaats) vereist",
      "OF: geen rit aangevinkt met geldige reden",
      "Handtekening is verplicht bij indienen",
      "Na indienen kun je een nieuwe dienst starten"
    ]
  },
  {
    id: "meerdaags",
    title: "8. Meerdaagse dienst",
    bullets: [
      "Alleen beschikbaar als dit in je profiel is toegestaan",
      "Toggle staat standaard aan voor geautoriseerde medewerkers",
      "Selecteer startdatum en einddatum (max 7 dagen)",
      "Voeg per dag je dienstregels toe"
    ]
  },
  {
    id: "inspectie",
    title: "9. Inspectie uitvoeren",
    bullets: [
      "Ga naar Voertuiginspectie → selecteer voertuig",
      "Vul kilometerstand in",
      "Loop de checklist door (groen = OK, rood = niet OK)",
      "Bij schade: omschrijving invullen + foto maken",
      "Tik Inspectie indienen"
    ]
  },
  {
    id: "declaratie",
    title: "10. Declaratie indienen",
    bullets: [
      "Ga naar Declaratie → selecteer categorie",
      "Vul omschrijving en bedrag in",
      "Upload een foto van je bon",
      "Tik Declaratie indienen"
    ]
  },
  {
    id: "faq",
    title: "11. Veelgestelde vragen",
    bullets: [
      "Tijdformaat: typ 4 cijfers (bijv. 0830), de : komt automatisch",
      "Offline: de app werkt zonder internet, data wordt later verstuurd",
      "Concept opslaan: tik 'Tussentijds opslaan' om later verder te gaan",
      "Schade? Bij 'Ja' opent Bumper automatisch na indienen",
      "PostNL: automatische rit (+1 min), dienst-eind synct (+2 min)"
    ]
  }
];

export default function MobileHandleidingTab() {
  const [openSections, setOpenSections] = useState(["vandaag"]);

  const toggle = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="-mx-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Handleiding
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Tik op een onderwerp</p>
      </div>

      {/* Sections — edge-to-edge */}
      <div className="divide-y divide-slate-100">
        {sections.map((section) => {
          const isOpen = openSections.includes(section.id);
          return (
            <div key={section.id}>
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white active:bg-slate-50 text-left"
              >
                <span className="text-[13px] font-medium text-slate-900">{section.title}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-3 bg-white">
                  <ul className="space-y-1.5">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="text-[12px] text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}