import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const { employee_id, contract_type, start_date, end_date, hours_per_week } = await req.json();

    if (!employee_id || !contract_type || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch all context data in parallel
    const [employee, caoRules, salaryTables, existingContracts] = await Promise.all([
      base44.asServiceRole.entities.Employee.get(employee_id),
      base44.asServiceRole.entities.CaoRule.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.SalaryTable.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.Contract.filter({ employee_id })
    ]);

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Find applicable salary
    const applicableSalary = salaryTables.find(s => 
      s.scale === employee.salary_scale && 
      new Date(s.start_date) <= new Date(start_date) &&
      (!s.end_date || new Date(s.end_date) >= new Date(start_date))
    );

    const hourlyRate = applicableSalary?.hourly_rate || employee.hourly_rate || 0;
    const actualHours = hours_per_week || employee.contract_hours || 40;

    // Check if this is an Oproep contract - use fixed template
    if (contract_type === 'Oproep') {
      const fullName = `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}`;
      const geboortedatum = employee.date_of_birth
        ? new Date(employee.date_of_birth).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
        : '[NOG IN TE VULLEN]';
      const adres = employee.address || '[NOG IN TE VULLEN]';
      const postcode = employee.postal_code || '[NOG IN TE VULLEN]';
      const woonplaats = employee.city || '[NOG IN TE VULLEN]';
      const trede = employee.salary_scale || '[NOG IN TE VULLEN]';
      const uurloon = hourlyRate > 0 ? `€ ${hourlyRate.toFixed(2)}` : '[NOG IN TE VULLEN]';
      const startDatumFormatted = new Date(start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      
      let duurMaanden = '[NOG IN TE VULLEN]';
      let eindDatumFormatted = '[NOG IN TE VULLEN]';
      if (end_date) {
        const startD = new Date(start_date);
        const endD = new Date(end_date);
        const months = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
        duurMaanden = String(months);
        eindDatumFormatted = endD.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      const heerMevrouw = 'De heer/mevrouw';
      const ondertekeningDatum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

      const oproepTemplate = `ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD Zonder vaste uren

De ondergetekenden:

Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";

en

2.\t${heerMevrouw} ${fullName}, geboren op ${geboortedatum}, en thans wonende aan de ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";

Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:

Artikel 1: CAO

Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.

Voorts is op deze overeenkomst het bedrijfsreglement van de werkgever van toepassing.

De werknemer verklaart in te stemmen met toekomstige wijzigingen op de bij de werkgever geldende algemene voorwaarden uit dit reglement.

Deze voorwaarden vormen één geheel met deze overeenkomst.

Artikel 2: ingangsdatum

Deze overeenkomst vangt aan op ${startDatumFormatted}.

Artikel 3: functie

De werknemer treedt in dienst in de functie van ${employee.function || 'Pakketbezorger'}. De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling 3. ${employee.department || 'PakketDistributie'}.

De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van zijn functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs door de werkgever kunnen worden verlangd.

Artikel 4: standplaats

De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever te Kapelle worden verricht.

De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een eventuele andere vestiging.

Artikel 5: duur

Deze arbeidsovereenkomst is aangegaan voor de duur van ${duurMaanden} maanden en eindigt derhalve van rechtswege op ${eindDatumFormatted} zonder dat daartoe toestemming van UWV WERKbedrijf vereist zal zijn.

Voor de werkgever geldt wel een schriftelijke aanzegtermijn van 1 maand; de werkgever zal de werknemer minimaal 1 maand voor afloop van deze overeenkomst schriftelijk laten weten of hij deze tijdelijke overeenkomst wel of niet wenst te verlengen, en indien wordt verlengd onder welke voorwaarden.

De wet verplicht werkgever één maand van te voren schriftelijk op te zeggen. Door ondertekening van deze overeenkomst is werknemer er mee bekend en akkoord dat de opzegtermijn van minimaal één maand in acht is genomen en hiermee van rechtswege tijdig is opgezegd.
Opzegging/beëindiging arbeidsovereenkomst per (einddatum).

Deze overeenkomst is ook tijdens de in 5.1 bedoelde duur opzegbaar (in geval van opzegging door de werkgever na verkregen toestemming van UWV WERKbedrijf, dan wel door de kantonrechter, dan wel middels een beëindigingsovereenkomst met wederzijds goedvinden wegens moverende redenen op voorspraak van de werkgever), met inachtneming van de opzegtermijn, welke op grond van de wet of de CAO geldt. In dat geval is bij opzegging van de arbeidsovereenkomst de opzegtermijn van toepassing die voortvloeit uit het bepaalde in artikel 7:672 van het Burgerlijk Wetboek, tenzij uit het bepaalde in de geldende CAO een kortere of langere opzegtermijn voortvloeit.

In geval van (al dan niet herhaalde) stilzwijgende voortzetting na het verstrijken van de duur als in artikel 5.1 bedoeld, eindigt de arbeidsovereenkomst in elk geval met ingang van de dag waarop de werknemer de leeftijd bereikt waarop op grond van de Algemene Ouderdoms Wet recht op ouderdomspensioen ontstaat. Eventuele keuzemogelijkheden van de werknemer om het recht op ouderdomspensioen eerder of later te laten ingaan zullen daarbij niet in aanmerking worden genomen.

De arbeidsovereenkomst eindigt in elk geval van rechtswege, zonder dat daarvoor opzegging noodzakelijk is, met ingang van de dag na het overlijden van de werkgever.

Artikel 6: proeftijd

Er geldt één maand proeftijd.

Artikel 7: arbeidstijd

De arbeidsovereenkomst wordt in beginsel aangegaan voor nul uur per week.
Indien geschikte werkzaamheden voor de werknemer voor handen zijn, zal de werkgever de werknemer echter oproepen voor het verrichten van deze werkzaamheden. De werknemer verplicht zich om na deze oproep de werkzaamheden te verrichten. Indien op basis van soortgelijke afspraken als bij deze overeenkomst tussen partijen zijn gemaakt, meerdere werknemers in aanmerking komen om te worden opgeroepen voor het verrichten van bepaalde werkzaamheden, zal de werkgever het werk (per kalenderjaar) evenredig over deze werknemers verdelen.

De werkgever is verplicht de werknemer voor werkzaamheden op te roepen uiterlijk 24 uur voor aanvang van de werkzaamheden.

De werkgever is verplicht de werknemer minimaal 4 uur voor het einde van de werkzaamheden op de hoogte te stellen van het einde van de werkzaamheden.

De dagen en tijden waarop de arbeid dient te worden verricht, worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer.

Artikel 8: salaris

Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per daadwerkelijk gewerkt uur.

In afwijking van het bepaalde in artikel 7:628 van het Burgerlijk Wetboek is de werkgever niet gehouden tot betaling van salaris gedurende de tijd dat geen geschikt werk voor de werknemer voor handen is.

De eerste 6 maanden van je contract krijg je alleen betaald voor de uren die je werkt. Ben je langer dan 6 maanden in dienst? Dan moet je werkgever betalen voor het gemiddelde aantal uren die je in de laatste 3 maanden hebt gewerkt, ook als je niet wordt opgeroepen.

Het salaris zal na afloop van elke maand uitbetaald worden op een door de werknemer aan te wijzen bankrekening.

Met het oog op het bepaalde in artikel 7:626 lid 4 van het Burgerlijk Wetboek, verklaart de werknemer er mee in te stemmen dat de salarisstrook niet schriftelijk maar ook op elektronische wijze kan worden aangeboden (bijvoorbeeld middels E-mail of middels een verstrekte inlogcode, waarbij de werknemer de salarisstrook zelf dient op te halen uit het bij de werkgever van toepassing zijnde salaris- en personeelsinformatiesysteem).

Artikel 9: arbeidsongeschiktheid

De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn vastgesteld. Deze voorschriften zijn terug te vinden in het bedrijfsreglement.

De werkgever is steeds bevoegd tot wijziging van deze voorschriften.

Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.

In geval van ziekte zullen er 2 wachtdagen worden toegepast per ziekteperiode om ziekteverzuim terug te dringen conform art. 7:629 lid 9 BW.

Indien de werknemer binnen vier weken na het einde van de arbeidsovereenkomst arbeidsongeschikt wordt als gevolg van een ziekte (een gebrek daaronder begrepen), is de werknemer ten opzichte van de werkgever verplicht:

van het intreden van deze ziekte onverwijld schriftelijk mededeling te doen aan de werkgever;

de werkgever daarbij te berichten of de werknemer ten tijde van het intreden van deze ziekte al dan niet in dienst was van een andere werkgever;

de werkgever daarbij te berichten of de werknemer ten tijde van het intreden van deze ziekte al dan niet daadwerkelijk een WW-uitkering ontving;

zich op eerste verzoek van de werkgever te doen onderzoeken door een door de werkgever aan te wijzen bedrijfsarts, deze bedrijfsarts alle gevraagde inlichtingen te verschaffen en deze bedrijfsarts op zijn verzoek te machtigen om informatie op te vragen bij de huisarts van de werknemer en eventuele andere artsen of anderen door wie de werknemer zich laat behandelen, een en ander teneinde deze bedrijfsarts in staat te stellen om ten behoeve van de werkgever vast te stellen of in de periode tot vier weken na de datum waarop de arbeidsovereenkomst eindigt sprake was van een ziekte of gebrek dat zou kunnen leiden tot de toekenning van een Ziektewetuitkering;

indien de werknemer een Ziektewetuitkering aanvraagt: alle verplichtingen na te komen die op grond van de Ziektewet voor de werknemer gelden.

De bovenstaande verplichtingen gelden ongeacht de wijze waarop de arbeidsovereenkomst eindigt.

6.\tBij niet-nakoming van één of meer van de in dit artikel vervatte verplichtingen verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 1.000,-- per overtreding en € 250,-- voor elke dag dat de overtreding voortduurt, zonder dat de werkgever gehouden zal zijn schade te bewijzen en onverminderd het recht van de werkgever om schadevergoeding te vorderen, indien en voor zover de schade het bedrag van de boeten overtreft.

Artikel 10: vakantietoeslag

Aan de werknemer zal 8% van zijn salaris als vakantietoeslag worden uitgekeerd.

De betaling van de vakantietoeslag zal maandelijks met de uitbetaling van het reguliere bruto salaris geschieden.

Artikel 11: vakantiedagen

Aan de werknemer wordt gedurende deze overeenkomst een recht op vakantie met behoud van salaris toegekend naar rato van de gewerkte uren.

De vakantie wordt op initiatief van de werkgever of de werknemer, door de werkgever vastgesteld. De werkgever voert over het vaststellen van de vakantiedagen tijdig overleg met de werknemer.

Artikel 12: ATV

Aan de werknemer wordt gedurende deze overeenkomst een recht op ATV met behoud van salaris toegekend volgens de bepalingen in de cao en naar rato van de gewerkte uren.

Artikel 13: beëindiging

Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantie-uren en te veel dan wel te weinig uitbetaalde vakantietoeslag geschieden door inhouding op dan wel uitbetaling bij het laatste maandsalaris, een en ander naar rato van het aantal gewerkte maanden in de betreffende periode.

Artikel 14: pensioen

De werknemer is verplicht toe te treden tot het bij de werkgever verplicht gestelde bedrijfspensioenfonds, een en ander conform de bepalingen van het reglement van dit pensioenfonds.

Artikel 15: verbod van nevenwerkzaamheden

1.\tDe werknemer zet zich geheel in voor de werkgever. Hij verricht zonder voorafgaande schriftelijke toestemming van de werkgever geen betaalde of onbetaalde (neven)werkzaamheden voor zichzelf of voor anderen, die schadelijk zijn met de belangen van de werkgever. De werkgever is gerechtigd aan bedoelde toestemming bepaalde voorwaarden te verbinden.

Artikel 16: geheimhoudingsplicht

1.\tDe werknemer is tijdens de duur en na het beëindigen van deze overeenkomst gehouden tot strikte geheimhouding van alles wat hem omtrent de onderneming van zowel de werkgever als van handelsrelaties/cliënten op welke wijze dan ook bekend is geworden en waaromtrent hem geheimhouding is opgelegd of waarvan hij het vertrouwelijk karakter redelijkerwijs kan vermoeden.

Artikel 17: concurrentiebeding

Het is werknemer verboden om, zonder schriftelijke toestemming van werkgever, binnen een tijdvak van 1 jaar na beëindiging van het dienstverband in enigerlei vorm een onderneming, gelijk, gelijksoortig of aanverwant aan die van de vennootschap of aan de vennootschap gelieerde vennootschappen te vestigen, te drijven, mede te drijven of te doen drijven, direct of indirect, alsook financieel in welke vorm ook bij een dergelijke onderneming belang te hebben, direct of indirect, of daarin of daarvoor op enigerlei wijze werkzaam te zijn, in dienstverband of anderszins, hetzij tegen vergoeding hetzij om niet, of daarin aandeel van welke aard ook te hebben.

Artikel 18: relatiebeding

1.\tHet is de werknemer verboden om, zonder schriftelijke toestemming van de werkgever, gedurende 1 jaar na beëindiging van de arbeidsovereenkomst op enigerlei wijze, direct of indirect, contacten te onderhouden met of werkzaam te zijn voor relaties (daaronder begrepen prospects, klanten, leveranciers en afnemers) van werkgever of aan werkgever gelieerde vennootschappen. De vraag of sprake is van een relatie van de werkgever, wordt bepaald aan de hand van de administratie van de werkgever; dit alles in de ruimste zin des woords.

Artikel 19: verbod op benadering van werknemers

1.\tHet is de werknemer verboden om gedurende 2 jaar na beëindiging van de arbeidsovereenkomst, zonder schriftelijke toestemming van werkgever, werknemers of personen te benaderen die in het laatste jaar voorafgaand aan het einde van de arbeidsovereenkomst van werknemer, een arbeidsovereenkomst hebben of hebben gehad met de werkgever en/of met de aan de werkgever gelieerde vennootschappen, ten einde deze werknemers of personen te bewegen de arbeidsovereenkomst met werkgever of met aan de werkgever gelieerde vennootschappen op te zeggen en/of zulke werknemers of personen zelf in dienst te nemen.

Artikel 20: boeteclausule

1.\tIndien de werknemer in strijd met zijn verplichtingen inzake het beding inzake nevenwerkzaamheden, het geheimhoudingsbeding, het concurrentiebeding, het relatiebeding en het beding inzake verbod op benadering van werknemers handelt, zal hij/zij in afwijking van artikel 7:650 lid 3 BW aan de werkgever, zonder dat enige ingebrekestelling is vereist, in afwijking van artikel 7:650 lid 5 BW, voor iedere overtreding een boete verbeuren van € 5.000,--, alsmede een boete van € 500,-- voor iedere dag dat de overtreding voortduurt, onverminderd het recht van de werkgever om in plaats daarvan volledige schadevergoeding plus kosten en interest te vorderen voor zover de werkelijk geleden schade de bedongen boete te boven gaat.

Artikel 21: schorsing

De werkgever behoudt zich het recht voor om de werknemer te schorsen (op non-actief te stellen) met behoud van salaris.

In geval van schorsing is de werknemer niet gehouden zich beschikbaar te houden voor het verrichten van werkzaamheden voor de werkgever. Het staat hem echter -op straffe van het vervallen van de verplichting van de werkgever tot doorbetaling van salaris- niet vrij werkzaamheden ten behoeve van derden te verrichten gedurende de tijd dat hij normaliter beschikbaar zou moeten zijn voor het verrichten van werkzaamheden voor de werkgever.

De werkgever verbindt zich om uitsluitend onder schriftelijke opgave van redenen over te gaan tot schorsing.

Desgewenst wordt de werknemer in de gelegenheid gesteld om zich in een persoonlijk onderhoud met de werkgever omtrent die redenen te verstaan.

De werkgever is steeds bevoegd de schorsing in te trekken in welk geval de werknemer gehouden is op eerste vordering van de werkgever de overeengekomen werkzaamheden te hervatten.

Artikel 22: afwijkingen en aanpassingen

Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen, zoals die bestaan op het moment van de ondertekening van deze overeenkomst.

Aanvullingen op, en afwijkingen van deze arbeidsovereenkomst zullen alleen geldig zijn indien en voor zover zij schriftelijk tussen partijen zijn overeengekomen, of schriftelijk door de werkgever zijn bevestigd.

De werkgever is gerechtigd één of meer uit deze arbeidsovereenkomst voortvloeiende arbeidsvoorwaarde(n) te wijzigen in de gevallen als vermeld in artikel 7:613 van het Burgerlijk Wetboek (dat wil zeggen: indien de werkgever bij deze wijziging een zodanig zwaarwichtig belang heeft dat het belang van de werknemer dat door de wijziging zou worden geschaad daarvoor naar maatstaven van redelijkheid en billijkheid moet wijken).

Artikel 23: afsluiting

1.\tTen aanzien van het in deze overeenkomst genoemde salaris en/of andere emolumenten geldt dat werkgever daarop zal inhouden het geen waartoe werkgever op voorschrift van overheids- en/of daarmee vergelijkbare instanties verplicht is of word. Een en ander zal nooit aanleiding kunnen zijn tot het op enigerlei wijze daarvoor vanwege werkgever toekennen van compensaties.

Artikel 24: toepasselijk recht/bevoegde rechter

Op deze arbeidsovereenkomst is het Nederlandse recht bij uitsluiting van ieder ander rechtsstelsel van toepassing.

De Nederlandse rechter is bij uitsluiting van ieder ander bevoegd tot beslechting van geschillen voortvloeiend uit deze overeenkomst.

Artikel 25: verstrekking kopie arbeidsovereenkomst en bedrijfsreglement.

Door ondertekening van deze overeenkomst verklaart de werknemer een kopie van deze overeenkomst te hebben ontvangen.

Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,

d.d. ${ondertekeningDatum}

Voor akkoord\t\t\tVoor akkoord

…………………………………………\t……………………………………

Van Dooren Transport Zeeland B.V.\t${heerMevrouw} ${fullName}

Namens deze:

De heer M. Schetters`;

      // Generate contract number
      const contractNumber = `CONTRACT-${employee.employee_number || employee_id.substring(0, 8)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Create contract record
      const contract = await base44.asServiceRole.entities.Contract.create({
        employee_id,
        contract_number: contractNumber,
        contract_type,
        start_date,
        end_date: end_date || null,
        hours_per_week: 0,
        hourly_rate: hourlyRate,
        salary_scale: employee.salary_scale,
        function_title: employee.function || 'Pakketbezorger',
        department: employee.department,
        contract_content: oproepTemplate,
        status: 'Concept',
        notes: 'Gegenereerd vanuit standaard oproepcontract sjabloon'
      });

      return Response.json({
        success: true,
        contract,
        conflict_analysis: null,
        clause_summary: null,
        message: 'Oproepcontract gegenereerd vanuit standaard sjabloon'
      });
    }

    // Build rich context for AI
    const activeContracts = existingContracts.filter(c => c.status === 'Actief' || c.status === 'Ondertekend');
    const previousContractInfo = activeContracts.length > 0 
      ? `\nEERDERE/ACTIEVE CONTRACTEN (${activeContracts.length}):\n${activeContracts.map(c => `- ${c.contract_number}: ${c.contract_type}, ${c.start_date} t/m ${c.end_date || 'onbepaald'}, ${c.hours_per_week}u/week`).join('\n')}`
      : '\nGeen eerdere actieve contracten.';

    const contractregels = employee.contractregels || [];
    const recentContractregel = contractregels.length > 0
      ? contractregels.sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0]
      : null;

    const inDienstSinds = employee.in_service_since 
      ? new Date(employee.in_service_since).toLocaleDateString('nl-NL')
      : 'Onbekend';

    // Group CAO rules by category
    const rulesByCategory = {};
    caoRules.forEach(rule => {
      const cat = rule.category || 'Overig';
      if (!rulesByCategory[cat]) rulesByCategory[cat] = [];
      rulesByCategory[cat].push(rule);
    });

    const caoContext = Object.entries(rulesByCategory).map(([cat, rules]) => {
      return `${cat}:\n${rules.map(r => {
        let detail = `  - ${r.name}`;
        if (r.percentage) detail += ` (${r.percentage}%)`;
        if (r.fixed_amount) detail += ` (€${r.fixed_amount})`;
        if (r.start_time && r.end_time) detail += ` [${r.start_time}-${r.end_time}]`;
        if (r.applies_to_days?.length) detail += ` [${r.applies_to_days.join(', ')}]`;
        if (r.description) detail += ` — ${r.description}`;
        return detail;
      }).join('\n')}`;
    }).join('\n\n');

    // STEP 1: Generate contract content
    const contractPrompt = `Genereer een volledig en professioneel arbeidscontract in het Nederlands voor een medewerker in het beroepsgoederenvervoer.

WERKGEVER:
- Naam: Interdistri Transport B.V.
- KvK: [invullen]
- Adres: [invullen]

WERKNEMER:
- Naam: ${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}
- Geboortedatum: ${employee.date_of_birth || 'Niet opgegeven'}
- Adres: ${employee.address || ''}, ${employee.postal_code || ''} ${employee.city || ''}
- BSN: ${employee.bsn || 'Niet opgegeven'}
- Functie: ${employee.function || 'Chauffeur'}
- Afdeling: ${employee.department}
- In dienst sinds: ${inDienstSinds}
- Rijbewijs: ${(employee.drivers_license_categories || []).join(', ') || 'Niet opgegeven'}
- Code 95 verval: ${employee.code95_expiry || 'Niet opgegeven'}
${previousContractInfo}

CONTRACT DETAILS:
- Type: ${contract_type}
- Startdatum: ${start_date}
${end_date ? `- Einddatum: ${end_date}` : '- Onbepaalde tijd'}
- Uren per week: ${actualHours}
- Uurloon: €${hourlyRate}
- Loonschaal: ${employee.salary_scale || 'Niet opgegeven'}
${recentContractregel ? `- Vorig contracttype: ${recentContractregel.type_contract || 'Onbekend'}` : ''}

TOEPASSELIJKE CAO-REGELS:
${caoContext}

STRUCTUUR VAN HET CONTRACT:
1. Kop: "ARBEIDSOVEREENKOMST" met datum
2. Artikel 1: Partijen
3. Artikel 2: Functie en werkzaamheden
4. Artikel 3: Duur van de overeenkomst en proeftijd
5. Artikel 4: Arbeidstijd en werkrooster
6. Artikel 5: Salaris en toeslagen (verwijs naar CAO-schalen en specifieke toeslagen)
7. Artikel 6: Vakantiedagen en vakantiegeld
8. Artikel 7: Pensioen
9. Artikel 8: Arbeidsongeschiktheid en ziekte
10. Artikel 9: Reiskostenvergoeding
11. Artikel 10: Geheimhouding
12. Artikel 11: Concurrentiebeding (indien van toepassing)
13. Artikel 12: Opzegging en beëindiging
14. Artikel 13: Toepasselijk recht en CAO
15. Artikel 14: Bijzondere bepalingen
16. Ondertekeningsblok

VEREISTEN:
- Verwerk ALLE relevante CAO-regels in de juiste artikelen
- Gebruik formele juridische taal
- Bereken het maandloon: €${hourlyRate} × ${actualHours} × 52/12 = €${Math.round(hourlyRate * actualHours * 52 / 12 * 100) / 100}
- Vermeld specifieke toeslagpercentages uit de CAO-regels
- Proeftijd: 1 maand voor tijdelijke contracten, 2 maanden voor vaste contracten (tenzij eerder in dienst)
${activeContracts.length > 0 ? '- GEEN proeftijd vermelden want werknemer is al in dienst' : ''}
- Vakantiedagen: minimaal 20 + eventuele bovenwettelijke dagen
- Vakantiegeld: 8% conform CAO`;

    const contractContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: contractPrompt,
      add_context_from_internet: false
    });

    // STEP 2: Generate AI conflict analysis
    const conflictPrompt = `Analyseer het volgende contractvoorstel en identificeer potentiële conflicten, afwijkingen of aandachtspunten.

CONTRACT DETAILS:
- Medewerker: ${employee.first_name} ${employee.last_name}
- Type: ${contract_type}
- Start: ${start_date}, Eind: ${end_date || 'onbepaald'}
- Uren: ${actualHours}/week
- Uurloon: €${hourlyRate}
- Loonschaal: ${employee.salary_scale || 'Niet opgegeven'}
- In dienst sinds: ${inDienstSinds}
- Afdeling: ${employee.department}
${previousContractInfo}

CAO-REGELS:
${caoContext}

Analyseer op:
1. Is het uurloon conform de CAO-loontabel voor de opgegeven schaal?
2. Zijn de uren per week realistisch en conform CAO?
3. Is er een conflict met bestaande contracten (overlap, onlogische opeenvolging)?
4. Proeftijdregels: mag er een proeftijd worden opgenomen?
5. Ketenregeling: hoeveel tijdelijke contracten zijn er al geweest?
6. Zijn alle verplichte CAO-toeslagen correct verwerkt?
7. Zijn er bijzondere aandachtspunten (rijbewijs, Code 95)?

Geef het resultaat als JSON.`;

    const conflictAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: conflictPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          risk_level: { type: "string", enum: ["laag", "gemiddeld", "hoog"] },
          conflicts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categorie: { type: "string" },
                ernst: { type: "string", enum: ["info", "waarschuwing", "fout"] },
                beschrijving: { type: "string" },
                aanbeveling: { type: "string" }
              }
            }
          },
          samenvatting: { type: "string" }
        }
      }
    });

    // STEP 3: Generate clause summary
    const summaryPrompt = `Lees het onderstaande contract en maak een beknopte samenvatting van de belangrijkste clausules voor snelle referentie.

CONTRACT:
${contractContent}

Geef per clausule een korte samenvatting in JSON formaat.`;

    const clauseSummary = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: summaryPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          clausules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                artikel: { type: "string" },
                titel: { type: "string" },
                samenvatting: { type: "string" },
                belangrijk: { type: "boolean" }
              }
            }
          },
          kernpunten: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Generate unique contract number
    const contractNumber = `CONTRACT-${employee.employee_number || employee_id.substring(0, 8)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Create contract record with AI analysis stored
    const contract = await base44.asServiceRole.entities.Contract.create({
      employee_id,
      contract_number: contractNumber,
      contract_type,
      start_date,
      end_date: end_date || null,
      hours_per_week: actualHours,
      hourly_rate: hourlyRate,
      salary_scale: employee.salary_scale,
      function_title: employee.function || 'Chauffeur',
      department: employee.department,
      contract_content: contractContent,
      status: 'Concept',
      cao_rules_applied: caoRules.map(r => r.id),
      notes: `AI Gegenereerd | Risico: ${conflictAnalysis.risk_level || 'onbekend'} | ${(conflictAnalysis.conflicts || []).length} aandachtspunten`
    });

    // Create notification
    const allUsers = await base44.asServiceRole.entities.User.list();
    const employeeUser = allUsers.find(u => u.email === employee.email);
    const adminUserIds = allUsers.filter(u => u.role === 'admin').map(u => u.id);

    if (employeeUser) {
      await base44.asServiceRole.entities.Notification.create({
        title: 'Nieuw contract gegenereerd',
        description: `Een nieuw ${contract_type} contract is voor u gegenereerd. Contractnummer: ${contractNumber}`,
        type: 'general',
        target_page: 'Contracts',
        user_ids: [employeeUser.id, ...adminUserIds],
        priority: 'high'
      });
    }

    return Response.json({
      success: true,
      contract,
      conflict_analysis: conflictAnalysis,
      clause_summary: clauseSummary,
      message: 'Contract succesvol gegenereerd met AI-analyse'
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});