import React from "react";
import { AlertTriangle, Shield, Smartphone, Bug, Lightbulb, Clock, Wifi, Eye, RefreshCw, FileText, ChevronDown, ChevronRight, Signal, Star } from "lucide-react";
import { useState } from "react";

const Section = ({ icon: Icon, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left">
        <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-slate-900 flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-2 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
};

const IssueCard = ({ title, description, cause, logs, impact, handling, risk, improvement }) => (
  <div className="bg-slate-50 rounded-lg p-4 mb-3 border border-slate-200">
    <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>
    <div className="space-y-2 text-[13px] text-slate-700">
      <div><span className="font-medium text-slate-900">Beschrijving:</span> {description}</div>
      <div><span className="font-medium text-slate-900">Technische oorzaak:</span> {cause}</div>
      <div><span className="font-medium text-slate-900">Zichtbaar in logs:</span> <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">{logs}</code></div>
      <div><span className="font-medium text-slate-900">Impact voor gebruiker:</span> {impact}</div>
      <div><span className="font-medium text-slate-900">Huidige afhandeling:</span> {handling}</div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900">Risiconiveau:</span>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          risk === "Laag" ? "bg-green-100 text-green-800" :
          risk === "Middel" ? "bg-amber-100 text-amber-800" :
          "bg-red-100 text-red-800"
        }`}>{risk}</span>
      </div>
      <div><span className="font-medium text-slate-900">Mogelijke verbetering:</span> {improvement}</div>
    </div>
  </div>
);

const BacklogItem = ({ title, description, priority }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
      priority === "hoog" ? "bg-red-100 text-red-700" :
      priority === "middel" ? "bg-amber-100 text-amber-700" :
      "bg-blue-100 text-blue-700"
    }`}>{priority}</span>
    <div>
      <p className="font-medium text-slate-900 text-sm">{title}</p>
      <p className="text-[12px] text-slate-600 mt-0.5">{description}</p>
    </div>
  </div>
);

