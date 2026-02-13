import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all employees and admin users
    const employees = await base44.asServiceRole.entities.Employee.list();
    const users = await base44.asServiceRole.entities.User.list();
    const adminUserIds = users.filter(u => u.role === 'admin').map(u => u.id);

    const results = {
      deactivated: [],
      contractsClosed: [],
      reiskostenClosed: [],
      expiryWarnings: []
    };

    for (const emp of employees) {
      if (emp.status === 'Uit dienst') continue;

      // Check contract_end_date on the employee level
      const contractEndDate = emp.contract_end_date;
      
      // Also check contractregels for the latest end date
      let latestContractEnd = contractEndDate;
      if (emp.contractregels && emp.contractregels.length > 0) {
        for (const cr of emp.contractregels) {
          if (cr.einddatum && (!latestContractEnd || cr.einddatum > latestContractEnd)) {
            latestContractEnd = cr.einddatum;
          }
        }
      }

      // === DEACTIVATION: If all contracts have ended ===
      if (latestContractEnd && latestContractEnd < today) {
        const empName = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');

        // Set employee status to 'Uit dienst'
        if (emp.status !== 'Uit dienst') {
          const updateData = { status: 'Uit dienst' };

          // Close active contractregels
          if (emp.contractregels) {
            const updatedContractregels = emp.contractregels.map(cr => {
              if (!cr.einddatum || cr.einddatum >= today) {
                results.contractsClosed.push(empName);
                return { ...cr, einddatum: latestContractEnd, status: 'Beëindigd' };
              }
              return cr;
            });
            updateData.contractregels = updatedContractregels;
          }

          // Close active reiskostenregels
          if (emp.reiskostenregels) {
            const updatedReiskostenregels = emp.reiskostenregels.map(rr => {
              if (!rr.einddatum || rr.einddatum >= today) {
                results.reiskostenClosed.push(empName);
                return { ...rr, einddatum: latestContractEnd, status: 'Beëindigd' };
              }
              return rr;
            });
            updateData.reiskostenregels = updatedReiskostenregels;
          }

          await base44.asServiceRole.entities.Employee.update(emp.id, updateData);
          results.deactivated.push(empName);

          // Create notification for admins
          await base44.asServiceRole.entities.Notification.create({
            title: `${empName} is uit dienst gezet`,
            description: `De contracteinddatum (${latestContractEnd}) is verstreken. Medewerker is automatisch op 'Uit dienst' gezet. Contract- en reiskostenregels zijn afgesloten.`,
            type: 'employee_uit_dienst',
            target_entity_id: emp.id,
            target_page: 'Employees',
            priority: 'high',
            user_ids: adminUserIds,
            is_read: false
          });
        }
      }

      // === EARLY WARNING: Contract expires within 30 days ===
      if (latestContractEnd && latestContractEnd >= today && latestContractEnd <= in30Days && emp.status === 'Actief') {
        const empName = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');
        const daysLeft = Math.ceil((new Date(latestContractEnd) - new Date(today)) / (1000 * 60 * 60 * 24));

        // Check if we already sent a warning recently (avoid duplicates)
        const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
          type: 'contract_bijna_afgelopen',
          target_entity_id: emp.id
        });

        const recentWarning = existingNotifications.find(n => {
          const created = new Date(n.created_date);
          const daysSinceCreated = Math.ceil((new Date() - created) / (1000 * 60 * 60 * 24));
          return daysSinceCreated < 7; // Don't send more than once per week
        });

        if (!recentWarning) {
          await base44.asServiceRole.entities.Notification.create({
            title: `Contract ${empName} loopt binnenkort af`,
            description: `Het contract van ${empName} loopt af op ${latestContractEnd} (nog ${daysLeft} dagen). Neem actie om het contract te verlengen of de uitdiensttreding voor te bereiden.`,
            type: 'contract_bijna_afgelopen',
            target_entity_id: emp.id,
            target_page: 'Employees',
            priority: daysLeft <= 7 ? 'urgent' : 'high',
            user_ids: adminUserIds,
            is_read: false
          });
          results.expiryWarnings.push({ name: empName, daysLeft, endDate: latestContractEnd });
        }
      }
    }

    return Response.json({
      success: true,
      date: today,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});