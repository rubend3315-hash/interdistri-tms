import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const sections = [
  {
    id: "vandaag",
    title: "1. Wat moet ik vandaag doen?",
    bullets: [
      "Open de app en ga naar Diensttijd",
      "Vul je starttijd in",
      "Voeg je ritten / standplaatswerk toe",
      "Vul eindtijd en pauze in",
      "Teken je handtekening en dien in"
    ]
  },
  {
    id: "dagdienst",
    title: "2. Dagdienst invoeren",
    bullets: [
      "Ga naar Diensttijd → vul startdatum en starttijd in",
      "Tik op Dienstregels → voeg ritten of standplaatswerk toe",
      "Ga terug → vul eindtijd en pauze in",
      "Controleer het totaal aantal uren",
      "Tik Handtekening & Indienen"
    ]
  },
  {
    id: "meerdaags",
    title: "3. Meerdaagse dienst invoeren",
    bullets: [
      "Zet de schakelaar 'Meerdaags' aan in het diensttijd-scherm",
      "Selecteer je startdatum en einddatum",
      "Voeg per dag je ritten toe",
      "Vul eindtijd in op je laatste werkdag",
      "Dien in met handtekening"
    ]
  },
  {
    id: "rit",
    title: "4. Rit toevoegen",
    bullets: [
      "Ga naar Dienstregels → Regel toevoegen → Rit",
      "Vul start- en eindtijd in (UU:MM)",
      "Selecteer voertuig en vul kilometerstanden in",
      "Kies klant en route (optioneel)",
      "Tik Opslaan"
    ]
  },
  {
    id: "standplaats",
    title: "5. Standplaats toevoegen",
    bullets: [
      "Ga naar Dienstregels → Regel toevoegen → Standplaats",
      "Vul start- en eindtijd in",
      "Selecteer klant, project en activiteit",
      "Voeg eventueel een opmerking toe",
      "Tik Opslaan"
    ]
  },
  {
    id: "inspectie",
    title: "6. Inspectie uitvoeren",
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
    title: "7. Declaratie indienen",
    bullets: [
      "Ga naar Declaratie → selecteer categorie",
      "Vul omschrijving en bedrag in",
      "Upload een foto van je bon",
      "Tik Declaratie indienen",
      "Je leidinggevende keurt de declaratie goed"
    ]
  },
  {
    id: "faq",
    title: "8. Veelgestelde vragen",
    bullets: [
      "Tijdformaat: typ 4 cijfers (bijv. 0830), de : komt automatisch",
      "Offline: de app werkt zonder internet, data wordt later verstuurd",
      "Concept opslaan: tik 'Tussentijds opslaan' om later verder te gaan",
      "Schade? Bij 'Ja' opent Bumper automatisch na indienen",
      "Swipen: veeg links/rechts om tussen tabs te wisselen"
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