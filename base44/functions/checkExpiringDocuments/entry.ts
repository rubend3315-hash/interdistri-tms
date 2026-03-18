// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const documents = await base44.asServiceRole.entities.Document.filter({ status: 'Actief' });
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminIds = admins.map(a => a.id);

    const today = new Date();
    const results = { notified: 0, expired: 0 };

    for (const doc of documents) {
      if (!doc.expiry_date) continue;

      const expiryDate = new Date(doc.expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Mark expired documents
      if (diffDays < 0) {
        await base44.asServiceRole.entities.Document.update(doc.id, { status: 'Verlopen' });
        results.expired++;
      }

      // Notify at 30, 14, 7 days and when expired
      if (diffDays === 30 || diffDays === 14 || diffDays === 7 || diffDays === 0) {
        const urgency = diffDays <= 7 ? 'urgent' : diffDays <= 14 ? 'high' : 'normal';
        const title = diffDays === 0
          ? `Document verlopen: ${doc.name}`
          : `Document verloopt over ${diffDays} dagen: ${doc.name}`;
        const description = doc.linked_entity_name
          ? `${doc.document_type} van ${doc.linked_entity_name}`
          : doc.document_type;

        await base44.asServiceRole.entities.Notification.create({
          title,
          description,
          type: 'document_expiry',
          priority: urgency,
          user_ids: adminIds,
          target_page: 'Documents',
          is_read: false
        });

        // Send email to admins
        for (const admin of admins) {
          if (admin.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: title,
              body: `<h3>${title}</h3><p>${description}</p><p>Vervaldatum: ${doc.expiry_date}</p><p>Log in om het document te bekijken.</p>`
            });
          }
        }

        results.notified++;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});