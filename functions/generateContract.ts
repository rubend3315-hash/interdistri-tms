import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatDate(dateStr) {
  if (!dateStr) return '[NOG IN TE VULLEN]';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calcDuration(start, end) {
  if (!start || !end) return '[NOG IN TE VULLEN]';
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  // Calculate remaining days after full months
  const afterMonths = new Date(s);
  afterMonths.setMonth(afterMonths.getMonth() + months);
  if (afterMonths > e) {
    months--;
    afterMonths.setMonth(afterMonths.getMonth() - 1);
  }
  const days = Math.round((e - afterMonths) / (1000 * 60 * 60 * 24));
  if (days === 0) return `${months} maanden`;
  return `${months} maanden en ${days} dagen`;
}

function signatureBlock(fullName) {
  return `<div style="display:flex;justify-content:space-between;margin-top:40px;"><div style="width:45%;text-align:center;"><p><strong>Voor akkoord werkgever</strong></p><br/><br/><p>…………………………………………</p><p>Van Dooren Transport Zeeland B.V.</p><p>Namens deze:</p><p>De heer M. Schetters</p></div><div style="width:45%;text-align:center;"><p><strong>Voor akkoord werknemer</strong></p><br/><br/><p>…………………………………………</p><p>De heer/mevrouw ${fullName}</p></div></div>`;
}

function buildBepaaldetijdTemplate(emp, vars) {
  const { fullName, geboortedatum, adres, postcode, woonplaats, trede, uurloon, startDatum, eindDatum, duurTekst, ondertekeningDatum, functie, afdeling, proeftijd, inDienstDatum } = vars;
  return `<h2>ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD</h2>

<p>De ondergetekenden:</p>

<p>Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";</p>

<p>en</p>

<p>2. De heer/mevrouw ${fullName}, geboren op ${geboortedatum}, en thans wonende aan de ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";</p>

<p>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</p>

<h3>Artikel 1: CAO</h3>

<p>Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.</p>

<p>Voorts is op deze overeenkomst het bedrijfsreglement van de werkgever van toepassing.</p>

<p>De werknemer verklaart in te stemmen met toekomstige wijzigingen op de bij de werkgever geldende algemene voorwaarden uit dit reglement.</p>

<p>Deze voorwaarden vormen één geheel met deze overeenkomst.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

<p>Werknemer is oorspronkelijk bij werkgever in dienst getreden op ${inDienstDatum}.</p>

<h3>Artikel 3: functie</h3>

<p>De werknemer treedt in dienst in de functie van ${functie}. De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling 3. ${afdeling}.</p>

<p>De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van zijn functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs door de werkgever kunnen worden verlangd.</p>

<h3>Artikel 4: standplaats</h3>

<p>De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever te Kapelle worden verricht.</p>

<p>De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een eventuele andere vestiging.</p>

<h3>Artikel 5: duur</h3>

<p>Deze arbeidsovereenkomst is aangegaan voor de duur van ${duurTekst}, en eindigt derhalve van rechtswege op ${eindDatum} zonder dat daartoe toestemming van UWV WERKbedrijf vereist zal zijn.</p>

<p>Voor de werkgever geldt wel een schriftelijke aanzegtermijn van 1 maand; de werkgever zal de werknemer minimaal 1 maand voor afloop van deze overeenkomst schriftelijk laten weten of hij deze tijdelijke overeenkomst wel of niet wenst te verlengen, en indien wordt verlengd onder welke voorwaarden.</p>

<p>De wet verplicht werkgever één maand van te voren schriftelijk op te zeggen. Door ondertekening van deze overeenkomst is werknemer er mee bekend en akkoord dat de opzegtermijn van minimaal één maand in acht is genomen en hiermee van rechtswege tijdig is opgezegd. Opzegging/beëindiging arbeidsovereenkomst per ${eindDatum}.</p>

<p>Deze overeenkomst is ook tijdens de in 5.1 bedoelde duur opzegbaar (in geval van opzegging door de werkgever na verkregen toestemming van UWV WERKbedrijf, dan wel door de kantonrechter, dan wel middels een beëindigingsovereenkomst met wederzijds goedvinden wegens moverende redenen op voorspraak van de werkgever), met inachtneming van de opzegtermijn, welke op grond van de wet of de CAO geldt. In dat geval is bij opzegging van de arbeidsovereenkomst de opzegtermijn van toepassing die voortvloeit uit het bepaalde in artikel 7:672 van het Burgerlijk Wetboek, tenzij uit het bepaalde in de geldende CAO een kortere of langere opzegtermijn voortvloeit.</p>

<p>In geval van (al dan niet herhaalde) stilzwijgende voortzetting na het verstrijken van de duur als in artikel 5.1 bedoeld, eindigt de arbeidsovereenkomst in elk geval met ingang van de dag waarop de werknemer de leeftijd bereikt waarop op grond van de Algemene Ouderdoms Wet recht op ouderdomspensioen ontstaat. Eventuele keuzemogelijkheden van de werknemer om het recht op ouderdomspensioen eerder of later te laten ingaan zullen daarbij niet in aanmerking worden genomen.</p>

<p>De arbeidsovereenkomst eindigt in elk geval van rechtswege, zonder dat daarvoor opzegging noodzakelijk is, met ingang van de dag na het overlijden van de werkgever.</p>

<h3>Artikel 6: proeftijd</h3>

<p>${proeftijd === 'Geen proeftijd' ? 'Er geldt geen proeftijd.' : 'Er geldt één maand proeftijd.'}</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor [NOG IN TE VULLEN] basisuren per week. Een fulltime werkweek wordt gesteld op 40 uur per week.</p>

<p>De dagen en tijden waarop de arbeid dient te worden verricht, worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer, arbeidsrooster en de voorwaarden uit de algemene overeenkomst/bedrijfsreglement art. 21 en 22.</p>

<p>De werkgever kan van de werknemer verlangen in bijzondere gevallen overwerk te verrichten.</p>

<p>Overuren zijn uren welke gelegen zijn buiten de normale arbeidsduur.</p>

<p>Overwerk wordt vergoed conform het bepaalde in de CAO.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per uur.</p>

<p>Het salaris zal maandelijks tegen het einde van de maand uitbetaald worden op een door de werknemer aan te wijzen bankrekening.</p>

<p>Met het oog op het bepaalde in artikel 7:626 lid 4 van het Burgerlijk Wetboek, verklaart de werknemer er mee in te stemmen dat de salarisstrook niet schriftelijk maar ook op elektronische wijze kan worden aangeboden (bijvoorbeeld middels E-mail of middels een verstrekte inlogcode, waarbij de werknemer de salarisstrook zelf dient op te halen uit het bij de werkgever van toepassing zijnde salaris- en personeelsinformatiesysteem).</p>

<h3>Artikel 9: arbeidsongeschiktheid</h3>

<p>De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn vastgesteld. Deze voorschriften zijn terug te vinden in het bedrijfsreglement.</p>

<p>De werkgever is steeds bevoegd tot wijziging van deze voorschriften.</p>

<p>Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.</p>

<p>In geval van ziekte zullen er 2 wachtdagen worden toegepast per ziekteperiode om ziekteverzuim terug te dringen conform art. 7:629 lid 9 BW.</p>

<p>Indien de werknemer binnen vier weken na het einde van de arbeidsovereenkomst arbeidsongeschikt wordt als gevolg van een ziekte (een gebrek daaronder begrepen), is de werknemer ten opzichte van de werkgever verplicht:</p>

<p>van het intreden van deze ziekte onverwijld schriftelijk mededeling te doen aan de werkgever;</p>

<p>de werkgever daarbij te berichten of de werknemer ten tijde van het intreden van deze ziekte al dan niet in dienst was van een andere werkgever;</p>

<p>de werkgever daarbij te berichten of de werknemer ten tijde van het intreden van deze ziekte al dan niet daadwerkelijk een WW-uitkering ontving;</p>

<p>zich op eerste verzoek van de werkgever te doen onderzoeken door een door de werkgever aan te wijzen bedrijfsarts, deze bedrijfsarts alle gevraagde inlichtingen te verschaffen en deze bedrijfsarts op zijn verzoek te machtigen om informatie op te vragen bij de huisarts van de werknemer en eventuele andere artsen of anderen door wie de werknemer zich laat behandelen, een en ander teneinde deze bedrijfsarts in staat te stellen om ten behoeve van de werkgever vast te stellen of in de periode tot vier weken na de datum waarop de arbeidsovereenkomst eindigt sprake was van een ziekte of gebrek dat zou kunnen leiden tot de toekenning van een Ziektewetuitkering;</p>

<p>indien de werknemer een Ziektewetuitkering aanvraagt: alle verplichtingen na te komen die op grond van de Ziektewet voor de werknemer gelden.</p>

<p>De bovenstaande verplichtingen gelden ongeacht de wijze waarop de arbeidsovereenkomst eindigt.</p>

<p>6. Bij niet-nakoming van één of meer van de in dit artikel vervatte verplichtingen verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 1.000,-- per overtreding en € 250,-- voor elke dag dat de overtreding voortduurt, zonder dat de werkgever gehouden zal zijn schade te bewijzen en onverminderd het recht van de werkgever om schadevergoeding te vorderen, indien en voor zover de schade het bedrag van de boeten overtreft.</p>

<h3>Artikel 10: vakantietoeslag</h3>

<p>Aan de werknemer zal 8% van zijn salaris als vakantietoeslag worden uitgekeerd.</p>

<p>Werknemerskeuze: De betaling van de vakantietoeslag zal maandelijks met de uitbetaling van het reguliere bruto salaris geschieden.</p>

<h3>Artikel 11: vakantiedagen</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op vakantie met behoud van salaris toegekend volgens de voorschriften van de CAO.</p>

<p>De vakantie wordt op initiatief van de werkgever of de werknemer, door de werkgever vastgesteld. De werkgever voert over het vaststellen van de vakantiedagen tijdig overleg met de werknemer.</p>

<h3>Artikel 12: ATV</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op ATV met behoud van salaris toegekend volgens de voorschriften van de CAO.</p>

<h3>Artikel 13: beëindiging</h3>

<p>Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantie-uren en te veel dan wel te weinig uitbetaalde vakantietoeslag geschieden door inhouding op dan wel uitbetaling bij het laatste maandsalaris, een en ander naar rato van het aantal gewerkte maanden in de betreffende periode.</p>

<h3>Artikel 14: pensioen</h3>

<p>De werknemer is verplicht toe te treden tot het bij de werkgever verplicht gestelde bedrijfspensioenfonds, een en ander conform de bepalingen van het reglement van dit pensioenfonds.</p>

<h3>Artikel 15: verbod van nevenwerkzaamheden</h3>

<p>1. De werknemer zet zich geheel in voor de werkgever. Hij verricht zonder voorafgaande schriftelijke toestemming van de werkgever geen betaalde of onbetaalde (neven)werkzaamheden voor zichzelf of voor anderen, die schadelijk zijn met de belangen van de werkgever. De werkgever is gerechtigd aan bedoelde toestemming bepaalde voorwaarden te verbinden.</p>

<h3>Artikel 16: geheimhoudingsplicht</h3>

<p>1. De werknemer is tijdens de duur en na het beëindigen van deze overeenkomst gehouden tot strikte geheimhouding van alles wat hem omtrent de onderneming van zowel de werkgever als van handelsrelaties/cliënten op welke wijze dan ook bekend is geworden en waaromtrent hem geheimhouding is opgelegd of waarvan hij het vertrouwelijk karakter redelijkerwijs kan vermoeden.</p>

<h3>Artikel 17: concurrentiebeding</h3>

<p>Het is werknemer verboden om, zonder schriftelijke toestemming van werkgever, binnen een tijdvak van 1 jaar na beëindiging van het dienstverband in enigerlei vorm een onderneming, gelijk, gelijksoortig of aanverwant aan die van de vennootschap of aan de vennootschap gelieerde vennootschappen te vestigen, te drijven, mede te drijven of te doen drijven, direct of indirect, alsook financieel in welke vorm ook bij een dergelijke onderneming belang te hebben, direct of indirect, of daarin of daarvoor op enigerlei wijze werkzaam te zijn, in dienstverband of anderszins, hetzij tegen vergoeding hetzij om niet, of daarin aandeel van welke aard ook te hebben.</p>

<h3>Artikel 18: relatiebeding</h3>

<p>1. Het is de werknemer verboden om, zonder schriftelijke toestemming van de werkgever, gedurende 1 jaar na beëindiging van de arbeidsovereenkomst op enigerlei wijze, direct of indirect, contacten te onderhouden met of werkzaam te zijn voor relaties (daaronder begrepen prospects, klanten, leveranciers en afnemers) van werkgever of aan werkgever gelieerde vennootschappen. De vraag of sprake is van een relatie van de werkgever, wordt bepaald aan de hand van de administratie van de werkgever; dit alles in de ruimste zin des woords.</p>

<h3>Artikel 19: verbod op benadering van werknemers</h3>

<p>1. Het is de werknemer verboden om gedurende 2 jaar na beëindiging van de arbeidsovereenkomst, zonder schriftelijke toestemming van werkgever, werknemers of personen te benaderen die in het laatste jaar voorafgaand aan het einde van de arbeidsovereenkomst van werknemer, een arbeidsovereenkomst hebben of hebben gehad met de werkgever en/of met de aan de werkgever gelieerde vennootschappen, ten einde deze werknemers of personen te bewegen de arbeidsovereenkomst met werkgever of met aan de werkgever gelieerde vennootschappen op te zeggen en/of zulke werknemers of personen zelf in dienst te nemen.</p>

<h3>Artikel 20: boeteclausule</h3>

<p>1. Indien de werknemer in strijd met zijn verplichtingen inzake het beding inzake nevenwerkzaamheden, het geheimhoudingsbeding, het concurrentiebeding, het relatiebeding en het beding inzake verbod op benadering van werknemers handelt, zal hij/zij in afwijking van artikel 7:650 lid 3 BW aan de werkgever, zonder dat enige ingebrekestelling is vereist, in afwijking van artikel 7:650 lid 5 BW, voor iedere overtreding een boete verbeuren van € 5.000,--, alsmede een boete van € 500,-- voor iedere dag dat de overtreding voortduurt, onverminderd het recht van de werkgever om in plaats daarvan volledige schadevergoeding plus kosten en interest te vorderen voor zover de werkelijk geleden schade de bedongen boete te boven gaat.</p>

<h3>Artikel 21: schorsing</h3>

<p>De werkgever behoudt zich het recht voor om de werknemer te schorsen (op non-actief te stellen) met behoud van salaris.</p>

<p>In geval van schorsing is de werknemer niet gehouden zich beschikbaar te houden voor het verrichten van werkzaamheden voor de werkgever. Het staat hem echter -op straffe van het vervallen van de verplichting van de werkgever tot doorbetaling van salaris- niet vrij werkzaamheden ten behoeve van derden te verrichten gedurende de tijd dat hij normaliter beschikbaar zou moeten zijn voor het verrichten van werkzaamheden voor de werkgever.</p>

<p>De werkgever verbindt zich om uitsluitend onder schriftelijke opgave van redenen over te gaan tot schorsing.</p>

<p>Desgewenst wordt de werknemer in de gelegenheid gesteld om zich in een persoonlijk onderhoud met de werkgever omtrent die redenen te verstaan.</p>

<p>De werkgever is steeds bevoegd de schorsing in te trekken in welk geval de werknemer gehouden is op eerste vordering van de werkgever de overeengekomen werkzaamheden te hervatten.</p>

<h3>Artikel 22: afwijkingen en aanpassingen</h3>

<p>Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen, zoals die bestaan op het moment van de ondertekening van deze overeenkomst.</p>

<p>Aanvullingen op, en afwijkingen van deze arbeidsovereenkomst zullen alleen geldig zijn indien en voor zover zij schriftelijk tussen partijen zijn overeengekomen, of schriftelijk door de werkgever zijn bevestigd.</p>

<p>De werkgever is gerechtigd één of meer uit deze arbeidsovereenkomst voortvloeiende arbeidsvoorwaarde(n) te wijzigen in de gevallen als vermeld in artikel 7:613 van het Burgerlijk Wetboek (dat wil zeggen: indien de werkgever bij deze wijziging een zodanig zwaarwichtig belang heeft dat het belang van de werknemer dat door de wijziging zou worden geschaad daarvoor naar maatstaven van redelijkheid en billijkheid moet wijken).</p>

<h3>Artikel 23: afsluiting</h3>

<p>1. Ten aanzien van het in deze overeenkomst genoemde salaris en/of andere emolumenten geldt dat werkgever daarop zal inhouden het geen waartoe werkgever op voorschrift van overheids- en/of daarmee vergelijkbare instanties verplicht is of word. Een en ander zal nooit aanleiding kunnen zijn tot het op enigerlei wijze daarvoor vanwege werkgever toekennen van compensaties.</p>

<h3>Artikel 24: toepasselijk recht/bevoegde rechter</h3>

<p>Op deze arbeidsovereenkomst is het Nederlandse recht bij uitsluiting van ieder ander rechtsstelsel van toepassing.</p>

<p>De Nederlandse rechter is bij uitsluiting van ieder ander bevoegd tot beslechting van geschillen voortvloeiend uit deze overeenkomst.</p>

<h3>Artikel 25: verstrekking kopie arbeidsovereenkomst</h3>

<p>Door ondertekening van deze overeenkomst verklaart de werknemer een kopie van deze overeenkomst te hebben ontvangen.</p>

<p>Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,</p>

<p>d.d. ${ondertekeningDatum}</p>

${signatureBlock(fullName)}`;
}

function buildOproepTemplate(emp, vars) {
  const { fullName, geboortedatum, adres, postcode, woonplaats, trede, uurloon, startDatum, eindDatum, duurMaanden, ondertekeningDatum, functie, afdeling } = vars;
  // Oproep = Bepaalde tijd Zonder vaste uren - uses different arbeidstijd/salaris articles
  return `<h2>ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD Zonder vaste uren</h2>

<p>De ondergetekenden:</p>

<p>Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";</p>

<p>en</p>

<p>2. De heer/mevrouw ${fullName}, geboren op ${geboortedatum}, en thans wonende aan de ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";</p>

<p>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</p>

<h3>Artikel 1: CAO</h3>

<p>Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.</p>

<p>Voorts is op deze overeenkomst het bedrijfsreglement van de werkgever van toepassing.</p>

<p>De werknemer verklaart in te stemmen met toekomstige wijzigingen op de bij de werkgever geldende algemene voorwaarden uit dit reglement.</p>

<p>Deze voorwaarden vormen één geheel met deze overeenkomst.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

<h3>Artikel 3: functie</h3>

<p>De werknemer treedt in dienst in de functie van ${functie}. De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling 3. ${afdeling}.</p>

<p>De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van zijn functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs door de werkgever kunnen worden verlangd.</p>

<h3>Artikel 4: standplaats</h3>

<p>De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever te Kapelle worden verricht.</p>

<p>De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een eventuele andere vestiging.</p>

<h3>Artikel 5: duur</h3>

<p>Deze arbeidsovereenkomst is aangegaan voor de duur van ${duurMaanden} maanden en eindigt derhalve van rechtswege op ${eindDatum} zonder dat daartoe toestemming van UWV WERKbedrijf vereist zal zijn.</p>

<p>Voor de werkgever geldt wel een schriftelijke aanzegtermijn van 1 maand; de werkgever zal de werknemer minimaal 1 maand voor afloop van deze overeenkomst schriftelijk laten weten of hij deze tijdelijke overeenkomst wel of niet wenst te verlengen, en indien wordt verlengd onder welke voorwaarden.</p>

<p>De wet verplicht werkgever één maand van te voren schriftelijk op te zeggen. Door ondertekening van deze overeenkomst is werknemer er mee bekend en akkoord dat de opzegtermijn van minimaal één maand in acht is genomen en hiermee van rechtswege tijdig is opgezegd. Opzegging/beëindiging arbeidsovereenkomst per ${eindDatum}.</p>

<p>Deze overeenkomst is ook tijdens de in 5.1 bedoelde duur opzegbaar (in geval van opzegging door de werkgever na verkregen toestemming van UWV WERKbedrijf, dan wel door de kantonrechter, dan wel middels een beëindigingsovereenkomst met wederzijds goedvinden wegens moverende redenen op voorspraak van de werkgever), met inachtneming van de opzegtermijn, welke op grond van de wet of de CAO geldt. In dat geval is bij opzegging van de arbeidsovereenkomst de opzegtermijn van toepassing die voortvloeit uit het bepaalde in artikel 7:672 van het Burgerlijk Wetboek, tenzij uit het bepaalde in de geldende CAO een kortere of langere opzegtermijn voortvloeit.</p>

<p>In geval van (al dan niet herhaalde) stilzwijgende voortzetting na het verstrijken van de duur als in artikel 5.1 bedoeld, eindigt de arbeidsovereenkomst in elk geval met ingang van de dag waarop de werknemer de leeftijd bereikt waarop op grond van de Algemene Ouderdoms Wet recht op ouderdomspensioen ontstaat.</p>

<p>De arbeidsovereenkomst eindigt in elk geval van rechtswege, zonder dat daarvoor opzegging noodzakelijk is, met ingang van de dag na het overlijden van de werkgever.</p>

<h3>Artikel 6: proeftijd</h3>

<p>Er geldt één maand proeftijd.</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt in beginsel aangegaan voor nul uur per week. Indien geschikte werkzaamheden voor de werknemer voor handen zijn, zal de werkgever de werknemer echter oproepen voor het verrichten van deze werkzaamheden. De werknemer verplicht zich om na deze oproep de werkzaamheden te verrichten.</p>

<p>De werkgever is verplicht de werknemer voor werkzaamheden op te roepen uiterlijk 24 uur voor aanvang van de werkzaamheden.</p>

<p>De werkgever is verplicht de werknemer minimaal 4 uur voor het einde van de werkzaamheden op de hoogte te stellen van het einde van de werkzaamheden.</p>

<p>De dagen en tijden waarop de arbeid dient te worden verricht, worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per daadwerkelijk gewerkt uur.</p>

<p>In afwijking van het bepaalde in artikel 7:628 van het Burgerlijk Wetboek is de werkgever niet gehouden tot betaling van salaris gedurende de tijd dat geen geschikt werk voor de werknemer voor handen is.</p>

<p>De eerste 6 maanden van je contract krijg je alleen betaald voor de uren die je werkt. Ben je langer dan 6 maanden in dienst? Dan moet je werkgever betalen voor het gemiddelde aantal uren die je in de laatste 3 maanden hebt gewerkt, ook als je niet wordt opgeroepen.</p>

<p>Het salaris zal na afloop van elke maand uitbetaald worden op een door de werknemer aan te wijzen bankrekening.</p>

<p>Met het oog op het bepaalde in artikel 7:626 lid 4 van het Burgerlijk Wetboek, verklaart de werknemer er mee in te stemmen dat de salarisstrook niet schriftelijk maar ook op elektronische wijze kan worden aangeboden.</p>

<h3>Artikel 9: arbeidsongeschiktheid</h3>

<p>De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn vastgesteld. Deze voorschriften zijn terug te vinden in het bedrijfsreglement.</p>

<p>De werkgever is steeds bevoegd tot wijziging van deze voorschriften.</p>

<p>Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.</p>

<p>In geval van ziekte zullen er 2 wachtdagen worden toegepast per ziekteperiode om ziekteverzuim terug te dringen conform art. 7:629 lid 9 BW.</p>

<h3>Artikel 10: vakantietoeslag</h3>

<p>Aan de werknemer zal 8% van zijn salaris als vakantietoeslag worden uitgekeerd.</p>

<p>De betaling van de vakantietoeslag zal maandelijks met de uitbetaling van het reguliere bruto salaris geschieden.</p>

<h3>Artikel 11: vakantiedagen</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op vakantie met behoud van salaris toegekend naar rato van de gewerkte uren.</p>

<h3>Artikel 12: ATV</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op ATV met behoud van salaris toegekend.</p>

<h3>Artikel 13: beëindiging</h3>

<p>Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantie-uren en te veel dan wel te weinig uitbetaalde vakantietoeslag geschieden door inhouding op dan wel uitbetaling bij het laatste maandsalaris, een en ander naar rato van het aantal gewerkte maanden in de betreffende periode.</p>

<h3>Artikel 14: pensioen</h3>

<p>De werknemer is verplicht toe te treden tot het bij de werkgever verplicht gestelde bedrijfspensioenfonds, een en ander conform de bepalingen van het reglement van dit pensioenfonds.</p>

<h3>Artikel 15: verbod van nevenwerkzaamheden</h3>

<p>1. De werknemer zet zich geheel in voor de werkgever. Hij verricht zonder voorafgaande schriftelijke toestemming van de werkgever geen betaalde of onbetaalde (neven)werkzaamheden voor zichzelf of voor anderen, die schadelijk zijn met de belangen van de werkgever.</p>

<h3>Artikel 16: geheimhoudingsplicht</h3>

<p>1. De werknemer is tijdens de duur en na het beëindigen van deze overeenkomst gehouden tot strikte geheimhouding van alles wat hem omtrent de onderneming van zowel de werkgever als van handelsrelaties/cliënten op welke wijze dan ook bekend is geworden en waaromtrent hem geheimhouding is opgelegd of waarvan hij het vertrouwelijk karakter redelijkerwijs kan vermoeden.</p>

<h3>Artikel 17: concurrentiebeding</h3>

<p>Het is werknemer verboden om, zonder schriftelijke toestemming van werkgever, binnen een tijdvak van 1 jaar na beëindiging van het dienstverband in enigerlei vorm een onderneming, gelijk, gelijksoortig of aanverwant aan die van de vennootschap te vestigen, te drijven, mede te drijven of te doen drijven, direct of indirect.</p>

<h3>Artikel 18: relatiebeding</h3>

<p>1. Het is de werknemer verboden om, zonder schriftelijke toestemming van de werkgever, gedurende 1 jaar na beëindiging van de arbeidsovereenkomst op enigerlei wijze contacten te onderhouden met of werkzaam te zijn voor relaties van werkgever.</p>

<h3>Artikel 19: verbod op benadering van werknemers</h3>

<p>1. Het is de werknemer verboden om gedurende 2 jaar na beëindiging van de arbeidsovereenkomst werknemers of personen te benaderen die bij de werkgever werkzaam zijn.</p>

<h3>Artikel 20: boeteclausule</h3>

<p>1. Indien de werknemer in strijd handelt met bovenstaande bedingen verbeurt hij/zij een boete van € 5.000,-- per overtreding en € 500,-- per dag.</p>

<h3>Artikel 21: schorsing</h3>

<p>De werkgever behoudt zich het recht voor om de werknemer te schorsen (op non-actief te stellen) met behoud van salaris.</p>

<h3>Artikel 22: afwijkingen en aanpassingen</h3>

<p>Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen.</p>

<h3>Artikel 23: afsluiting</h3>

<p>1. Ten aanzien van het in deze overeenkomst genoemde salaris en/of andere emolumenten geldt dat werkgever daarop zal inhouden het geen waartoe werkgever op voorschrift van overheids- en/of daarmee vergelijkbare instanties verplicht is.</p>

<h3>Artikel 24: toepasselijk recht/bevoegde rechter</h3>

<p>Op deze arbeidsovereenkomst is het Nederlandse recht bij uitsluiting van ieder ander rechtsstelsel van toepassing.</p>

<h3>Artikel 25: verstrekking kopie arbeidsovereenkomst</h3>

<p>Door ondertekening van deze overeenkomst verklaart de werknemer een kopie van deze overeenkomst te hebben ontvangen.</p>

<p>Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,</p>

<p>d.d. ${ondertekeningDatum}</p>

${signatureBlock(fullName)}`;
}

function buildVastTemplate(emp, vars) {
  const { fullName, geboortedatum, adres, postcode, woonplaats, trede, uurloon, startDatum, ondertekeningDatum, functie, afdeling } = vars;
  return `<h2>ARBEIDSOVEREENKOMST VOOR ONBEPAALDE TIJD</h2>

<p>De ondergetekenden:</p>

<p>Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";</p>

<p>En</p>

<p>De heer/mevrouw ${fullName}, geboren op ${geboortedatum}, en thans wonende aan ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";</p>

<p>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</p>

<h3>Artikel 1: CAO</h3>

<p>Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.</p>

<p>Voorts is op deze overeenkomst het bedrijfsreglement van de werkgever van toepassing.</p>

<p>De werknemer verklaart in te stemmen met toekomstige wijzigingen op de bij de werkgever geldende algemene voorwaarden uit dit reglement.</p>

<p>Het bedrijfsreglement vormt één geheel met deze overeenkomst.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

<p>De werknemer is oorspronkelijk bij werkgever in dienst getreden op [NOG IN TE VULLEN]</p>

<h3>Artikel 3: functie</h3>

<p>De werknemer treedt in dienst in de functie van ${functie}.</p>

<p>De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling ${afdeling}.</p>

<p>De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van zijn functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs door de werkgever kunnen worden verlangd.</p>

<h3>Artikel 4: standplaats</h3>

<p>De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever te Kapelle worden verricht.</p>

<p>De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een eventuele andere vestiging.</p>

<h3>Artikel 5: duur</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor onbepaalde duur.</p>

<p>In geval van opzegging is de opzegtermijn van toepassing die voortvloeit uit het bepaalde in artikel 7:672 van het Burgerlijk Wetboek, tenzij uit het bepaalde in de geldende CAO een kortere of langere opzegtermijn voortvloeit. Opzegging van de arbeidsovereenkomst door de werkgever is alleen mogelijk indien hiervoor toestemming is verleend door UWV WERKbedrijf, dan wel door de kantonrechter, dan wel middels een beëindigingsovereenkomst met wederzijds goedvinden wegens moverende redenen op voorspraak van de werkgever.</p>

<p>De arbeidsovereenkomst eindigt in elk geval met ingang van de dag waarop de werknemer de leeftijd bereikt waarop op grond van de Algemene Ouderdoms Wet recht op ouderdomspensioen ontstaat.</p>

<p>De arbeidsovereenkomst eindigt in elk geval van rechtswege, zonder dat daarvoor opzegging noodzakelijk is, met ingang van de dag na het overlijden van de werkgever.</p>

<h3>Artikel 6: proeftijd</h3>

<p>Er geldt één maand / geen proeftijd.</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor [NOG IN TE VULLEN] basisuren per week. Een fulltime werkweek wordt gesteld op 40 uur per week.</p>

<p>De dagen en tijden waarop de arbeid dient te worden verricht, worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer, arbeidsrooster en de voorwaarden uit de algemene overeenkomst/bedrijfsreglement art. 21 en 22.</p>

<p>De werkgever kan van de werknemer verlangen in bijzondere gevallen overwerk te verrichten.</p>

<p>Overuren zijn uren welke gelegen zijn buiten de normale arbeidsduur.</p>

<p>Overwerk wordt vergoed conform het bepaalde in de CAO.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per uur.</p>

<p>Het salaris zal maandelijks tegen het einde van de maand uitbetaald worden op een door de werknemer aan te wijzen bankrekening.</p>

<p>Met het oog op het bepaalde in artikel 7:626 lid 4 van het Burgerlijk Wetboek, verklaart de werknemer er mee in te stemmen dat de salarisstrook niet schriftelijk maar ook op elektronische wijze kan worden aangeboden.</p>

<h3>Artikel 9: arbeidsongeschiktheid</h3>

<p>De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn vastgesteld.</p>

<p>De werkgever is steeds bevoegd tot wijziging van deze voorschriften. Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.</p>

<p>In geval van ziekte zullen er 2 wachtdagen worden toegepast per ziekteperiode om ziekteverzuim terug te dringen conform art. 7:629 lid 9 BW.</p>

<h3>Artikel 10: vakantietoeslag</h3>

<p>Aan de werknemer zal 8% van zijn salaris als vakantietoeslag worden uitgekeerd.</p>

<p>Werknemerskeuze: De betaling van de vakantietoeslag zal maandelijks met de uitbetaling van het reguliere bruto salaris geschieden.</p>

<h3>Artikel 11: vakantiedagen</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op vakantie met behoud van salaris toegekend volgens de voorschriften van de CAO.</p>

<h3>Artikel 12: ATV</h3>

<p>Aan de werknemer wordt gedurende deze overeenkomst een recht op ATV met behoud van salaris toegekend volgens de voorschriften van de CAO.</p>

<h3>Artikel 13: beëindiging</h3>

<p>Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantie-uren geschieden.</p>

<h3>Artikel 14: pensioen</h3>

<p>De werknemer is verplicht toe te treden tot het bij de werkgever verplicht gestelde bedrijfspensioenfonds.</p>

<h3>Artikel 15: verbod van nevenwerkzaamheden</h3>

<p>1. De werknemer zet zich geheel in voor de werkgever. Hij verricht zonder voorafgaande schriftelijke toestemming van de werkgever geen betaalde of onbetaalde (neven)werkzaamheden voor zichzelf of voor anderen.</p>

<h3>Artikel 16: geheimhoudingsplicht</h3>

<p>1. De werknemer is tijdens de duur en na het beëindigen van deze overeenkomst gehouden tot strikte geheimhouding.</p>

<h3>Artikel 17: concurrentiebeding</h3>

<p>Het is werknemer verboden om, zonder schriftelijke toestemming van werkgever, binnen een tijdvak van 1 jaar na beëindiging van het dienstverband in enigerlei vorm een gelijksoortige onderneming te vestigen of te drijven.</p>

<h3>Artikel 18: relatiebeding</h3>

<p>1. Het is de werknemer verboden om gedurende 1 jaar na beëindiging contacten te onderhouden met relaties van werkgever.</p>

<h3>Artikel 19: verbod op benadering van werknemers</h3>

<p>Het is de werknemer verboden om gedurende 2 jaar na beëindiging werknemers te benaderen.</p>

<h3>Artikel 20: boeteclausule</h3>

<p>1. Bij overtreding van bovenstaande bedingen verbeurt werknemer een boete van € 5.000,-- per overtreding en € 500,-- per dag.</p>

<h3>Artikel 21: schorsing</h3>

<p>De werkgever behoudt zich het recht voor om de werknemer te schorsen met behoud van salaris.</p>

<h3>Artikel 22: afwijkingen en aanpassingen</h3>

<p>Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen.</p>

<h3>Artikel 23: afsluiting</h3>

<p>1. Ten aanzien van het genoemde salaris geldt dat werkgever daarop zal inhouden het geen waartoe werkgever wettelijk verplicht is.</p>

<h3>Artikel 24: toepasselijk recht/bevoegde rechter</h3>

<p>Op deze arbeidsovereenkomst is het Nederlandse recht van toepassing.</p>

<h3>Artikel 25: verstrekking kopie arbeidsovereenkomst</h3>

<p>Door ondertekening van deze overeenkomst verklaart de werknemer een kopie te hebben ontvangen.</p>

<p>Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,</p>

<p>d.d. ${ondertekeningDatum}</p>

${signatureBlock(fullName)}`;
}


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { employee_id, contract_type, start_date, end_date, hours_per_week, proeftijd, is_verlenging, oorspronkelijke_indienst_datum, preview_only, final_html } = body;

    if (!employee_id || !contract_type || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [employee, salaryTables] = await Promise.all([
      base44.asServiceRole.entities.Employee.get(employee_id),
      base44.asServiceRole.entities.SalaryTable.filter({ status: 'Actief' }),
    ]);

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const applicableSalary = salaryTables.find(s => 
      s.scale === employee.salary_scale && 
      new Date(s.start_date) <= new Date(start_date) &&
      (!s.end_date || new Date(s.end_date) >= new Date(start_date))
    );

    const hourlyRate = applicableSalary?.hourly_rate || employee.hourly_rate || 0;
    const actualHours = hours_per_week || employee.contract_hours || 40;

    const fullName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;
    const inDienstDatum = is_verlenging && oorspronkelijke_indienst_datum
      ? formatDate(oorspronkelijke_indienst_datum)
      : (employee.in_service_since ? formatDate(employee.in_service_since) : '[NOG IN TE VULLEN]');

    const vars = {
      fullName,
      geboortedatum: formatDate(employee.date_of_birth),
      adres: employee.address || '[NOG IN TE VULLEN]',
      postcode: employee.postal_code || '[NOG IN TE VULLEN]',
      woonplaats: employee.city || '[NOG IN TE VULLEN]',
      trede: employee.salary_scale || '[NOG IN TE VULLEN]',
      uurloon: hourlyRate > 0 ? `€ ${hourlyRate.toFixed(2)}` : '[NOG IN TE VULLEN]',
      startDatum: formatDate(start_date),
      eindDatum: formatDate(end_date),
      duurTekst: calcDuration(start_date, end_date),
      ondertekeningDatum: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
      functie: employee.function || 'Pakketbezorger',
      afdeling: employee.department || 'PakketDistributie',
      proeftijd: proeftijd || 'Geen proeftijd',
      inDienstDatum,
    };

    let contractContent;
    let templateNote;
    let contractHours;

    if (contract_type === 'Oproep') {
      contractContent = buildOproepTemplate(employee, vars);
      templateNote = 'Oproepcontract sjabloon (bepaalde tijd, nul uren)';
      contractHours = 0;
    } else if (contract_type === 'Tijdelijk') {
      contractContent = buildBepaaldetijdTemplate(employee, vars);
      templateNote = 'Bepaalde tijd sjabloon (vaste uren)';
      contractHours = actualHours;
    } else {
      // Vast
      contractContent = buildVastTemplate(employee, vars);
      templateNote = 'Onbepaalde tijd sjabloon (vaste uren)';
      contractHours = actualHours;
    }

    const contractNumber = `CONTRACT-${employee.employee_number || employee_id.substring(0, 8)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const contract = await base44.asServiceRole.entities.Contract.create({
      employee_id,
      contract_number: contractNumber,
      contract_type,
      start_date,
      end_date: end_date || null,
      hours_per_week: contractHours,
      hourly_rate: hourlyRate,
      salary_scale: employee.salary_scale,
      function_title: employee.function || 'Pakketbezorger',
      department: employee.department,
      contract_content: contractContent,
      status: 'Concept',
      notes: `Gegenereerd vanuit ${templateNote}`
    });

    // Create notification
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUserIds = allUsers.filter(u => u.role === 'admin').map(u => u.id);
    const employeeUser = allUsers.find(u => u.email === employee.email);

    if (employeeUser) {
      await base44.asServiceRole.entities.Notification.create({
        title: 'Nieuw contract gegenereerd',
        description: `Een nieuw ${contract_type} contract is gegenereerd. Contractnummer: ${contractNumber}`,
        type: 'general',
        target_page: 'Contracts',
        user_ids: [employeeUser.id, ...adminUserIds],
        priority: 'high'
      });
    }

    return Response.json({
      success: true,
      contract,
      conflict_analysis: null,
      clause_summary: null,
      message: `Contract gegenereerd vanuit ${templateNote}`
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});