export default function IOSMobileEntryDocs() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">MobileEntry – iOS / Safari Behaviour, Issues & Improvements</h1>
            <p className="text-sm text-slate-500">Technische referentie · Versie 1.0 · {new Date().toLocaleDateString('nl-NL')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          Dit document beschrijft alle bekende, geobserveerde en potentiële iOS/Safari-specifieke problemen voor de MobileEntry app.
          Het dient als centrale technische referentie zodat toekomstige debugging en support sneller kan verlopen.
        </p>
      </div>

      {/* 1. Geobserveerde productie-issues */}
      <Section icon={Bug} title="1. Geobserveerde productie-issues" defaultOpen={true}>
        <p className="text-sm text-slate-600 mb-4">
          De volgende problemen zijn in productie waargenomen bij gebruikers van de MobileEntry app op iOS / Safari.
        </p>

        <IssueCard
          title="Verlopen sessie terwijl app nog open lijkt"
          description="Gebruiker opent Safari na dagen en ziet de MobileEntry UI nog volledig geladen, maar de sessie-token is ondertussen verlopen."
          cause="iOS Safari bevriest JavaScript-uitvoering bij background tabs. De tab wordt uit het geheugen hersteld (memory restoration) zonder dat de app een sessiecheck uitvoert bij terugkomst."
          logs="Geen logs tot gebruiker een actie uitvoert (bijv. submit)"
          impact="Gebruiker denkt dat de app actief is, maar elke API-call zal falen met 401."
          handling="Geen proactieve detectie. Fout wordt pas opgemerkt bij volgende API-call."
          risk="Middel"
          improvement="visibilitychange event listener om sessie te controleren bij terugkeer in tab."
        />

        <IssueCard
          title="FAILED submission logs door verlopen sessie"
          description="MobileEntrySubmissionLog records met status FAILED en error_code AUTH_ERROR of UNAUTHORIZED na een submit-poging."
          cause="Gebruiker drukt op 'Indienen' terwijl de sessie al verlopen is. De submitTimeEntry backend-functie retourneert 401. useMobileSubmit vangt de fout af en logt een FAILED result."
          logs="MobileEntrySubmissionLog: status=FAILED, error_code=UNAUTHORIZED of AUTH_ERROR"
          impact="Gebruiker ziet een foutmelding ('Je sessie is verlopen') gevolgd door redirect naar login na 3 seconden."
          handling="useMobileSubmit vangt 401 op, toont toast, en roept na 3s base44.auth.redirectToLogin() aan."
          risk="Laag"
          improvement="Verkort redirect delay van 3s naar ~1s. Overweeg proactieve sessiecheck vóór submit."
        />

        <IssueCard
          title="Meerdere opeenvolgende FAILED submissions"
          description="Meerdere FAILED logs voor dezelfde gebruiker binnen kort tijdsbestek, soms 3-5 pogingen."
          cause="Gebruiker klikt herhaaldelijk op 'Indienen' terwijl de sessie verlopen is. Elke poging resulteert in een nieuwe FAILED log voordat de redirect-timer (3s) afloopt."
          logs="Meerdere MobileEntrySubmissionLog records met dezelfde employee_id, zelfde datum, status=FAILED, timestamps binnen seconden van elkaar"
          impact="Gebruiker is gefrustreerd door herhaalde foutmeldingen. Geen dataverlies."
          handling="Elke submit-poging wordt individueel afgehandeld. De isSubmitting guard blokkeert parallelle calls, maar na falen wordt deze gereset."
          risk="Laag"
          improvement="Na eerste 401-detectie direct blokkeren van verdere submit-pogingen en onmiddellijk redirecten."
        />

        <IssueCard
          title="Vertraagde redirect naar login (3 seconden)"
          description="Na een verlopen sessie duurt het 3 seconden voordat de gebruiker naar het loginscherm wordt gestuurd."
          cause="In useMobileSubmit staat een hardcoded setTimeout van 3000ms na detectie van AUTH_ERROR voordat redirectToLogin() wordt aangeroepen."
          logs="Tijdsverschil van ~3s tussen FAILED log timestamp en volgende login-event"
          impact="Gebruiker ziet 3 seconden lang een foutmelding zonder duidelijke actie. Kan verwarring veroorzaken."
          handling="Toast melding 'Je sessie is verlopen. Log opnieuw in.' wordt getoond, gevolgd door redirect na 3s."
          risk="Laag"
          improvement="Verkort delay naar 800-1500ms. Voeg visuele loading indicator toe tijdens de wachttijd."
        />

        <IssueCard
          title="UI lijkt actief maar gebruiker is niet geauthenticeerd"
          description="De volledige MobileEntry UI wordt getoond inclusief formuliervelden en knoppen, maar er is geen geldige sessie meer."
          cause="Safari herstelt de DOM en React state vanuit het geheugen bij tab-reactivatie. Er wordt geen sessiecheck uitgevoerd bij het herstellen van de tab."
          logs="Geen logs tot een API-interactie plaatsvindt"
          impact="Gebruiker kan het formulier volledig invullen en pas bij indienen ontdekken dat de sessie verlopen is."
          handling="Geen proactieve detectie. De AuthProvider controleert alleen bij initiële mount, niet bij tab-reactivatie."
          risk="Middel"
          improvement="visibilitychange listener die sessie valideert wanneer tab weer zichtbaar wordt."
        />
      </Section>

      {/* 2. iOS/Safari browsergedrag analyse */}
      <Section icon={Smartphone} title="2. iOS/Safari technisch browsergedrag">
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Tab freezing / Background suspension</h4>
            <p>iOS Safari pauzeert JavaScript-uitvoering volledig wanneer een tab naar de achtergrond gaat of wanneer de gebruiker naar een andere app schakelt. Dit is een energiebesparingsmechanisme van iOS. In tegenstelling tot desktop browsers wordt de tab niet geleidelijk gedegradeerd maar direct bevroren.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">JavaScript timers pauzeren</h4>
            <p><code className="bg-slate-100 px-1 rounded">setTimeout</code> en <code className="bg-slate-100 px-1 rounded">setInterval</code> worden volledig gepauzeerd bij tab-suspensie. Een timer die over 5 minuten zou aflopen, wordt pas hervat wanneer de tab weer actief wordt — ongeacht hoelang de tab in de achtergrond stond. Dit betekent dat periodieke sessiechecks via setInterval niet betrouwbaar zijn op iOS.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">iOS Page Lifecycle</h4>
            <p>iOS Safari volgt een vereenvoudigde versie van de Page Lifecycle API:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li><strong>Active</strong> → tab is zichtbaar en responsive</li>
              <li><strong>Frozen</strong> → tab is in achtergrond, JS gepauzeerd</li>
              <li><strong>Discarded</strong> → tab wordt uit geheugen verwijderd (bij geheugendruk)</li>
              <li><strong>Restored</strong> → tab wordt hersteld vanuit geheugen, DOM intact maar JS-context kan verouderd zijn</li>
            </ul>
            <p className="mt-1">Het probleem ontstaat in de overgang van Frozen → Restored: de UI ziet er actueel uit, maar alle runtime state (inclusief sessie-tokens) kan verouderd zijn.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Sessie-tokens verlopen terwijl UI actief lijkt</h4>
            <p>Base44 SDK sessie-tokens hebben een beperkte levensduur. Wanneer een tab uren of dagen bevroren is, verloopt de token op de server terwijl de client nog de oude (verlopen) token in het geheugen heeft. De SDK doet automatische token refresh, maar alleen bij actieve API-calls — niet terwijl de tab bevroren is.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Safari caching van webapps</h4>
            <p>Safari cachet agressief HTML, CSS en JS van webapps. Bij tab-herstel kan een verouderde versie van de app worden getoond. Dit is doorgaans geen probleem voor de sessie-flow, maar kan in zeldzame gevallen leiden tot inconsistente UI-state.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Netwerkherstel bij WiFi / mobiel wisseling</h4>
            <p>Wanneer een iPhone wisselt tussen WiFi en mobiel netwerk (of vice versa), kan er een korte periode van connectiviteitsverlies zijn. API-calls die tijdens deze overgang plaatsvinden kunnen falen met netwerk-gerelateerde fouten, niet te verwarren met auth-fouten.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">localStorage en sessionStorage</h4>
            <p>Safari op iOS heeft beperkingen op storage in private browsing mode (7 dagen limiet). In normale modus is localStorage persistent, maar sessionStorage wordt gewist bij het sluiten van de tab. De MobileEntry app gebruikt localStorage voor draft-opslag, wat betrouwbaar is zolang de gebruiker niet in private mode browst.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Memory restoration van Safari tabs</h4>
            <p>Wanneer iOS geheugendruk ervaart, kan Safari achtergrondtabs volledig uit het geheugen verwijderen (discard). Bij het opnieuw openen wordt de pagina opnieuw geladen — dit gedraagt zich als een verse page load inclusief nieuwe AuthProvider mount. Dit scenario is eigenlijk minder problematisch dan tab freeze, omdat de app volledig opnieuw initialiseert.</p>
          </div>
        </div>
      </Section>

      {/* 3. Architectuuranalyse */}
      <Section icon={Shield} title="3. MobileEntry architectuur en sessieafhandeling">
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Base44 SDK authenticatie</h4>
            <p>De Base44 SDK beheert sessie-tokens automatisch. Bij elke API-call controleert de SDK of de token geldig is en voert indien nodig een silent refresh uit. Dit mechanisme werkt goed bij actief gebruik, maar kan niet functioneren wanneer de tab bevroren is in iOS Safari.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">AuthProvider sessiecontrole</h4>
            <p>De AuthProvider (in App.jsx) voert een eenmalige sessiecheck uit bij mount. Wanneer een bevroren tab wordt hersteld zonder volledige remount, wordt deze check niet opnieuw uitgevoerd. De AuthProvider vangt <code className="bg-slate-100 px-1 rounded">auth_required</code> fouten op en redirect naar login.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">useMobileSubmit foutafhandeling</h4>
            <p>De <code className="bg-slate-100 px-1 rounded">useMobileSubmit</code> hook vangt auth-fouten (401/UNAUTHORIZED) lokaal af in de <code className="bg-slate-100 px-1 rounded">mapErrorToMessage</code> functie. Hierdoor bereiken deze fouten NIET de globale AuthProvider. In plaats daarvan:</p>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Toont een toast: "Je sessie is verlopen. Log opnieuw in."</li>
              <li>Wacht 3 seconden (setTimeout)</li>
              <li>Roept <code className="bg-slate-100 px-1 rounded">base44.auth.redirectToLogin()</code> aan</li>
            </ol>
            <p className="mt-2">Dit is een bewuste ontwerpkeuze: de gebruiker krijgt eerst een duidelijke melding voordat de redirect plaatsvindt.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Waarom auth errors niet direct tot redirect leiden</h4>
            <p>De MobileEntry pagina draait buiten de standaard Layout wrapper (het is een full-screen mobiele pagina). Doordat useMobileSubmit de 401-fout lokaal afvangt en niet opnieuw gooit, bereikt de fout de AuthProvider nooit. Dit is geen bug maar een bewuste architectuurbeslissing voor betere UX op mobiel.</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-1">Flow diagram</h4>
            <div className="bg-slate-100 rounded-lg p-4 font-mono text-xs leading-relaxed">
              <p>Gebruiker drukt "Indienen"</p>
              <p className="ml-2">↓</p>
              <p className="ml-2">useMobileSubmit → submitEntry() → API call</p>
              <p className="ml-4">↓</p>
              <p className="ml-4">Token verlopen → 401 response</p>
              <p className="ml-6">↓</p>
              <p className="ml-6">useEntrySubmit retourneert {"{"} success: false, error: 'UNAUTHORIZED' {"}"}</p>
              <p className="ml-8">↓</p>
              <p className="ml-8">useMobileSubmit.mapErrorToMessage()</p>
              <p className="ml-10">↓</p>
              <p className="ml-10">toast.error("Je sessie is verlopen")</p>
              <p className="ml-10">setTimeout(redirectToLogin, 3000)</p>
              <p className="ml-12">↓</p>
              <p className="ml-12">Login scherm</p>
            </div>
          </div>
        </div>
      </Section>

      {/* 4. Known limitations */}
      <Section icon={AlertTriangle} title="4. Known limitations of web apps on iOS Safari relevant to MobileEntry">
        <div className="space-y-3 text-sm text-slate-700">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Geen persistent background execution</h4>
            <p className="text-amber-800">iOS staat geen langlopende achtergrondprocessen toe voor webapps. Alle JavaScript wordt gepauzeerd bij tab-wisseling. Er is geen Web Worker of Service Worker workaround die dit omzeilt op iOS.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Push Notifications beperkt</h4>
            <p className="text-amber-800">Web Push Notifications zijn pas beschikbaar vanaf iOS 16.4+ en vereisen dat de webapp als PWA op het homescreen is geïnstalleerd. Standaard Safari tabs ontvangen geen push notifications.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Geen betrouwbare Wake Lock</h4>
            <p className="text-amber-800">De Screen Wake Lock API wordt door Safari niet volledig ondersteund. Dit betekent dat het scherm kan uitschakelen tijdens gebruik, wat tab-suspensie kan triggeren.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Geheugenlimiet per tab</h4>
            <p className="text-amber-800">Safari op iOS heeft een striktere geheugenlimiet per tab dan desktop browsers (~500MB). Bij overschrijding wordt de tab gediscardeerd en bij terugkomst volledig herladen.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Private browsing — 7-dagen storage limiet</h4>
            <p className="text-amber-800">In Safari private mode worden localStorage en IndexedDB data na 7 dagen automatisch gewist. Dit kan draft-opslag beïnvloeden als gebruikers in private mode browsen.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">Viewport zoom bij input focus</h4>
            <p className="text-amber-800">Safari zoomt automatisch in op input-velden met font-size kleiner dan 16px. De MobileEntry app heeft hiervoor een CSS-fix in globals.css die font-size afdwingt op 16px bij focus.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold text-amber-900 mb-1">100vh probleem</h4>
            <p className="text-amber-800">De MobileEntry app gebruikt 100dvh (dynamic viewport height) om rekening te houden met de Safari toolbar die verschijnt/verdwijnt bij scrollen. Dit is al correct geïmplementeerd.</p>
          </div>
        </div>
      </Section>

      {/* 5. Aanbevolen verbeteringen / backlog */}
      <Section icon={Lightbulb} title="5. Aanbevolen verbeteringen / backlog">
        <p className="text-sm text-slate-600 mb-4">
          Onderstaande verbeteringen zijn niet urgent (het systeem werkt correct), maar kunnen de gebruikerservaring op iOS aanzienlijk verbeteren.
        </p>

        <BacklogItem
          priority="hoog"
          title="visibilitychange sessiecheck"
          description="Voeg een document.addEventListener('visibilitychange') toe die bij terugkeer in de tab de sessie valideert. Als de sessie verlopen is, redirect direct naar login — vóórdat de gebruiker een actie kan uitvoeren. Implementeer in App.jsx of AuthProvider zodat het voor de hele app geldt."
        />
        <BacklogItem
          priority="hoog"
          title="Directe blokkering na eerste 401 bij submit"
          description="Na detectie van een 401/AUTH_ERROR in useMobileSubmit, blokkeer direct alle verdere submit-pogingen en redirect onmiddellijk. Voorkomt meerdere opeenvolgende FAILED logs."
        />
        <BacklogItem
          priority="middel"
          title="Verkorten redirect delay (3s → 1s)"
          description="De huidige setTimeout van 3000ms bij AUTH_ERROR in useMobileSubmit kan worden verkort naar 800-1500ms. Dit vermindert de tijd waarin gebruikers herhaaldelijk kunnen klikken."
        />
        <BacklogItem
          priority="middel"
          title="Pre-submit sessiecheck"
          description="Voeg een snelle sessievalidatie toe vóór de daadwerkelijke submit-call. Bijv. een lichtgewicht auth.me() check in startSubmitFlow(). Als de sessie verlopen is, direct naar login zonder de zware submit-flow te starten."
        />
        <BacklogItem
          priority="middel"
          title="Centraliseren van 401 error handling"
          description="Overweeg om 401-fouten niet lokaal in useMobileSubmit af te vangen, maar door te gooien naar de AuthProvider. Dit zorgt voor consistente sessie-afhandeling door de hele app heen."
        />
        <BacklogItem
          priority="laag"
          title="Extra mobile submission logging"
          description="Voeg een extra veld toe aan MobileEntrySubmissionLog dat aangeeft of de fout gerelateerd was aan een verlopen sessie (is_session_expired). Dit maakt filtering en analyse eenvoudiger."
        />
        <BacklogItem
          priority="laag"
          title="Silent session refresh optimalisatie"
          description="Onderzoek of de Base44 SDK proactief tokens kan vernieuwen bij visibilitychange events, naast de standaard refresh bij API-calls. Dit zou de meeste sessie-verlopen scenarios kunnen voorkomen."
        />
        <BacklogItem
          priority="laag"
          title="UX verbetering: visuele sessie-indicator"
          description="Toon een subtiele indicator (bijv. in de MobileHeader) wanneer de sessie binnenkort verloopt, of wanneer de laatste sessiecheck langer dan X minuten geleden is."
        />
      </Section>

      {/* 6. Praktische samenvatting voor support */}
      <Section icon={FileText} title="6. Praktische samenvatting voor support & debugging" defaultOpen={true}>
        <div className="space-y-4 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Hoe herken je een iOS sessie-probleem?</h4>
            <ul className="list-disc ml-5 space-y-1 text-blue-800">
              <li>MobileEntrySubmissionLog met status <strong>FAILED</strong> en error_code <strong>UNAUTHORIZED</strong> of <strong>AUTH_ERROR</strong></li>
              <li>Meerdere FAILED records voor dezelfde gebruiker binnen seconden</li>
              <li>User-Agent bevat "iPhone" of "iPad" en "Safari"</li>
              <li>Tijdstip van FAILED is ver na de laatste succesvolle actie van de gebruiker</li>
              <li>Gebruiker meldt "ik zag mijn uren nog staan maar het lukte niet"</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Wat te doen bij een support-melding?</h4>
            <ol className="list-decimal ml-5 space-y-1 text-green-800">
              <li>Controleer MobileEntrySubmissionLog voor de betreffende datum en medewerker</li>
              <li>Check de error_code — UNAUTHORIZED/AUTH_ERROR = verlopen sessie</li>
              <li>Check de user_agent — iPhone/iPad/Safari bevestigt iOS-gerelateerd</li>
              <li>Stel de gebruiker gerust: data is niet verloren, alleen de sessie was verlopen</li>
              <li>Adviseer: sluit Safari volledig af en open de app opnieuw via de link</li>
              <li>Als er een concept (draft) bestond, is deze waarschijnlijk nog beschikbaar na opnieuw inloggen</li>
            </ol>
          </div>

          <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Snelle checklist</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-1.5 font-semibold">Symptoom</th>
                  <th className="text-left py-1.5 font-semibold">Waarschijnlijke oorzaak</th>
                  <th className="text-left py-1.5 font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">FAILED + UNAUTHORIZED</td>
                  <td className="py-1.5">Verlopen sessie (iOS freeze)</td>
                  <td className="py-1.5">Opnieuw inloggen</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">Meerdere FAILED in seconden</td>
                  <td className="py-1.5">Herhaald klikken na sessie-verlopen</td>
                  <td className="py-1.5">Normaal gedrag, redirect volgt</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">FAILED + NETWORK_ERROR</td>
                  <td className="py-1.5">WiFi/mobiel wisseling</td>
                  <td className="py-1.5">Opnieuw proberen</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5">FAILED + CLIENT_TIMEOUT</td>
                  <td className="py-1.5">Trage verbinding</td>
                  <td className="py-1.5">Betere verbinding, opnieuw proberen</td>
                </tr>
                <tr>
                  <td className="py-1.5">Gebruiker: "data kwijt"</td>
                  <td className="py-1.5">Draft nog beschikbaar</td>
                  <td className="py-1.5">Opnieuw inloggen, draft laden</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}