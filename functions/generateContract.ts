// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Contracts page)                   ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
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
  return `
<p style="margin-top:40px;"><strong>Voor akkoord werkgever</strong></p>
<br/>
<p>Van Dooren Transport Zeeland B.V.</p>
<p>Namens deze:</p>
<p>De heer M. Schetters</p>

<p style="margin-top:30px;"><strong>Voor akkoord werknemer</strong></p>
<br/>
<p>De heer/mevrouw ${fullName}</p>`;
}

function replacePlaceholders(html, vars) {
  let result = html;
  const map = {
    '{{fullName}}': vars.fullName,
    '{{geboortedatum}}': vars.geboortedatum,
    '{{adres}}': vars.adres,
    '{{postcode}}': vars.postcode,
    '{{woonplaats}}': vars.woonplaats,
    '{{trede}}': vars.trede,
    '{{uurloon}}': vars.uurloon,
    '{{startDatum}}': vars.startDatum,
    '{{eindDatum}}': vars.eindDatum,
    '{{duurTekst}}': vars.duurTekst,
    '{{ondertekeningDatum}}': vars.ondertekeningDatum,
    '{{functie}}': vars.functie,
    '{{afdeling}}': vars.afdeling,
    '{{proeftijd}}': vars.proeftijd === 'Geen proeftijd' ? 'Er geldt geen proeftijd.' : 'Er geldt één maand proeftijd.',
    '{{inDienstDatum}}': vars.inDienstDatum,
    '{{urenPerWeek}}': vars.urenPerWeek || '[NOG IN TE VULLEN]',
    '{{handtekeningBlok}}': signatureBlock(vars.fullName),
  };
  for (const [key, value] of Object.entries(map)) {
    result = result.split(key).join(value || '[NOG IN TE VULLEN]');
  }
  return result;
}

// ---- FALLBACK HARDCODED TEMPLATES (used when no DB template exists) ----

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

<p>Deze voorwaarden vormen een geheel met deze overeenkomst.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

${inDienstDatum !== '[NOG IN TE VULLEN]' ? `<p>Werknemer is oorspronkelijk bij werkgever in dienst getreden op ${inDienstDatum}.</p>` : ''}

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

<p>Deze overeenkomst is ook tijdens de in 5.1 bedoelde duur opzegbaar met inachtneming van de opzegtermijn welke op grond van de wet of de CAO geldt.</p>

<h3>Artikel 6: proeftijd</h3>

<p>${proeftijd === 'Geen proeftijd' ? 'Er geldt geen proeftijd.' : 'Er geldt één maand proeftijd.'}</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor ${vars.urenPerWeek} basisuren per week. Een fulltime werkweek wordt gesteld op 40 uur per week.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per uur.</p>

<p>Het salaris zal maandelijks tegen het einde van de maand uitbetaald worden op een door de werknemer aan te wijzen bankrekening.</p>

<p>Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,</p>

<p>d.d. ${ondertekeningDatum}</p>

${signatureBlock(fullName)}`;
}

function buildOproepTemplate(emp, vars) {
  const { fullName, geboortedatum, adres, postcode, woonplaats, trede, uurloon, startDatum, eindDatum, duurTekst, ondertekeningDatum, functie, afdeling, proeftijd, inDienstDatum } = vars;
  return `<h2>ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD Zonder vaste uren</h2>

<p>De ondergetekenden:</p>

<p>Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";</p>

<p>en</p>

<p>2. De heer/mevrouw ${fullName}, geboren op ${geboortedatum}, en thans wonende aan de ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";</p>

<p>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</p>

<h3>Artikel 1: CAO</h3>

<p>Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

${inDienstDatum !== '[NOG IN TE VULLEN]' ? `<p>Werknemer is oorspronkelijk bij werkgever in dienst getreden op ${inDienstDatum}.</p>` : ''}

<h3>Artikel 3: functie</h3>

<p>De werknemer treedt in dienst in de functie van ${functie}. De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling 3. ${afdeling}.</p>

<h3>Artikel 5: duur</h3>

<p>Deze arbeidsovereenkomst is aangegaan voor de duur van ${duurTekst} en eindigt derhalve van rechtswege op ${eindDatum}.</p>

<h3>Artikel 6: proeftijd</h3>

<p>${proeftijd === 'Geen proeftijd' ? 'Er geldt geen proeftijd.' : 'Er geldt één maand proeftijd.'}</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt in beginsel aangegaan voor nul uur per week.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per daadwerkelijk gewerkt uur.</p>

<p>Aldus overeengekomen, opgemaakt in 3-voud en ondertekend te Kapelle,</p>

<p>d.d. ${ondertekeningDatum}</p>

${signatureBlock(fullName)}`;
}

function buildVastTemplate(emp, vars) {
  const { fullName, geboortedatum, adres, postcode, woonplaats, trede, uurloon, startDatum, ondertekeningDatum, functie, afdeling, proeftijd, inDienstDatum } = vars;
  return `<h2>ARBEIDSOVEREENKOMST VOOR ONBEPAALDE TIJD</h2>

