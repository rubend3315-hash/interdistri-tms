import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id, action } = await req.json();

    if (!contract_id) {
      return Response.json({ error: 'Missing contract_id' }, { status: 400 });
    }

    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    const [employee, caoRules, salaryTables, allContracts] = await Promise.all([
      base44.asServiceRole.entities.Employee.get(contract.employee_id),
      base44.asServiceRole.entities.CaoRule.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.SalaryTable.filter({ status: 'Actief' }),
      base44.asServiceRole.entities.Contract.filter({ employee_id: contract.employee_id })
    ]);

    const employeeName = employee ? `${employee.first_name} ${employee.prefix ? employee.prefix + ' ' : ''}${employee.last_name}` : 'Onbekend';

    // Build CAO context
    const caoContext = caoRules.map(r => {
      let detail = `- ${r.name} (${r.category || 'Overig'})`;
      if (r.percentage) detail += ` — ${r.percentage}%`;
      if (r.fixed_amount) detail += ` — €${r.fixed_amount}`;
      if (r.start_time && r.end_time) detail += ` [${r.start_time}-${r.end_time}]`;
      if (r.description) detail += ` — ${r.description}`;
      return detail;
    }).join('\n');

    const otherContracts = allContracts.filter(c => c.id !== contract_id);
    const otherContractsInfo = otherContracts.map(c => 
      `- ${c.contract_number}: ${c.contract_type}, ${c.start_date} t/m ${c.end_date || 'onbepaald'}, status: ${c.status}`
    ).join('\n') || 'Geen andere contracten';

    if (action === 'conflict_analysis') {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyseer het volgende contract op conflicten, afwijkingen en risico's ten opzichte van de CAO Beroepsgoederenvervoer en Nederlandse arbeidswetgeving.

CONTRACT:
- Nummer: ${contract.contract_number}
- Medewerker: ${employeeName}
- Type: ${contract.contract_type}
- Start: ${contract.start_date}, Eind: ${contract.end_date || 'onbepaald'}
- Uren/week: ${contract.hours_per_week}
- Uurloon: €${contract.hourly_rate}
- Loonschaal: ${contract.salary_scale || 'Niet opgegeven'}
- Afdeling: ${contract.department}
- In dienst sinds: ${employee?.in_service_since || 'Onbekend'}

ANDERE CONTRACTEN VAN DEZE MEDEWERKER:
${otherContractsInfo}

CAO-REGELS:
${caoContext}

LOONTABELLEN:
${salaryTables.filter(s => s.scale === contract.salary_scale).map(s => 
  `- Schaal ${s.scale}, Trede ${s.step || '-'}: €${s.hourly_rate}/uur (geldig vanaf ${s.start_date})`
).join('\n') || 'Geen loontabellen gevonden voor deze schaal'}

CONTRACT INHOUD:
${contract.contract_content?.substring(0, 3000) || 'Geen contracttekst beschikbaar'}

Analyseer grondig op:
1. Conformiteit met CAO-loontabellen
2. Wettelijke eisen (proeftijd, ketenregeling, opzegtermijn)
3. Overlap of conflicten met bestaande contracten
4. Ontbrekende verplichte clausules
5. Toeslagen en vergoedingen conform CAO
6. Bijzondere risico's

Geef het antwoord als JSON.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string", enum: ["laag", "gemiddeld", "hoog"] },
            score: { type: "number" },
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
            ontbrekende_clausules: {
              type: "array",
              items: { type: "string" }
            },
            samenvatting: { type: "string" }
          }
        }
      });

      return Response.json({ success: true, analysis: result });
    }

    if (action === 'clause_summary') {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyseer het onderstaande arbeidscontract en maak een gestructureerde samenvatting van alle clausules voor snelle referentie door HR.

CONTRACT INHOUD:
${contract.contract_content || 'Geen contracttekst beschikbaar'}

Markeer de belangrijkste clausules (financieel, opzegging, bijzondere bepalingen) als "belangrijk".
Geef per clausule een korte maar informatieve samenvatting.
Voeg ook kernpunten toe: de 5-8 allerbelangrijkste zaken uit dit contract.`,
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
            },
            financieel_overzicht: {
              type: "object",
              properties: {
                bruto_uurloon: { type: "string" },
                bruto_maandloon: { type: "string" },
                vakantiegeld: { type: "string" },
                toeslagen: { type: "string" },
                reiskosten: { type: "string" }
              }
            }
          }
        }
      });

      return Response.json({ success: true, summary: result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Contract analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});