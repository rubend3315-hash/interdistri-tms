import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Fetch signature image and return as base64 JPEG data URI
async function fetchSignatureAsJpeg(url) {
  try {
    console.log('Fetching signature from:', url);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('Signature fetch failed:', resp.status, resp.statusText);
      return null;
    }
    const arrayBuf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    console.log('Signature fetched, size:', uint8.length, 'first bytes:', uint8[0], uint8[1], uint8[2]);

    const isJpeg = uint8[0] === 0xFF && uint8[1] === 0xD8;
    const isPng = uint8[0] === 0x89 && uint8[1] === 0x50;

    if (isJpeg) {
      // Direct JPEG - convert to base64
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const b64 = btoa(binary);
      console.log('JPEG signature, base64 length:', b64.length);
      return { data: b64, format: 'JPEG' };
    }

    if (isPng) {
      // For PNG, we'll just use it as PNG - jsPDF supports PNG
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const b64 = btoa(binary);
      console.log('PNG signature, base64 length:', b64.length);
      return { data: b64, format: 'PNG' };
    }

    console.error('Unknown image format, bytes:', uint8[0], uint8[1]);
    return null;
  } catch (e) {
    console.error('fetchSignature error:', e.message);
    return null;
  }
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

    // Pre-fetch signature images
    console.log('Manager sig URL:', contract.manager_signature_url);
    console.log('Employee sig URL:', contract.employee_signature_url);

    const [managerSig, employeeSig] = await Promise.all([
      contract.manager_signature_url ? fetchSignatureAsJpeg(contract.manager_signature_url) : null,
      contract.employee_signature_url ? fetchSignatureAsJpeg(contract.employee_signature_url) : null,
    ]);

    console.log('Manager sig result:', managerSig ? `${managerSig.format}, ${managerSig.data.length} chars` : 'null');
    console.log('Employee sig result:', employeeSig ? `${employeeSig.format}, ${employeeSig.data.length} chars` : 'null');

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

    // Contract info block
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, usableWidth, 40, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, usableWidth, 40, 'S');

    const infoY = y + 8;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(100, 116, 139);

    const col1 = margin + 5;
    const col2 = margin + usableWidth / 2 + 5;

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
    pdf.text(contract.hours_per_week ? String(contract.hours_per_week) : '-', col2 + 35, infoY + 20);

    y += 50;

    // Contract content
    if (contract.contract_content) {
      let htmlContent = contract.contract_content;

      // Remove the "Voor akkoord" signature block from the HTML content
      htmlContent = htmlContent
        .replace(/<div\s+style[^>]*>[\s\S]*?Voor akkoord[\s\S]*?<\/div>/gi, '')
        .replace(/<p[^>]*>\s*<strong>\s*Voor akkoord werkgever\s*<\/strong>\s*<\/p>[\s\S]*$/i, '')
        .replace(/<strong>\s*Voor akkoord werkgever\s*<\/strong>[\s\S]*$/i, '')
        .replace(/Voor akkoord werkgever[\s\S]*$/gi, '');

      const startDateFormatted = formatDate(contract.start_date);
      if (startDateFormatted) {
        htmlContent = htmlContent.replace(/Invalid Date/g, startDateFormatted);
      }

      let textContent = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h2>/gi, '\n\n')
        .replace(/<h3[^>]*>/gi, '\n\n###ARTIKEL###')
        .replace(/<\/h3>/gi, '\n')
        .replace(/<h2[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&euro;/gi, '\u20AC');

      // Fix Unicode chars that jsPDF cannot render
      textContent = textContent
        .replace(/\u00e9/g, 'e').replace(/\u00eb/g, 'e').replace(/\u00e8/g, 'e')
        .replace(/\u00ef/g, 'i').replace(/\u00fc/g, 'u').replace(/\u00f6/g, 'o')
        .replace(/\u00e4/g, 'a').replace(/\u00e0/g, 'a')
        .replace(/\u20AC/g, 'EUR ')
        .replace(/\u00E9\u00E9n/g, 'een')
        .replace(/\u00ef\u00bf\u00bd\u00ef\u00bf\u00bdn/g, 'een')
        .replace(/\u00ef\u00bf\u00bd/g, 'EUR ')
        .replace(/ï¿½ï¿½n/g, 'een').replace(/ï¿½/g, 'EUR ')
        .replace(/Ã«n/g, 'en').replace(/Ã«/g, 'e').replace(/Ã©/g, 'e')
        .replace(/Ã¯/g, 'i').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o')
        .replace(/Ã /g, 'a').replace(/â‚¬/g, 'EUR ')
        .replace(/be[^\w\s]{1,6}indig/g, 'beeindig')
        .replace(/\.{10,}/g, '')
        .replace(/\u2026{3,}/g, '');

      textContent = textContent
        .replace(/Voor akkoord werkgever[\s\S]*$/i, '')
        .trim();

      if (!contract.is_verlenging) {
        textContent = textContent
          .replace(/De werknemer is oorspronkelijk bij werkgever in dienst getreden op[^\n.]*\.?/gi, '')
          .replace(/Werknemer is oorspronkelijk bij werkgever in dienst getreden op[^\n.]*\.?/gi, '');
      }

      textContent = textContent
        .replace(/[^\n]*\[NOG IN TE VULLEN\][^\n]*\n?/g, '')
        .replace(/vangt aan op\s*\.\s*/gi, startDateFormatted ? `vangt aan op ${startDateFormatted}.` : '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(30, 41, 59);

      const lineHeight = 4.5;
      const artikelSpacing = 6;
      const paragraphs = textContent.split('\n');

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const isArtikel = trimmed.startsWith('###ARTIKEL###');
        const displayText = isArtikel ? trimmed.replace('###ARTIKEL###', '').trim() : trimmed;
        if (!displayText) continue;

        if (isArtikel) y += artikelSpacing;

        if (y + lineHeight > pageHeight - 30) {
          pdf.addPage();
          y = 20;
        }

        if (isArtikel) {
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(10.5);
        } else {
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(10);
        }

        const wrappedLines = pdf.splitTextToSize(displayText, usableWidth);
        for (const wLine of wrappedLines) {
          if (y + lineHeight > pageHeight - 30) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(wLine, margin, y);
          y += lineHeight;
        }
      }

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
    }

    // ===== SIGNATURES SECTION =====
    y += 10;
    if (y > pageHeight - 90) {
      pdf.addPage();
      y = 20;
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, margin + usableWidth, y);
    y += 8;

    // --- Voor akkoord werkgever ---
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Voor akkoord werkgever', margin, y);
    y += 7;

    if (managerSig) {
      try {
        console.log('Adding manager signature image, format:', managerSig.format);
        pdf.addImage(
          'data:image/' + managerSig.format.toLowerCase() + ';base64,' + managerSig.data,
          managerSig.format,
          margin,
          y,
          60,
          25
        );
        console.log('Manager signature added successfully');
        y += 28;
      } catch (imgErr) {
        console.error('Error adding manager signature image:', imgErr.message);
        y += 20;
      }
    } else {
      console.log('No manager signature data available');
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
      pdf.text(`Ondertekend op ${new Date(contract.manager_signed_date).toLocaleDateString('nl-NL')}`, margin + 50, y);
      pdf.setTextColor(30, 41, 59);
    }
    y += 12;

    // --- Voor akkoord werknemer ---
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Voor akkoord werknemer', margin, y);
    y += 7;

    if (employeeSig) {
      try {
        console.log('Adding employee signature image, format:', employeeSig.format);
        pdf.addImage(
          'data:image/' + employeeSig.format.toLowerCase() + ';base64,' + employeeSig.data,
          employeeSig.format,
          margin,
          y,
          60,
          25
        );
        console.log('Employee signature added successfully');
        y += 28;
      } catch (imgErr) {
        console.error('Error adding employee signature image:', imgErr.message);
        y += 20;
      }
    } else {
      console.log('No employee signature data available');
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
      pdf.text(`Ondertekend op ${new Date(contract.employee_signed_date).toLocaleDateString('nl-NL')}`, margin + 60, y);
      pdf.setTextColor(30, 41, 59);
    }

    // Footer on all pages
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} - Pagina ${i} van ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
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