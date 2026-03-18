import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { review_id, review_data } = await req.json();
    if (!review_data) {
      return Response.json({ error: 'review_data is required' }, { status: 400 });
    }

    const review = review_data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = 20;

    // Colors
    const blue = [44, 82, 130];
    const darkText = [45, 55, 72];
    const lightBg = [237, 242, 247];
    const white = [255, 255, 255];
    const headerBg = [44, 82, 130];
    const altRowBg = [247, 250, 252];
    const gridColor = [203, 213, 224];

    function checkPage(needed) {
      if (y + needed > 275) {
        doc.addPage();
        y = 20;
      }
    }

    function drawSectionHeader(title) {
      checkPage(15);
      doc.setFillColor(...lightBg);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blue);
      doc.text(title, margin + 3, y + 7);
      y += 15;
    }

    function drawTable(headers, rows, colWidths) {
      const rowHeight = 8;
      const totalWidth = colWidths.reduce((a, b) => a + b, 0);

      checkPage(rowHeight * (rows.length + 1) + 5);

      // Header
      doc.setFillColor(...headerBg);
      let x = margin;
      doc.rect(x, y, totalWidth, rowHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        doc.text(String(h), x + 2, y + 5.5);
        x += colWidths[i];
      });
      y += rowHeight;

      // Data rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      rows.forEach((row, rowIdx) => {
        checkPage(rowHeight);
        x = margin;
        // Alt row background
        if (rowIdx % 2 === 1) {
          doc.setFillColor(...altRowBg);
          doc.rect(x, y, totalWidth, rowHeight, 'F');
        }
        // Grid
        doc.setDrawColor(...gridColor);
        doc.rect(x, y, totalWidth, rowHeight, 'S');

        doc.setTextColor(...darkText);
        row.forEach((cell, i) => {
          const cellText = cell === null || cell === undefined ? 'N/A' : String(cell);
          if (i === 0) {
            doc.text(cellText, x + 2, y + 5.5);
          } else {
            // Center align for non-first columns
            const textWidth = doc.getTextWidth(cellText);
            doc.text(cellText, x + (colWidths[i] - textWidth) / 2, y + 5.5);
          }
          x += colWidths[i];
        });
        y += rowHeight;
      });
      y += 5;
    }

    function drawTextSection(label, text) {
      if (!text) return;
      checkPage(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(label, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        checkPage(5);
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 5;
    }

    function fmt(val, suffix) {
      if (val === null || val === undefined) return 'N/A';
      return `${Number(val).toFixed(1)}${suffix || ''}`;
    }

    // === TITLE ===
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blue);
    const title = 'FUNCTIONERINGSGESPREK';
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // === INFO ===
    doc.setFontSize(9);
    doc.setTextColor(...darkText);
    const infoLines = [
      ['Medewerker ID:', review.employee_id || 'N/A'],
      ['Beoordelingsdatum:', review.review_date || 'N/A'],
      ['Periode:', `${review.period_start || 'N/A'} t/m ${review.period_end || 'N/A'}`],
      ['Status:', review.status || 'Concept'],
    ];
    infoLines.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 40, y);
      y += 5;
    });
    y += 8;

    // === 1. KPI's ===
    drawSectionHeader('1. Key Performance Indicators (KPI)');
    const kpiCols = [70, 25, 30, 25];
    drawTable(
      ['KPI', 'Target', 'Resultaat', 'Punten'],
      [
        ['TVI Dag', '93%', fmt(review.tvi_dag, '%'), fmt(review.tvi_dag_punten)],
        ['Uitreik locatie', '98%', fmt(review.uitreik_locatie, '%'), fmt(review.uitreik_locatie_punten)],
        ['Scankwaliteit', '99,2%', fmt(review.scankwaliteit, '%'), fmt(review.scankwaliteit_punten)],
        ['PBA-bezorgen', '93%', fmt(review.pba_bezorgen, '%'), fmt(review.pba_bezorgen_punten)],
        ['Hitrate', '97,9%', fmt(review.hitrate, '%'), fmt(review.hitrate_punten)],
      ],
      kpiCols
    );

    // === 2. Ratio's ===
    drawSectionHeader("2. Ratio's en Klachten");
    drawTable(
      ['Indicator', 'Target', 'Resultaat', 'Punten'],
      [
        ['Procesverstoring cat. 1', '\u2264 3', fmt(review.procesverstoring_cat1), fmt(review.procesverstoring_cat1_punten)],
        ['Procesverstoring cat. 2', '\u2264 1', fmt(review.procesverstoring_cat2), fmt(review.procesverstoring_cat2_punten)],
        ['Betwiste klachten', '\u2264 10', fmt(review.betwiste_klachten), fmt(review.betwiste_klachten_punten)],
        ['Onbetwiste klachten', '\u2264 5', fmt(review.onbetwiste_klachten), fmt(review.onbetwiste_klachten_punten)],
        ['Contact ratio', '22,8', fmt(review.contract_ratio), fmt(review.contract_ratio_punten)],
        ['Claims', '\u2264 1,5', fmt(review.claims), fmt(review.claims_punten)],
      ],
      kpiCols
    );

    // === 3. Rijgedrag ===
    drawSectionHeader('3. Rijgedrag en Voertuigbeheer');
    const scoreCols = [90, 30, 30];
    drawTable(
      ['Aspect', 'Score', 'Punten'],
      [
        ['Veilig en defensief rijgedrag', String(review.veilig_defensief_rijgedrag ?? 'N/A'), fmt(review.veilig_defensief_rijgedrag_punten)],
        ['Naleven verkeersregels', String(review.naleven_verkeersregels ?? 'N/A'), fmt(review.naleven_verkeersregels_punten)],
        ['Schadevrij rijden', String(review.schadevrij_rijden ?? 'N/A'), fmt(review.schadevrij_rijden_punten)],
        ['Melden schade/incidenten', String(review.melden_schade_incidenten ?? 'N/A'), fmt(review.melden_schade_incidenten_punten)],
        ['Representatief gebruik voertuig', String(review.representatief_gebruik_voertuig ?? 'N/A'), fmt(review.representatief_gebruik_voertuig_punten)],
        ['Periodieke voertuig controle', String(review.periodieke_voertuig_controle ?? 'N/A'), fmt(review.periodieke_voertuig_controle_punten)],
        ['Netheid en onderhoud', String(review.netheid_onderhoud_voertuig ?? 'N/A'), fmt(review.netheid_onderhoud_voertuig_punten)],
        ['Zuinig rijgedrag', String(review.zuinig_verantwoord_rijgedrag ?? 'N/A'), fmt(review.zuinig_verantwoord_rijgedrag_punten)],
        ['Bandenslijtage', String(review.bandenslijtage ?? 'N/A'), fmt(review.bandenslijtage_punten)],
      ],
      scoreCols
    );

    // === 4. Persoonlijk ===
    drawSectionHeader('4. Persoonlijk Functioneren');
    drawTable(
      ['Aspect', 'Score', 'Punten'],
      [
        ['Inzet & betrokkenheid', String(review.persoonlijke_inzet ?? 'N/A'), fmt(review.persoonlijke_inzet_punten)],
        ['Flexibiliteit piek/ziekte', String(review.piek_ziektebezetting ?? 'N/A'), fmt(review.piek_ziektebezetting_punten)],
        ['Omgang veranderingen', String(review.omgang_veranderingen ?? 'N/A'), fmt(review.omgang_veranderingen_punten)],
        ['Ziekteverzuim', String(review.ziekteverzuim ?? 'N/A'), fmt(review.ziekteverzuim_punten)],
        ['Samenwerking & houding', String(review.omgang_collega ?? 'N/A'), fmt(review.omgang_collega_punten)],
        ['Nakomen afspraken', String(review.nakomen_afspraken ?? 'N/A'), fmt(review.nakomen_afspraken_punten)],
      ],
      scoreCols
    );

    // === 5. Bespreekpunten ===
    drawSectionHeader('5. Bespreekpunten');
    drawTextSection('Werk-privé balans:', review.werk_prive_balans);
    drawTextSection('Terugblik vorige periode:', review.terugblik_vorige_periode);
    drawTextSection('SMART doelen komende periode:', review.nieuwe_doelen);
    drawTextSection('Feedback medewerker:', review.feedback_medewerker);

    // === 6. Beoordeling ===
    drawSectionHeader('6. Beoordeling en Conclusie');
    checkPage(20);

    // Score box
    const scoreText = `Totaal Score: ${review.gemiddelde_score != null ? Number(review.gemiddelde_score).toFixed(0) : 'N/A'} punten`;
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 12, 'FD');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...blue);
    doc.text(scoreText, pageWidth / 2, y + 8, { align: 'center' });
    y += 18;

    if (review.trede_verhoging) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('\u2713 In aanmerking voor trede verhoging', margin, y);
      y += 6;
      if (review.trede_verhoging_toelichting) {
        drawTextSection('', review.trede_verhoging_toelichting);
      }
    }

    drawTextSection('Algemene conclusie:', review.algemene_conclusie);
    drawTextSection('Ontwikkelpunten:', review.ontwikkelpunten);

    // === 7. Handtekeningen ===
    drawSectionHeader('7. Handtekeningen');
    checkPage(30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text('Manager:', margin, y);
    doc.text('Medewerker:', margin + contentWidth / 2, y);
    y += 20;

    doc.setDrawColor(...darkText);
    doc.line(margin, y, margin + 60, y);
    doc.line(margin + contentWidth / 2, y, margin + contentWidth / 2 + 60, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Datum: _______________', margin, y);
    doc.text('Datum: _______________', margin + contentWidth / 2, y);
    y += 15;

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(113, 128, 150);
    const now = new Date();
    doc.text(`Gegenereerd op ${now.toLocaleDateString('nl-NL')} ${now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`, margin, 285);

    // Output
    const pdfOutput = doc.output('arraybuffer');
    
    return new Response(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="beoordeling_${review.employee_id}_${review.review_date}.pdf"`,
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});