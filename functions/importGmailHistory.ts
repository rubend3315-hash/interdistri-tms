import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Step 1: List sent messages (max 500, paginated)
    let allMessageIds = [];
    let nextPageToken = null;

    while (allMessageIds.length < 500) {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('labelIds', 'SENT');
      url.searchParams.set('maxResults', '100');
      if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

      const listRes = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const err = await listRes.text();
        return Response.json({ error: `Gmail list error: ${err}` }, { status: listRes.status });
      }

      const listData = await listRes.json();
      const messages = listData.messages || [];
      allMessageIds.push(...messages.map(m => m.id));
      nextPageToken = listData.nextPageToken;

      if (!nextPageToken) break;
    }

    console.log(`Found ${allMessageIds.length} sent messages in Gmail`);

    // Step 2: Get existing EmailLog records to avoid duplicates (check by subject+to+sent_at)
    const existingLogs = await base44.asServiceRole.entities.EmailLog.filter({}, '-created_date', 500);
    const existingKeys = new Set(
      existingLogs.map(l => `${l.to}|${l.subject}|${(l.sent_at || '').substring(0, 16)}`)
    );

    // Step 3: Fetch each message and filter for Interdistri TMS emails
    let imported = 0;
    let skipped = 0;
    let notRelevant = 0;

    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < allMessageIds.length; i += 10) {
      const batch = allMessageIds.slice(i, i + 10);

      const details = await Promise.all(
        batch.map(async (msgId) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );
          if (!detailRes.ok) return null;
          return detailRes.json();
        })
      );

      for (const msg of details) {
        if (!msg || !msg.payload || !msg.payload.headers) continue;

        const headers = msg.payload.headers;
        const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const from = getHeader('From');
        const subject = getHeader('Subject');
        const to = getHeader('To');
        const cc = getHeader('Cc');
        const dateStr = getHeader('Date');

        // Filter: only emails that appear to be from Interdistri TMS
        // Check subject patterns or from address
        const isRelevant =
          from.toLowerCase().includes('interdistri') ||
          subject.toLowerCase().includes('interdistri') ||
          subject.toLowerCase().includes('stamkaart') ||
          subject.toLowerCase().includes('contract') ||
          subject.toLowerCase().includes('welkom') ||
          subject.toLowerCase().includes('onboarding') ||
          subject.toLowerCase().includes('loonheffing') ||
          subject.toLowerCase().includes('dienst') ||
          subject.toLowerCase().includes('tijdregistratie') ||
          subject.toLowerCase().includes('medewerker');

        if (!isRelevant) {
          notRelevant++;
          continue;
        }

        // Parse date
        let sentAt;
        try {
          sentAt = new Date(dateStr).toISOString();
        } catch {
          sentAt = new Date(parseInt(msg.internalDate)).toISOString();
        }

        // Dedupe check
        const key = `${to}|${subject}|${sentAt.substring(0, 16)}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        // Determine source_function based on subject
        let sourceFunction = 'gmail_import';
        const subLower = subject.toLowerCase();
        if (subLower.includes('stamkaart')) sourceFunction = 'sendStamkaartEmail';
        else if (subLower.includes('contract')) sourceFunction = 'sendContractForSigning';
        else if (subLower.includes('welkom') || subLower.includes('onboarding')) sourceFunction = 'sendWelcomeEmail';
        else if (subLower.includes('dienst') || subLower.includes('afgekeurd')) sourceFunction = 'sendTimeEntryRejectionEmail';

        await base44.asServiceRole.entities.EmailLog.create({
          to: to.substring(0, 200),
          cc: cc.substring(0, 200),
          subject: subject.substring(0, 500),
          status: 'success',
          source_function: sourceFunction,
          sent_at: sentAt,
        });

        existingKeys.add(key);
        imported++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped (duplicate), ${notRelevant} not relevant`);

    return Response.json({
      success: true,
      total_scanned: allMessageIds.length,
      imported,
      skipped_duplicate: skipped,
      not_relevant: notRelevant,
    });
  } catch (error) {
    console.error('importGmailHistory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});