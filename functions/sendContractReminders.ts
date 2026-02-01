import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUserIds = allUsers.filter(u => u.role === 'admin').map(u => u.id);

    // Get all employees
    const employees = await base44.asServiceRole.entities.Employee.list();

    // Get all contracts
    const contracts = await base44.asServiceRole.entities.Contract.list();

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in60Days = new Date(today);
    in60Days.setDate(today.getDate() + 60);

    let remindersCount = 0;

    // Check for expiring contracts
    for (const contract of contracts) {
      if (!contract.end_date || contract.status === 'Beëindigd') continue;

      const endDate = new Date(contract.end_date);
      const daysUntilExpiry = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));

      // Send reminder at 60 days, 30 days, and 7 days before expiry
      const shouldRemind = daysUntilExpiry === 60 || daysUntilExpiry === 30 || daysUntilExpiry === 7;

      if (shouldRemind && daysUntilExpiry > 0) {
        const employee = employees.find(e => e.id === contract.employee_id);
        const employeeUser = allUsers.find(u => u.email === employee?.email);

        const reminderSentDates = contract.reminder_sent_dates || [];
        const todayStr = today.toISOString().split('T')[0];

        // Check if reminder was already sent today
        if (reminderSentDates.includes(todayStr)) continue;

        // Determine priority
        let priority = 'medium';
        if (daysUntilExpiry <= 7) priority = 'urgent';
        else if (daysUntilExpiry <= 30) priority = 'high';

        // Create notification for admins and employee
        const notificationUserIds = [...adminUserIds];
        if (employeeUser) notificationUserIds.push(employeeUser.id);

        await base44.asServiceRole.entities.Notification.create({
          title: `Contract verloopt over ${daysUntilExpiry} dagen`,
          description: `Contract ${contract.contract_number} voor ${employee?.first_name} ${employee?.last_name} verloopt op ${new Date(contract.end_date).toLocaleDateString('nl-NL')}. Neem actie voor verlenging of beëindiging.`,
          type: 'general',
          target_page: 'Contracts',
          target_entity_id: contract.id,
          user_ids: notificationUserIds,
          priority
        });

        // Send email to employee if they have an email
        if (employee?.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: employee.email,
              subject: `Herinnering: Contract verloopt over ${daysUntilExpiry} dagen`,
              body: `Beste ${employee.first_name},\n\nDit is een herinnering dat uw contract (${contract.contract_number}) op ${new Date(contract.end_date).toLocaleDateString('nl-NL')} afloopt.\n\nNeem contact op met de HR-afdeling voor meer informatie over contractverlenging.\n\nMet vriendelijke groet,\nInterdistri Transport`
            });
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
          }
        }

        // Update contract with reminder date
        reminderSentDates.push(todayStr);
        await base44.asServiceRole.entities.Contract.update(contract.id, {
          reminder_sent_dates: reminderSentDates
        });

        remindersCount++;
      }
    }

    // Check for employees without active contracts
    for (const employee of employees) {
      if (employee.status !== 'Actief' || employee.department !== 'Transport') continue;

      const activeContract = contracts.find(c => 
        c.employee_id === employee.id && 
        c.status === 'Actief' &&
        (!c.end_date || new Date(c.end_date) > today)
      );

      if (!activeContract) {
        // Check if notification already exists
        const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
          type: 'driver_no_contract',
          target_entity_id: employee.id
        });

        const hasUnreadNotification = existingNotifications.some(n => !n.is_read);

        if (!hasUnreadNotification) {
          await base44.asServiceRole.entities.Notification.create({
            title: 'Chauffeur zonder actief contract',
            description: `${employee.first_name} ${employee.last_name} heeft geen actief contract. Genereer een nieuw contract.`,
            type: 'driver_no_contract',
            target_page: 'Contracts',
            target_entity_id: employee.id,
            user_ids: adminUserIds,
            priority: 'high'
          });

          remindersCount++;
        }
      }
    }

    return Response.json({
      success: true,
      reminders_sent: remindersCount,
      message: `${remindersCount} herinneringen verzonden`
    });

  } catch (error) {
    console.error('Reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});