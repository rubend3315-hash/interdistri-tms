import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imports, projectName, datum, email } = await req.json();

    if (!imports || !Array.isArray(imports) || imports.length === 0) {
      return Response.json({ error: 'Geen importgegevens gevonden om te exporteren.' }, { status: 400 });
    }

    const pdf = new jsPDF();
    let y = 15;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 12;
    const contentMargin = 5;
    const lineHeight = 6;
    const labelWidth = 60;
    const labelXPos = margin + contentMargin;
    const pageRight = margin + pdf.internal.pageSize.width - (margin * 2) - contentMargin;

    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('PostNL Import Rapport', margin, y);
    y += 10;

    imports.forEach((imp) => {
      const allFields = [];
      
      allFields.push(['Klantnaam:', 'PostNL']);
      allFields.push(['Projectnaam:', `${imp.project_naam}`]);
      allFields.push(['Route:', `${imp.data?.['Ritnaam'] || ''}`]);
      allFields.push(['Datum:', `${imp.data?.['Datum'] || ''}`]);
      
      if (imp.starttijd_shift) {
        allFields.push(['Starttijd Shift:', String(imp.starttijd_shift)]);
      }
      
      if (imp.data) {
        Object.entries(imp.data).forEach(([key, value]) => {
          if (key !== 'Ritnaam' && key !== 'Datum') {
            allFields.push([`${key}:`, String(value)]);
          }
        });
      }

      const blockHeight = allFields.length * lineHeight + 5;

      if (y + blockHeight > pageHeight - 8) {
        pdf.addPage();
        y = margin;
      }

      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.4);
      pdf.rect(margin, y, pdf.internal.pageSize.width - (margin * 2), blockHeight);

      let contentY = y + 3;

      allFields.forEach(([label, value]) => {
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.text(label, labelXPos, contentY);
        
        pdf.setFont(undefined, 'normal');
        const valueStr = String(value).substring(0, 40);
        pdf.text(valueStr, pageRight, contentY, { align: 'right' });
        
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(labelXPos, contentY + 1.5, pageRight, contentY + 1.5);
        
        contentY += lineHeight;
      });

      y = contentY + 8;
    });

    const recipientEmail = email || user.email;
    const subject = `PostNL Import Rapport - ${projectName} (${datum})`;
    const body = `Beste ${user.full_name},\n\nBijgevoegd vindt u het PostNL import rapport voor ${projectName} op ${datum}.\n\nMet vriendelijke groet,\nUw Applicatie`;

    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: subject,
      body: body,
    });

    return Response.json({ message: 'Rapport succesvol verzonden via e-mail.' });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});