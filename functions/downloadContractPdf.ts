import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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

// Fetch signature and add it to PDF directly
// Returns true if signature was added, false otherwise
async function addSignatureToPdf(pdf, url, x, y, w, h) {
  try {
    console.log('Fetching signature from:', url);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('Signature fetch failed:', resp.status);
      return false;
    }
    
    const arrayBuf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    console.log('Fetched bytes:', uint8.length, 'first 4:', uint8[0], uint8[1], uint8[2], uint8[3]);
    
    if (uint8.length < 100) {
      console.error('Image too small, likely not a valid image');
      return false;
    }

    const isJpeg = uint8[0] === 0xFF && uint8[1] === 0xD8;
    const isPng = uint8[0] === 0x89 && uint8[1] === 0x50;
    const format = isJpeg ? 'JPEG' : isPng ? 'PNG' : null;
    
    if (!format) {
      console.error('Unknown image format');
      return false;
    }

    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, uint8.length);
      const chunk = uint8.subarray(i, end);
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    const b64 = btoa(binary);
    
    console.log('Base64 length:', b64.length, 'format:', format);
    
    // Use the raw base64 data directly with format parameter
    pdf.addImage(b64, format, x, y, w, h);
    console.log('Signature added to PDF successfully');
    return true;
  } catch (e) {
    console.error('addSignatureToPdf error:', e.message, e.stack);
    return false;
  }
}

// Strip HTML to plain text sections
function parseContractContent(html) {
  if (!html) return [];
  
  // Remove "Voor akkoord" blocks from the end
  let cleaned = html
    .replace(/Voor akkoord werkgever[\s\S]*$/gi, '')
    .replace(/<div\s+style[^>]*>[\s\S]*?Voor akkoord[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*>\s*<strong>\s*Voor akkoord werkgever\s*<\/strong>\s*<\/p>[\s\S]*$/i, '');
  
  // Mark headings
  cleaned = cleaned.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n###H###$1\n');
  cleaned = cleaned.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n###H###$1\n');
  
  // Convert block elements
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
    .replace(/&euro;/gi, 'EUR ')
    .replace(/\u20AC/g, 'EUR ')
    .replace(/\u00e9/g, 'e').replace(/\u00eb/g, 'e').replace(/\u00e8/g, 'e')
    .replace(/\u00ef/g, 'i').replace(/\u00fc/g, 'u').replace(/\u00f6/g, 'o')
    .replace(/\u00e4/g, 'a').replace(/\u00e0/g, 'a')
    .replace(/ï¿½ï¿½n/g, 'een').replace(/ï¿½/g, 'EUR ')
    .replace(/Ã«n/g, 'en').replace(/Ã«/g, 'e').replace(/Ã©/g, 'e')
    .replace(/Ã¯/g, 'i').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o')
    .replace(/Ã /g, 'a').replace(/â‚¬/g, 'EUR ')
    .replace(/be[^\w\s]{1,6}indig/g, 'beeindig')
    .replace(/\.{10,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const result = [];
  for (const line of cleaned.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('###H###')) {
      result.push({ heading: true, text: trimmed.replace('###H###', '').trim() });
    } else {
      result.push({ heading: false, text: trimmed });
    }
  }
  return result;
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

    // RBAC: ADMIN/HR_MANAGER can download any, EMPLOYEE only their own
    if (user.role !== 'admin' && !['ADMIN', 'HR_MANAGER'].includes(user.business_role)) {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      if (employees.length === 0 || employees[0].id !== contract.employee_id) {
        return Response.json({ error: 'Forbidden: geen toegang tot dit contract' }, { status: 403 });
      }
    }

    let employeeName = 'Onbekend';
    if (contract.employee_id) {
      const emp = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
      if (emp) {
        employeeName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
      }
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 20;

    // ===== HEADER =====
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

    // ===== INFO BOX =====
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, usableWidth, 40, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, usableWidth, 40, 'S');

    const infoY = y + 8;
    const col1 = margin + 5;
    const col2 = margin + usableWidth / 2 + 5;

    pdf.setFontSize(9);
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

    // ===== CONTRACT CONTENT =====
    const sections = parseContractContent(contract.contract_content);
    const lineHeight = 4.5;

    for (const section of sections) {
      if (section.heading) {
        y += 6;
        if (y + lineHeight > pageHeight - 30) { pdf.addPage(); y = 20; }
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10.5);
      } else {
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(10);
      }

      pdf.setTextColor(30, 41, 59);
      const wrappedLines = pdf.splitTextToSize(section.text, usableWidth);
      for (const wLine of wrappedLines) {
        if (y + lineHeight > pageHeight - 30) { pdf.addPage(); y = 20; }
        pdf.text(wLine, margin, y);
        y += lineHeight;
      }
    }

    // ===== SIGNATURES =====
    y += 10;
    if (y > pageHeight - 90) { pdf.addPage(); y = 20; }

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, margin + usableWidth, y);
    y += 8;

    // Manager signature
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Voor akkoord werkgever', margin, y);
    y += 5;

    if (contract.manager_signature_url) {
      const added = await addSignatureToPdf(pdf, contract.manager_signature_url, margin, y, 60, 25);
      y += added ? 28 : 20;
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
    if (contract.manager_signed_date) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Ondertekend op ${formatDateShort(contract.manager_signed_date)}`, margin + 50, y);
    }
    y += 12;

    // Employee signature
    if (y > pageHeight - 60) { pdf.addPage(); y = 20; }

    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Voor akkoord werknemer', margin, y);
    y += 5;

    if (contract.employee_signature_url) {
      const added = await addSignatureToPdf(pdf, contract.employee_signature_url, margin, y, 60, 25);
      y += added ? 28 : 20;
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
    if (contract.employee_signed_date) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Ondertekend op ${formatDateShort(contract.employee_signed_date)}`, margin + 60, y);
    }

    // ===== FOOTER =====
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

    const pdfBytes = pdf.output('arraybuffer');
    console.log('PDF generated, size:', pdfBytes.byteLength);

    return new Response(pdfBytes, {
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