<p>De ondergetekenden:</p>

<p>Van Dooren Transport Zeeland B.V., handelend onder de naam Interdistri, gevestigd aan de Fleerbosseweg 19, te 4421 RR Kapelle, en ten deze rechtsgeldig vertegenwoordigd door de heer M. Schetters, hierna te noemen: "de werkgever";</p>

<p>En</p>

<p>De heer/mevrouw ${fullName}, geboren op ${geboortedatum}, en thans wonende aan ${adres}, ${postcode} te ${woonplaats}, hierna te noemen "de werknemer";</p>

<p>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</p>

<h3>Artikel 1: CAO</h3>

<p>Op deze arbeidsovereenkomst is de CAO Beroepsgoederenvervoer over de weg van toepassing.</p>

<h3>Artikel 2: ingangsdatum</h3>

<p>Deze overeenkomst vangt aan op ${startDatum}.</p>

${inDienstDatum !== '[NOG IN TE VULLEN]' ? `<p>De werknemer is oorspronkelijk bij werkgever in dienst getreden op ${inDienstDatum}.</p>` : ''}

<h3>Artikel 3: functie</h3>

<p>De werknemer treedt in dienst in de functie van ${functie}.</p>

<p>De werknemer wordt ingedeeld in functiegroep C trede ${trede} van de CAO. Afdeling ${afdeling}.</p>

<h3>Artikel 5: duur</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor onbepaalde duur.</p>

<h3>Artikel 6: proeftijd</h3>

<p>${proeftijd === 'Geen proeftijd' ? 'Er geldt geen proeftijd.' : 'Er geldt één maand proeftijd.'}</p>

<h3>Artikel 7: arbeidstijd</h3>

<p>De arbeidsovereenkomst wordt aangegaan voor ${vars.urenPerWeek} basisuren per week. Een fulltime werkweek wordt gesteld op 40 uur per week.</p>

<h3>Artikel 8: salaris</h3>

<p>Het aanvangssalaris bedraagt ten tijde van het aangaan van deze overeenkomst ${uurloon} bruto per uur.</p>

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
    const { employee_id, contract_type, start_date, end_date, hours_per_week, proeftijd, is_verlenging, oorspronkelijke_indienst_datum, preview_only, final_html, template_id } = body;

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
    // Only show "in dienst getreden" for verlengingen
    const inDienstDatum = is_verlenging
      ? (oorspronkelijke_indienst_datum ? formatDate(oorspronkelijke_indienst_datum) : (employee.in_service_since ? formatDate(employee.in_service_since) : '[NOG IN TE VULLEN]'))
      : '[NOG IN TE VULLEN]';

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
      urenPerWeek: String(actualHours),
    };

    let contractContent;
    let templateNote;
    let contractHours;

    // Try to use a database template
    let dbTemplate = null;
    
    if (template_id) {
      // Specific template requested
      dbTemplate = await base44.asServiceRole.entities.ContractTemplate.get(template_id);
    } else {
      // Look for default template for this contract_type
      const templates = await base44.asServiceRole.entities.ContractTemplate.filter({ 
        contract_type, 
        status: 'Actief',
        is_default: true 
      });
      if (templates.length > 0) {
        dbTemplate = templates[0];
      }
    }

    if (dbTemplate) {
      // Use database template with placeholder replacement
      contractContent = replacePlaceholders(dbTemplate.template_content, vars);
      templateNote = `Sjabloon: ${dbTemplate.name}`;
      contractHours = contract_type === 'Oproep' ? 0 : actualHours;
    } else {
      // Fallback to hardcoded templates
      if (contract_type === 'Tijdelijk Nul Uren') {
        contractContent = buildOproepTemplate(employee, vars);
        templateNote = 'Standaard oproepcontract sjabloon (fallback)';
        contractHours = 0;
      } else if (contract_type === 'Tijdelijk') {
        contractContent = buildBepaaldetijdTemplate(employee, vars);
        templateNote = 'Standaard bepaalde tijd sjabloon (fallback)';
        contractHours = actualHours;
      } else if (contract_type === 'Vast Nul Uren') {
        contractContent = buildOproepTemplate(employee, vars);
        templateNote = 'Standaard onbepaalde tijd nul uren sjabloon (fallback)';
        contractHours = 0;
      } else {
        contractContent = buildVastTemplate(employee, vars);
        templateNote = 'Standaard onbepaalde tijd sjabloon (fallback)';
        contractHours = actualHours;
      }
    }

    // Preview mode: return HTML without saving
    if (preview_only) {
      return Response.json({
        success: true,
        preview_html: contractContent,
        message: 'Preview gegenereerd'
      });
    }

    // If final_html is provided, use the user-edited version
    if (final_html) {
      contractContent = final_html;
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
      message: `Contract gegenereerd vanuit ${templateNote}`
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});