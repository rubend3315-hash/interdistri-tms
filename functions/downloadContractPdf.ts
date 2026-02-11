import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('nl-NL');
  } catch {
    return '';
  }
}

// Fetch image and return as base64 data URI
async function fetchImageAsDataUri(url) {
  try {
    console.log('Fetching image:', url);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('Image fetch failed:', resp.status);
      return null;
    }
    const buf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    console.log('Image size:', uint8.length, 'bytes');
    
    let binary = '';
    // Process in chunks to avoid call stack issues
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
      binary += String.fromCharCode(...chunk);
    }
    const b64 = btoa(binary);
    
    const isJpeg = uint8[0] === 0xFF && uint8[1] === 0xD8;
    const mime = isJpeg ? 'image/jpeg' : 'image/png';
    console.log('Image converted to base64, mime:', mime, 'length:', b64.length);
    return `data:${mime};base64,${b64}`;
  } catch (e) {
    console.error('fetchImage error:', e.message);
    return null;
  }
}

// Strip HTML tags but preserve structure
function htmlToPlainSections(html) {
  if (!html) return [];
  
  // Remove signature blocks from HTML
  let cleaned = html
    .replace(/Voor akkoord werkgever[\s\S]*$/gi, '')
    .replace(/<div\s+style[^>]*>[\s\S]*?Voor akkoord[\s\S]*?<\/div>/gi, '');
  
  // Split into logical sections by headings
  const sections = [];
  
  // Replace h3 tags with markers
  cleaned = cleaned.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n§§HEADING§§$1\n');
  cleaned = cleaned.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n§§HEADING§§$1\n');
  
  // Convert block elements to newlines
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/gi, '€')
    .replace(/\n{3,}/g, '\n\n');
  
  const lines = cleaned.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('§§HEADING§§')) {
      sections.push({ type: 'heading', text: trimmed.replace('§§HEADING§§', '').trim() });
    } else {
      sections.push({ type: 'text', text: trimmed });
    }
  }
  
  return sections;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await req.json();
    if (!contract_id) {
      return Response.json({ error: 'contract_id is verplicht' }, { status: 400 });
    }

    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      if (employees.length === 0 || employees[0].id !== contract.employee_id) {
        return Response.json({ error: 'Geen toegang tot dit contract' }, { status: 403 });
      }
    }

    let employeeName = 'Onbekend';
    if (contract.employee_id) {
      const emp = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
      if (emp) {
        employeeName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
      }
    }

    // Fetch signature images as base64 data URIs
    const [managerSigUri, employeeSigUri] = await Promise.all([
      contract.manager_signature_url ? fetchImageAsDataUri(contract.manager_signature_url) : null,
      contract.employee_signature_url ? fetchImageAsDataUri(contract.employee_signature_url) : null,
    ]);

    console.log('Manager sig:', managerSigUri ? 'loaded' : 'none');
    console.log('Employee sig:', employeeSigUri ? 'loaded' : 'none');

    // Parse contract content into sections
    const sections = htmlToPlainSections(contract.contract_content);
    
    // Build contract body HTML
    let contractBodyHtml = '';
    for (const section of sections) {
      if (section.type === 'heading') {
        contractBodyHtml += `<h3 style="font-size: 11pt; font-weight: bold; margin: 14px 0 4px 0; color: #1e293b;">${section.text}</h3>\n`;
      } else {
        contractBodyHtml += `<p style="font-size: 10pt; line-height: 1.5; margin: 2px 0; color: #1e293b;">${section.text}</p>\n`;
      }
    }

    // Build signature blocks
    const managerSignatureHtml = managerSigUri 
      ? `<img src="${managerSigUri}" style="width: 200px; height: 80px; object-fit: contain; display: block; margin: 8px 0;" />`
      : '<div style="height: 60px;"></div>';
    
    const employeeSignatureHtml = employeeSigUri
      ? `<img src="${employeeSigUri}" style="width: 200px; height: 80px; object-fit: contain; display: block; margin: 8px 0;" />`
      : '<div style="height: 60px;"></div>';

    const managerDateStr = contract.manager_signed_date ? formatDateShort(contract.manager_signed_date) : '';
    const employeeDateStr = contract.employee_signed_date ? formatDateShort(contract.employee_signed_date) : '';

    // Complete HTML document for PDF
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 15mm 20mm; size: A4; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1e293b; margin: 0; padding: 0; }
  .header { background: #1e293b; color: white; padding: 16px 24px; margin: -15mm -20mm 20px -20mm; width: calc(100% + 40mm); }
  .header h1 { font-size: 18pt; margin: 0 0 4px 0; }
  .header p { font-size: 10pt; margin: 0; color: #94a3b8; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 4px 8px; font-size: 9pt; }
  .info-label { color: #64748b; font-weight: bold; width: 120px; }
  .info-value { color: #1e293b; }
  .signature-section { margin-top: 30px; page-break-inside: avoid; }
  .signature-block { margin-bottom: 24px; }
  .signature-block h4 { font-size: 11pt; font-weight: bold; margin: 0 0 8px 0; }
  .signature-line { border-bottom: 1px dotted #94a3b8; width: 250px; margin-bottom: 4px; }
  .signature-info { font-size: 9pt; color: #475569; margin: 2px 0; }
  .signature-date { font-size: 8pt; color: #94a3b8; }
  .footer { font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 30px; }
</style>
</head>
<body>

<div class="header">
  <h1>Interdistri Transport</h1>
  <p>Arbeidscontract</p>
</div>

<div class="info-box">
  <table class="info-table">
    <tr>
      <td class="info-label">Medewerker:</td>
      <td class="info-value">${employeeName}</td>
      <td class="info-label">Contractnummer:</td>
      <td class="info-value">${contract.contract_number || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Contracttype:</td>
      <td class="info-value">${contract.contract_type || '-'}</td>
      <td class="info-label">Startdatum:</td>
      <td class="info-value">${formatDate(contract.start_date) || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Status:</td>
      <td class="info-value">${contract.status || '-'}</td>
      <td class="info-label">Uren/week:</td>
      <td class="info-value">${contract.hours_per_week || '-'}</td>
    </tr>
  </table>
</div>

${contractBodyHtml}

<div class="signature-section">
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
  
  <div class="signature-block">
    <h4>Voor akkoord werkgever</h4>
    ${managerSignatureHtml}
    <div class="signature-line"></div>
    <p class="signature-info">Van Dooren Transport Zeeland B.V.</p>
    <p class="signature-info">Namens deze:</p>
    <p class="signature-info">De heer M. Schetters${managerDateStr ? `&nbsp;&nbsp;&nbsp;&nbsp;<span class="signature-date">Ondertekend op ${managerDateStr}</span>` : ''}</p>
  </div>

  <div class="signature-block">
    <h4>Voor akkoord werknemer</h4>
    ${employeeSignatureHtml}
    <div class="signature-line"></div>
    <p class="signature-info">De heer/mevrouw ${employeeName}${employeeDateStr ? `&nbsp;&nbsp;&nbsp;&nbsp;<span class="signature-date">Ondertekend op ${employeeDateStr}</span>` : ''}</p>
  </div>
</div>

<div class="footer">
  Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}
</div>

</body>
</html>`;

    // Use a headless Chrome PDF API to convert HTML to PDF
    // We'll use a free public API for this
    const pdfResponse = await fetch('https://htmltopdf.paculino.com/api/v1/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: fullHtml,
        options: {
          format: 'A4',
          margin: { top: '0', bottom: '10mm', left: '0', right: '0' }
        }
      })
    });

    if (pdfResponse.ok) {
      const pdfBytes = await pdfResponse.arrayBuffer();
      console.log('PDF generated via HTML API, size:', pdfBytes.byteLength);
      
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=contract_${contract.contract_number || contract_id}.pdf`
        }
      });
    }

    // Fallback: use jsPDF but with a different approach - embed signatures differently
    console.log('HTML-to-PDF API failed, status:', pdfResponse.status, 'falling back to jsPDF');
    
    const { jsPDF } = await import('npm:jspdf@2.5.1');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Interdistri Transport', margin, 15);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text('Arbeidscontract', margin, 25);
    pdf.setTextColor(0, 0, 0);
    y = 45;

    // Info box
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, usableWidth, 40, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, usableWidth, 40, 'S');
    const infoY = y + 8;
    pdf.setFontSize(9);
    const col1 = margin + 5;
    const col2 = margin + usableWidth / 2 + 5;
    
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Medewerker:', col1, infoY);
    pdf.text('Contractnummer:', col2, infoY);
    pdf.text('Contracttype:', col1, infoY + 10);
    pdf.text('Startdatum:', col2, infoY + 10);
    pdf.text('Status:', col1, infoY + 20);
    pdf.text('Uren/week:', col2, infoY + 20);
    
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(15, 23, 42);
    pdf.text(employeeName, col1 + 30, infoY);
    pdf.text(contract.contract_number || '-', col2 + 35, infoY);
    pdf.text(contract.contract_type || '-', col1 + 30, infoY + 10);
    pdf.text(formatDate(contract.start_date) || '-', col2 + 35, infoY + 10);
    pdf.text(contract.status || '-', col1 + 30, infoY + 20);
    pdf.text(String(contract.hours_per_week || '-'), col2 + 35, infoY + 20);
    y += 50;

    // Contract content
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    const lineHeight = 4.5;

    for (const section of sections) {
      if (section.type === 'heading') {
        y += 6;
        if (y + lineHeight > pageHeight - 30) { pdf.addPage(); y = 20; }
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10.5);
      } else {
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);
      }
      
      const lines = pdf.splitTextToSize(section.text, usableWidth);
      for (const line of lines) {
        if (y + lineHeight > pageHeight - 30) { pdf.addPage(); y = 20; }
        pdf.text(line, margin, y);
        y += lineHeight;
      }
    }

    // Signatures
    y += 10;
    if (y > pageHeight - 90) { pdf.addPage(); y = 20; }
    
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, margin + usableWidth, y);
    y += 8;

    // Manager signature
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Voor akkoord werkgever', margin, y);
    y += 7;

    if (managerSigUri) {
      try {
        pdf.addImage(managerSigUri, 'JPEG', margin, y, 60, 25);
        y += 28;
      } catch (e) {
        console.error('jsPDF addImage manager failed:', e.message);
        y += 20;
      }
    } else {
      y += 20;
    }

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('................................................................', margin, y);
    y += 5;
    pdf.setTextColor(30, 41, 59);
    pdf.text('Van Dooren Transport Zeeland B.V.', margin, y);
    y += 5;
    pdf.text('Namens deze:', margin, y);
    y += 5;
    pdf.text('De heer M. Schetters', margin, y);
    if (managerDateStr) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Ondertekend op ${managerDateStr}`, margin + 50, y);
    }
    y += 12;

    // Employee signature
    if (y > pageHeight - 60) { pdf.addPage(); y = 20; }
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Voor akkoord werknemer', margin, y);
    y += 7;

    if (employeeSigUri) {
      try {
        pdf.addImage(employeeSigUri, 'JPEG', margin, y, 60, 25);
        y += 28;
      } catch (e) {
        console.error('jsPDF addImage employee failed:', e.message);
        y += 20;
      }
    } else {
      y += 20;
    }

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('................................................................', margin, y);
    y += 5;
    pdf.setTextColor(30, 41, 59);
    pdf.text(`De heer/mevrouw ${employeeName}`, margin, y);
    if (employeeDateStr) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Ondertekend op ${employeeDateStr}`, margin + 60, y);
    }

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} - Pagina ${i} van ${pageCount}`,
        pageWidth / 2, pageHeight - 10, { align: 'center' }
      );
    }

    const pdfBytes2 = pdf.output('arraybuffer');
    console.log('jsPDF fallback PDF, size:', pdfBytes2.byteLength);

    return new Response(pdfBytes2, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=contract_${contract.contract_number || contract_id}.pdf`
      }
    });

  } catch (error) {
    console.error('downloadContractPdf error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});