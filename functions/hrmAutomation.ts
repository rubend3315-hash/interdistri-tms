import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Helpers
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminEmails = allUsers.filter(u => u.role === 'admin').map(u => u.email);
    const adminIds = allUsers.filter(u => u.role === 'admin').map(u => u.id);

    const employees = await base44.asServiceRole.entities.Employee.list();
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();

    const results = {
      rijbewijs_notifications: 0,
      code95_notifications: 0,
      apk_notifications: 0,
      status_changes: 0,
      emails_sent: 0
    };

    // Voorkom dubbele notificaties: haal bestaande ongelezen notificaties op
    const existingNotifications = await base44.asServiceRole.entities.Notification.list();
    const unreadByKey = new Set(
      existingNotifications
        .filter(n => !n.is_read)
        .map(n => `${n.type}_${n.target_entity_id}`)
    );

    // ============================================================
    // 1. RIJBEWIJS VERLOOP CHECK (90, 60, 30, 14, 7, 0 dagen)
    // ============================================================
    const checkDays = [90, 60, 30, 14, 7, 0];

    for (const emp of employees) {
      if (emp.status !== 'Actief') continue;

      // Rijbewijs check
      if (emp.drivers_license_expiry) {
        const expiryDate = new Date(emp.drivers_license_expiry);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        const empName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
        const key = `driver_license_expiry_${emp.id}`;

        if (checkDays.includes(diffDays) || diffDays < 0) {
          if (!unreadByKey.has(key)) {
            const priority = diffDays <= 0 ? 'urgent' : diffDays <= 14 ? 'high' : 'medium';
            const title = diffDays <= 0
              ? `🚨 Rijbewijs VERLOPEN: ${empName}`
              : `⚠️ Rijbewijs verloopt over ${diffDays} dagen: ${empName}`;

            await base44.asServiceRole.entities.Notification.create({
              title,
              description: `Rijbewijs van ${empName} verloopt op ${emp.drivers_license_expiry}. Categorieën: ${(emp.drivers_license_categories || []).join(', ')}`,
              type: 'driver_license_expiry',
              target_entity_id: emp.id,
              target_page: 'Employees',
              user_ids: adminIds,
              priority,
              is_read: false
            });
            results.rijbewijs_notifications++;

            // Email naar alle admins bij <= 30 dagen
            if (diffDays <= 30) {
              for (const email of adminEmails) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: title,
                    body: `<h3>${title}</h3>
                      <p>Medewerker: <strong>${empName}</strong></p>
                      <p>Vervaldatum rijbewijs: <strong>${emp.drivers_license_expiry}</strong></p>
                      <p>Categorieën: ${(emp.drivers_license_categories || []).join(', ')}</p>
                      <p>${diffDays <= 0 ? '<strong style="color:red">Het rijbewijs is verlopen! Onmiddellijke actie vereist.</strong>' : `Nog ${diffDays} dagen tot verloop.`}</p>
                      <p>Log in op het systeem om actie te ondernemen.</p>`
                  });
                  results.emails_sent++;
                } catch (e) { console.error('Email error:', e.message); }
              }
            }
          }
        }
      }

      // Code 95 check
      if (emp.code95_expiry) {
        const expiryDate = new Date(emp.code95_expiry);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        const empName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
        const key = `code95_expiry_${emp.id}`;

        if (checkDays.includes(diffDays) || diffDays < 0) {
          if (!unreadByKey.has(key)) {
            const priority = diffDays <= 0 ? 'urgent' : diffDays <= 14 ? 'high' : 'medium';
            const title = diffDays <= 0
              ? `🚨 Code 95 VERLOPEN: ${empName}`
              : `⚠️ Code 95 verloopt over ${diffDays} dagen: ${empName}`;

            await base44.asServiceRole.entities.Notification.create({
              title,
              description: `Code 95 van ${empName} verloopt op ${emp.code95_expiry}.`,
              type: 'code95_expiry',
              target_entity_id: emp.id,
              target_page: 'Employees',
              user_ids: adminIds,
              priority,
              is_read: false
            });
            results.code95_notifications++;

            if (diffDays <= 30) {
              for (const email of adminEmails) {
                try {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: title,
                    body: `<h3>${title}</h3>
                      <p>Medewerker: <strong>${empName}</strong></p>
                      <p>Vervaldatum Code 95: <strong>${emp.code95_expiry}</strong></p>
                      <p>${diffDays <= 0 ? '<strong style="color:red">Code 95 is verlopen! Chauffeur mag niet rijden.</strong>' : `Nog ${diffDays} dagen tot verloop.`}</p>`
                  });
                  results.emails_sent++;
                } catch (e) { console.error('Email error:', e.message); }
              }
            }
          }
        }
      }
    }

    // ============================================================
    // 2. APK VERLOOP CHECK
    // ============================================================
    for (const vehicle of vehicles) {
      if (vehicle.status === 'Uit dienst') continue;
      if (!vehicle.apk_expiry) continue;

      const expiryDate = new Date(vehicle.apk_expiry);
      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      const key = `vehicle_apk_expiry_${vehicle.id}`;

      if (checkDays.includes(diffDays) || diffDays < 0) {
        if (!unreadByKey.has(key)) {
          const priority = diffDays <= 0 ? 'urgent' : diffDays <= 14 ? 'high' : 'medium';
          const title = diffDays <= 0
            ? `🚨 APK VERLOPEN: ${vehicle.license_plate}`
            : `⚠️ APK verloopt over ${diffDays} dagen: ${vehicle.license_plate}`;

          await base44.asServiceRole.entities.Notification.create({
            title,
            description: `APK van ${vehicle.license_plate} (${vehicle.brand} ${vehicle.model || ''}) verloopt op ${vehicle.apk_expiry}.`,
            type: 'vehicle_apk_expiry',
            target_entity_id: vehicle.id,
            target_page: 'Vehicles',
            user_ids: adminIds,
            priority,
            is_read: false
          });
          results.apk_notifications++;

          if (diffDays <= 30) {
            for (const email of adminEmails) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: title,
                  body: `<h3>${title}</h3>
                    <p>Voertuig: <strong>${vehicle.license_plate}</strong> (${vehicle.brand} ${vehicle.model || ''})</p>
                    <p>Vervaldatum APK: <strong>${vehicle.apk_expiry}</strong></p>
                    <p>${diffDays <= 0 ? '<strong style="color:red">APK is verlopen! Voertuig mag niet op de weg.</strong>' : `Nog ${diffDays} dagen tot verloop.`}</p>`
                });
                results.emails_sent++;
              } catch (e) { console.error('Email error:', e.message); }
            }
          }
        }
      }
    }

    // ============================================================
    // 3. IN DIENST CHECKER - Contracteinddata & status
    // ============================================================
    for (const emp of employees) {
      if (emp.status !== 'Actief') continue;

      const contractregels = emp.contractregels || [];
      if (contractregels.length === 0) continue;

      // Zoek het meest recente actieve contract
      const activeContracts = contractregels
        .filter(c => c.status !== 'Inactief')
        .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum));

      if (activeContracts.length === 0) continue;

      const latestContract = activeContracts[0];
      const empName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;

      // Check of het contract al verlopen is
      if (latestContract.einddatum) {
        const endDate = new Date(latestContract.einddatum);
        const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        // Contract is verlopen → stel medewerker op "Uit dienst"
        if (diffDays < 0) {
          await base44.asServiceRole.entities.Employee.update(emp.id, { status: 'Uit dienst' });

          const key = `dienst_status_wijziging_${emp.id}`;
          if (!unreadByKey.has(key)) {
            await base44.asServiceRole.entities.Notification.create({
              title: `📋 Status gewijzigd: ${empName} → Uit dienst`,
              description: `Medewerker ${empName} is automatisch op 'Uit dienst' gezet omdat het contract op ${latestContract.einddatum} is verlopen. Laatste contracttype: ${latestContract.type_contract || 'Onbekend'}.`,
              type: 'dienst_status_wijziging',
              target_entity_id: emp.id,
              target_page: 'Employees',
              user_ids: adminIds,
              priority: 'high',
              is_read: false
            });

            for (const email of adminEmails) {
              try {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: email,
                  subject: `Medewerker ${empName} automatisch op 'Uit dienst' gezet`,
                  body: `<h3>Status wijziging medewerker</h3>
                    <p>Medewerker <strong>${empName}</strong> is automatisch op status <strong>'Uit dienst'</strong> gezet.</p>
                    <p>Reden: Contract verlopen op <strong>${latestContract.einddatum}</strong>.</p>
                    <p>Neem contact op met HR als dit niet correct is.</p>`
                });
                results.emails_sent++;
              } catch (e) { console.error('Email error:', e.message); }
            }
          }

          results.status_changes++;
        }
        // Contract verloopt binnenkort → waarschuwing
        else if (checkDays.includes(diffDays)) {
          const key = `contract_expiry_${emp.id}`;
          if (!unreadByKey.has(key)) {
            await base44.asServiceRole.entities.Notification.create({
              title: `⏰ Contract verloopt over ${diffDays} dagen: ${empName}`,
              description: `Het ${latestContract.type_contract || ''} contract van ${empName} verloopt op ${latestContract.einddatum}. Neem actie voor verlenging.`,
              type: 'contract_expiry',
              target_entity_id: emp.id,
              target_page: 'Employees',
              user_ids: adminIds,
              priority: diffDays <= 14 ? 'high' : 'medium',
              is_read: false
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      date: todayStr,
      ...results,
      message: `Rijbewijs: ${results.rijbewijs_notifications}, Code 95: ${results.code95_notifications}, APK: ${results.apk_notifications}, Status: ${results.status_changes}, Emails: ${results.emails_sent}`
    });

  } catch (error) {
    console.error('HRM Automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});