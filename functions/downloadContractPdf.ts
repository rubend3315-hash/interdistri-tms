import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { decode as decodePng } from 'npm:upng-js@2.1.0';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Create a minimal valid BMP file from raw RGB pixel data (no alpha)
function createBMP(width, height, rgbData) {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows must be 4-byte aligned
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const bmp = new Uint8Array(fileSize);
  const view = new DataView(bmp.buffer);

  // BMP Header
  bmp[0] = 0x42; bmp[1] = 0x4D; // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset

  // DIB Header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative = top-down
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // no compression
  view.setUint32(34, pixelDataSize, true);

  // Write pixel data (BMP uses BGR order)
  let offset = 54;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIdx = (row * width + col) * 3;
      bmp[offset++] = rgbData[srcIdx + 2]; // B
      bmp[offset++] = rgbData[srcIdx + 1]; // G
      bmp[offset++] = rgbData[srcIdx];     // R
    }
    // Pad row to 4 bytes
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      bmp[offset++] = 0;
    }
  }

  return bmp;
}

// Fetch signature and convert to BMP (no alpha channel issues)
async function fetchSignatureAsBmpDataUri(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) { console.error('Fetch failed:', resp.status); return null; }
    const arrayBuf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);

    const isPng = uint8[0] === 0x89 && uint8[1] === 0x50;
    const isJpeg = uint8[0] === 0xFF && uint8[1] === 0xD8;

    if (isJpeg) {
      // JPEG has no alpha, use directly
      let binary = '';
      for (let i = 0; i < uint8.length; i += 8192) {
        const chunk = uint8.subarray(i, Math.min(i + 8192, uint8.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      return { dataUri: `data:image/jpeg;base64,${btoa(binary)}`, format: 'JPEG' };
    }

    if (isPng) {
      // Decode PNG to get raw RGBA pixels, composite onto white background, output as BMP
      const png = decodePng(arrayBuf);
      const width = png.width;
      const height = png.height;
      // toRGBA8 returns array of frames, each frame is ArrayBuffer of RGBA pixels
      const frames = decodePng.toRGBA8(png);
      const rgba = new Uint8Array(frames[0]);

      // Composite RGBA onto white background -> RGB
      const rgb = new Uint8Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        const a = rgba[i * 4 + 3] / 255;
        rgb[i * 3]     = Math.round(rgba[i * 4]     * a + 255 * (1 - a)); // R
        rgb[i * 3 + 1] = Math.round(rgba[i * 4 + 1] * a + 255 * (1 - a)); // G
        rgb[i * 3 + 2] = Math.round(rgba[i * 4 + 2] * a + 255 * (1 - a)); // B
      }

      const bmpBytes = createBMP(width, height, rgb);
      let binary = '';
      for (let i = 0; i < bmpBytes.length; i += 8192) {
        const chunk = bmpBytes.subarray(i, Math.min(i + 8192, bmpBytes.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      return { dataUri: `data:image/bmp;base64,${btoa(binary)}`, format: 'BMP', width, height };
    }

    // Unknown format, try as-is
    let binary = '';
    for (let i = 0; i < uint8.length; i += 8192) {
      const chunk = uint8.subarray(i, Math.min(i + 8192, uint8.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return { dataUri: `data:image/png;base64,${btoa(binary)}`, format: 'PNG' };
  } catch (e) {
    console.error('fetchSignature error:', e.message, e.stack);
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

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.width;
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

    // Pre-fetch signature images as data URIs while we build the rest of the PDF
    const [managerSigData, employeeSigData] = await Promise.all([
      contract.manager_signature_url ? fetchSignatureAsBmpDataUri(contract.manager_signature_url) : null,
      contract.employee_signature_url ? fetchSignatureAsBmpDataUri(contract.employee_signature_url) : null,
    ]);

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

        if (y + lineHeight > pdf.internal.pageSize.height - 30) {
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
          if (y + lineHeight > pdf.internal.pageSize.height - 30) {
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

    // Signatures section
    y += 10;
    if (y > pdf.internal.pageSize.height - 80) {
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

    if (managerSigData) {
      // Draw a white rectangle first as background to handle any transparency
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, y, 65, 25, 'F');
      pdf.addImage(managerSigData.dataUri, managerSigData.format, margin, y, 65, 25);
      y += 28;
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
      pdf.text(`Ondertekend op ${new Date(contract.manager_signed_date).toLocaleDateString('nl-NL')}`, margin + 50, y);
      pdf.setTextColor(30, 41, 59);
    }
    y += 12;

    // --- Voor akkoord werknemer ---
    if (y > pdf.internal.pageSize.height - 60) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Voor akkoord werknemer', margin, y);
    y += 7;

    if (employeeSigData) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, y, 65, 25, 'F');
      pdf.addImage(employeeSigData.dataUri, employeeSigData.format, margin, y, 65, 25);
      y += 28;
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
      pdf.text(`Ondertekend op ${new Date(contract.employee_signed_date).toLocaleDateString('nl-NL')}`, margin + 60, y);
      pdf.setTextColor(30, 41, 59);
    }

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} - Pagina ${i} van ${pageCount}`,
        pageWidth / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    const pdfBytes = pdf.output('arraybuffer');

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