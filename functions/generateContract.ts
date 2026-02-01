import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can generate contracts
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { employee_id, contract_type, start_date, end_date, hours_per_week } = await req.json();

    if (!employee_id || !contract_type || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch employee data
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch relevant CAO rules
    const caoRules = await base44.asServiceRole.entities.CaoRule.filter({ status: 'Actief' });

    // Fetch salary tables
    const salaryTables = await base44.asServiceRole.entities.SalaryTable.filter({ status: 'Actief' });

    // Find applicable salary
    const applicableSalary = salaryTables.find(s => 
      s.scale === employee.salary_scale && 
      new Date(s.start_date) <= new Date(start_date) &&
      (!s.end_date || new Date(s.end_date) >= new Date(start_date))
    );

    // Prepare context for AI
    const contractPrompt = `Genereer een professioneel arbeidscontract voor een chauffeur in het Nederlands, compleet met alle juridisch vereiste clausules volgens de CAO Beroepsgoederenvervoer.

MEDEWERKER INFORMATIE:
- Naam: ${employee.first_name} ${employee.last_name}
- Geboortedatum: ${employee.date_of_birth || 'Niet opgegeven'}
- Adres: ${employee.address || ''}, ${employee.postal_code || ''} ${employee.city || ''}
- BSN: ${employee.bsn || 'Niet opgegeven'}
- Functie: ${employee.function || 'Chauffeur'}
- Afdeling: ${employee.department}

CONTRACT DETAILS:
- Type: ${contract_type}
- Startdatum: ${start_date}
${end_date ? `- Einddatum: ${end_date}` : '- Onbepaalde tijd'}
- Uren per week: ${hours_per_week || employee.contract_hours || 40}
- Uurloon: €${applicableSalary?.hourly_rate || employee.hourly_rate || '0'}
- Loonschaal: ${employee.salary_scale || 'Niet opgegeven'}

CAO REGELS (${caoRules.length} regels actief):
${caoRules.slice(0, 10).map(rule => `- ${rule.name}: ${rule.description || ''}`).join('\n')}

VEREISTEN:
1. Begin met een formele kop: "ARBEIDSOVEREENKOMST"
2. Partijen: Werkgever (Interdistri Transport B.V.) en Werknemer
3. Functieomschrijving en taken
4. Arbeidsvoorwaarden (uren, loon, vakantiedagen volgens CAO)
5. Proeftijd (indien van toepassing)
6. Verwijzing naar CAO Beroepsgoederenvervoer
7. Specificeer bijzondere arbeidsomstandigheden (onregelmatig werk, nachtdiensten)
8. Opzegtermijnen volgens CAO
9. Geheimhouding en concurrentiebeding
10. Plaats voor handtekeningen (WERKGEVER en WERKNEMER)

Maak het contract formeel, juridisch correct en compleet. Gebruik professionele taal en zorg dat alle CAO-regels correct zijn verwerkt.`;

    // Generate contract using AI
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: contractPrompt,
      add_context_from_internet: false
    });

    const contractContent = aiResponse;

    // Generate unique contract number
    const contractNumber = `CONTRACT-${employee.employee_number || employee_id.substring(0, 8)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Create contract record
    const contract = await base44.asServiceRole.entities.Contract.create({
      employee_id,
      contract_number: contractNumber,
      contract_type,
      start_date,
      end_date: end_date || null,
      hours_per_week: hours_per_week || employee.contract_hours || 40,
      hourly_rate: applicableSalary?.hourly_rate || employee.hourly_rate,
      salary_scale: employee.salary_scale,
      function_title: employee.function || 'Chauffeur',
      department: employee.department,
      contract_content: contractContent,
      status: 'Concept',
      cao_rules_applied: caoRules.map(r => r.id),
      notes: 'Automatisch gegenereerd door AI'
    });

    // Create notification for employee
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
      message: 'Contract succesvol gegenereerd'
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});