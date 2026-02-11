import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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
    if (contract.end_date) {
      pdf.text('Einddatum:', col2, infoY + 20);
    }
    if (contract.hours_per_week) {
      pdf.text('Uren/week:', col2, infoY + 20 + (contract.end_date ? 10 : 0));
    }

    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(15, 23, 42);
    pdf.text(employeeName, col1 + 30, infoY);
    pdf.text(contract.contract_number || '-', col2 + 35, infoY);
    pdf.text(contract.contract_type || '-', col1 + 30, infoY + 10);
    pdf.text(contract.start_date ? new Date(contract.start_date).toLocaleDateString('nl-NL') : '-', col2 + 35, infoY + 10);
    pdf.text(contract.status || '-', col1 + 30, infoY + 20);
    if (contract.end_date) {
      pdf.text(new Date(contract.end_date).toLocaleDateString('nl-NL'), col2 + 35, infoY + 20);
    }

    y += 50;

    // Contract content - strip HTML tags and render as text
    if (contract.contract_content) {
      let textContent = contract.contract_content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<h[1-6][^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(30, 41, 59);

      const lines = pdf.splitTextToSize(textContent, usableWidth);
      const lineHeight = 5;

      for (const line of lines) {
        if (y + lineHeight > pdf.internal.pageSize.height - 30) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }
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

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Ondertekening', margin, y);
    y += 10;

    pdf.setFontSize(9);

    // Helper to embed signature image
    const addSignatureImage = async (url, x, currentY) => {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
        const dataUri = `data:image/png;base64,${base64}`;
        pdf.addImage(dataUri, 'PNG', x, currentY, 40, 20);
        return 22;
      } catch (e) {
        console.error('Signature image error:', e);
        return 0;
      }
    };

    // Employee signature
    pdf.setFont(undefined, 'bold');
    pdf.text('Medewerker:', margin, y);
    pdf.setFont(undefined, 'normal');
    if (contract.employee_signed_date) {
      pdf.text(`Ondertekend op ${new Date(contract.employee_signed_date).toLocaleDateString('nl-NL')}`, margin + 30, y);
      if (contract.employee_signature_url) {
        y += 3;
        const sigH = await addSignatureImage(contract.employee_signature_url, margin, y);
        y += sigH || 2;
      }
    } else {
      pdf.text('Nog niet ondertekend', margin + 30, y);
    }
    y += 8;

    // Manager signature
    if (y > pdf.internal.pageSize.height - 40) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFont(undefined, 'bold');
    pdf.text('Management:', margin, y);
    pdf.setFont(undefined, 'normal');
    if (contract.manager_signed_date) {
      pdf.text(`Ondertekend op ${new Date(contract.manager_signed_date).toLocaleDateString('nl-NL')} door ${contract.manager_signed_by || '-'}`, margin + 30, y);
      if (contract.manager_signature_url) {
        y += 3;
        const sigH = await addSignatureImage(contract.manager_signature_url, margin, y);
        y += sigH || 2;
      }
    } else {
      pdf.text('Nog niet ondertekend', margin + 30, y);
    }

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} — Pagina ${i} van ${pageCount}`,
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