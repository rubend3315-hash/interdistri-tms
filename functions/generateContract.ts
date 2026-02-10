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