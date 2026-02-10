import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { event, data, old_data } = await req.json();

    if (!data) {
      return Response.json({ error: 'No data' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminIds = allUsers.filter(u => u.role === 'admin').map(u => u.id);
    const adminEmails = allUsers.filter(u => u.role === 'admin').map(u => u.email);

    const empName = data.employee_naam || 'Medewerker';

    // Bij nieuwe aanvraag → notificatie naar alle admins
    if (event?.type === 'create') {
      await base44.asServiceRole.entities.Notification.create({
        title: `📝 Nieuwe contractwijziging: ${empName}`,
        description: `${data.type_wijziging}: ${data.huidige_waarde || '-'} → ${data.nieuwe_waarde}. Ingangsdatum: ${data.ingangsdatum}. Prioriteit: ${data.prioriteit || 'Normaal'}.`,
        type: 'contract_wijziging',
        target_entity_id: event.entity_id,
        target_page: 'ContractWijzigingen',
        user_ids: adminIds,
        priority: data.prioriteit === 'Urgent' ? 'urgent' : data.prioriteit === 'Hoog' ? 'high' : 'medium',
        is_read: false
      });

      // Email naar admins
      for (const email of adminEmails) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `Nieuwe contractwijziging aangevraagd: ${empName}`,
            body: `<h3>Nieuwe contractwijziging</h3>
              <p><strong>Medewerker:</strong> ${empName}</p>
              <p><strong>Type:</strong> ${data.type_wijziging}</p>
              <p><strong>Huidige situatie:</strong> ${data.huidige_waarde || '-'}</p>
              <p><strong>Gewenste situatie:</strong> ${data.nieuwe_waarde}</p>
              <p><strong>Ingangsdatum:</strong> ${data.ingangsdatum}</p>
              <p><strong>Toelichting:</strong> ${data.toelichting || '-'}</p>
              <p><strong>Aangevraagd door:</strong> ${data.aangevraagd_door || '-'}</p>
              <p>Log in op het systeem om de aanvraag te beoordelen.</p>`
          });
        } catch (e) { console.error('Email error:', e.message); }
      }
    }

    // Bij statuswijziging → notificatie
    if (event?.type === 'update' && old_data?.status !== data.status) {
      const statusMessages = {
        'Goedgekeurd': `✅ Contractwijziging goedgekeurd: ${empName}`,
        'Afgekeurd': `❌ Contractwijziging afgekeurd: ${empName}`,
        'In behandeling': `🔄 Contractwijziging in behandeling: ${empName}`,
        'Doorgevoerd': `✔️ Contractwijziging doorgevoerd: ${empName}`
      };

      const title = statusMessages[data.status] || `Contractwijziging status: ${data.status} - ${empName}`;
      
      // Notificatie naar aanvrager
      const aanvrager = allUsers.find(u => u.email === data.aangevraagd_door);
      const notifyIds = aanvrager ? [...adminIds, aanvrager.id] : adminIds;

      await base44.asServiceRole.entities.Notification.create({
        title,
        description: `${data.type_wijziging}: ${data.nieuwe_waarde}. ${data.afkeur_reden ? 'Reden: ' + data.afkeur_reden : ''}`,
        type: 'contract_wijziging',
        target_entity_id: event.entity_id,
        target_page: 'ContractWijzigingen',
        user_ids: [...new Set(notifyIds)],
        priority: data.status === 'Afgekeurd' ? 'high' : 'medium',
        is_read: false
      });

      // Email naar aanvrager bij goedkeuring/afkeuring
      if ((data.status === 'Goedgekeurd' || data.status === 'Afgekeurd') && data.aangevraagd_door) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: data.aangevraagd_door,
            subject: title,
            body: `<h3>${title}</h3>
              <p><strong>Type:</strong> ${data.type_wijziging}</p>
              <p><strong>Gewenste wijziging:</strong> ${data.nieuwe_waarde}</p>
              <p><strong>Status:</strong> ${data.status}</p>
              ${data.afkeur_reden ? `<p><strong>Reden afkeuring:</strong> ${data.afkeur_reden}</p>` : ''}
              <p><strong>Beoordeeld door:</strong> ${data.beoordeeld_door || '-'}</p>`
          });
        } catch (e) { console.error('Email error:', e.message); }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('ContractWijziging automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});