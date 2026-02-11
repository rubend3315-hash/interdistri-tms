import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { Jimp } from 'npm:jimp@1.6.0';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
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

    // Fetch the contract
    const contract = await base44.asServiceRole.entities.Contract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contract niet gevonden' }, { status: 404 });
    }

    // Security: non-admin users can only download their own contracts
    if (user.role !== 'admin') {
      const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
      if (employees.length === 0 || employees[0].id !== contract.employee_id) {
        return Response.json({ error: 'Geen toegang tot dit contract' }, { status: 403 });
      }
    }

    // Fetch employee info
    let employeeName = 'Onbekend';
    if (contract.employee_id) {
      const emp = await base44.asServiceRole.entities.Employee.get(contract.employee_id);
      if (emp) {
        employeeName = `${emp.first_name} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name}`;
      }
    }

    // Build PDF
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    pdf.setFillColor(30, 41, 59); // slate-800
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
    pdf.setFillColor(248, 250, 252); // slate-50
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

    // Helper: uint8array to base64
    const toBase64 = (uint8) => {
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    };

    // Minimal PNG decoder for getting RGBA pixel data
    const decodePngRGBA = (buf) => {
      const dv = new DataView(buf.buffer || buf);
      // Skip 8-byte PNG signature
      let pos = 8;
      let width = 0, height = 0, bitDepth = 0, colorType = 0;
      const idatChunks = [];
      
      while (pos < buf.length) {
        const len = dv.getUint32(pos);
        const type = String.fromCharCode(buf[pos+4], buf[pos+5], buf[pos+6], buf[pos+7]);
        
        if (type === 'IHDR') {
          width = dv.getUint32(pos + 8);
          height = dv.getUint32(pos + 12);
          bitDepth = buf[pos + 16];
          colorType = buf[pos + 17];
        } else if (type === 'IDAT') {
          idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
        }
        pos += 12 + len;
      }
      
      // Decompress IDAT data
      const compressed = new Uint8Array(idatChunks.reduce((a, c) => a + c.length, 0));
      let offset = 0;
      for (const chunk of idatChunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(compressed);
      writer.close();
      
      return reader.read().then(async function collect({ done, value }) {
        const chunks = value ? [value] : [];
        if (!done) {
          const next = await reader.read();
          if (next.value) chunks.push(next.value);
          while (!next.done) {
            const n2 = await reader.read();
            if (n2.value) chunks.push(n2.value);
            if (n2.done) break;
          }
        }
        const raw = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
        let o = 0;
        for (const c of chunks) { raw.set(c, o); o += c.length; }
        
        // channels per pixel based on colorType
        const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
        const bpp = Math.ceil(bitDepth * channels / 8);
        const rowLen = width * bpp;
        
        // Unfilter
        const pixels = new Uint8Array(height * rowLen);
        for (let row = 0; row < height; row++) {
          const filterType = raw[row * (rowLen + 1)];
          const rowStart = row * (rowLen + 1) + 1;
          const outStart = row * rowLen;
          const prevRow = row > 0 ? (row - 1) * rowLen : -1;
          
          for (let i = 0; i < rowLen; i++) {
            const rawByte = raw[rowStart + i];
            const a2 = i >= bpp ? pixels[outStart + i - bpp] : 0;
            const b2 = prevRow >= 0 ? pixels[prevRow + i] : 0;
            const c2 = (i >= bpp && prevRow >= 0) ? pixels[prevRow + i - bpp] : 0;
            
            if (filterType === 0) pixels[outStart + i] = rawByte;
            else if (filterType === 1) pixels[outStart + i] = (rawByte + a2) & 0xFF;
            else if (filterType === 2) pixels[outStart + i] = (rawByte + b2) & 0xFF;
            else if (filterType === 3) pixels[outStart + i] = (rawByte + Math.floor((a2 + b2) / 2)) & 0xFF;
            else if (filterType === 4) {
              const p = a2 + b2 - c2;
              const pa = Math.abs(p - a2);
              const pb = Math.abs(p - b2);
              const pc = Math.abs(p - c2);
              const pr = pa <= pb && pa <= pc ? a2 : pb <= pc ? b2 : c2;
              pixels[outStart + i] = (rawByte + pr) & 0xFF;
            }
          }
        }
        
        // Convert to RGBA
        const rgba = new Uint8Array(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          if (channels === 4) {
            rgba[i*4] = pixels[i*4]; rgba[i*4+1] = pixels[i*4+1];
            rgba[i*4+2] = pixels[i*4+2]; rgba[i*4+3] = pixels[i*4+3];
          } else if (channels === 3) {
            rgba[i*4] = pixels[i*3]; rgba[i*4+1] = pixels[i*3+1];
            rgba[i*4+2] = pixels[i*3+2]; rgba[i*4+3] = 255;
          } else if (channels === 2) {
            rgba[i*4] = rgba[i*4+1] = rgba[i*4+2] = pixels[i*2]; rgba[i*4+3] = pixels[i*2+1];
          } else {
            rgba[i*4] = rgba[i*4+1] = rgba[i*4+2] = pixels[i]; rgba[i*4+3] = 255;
          }
        }
        
        return { width, height, rgba };
      });
    };

    // Helper to embed signature image - flatten PNG to opaque and embed
    const addSignatureImage = async (url, x, currentY) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
        const arrayBuf = await resp.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        
        const isJpeg = uint8[0] === 0xFF && uint8[1] === 0xD8;
        
        if (isJpeg) {
          const base64 = toBase64(uint8);
          pdf.addImage(`data:image/jpeg;base64,${base64}`, 'JPEG', x, currentY, 60, 20);
          return 23;
        }
        
        // PNG: decode, flatten alpha on white, re-encode as opaque PNG using fast-png
        const { width: w, height: h, rgba } = await decodePngRGBA(uint8);
        
        // Flatten transparency onto white
        const rgb = new Uint8Array(w * h * 3);
        for (let i = 0; i < w * h; i++) {
          const a = rgba[i * 4 + 3] / 255;
          rgb[i * 3 + 0] = Math.round(rgba[i * 4 + 0] * a + 255 * (1 - a));
          rgb[i * 3 + 1] = Math.round(rgba[i * 4 + 1] * a + 255 * (1 - a));
          rgb[i * 3 + 2] = Math.round(rgba[i * 4 + 2] * a + 255 * (1 - a));
        }
        
        // Re-encode as opaque PNG (RGB, no alpha) using fast-png
        const opaquePngBuf = encodePng({ width: w, height: h, data: rgb, channels: 3 });
        const base64 = toBase64(new Uint8Array(opaquePngBuf));
        const dataUri = `data:image/png;base64,${base64}`;
        
        // Calculate aspect ratio
        const maxW = 60;
        const maxH = 20;
        const aspect = w / h;
        let drawW = maxW;
        let drawH = drawW / aspect;
        if (drawH > maxH) { drawH = maxH; drawW = drawH * aspect; }
        
        pdf.addImage(dataUri, 'PNG', x, currentY, drawW, drawH);
        return drawH + 3;
      } catch (e) {
        console.error('Signature image error:', e.message);
        return 0;
      }
    };

    // Contract content - strip HTML tags and render as text
    if (contract.contract_content) {
      let htmlContent = contract.contract_content;

      // Remove the "Voor akkoord" signature block from the HTML content
      htmlContent = htmlContent
        .replace(/<div\s+style[^>]*>[\s\S]*?Voor akkoord[\s\S]*?<\/div>/gi, '')
        .replace(/<p[^>]*>\s*<strong>\s*Voor akkoord werkgever\s*<\/strong>\s*<\/p>[\s\S]*$/i, '')
        .replace(/<strong>\s*Voor akkoord werkgever\s*<\/strong>[\s\S]*$/i, '')
        .replace(/Voor akkoord werkgever[\s\S]*$/gi, '');

      // Fix "Invalid Date" in HTML before stripping tags
      const startDateFormatted = formatDate(contract.start_date);
      if (startDateFormatted) {
        htmlContent = htmlContent.replace(/Invalid Date/g, startDateFormatted);
      }

      // Convert HTML to text, using markers for article headers to add spacing later
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

      // Fix Unicode/UTF-8 characters that jsPDF cannot render
      // Replace actual Unicode chars with ASCII equivalents
      textContent = textContent
        .replace(/\u00e9/g, 'e')   // é → e
        .replace(/\u00eb/g, 'e')   // ë → e
        .replace(/\u00e8/g, 'e')   // è → e
        .replace(/\u00ef/g, 'i')   // ï → i
        .replace(/\u00fc/g, 'u')   // ü → u
        .replace(/\u00f6/g, 'o')   // ö → o
        .replace(/\u00e4/g, 'a')   // ä → a
        .replace(/\u00e0/g, 'a')   // à → a
        .replace(/\u20AC/g, 'EUR ')  // € → EUR (jsPDF can't render €)
        .replace(/\u00E9\u00E9n/g, 'een')
        // Fix mojibake patterns (double-encoded UTF-8)
        .replace(/\u00ef\u00bf\u00bd\u00ef\u00bf\u00bdn/g, 'een')
        .replace(/\u00ef\u00bf\u00bd/g, 'EUR ')
        .replace(/ï¿½ï¿½n/g, 'een')
        .replace(/ï¿½/g, 'EUR ')
        .replace(/Ã«n/g, 'en')
        .replace(/Ã«/g, 'e')
        .replace(/Ã©/g, 'e')
        .replace(/Ã¯/g, 'i')
        .replace(/Ã¼/g, 'u')
        .replace(/Ã¶/g, 'o')
        .replace(/Ã /g, 'a')
        .replace(/â‚¬/g, 'EUR ')
        // Fix "beëindig" variants
        .replace(/be[^\w\s]{1,6}indig/g, 'beeindig')
        // Remove leftover dotted signature lines
        .replace(/\.{10,}/g, '')
        .replace(/\u2026{3,}/g, '');

      // Remove trailing "Voor akkoord" block from plain text too
      textContent = textContent
        .replace(/Voor akkoord werkgever[\s\S]*$/i, '')
        .trim();

      // Remove "oorspronkelijk in dienst getreden" line if not a verlenging
      if (!contract.is_verlenging) {
        textContent = textContent
          .replace(/De werknemer is oorspronkelijk bij werkgever in dienst getreden op[^\n.]*\.?/gi, '')
          .replace(/Werknemer is oorspronkelijk bij werkgever in dienst getreden op[^\n.]*\.?/gi, '');
      }
      // Remove lines with [NOG IN TE VULLEN] placeholder
      textContent = textContent
        .replace(/[^\n]*\[NOG IN TE VULLEN\][^\n]*\n?/g, '')
        // Clean up "vangt aan op ." (empty date after Invalid Date removal)
        .replace(/vangt aan op\s*\.\s*/gi, startDateFormatted ? `vangt aan op ${startDateFormatted}.` : '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(30, 41, 59);

      const lineHeight = 4.5;
      const artikelSpacing = 6; // extra space before each Artikel heading

      // Split into paragraphs and process
      const paragraphs = textContent.split('\n');

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const isArtikel = trimmed.startsWith('###ARTIKEL###');
        const displayText = isArtikel ? trimmed.replace('###ARTIKEL###', '').trim() : trimmed;

        if (!displayText) continue;

        // Add extra spacing before article headings
        if (isArtikel) {
          y += artikelSpacing;
        }

        // Check page break
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

        // Word-wrap this paragraph
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
      
      // Reset font after content
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

    if (contract.manager_signature_url) {
      const sigH = await addSignatureImage(contract.manager_signature_url, margin, y);
      y += sigH || 2;
    } else {
      y += 20; // empty space for manual signature
    }

    // Dotted line
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

    if (contract.employee_signature_url) {
      const sigH = await addSignatureImage(contract.employee_signature_url, margin, y);
      y += sigH || 2;
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