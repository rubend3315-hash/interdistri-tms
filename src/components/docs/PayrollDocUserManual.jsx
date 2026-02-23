import React from "react";
import ReactMarkdown from "react-markdown";

const DOC = `
# Dagrapport Loonadministratie — Gebruikershandleiding

**Versie:** 1.0  
**Datum:** 2026-02-23  
**Doelgroep:** HR-medewerkers, Loonadministratie, Supervisors  

---

## A) Wat is het Dagrapport?

### Doel

Het Dagrapport Loonadministratie geeft een compleet overzicht van alle loonrelevante gegevens voor een specifieke werkdag. Het rapport bundelt automatisch alle informatie die nodig is voor de salarisverwerking.

### Voor wie is dit rapport?

| Gebruiker | Gebruik |
|---|---|
| **HR-afdeling** | Controle en goedkeuring van dagelijkse uren |
| **Loonadministratie** | Invoer in extern loonsysteem of doorsturen naar Azure |
| **Supervisors** | Overzicht van dagelijkse inzet per medewerker |

### Wat wordt meegenomen in het rapport?

Het rapport bevat drie typen gegevens:

**1. Tijdregistratie (alleen goedgekeurd)**
- Begin- en eindtijd van de dienst
- Pauze in minuten
- Totaal gewerkte uren
- Overuren, nachturen, weekenduren, feestdaguren
- Verblijfskosten, voorgeschoten kosten, inhoudingen, WKR
- Reiskostenvergoeding

> ⚠️ **Belangrijk:** Alleen tijdregistraties met status **"Goedgekeurd"** worden opgenomen. Registraties die nog op "Concept", "Ingediend" of "Afgekeurd" staan worden **niet** meegenomen.

**2. Ritten**
- Voertuig en route
- Begin- en eindkilometerstand
- Totaal gereden kilometers
- Getankte liters brandstof
- Vertrek- en aankomsttijd

**3. Standplaatswerk**
- Locatie en tijdstippen
- Berekende uren op standplaats

---

## B) Hoe genereer ik het rapport?

### Stap 1: Navigeer naar het Dagrapport

Ga in het menu naar: **Loon & Rapportage → Dagrapport**

### Stap 2: Selecteer een datum

Kies de gewenste werkdag via de datumkiezer bovenaan de pagina. Het systeem haalt automatisch alle relevante gegevens op voor die datum.

### Stap 3: Kies het gewenste formaat

Er zijn drie opties beschikbaar:

| Actie | Knop | Resultaat |
|---|---|---|
| **PDF genereren** | 📄 PDF | Een overzichtelijk PDF-bestand wordt gedownload. Geschikt voor printen, archiveren of e-mailen. |
| **JSON downloaden** | 📦 JSON | Een machine-leesbaar databestand wordt gedownload. Geschikt voor import in externe systemen. |
| **Azure test push** | ☁️ Verstuur naar Azure | Het rapport wordt verstuurd naar het gekoppelde Azure endpoint. Bij een test-omgeving krijg je een melding dat Azure niet geconfigureerd is — dit is normaal. |

### Wat gebeurt er op de achtergrond?

1. Het systeem haalt alle **actieve medewerkers** op
2. Per medewerker worden **goedgekeurde tijdregistraties**, **ritten** en **standplaatswerk** voor die dag verzameld
3. Alle bedragen en uren worden berekend en afgerond op 2 decimalen
4. Het rapport wordt gevalideerd tegen het officiële schema (v2.3)
5. Het rapport wordt geleverd in het gekozen formaat

---

## C) Wat betekent de inhoud?

### Begin- en einddatum

Elk rapport heeft een **rapportdatum** — dit is de werkdag waarvoor het rapport is gegenereerd. Bij nachtdiensten kan de einddatum op de volgende dag vallen.

| Veld | Voorbeeld | Uitleg |
|---|---|---|
| Rapportdatum | 2026-01-15 | De werkdag |
| Begintijd | 06:00 | Start van de dienst |
| Eindtijd | 14:30 | Einde van de dienst |

### ISO datum/tijd

Naast de gewone tijden bevat het rapport ook **ISO-tijden**. Dit zijn internationale standaardtijden die rekening houden met zomer- en wintertijd:

| Gewone tijd | ISO-tijd | Seizoen |
|---|---|---|
| 06:00 op 15 jan | 2026-01-15T06:00:00+01:00 | Wintertijd (+01:00) |
| 06:00 op 15 jul | 2026-07-15T06:00:00+02:00 | Zomertijd (+02:00) |

> 💡 **Tip:** De \`+01:00\` of \`+02:00\` achter de tijd geeft aan of het winter- of zomertijd is. Dit wordt automatisch bepaald — u hoeft hier niets voor te doen.

### Financiële velden

| Veld | Betekenis |
|---|---|
| **Totaal uren** | Som van alle gewerkte uren (excl. pauze) |
| **Overuren** | Uren boven de contractuele werktijd |
| **Nachturen** | Uren gewerkt in de nachttoeslag-periode |
| **Weekenduren** | Uren gewerkt op zaterdag of zondag |
| **Feestdaguren** | Uren gewerkt op een erkende feestdag |
| **Verblijfskosten** | Vergoeding voor overnachting/verblijf |
| **Voorgeschoten kosten** | Door medewerker betaalde zakelijke kosten |
| **Inhoudingen** | Maaltijdkosten of andere inhoudingen |
| **WKR** | Werkkostenregeling vergoeding |
| **Reiskosten multiplier** | Factor voor reiskostenberekening |

### Totalen per medewerker

Elk medewerker-blok in het rapport toont:
- De **naam** en het **personeelsnummer**
- De **afdeling** (Transport, PakketDistributie, etc.)
- Een **samenvatting** van alle bovenstaande velden
- Gedetailleerde regels per tijdregistratie, rit en standplaatswerk

### Alleen goedgekeurde registraties

Het rapport bevat uitsluitend tijdregistraties met status **"Goedgekeurd"**. Dit garandeert dat:
- Alle uren zijn gecontroleerd door een supervisor
- Concept-registraties niet per ongeluk in de salarisverwerking terechtkomen
- Afgekeurde registraties niet worden meegenomen

---

## D) Foutmeldingen

### AZURE_NOT_CONFIGURED

| | |
|---|---|
| **Wanneer** | Bij het versturen naar Azure |
| **Oorzaak** | De Azure endpoint URL en/of API key zijn niet ingesteld |
| **Actie** | Dit is normaal in een test-omgeving. In productie: neem contact op met de systeembeheerder om de Azure-instellingen te configureren. |
| **Ernst** | Geen dataverlies — het rapport is wel correct gegenereerd |

### SCHEMA_VALIDATION_FAILED

| | |
|---|---|
| **Wanneer** | Bij het genereren van het rapport |
| **Oorzaak** | De data bevat een veld dat niet in het verwachte formaat past |
| **Actie** | Dit is een technisch probleem. Meld het bij de systeembeheerder met de volledige foutmelding. |
| **Ernst** | Het rapport wordt **niet** verstuurd totdat het probleem is opgelost |

### Deployment errors

| | |
|---|---|
| **Wanneer** | Bij het openen van de rapportpagina of het genereren |
| **Oorzaak** | Een backend-functie is niet beschikbaar of niet correct gedeployed |
| **Actie** | Ga naar **Governance → Systeem → Deployment Status** om te controleren welke functie het probleem veroorzaakt. Meld het bij de systeembeheerder. |

---

## E) Veelgestelde vragen

### "Waarom zie ik geen uren voor vandaag?"

Er zijn meerdere mogelijke oorzaken:

1. **De tijdregistraties zijn nog niet goedgekeurd** — Het rapport toont alleen registraties met status "Goedgekeurd". Controleer of de supervisor de uren al heeft goedgekeurd via **Core Operations → Goedkeuringen**.

2. **Er zijn geen registraties voor deze datum** — De medewerker heeft mogelijk geen uren ingevoerd voor de geselecteerde dag.

3. **De medewerker is niet actief** — Alleen medewerkers met status "Actief" worden opgenomen in het rapport.

### "Waarom ontbreekt een medewerker in het rapport?"

Een medewerker verschijnt alleen in het rapport als aan **alle** voorwaarden is voldaan:

| Voorwaarde | Check |
|---|---|
| Status is "Actief" | Ga naar **HR → Medewerkers** en controleer de status |
| Heeft goedgekeurde tijdregistratie, rit, óf standplaatswerk op die datum | Controleer via **Tijdregistratie** of **Ritten** |
| Tijdregistratie is goedgekeurd | Controleer de status in **Goedkeuringen** |

Als een medewerker op die dag geen enkele goedgekeurde registratie, rit of standplaatswerk heeft, wordt deze niet opgenomen.

### "Wat gebeurt er bij zomer-/wintertijd?"

Het systeem handelt de overgang tussen zomer- en wintertijd **automatisch** af:

- **Wintertijd** (oktober t/m maart): tijden krijgen offset \`+01:00\`
- **Zomertijd** (maart t/m oktober): tijden krijgen offset \`+02:00\`

U hoeft hier niets voor te doen. De ISO-tijden in het rapport worden automatisch correct berekend op basis van de datum.

**Voorbeeld bij de klokovergang:**
- Op de dag dat de klok vooruit gaat (laatste zondag van maart), wordt een dienst van 22:00 - 06:00 correct berekend als 7 uur in plaats van 8 uur.
- Op de dag dat de klok terug gaat (laatste zondag van oktober), wordt een dienst van 22:00 - 06:00 correct berekend als 9 uur in plaats van 8 uur.

### "Kan ik het rapport voor een eerdere datum opnieuw genereren?"

Ja, u kunt het rapport voor elke datum (opnieuw) genereren. Selecteer simpelweg de gewenste datum. Het rapport wordt altijd op basis van de **huidige** data gegenereerd — als er in de tussentijd wijzigingen zijn gedaan aan tijdregistraties, worden deze meegenomen.

### "Wat betekent 'dry-run' bij Azure?"

Als de Azure-koppeling niet is geconfigureerd, draait het systeem in **dry-run modus**. Dit betekent:
- Het rapport wordt **wel** volledig opgebouwd en gevalideerd
- Het rapport wordt **niet** verstuurd naar Azure
- U ziet een melding met de totalen, zodat u kunt controleren of de data correct is

---

*Gebruikershandleiding v1.0 — Interdistri TMS Dagrapport Loonadministratie — 2026-02-23*
`;

export default function PayrollDocUserManual() {
  return (
    <ReactMarkdown
      className="prose prose-slate max-w-none
        prose-headings:text-slate-900
        prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-3
        prose-h2:text-xl prose-h2:mt-8
        prose-h3:text-base
        prose-table:text-sm
        prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2
        prose-td:px-3 prose-td:py-2
        prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg"
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto border border-slate-200 rounded-lg my-4">
            <table className="min-w-full">{children}</table>
          </div>
        ),
      }}
    >
      {DOC}
    </ReactMarkdown>
  );
}