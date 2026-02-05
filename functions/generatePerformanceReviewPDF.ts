import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { review } = body;

    if (!review) {
      return Response.json({ error: 'Review data required' }, { status: 400 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 10;
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);

    // Helper functions
    const addTitle = (text) => {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(text, margin, yPosition);
      yPosition += 10;
    };

    const addSection = (title) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 10;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPosition);
      yPosition += 8;
    };

    const addLabelValue = (label, value) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 10;
      }
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`${label}:`, margin, yPosition);
      doc.setFont(undefined, 'bold');
      doc.text(String(value || '-'), margin + 50, yPosition);
      yPosition += 6;
    };

    const addParagraph = (title, text) => {
      if (yPosition > pageHeight - 25) {
        doc.addPage();
        yPosition = 10;
      }
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(title + ':', margin, yPosition);
      yPosition += 5;
      
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(text || '-', maxWidth - 5);
      doc.text(lines, margin + 5, yPosition);
      yPosition += (lines.length * 4) + 3;
    };

    // Title
    addTitle('Resultaat & Ontwikkeling');
    yPosition += 2;

    // Header info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Beoordeling: ${new Date(review.review_date).toLocaleDateString('nl-NL')}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Status: ${review.status}`, margin, yPosition);
    yPosition += 8;

    // Section 1: Operationele Resultaten
    addSection('1. Operationele Resultaten (KPI\'s)');
    if (review.tvi_dag) addLabelValue('TVI Dag (target: 93%)', `${review.tvi_dag}%`);
    if (review.uitreik_locatie) addLabelValue('Uitreik locatie (target: 98%)', `${review.uitreik_locatie}%`);
    if (review.scankwaliteit) addLabelValue('Scankwaliteit (target: 99,2%)', `${review.scankwaliteit}%`);
    if (review.pba_bezorgen) addLabelValue('PBA-bezorgen (target: 93%)', `${review.pba_bezorgen}%`);
    if (review.hitrate) addLabelValue('Hitrate (target: 97,9%)', `${review.hitrate}%`);
    yPosition += 2;

    // Section 2: Vaardigheden
    addSection('2. Vaardigheden en Verantwoord Gebruik van het Voertuig');
    if (review.veilig_defensief_rijgedrag) addLabelValue('Veilig en defensief rijgedrag', `${review.veilig_defensief_rijgedrag}/4`);
    if (review.naleven_verkeersregels) addLabelValue('Naleven verkeersregels', `${review.naleven_verkeersregels}/4`);
    if (review.schadevrij_rijden) addLabelValue('Schadevrij rijden', `${review.schadevrij_rijden}/4`);
    if (review.netheid_onderhoud_voertuig) addLabelValue('Netheid en onderhoud voertuig', `${review.netheid_onderhoud_voertuig}/4`);
    yPosition += 2;

    // Section 3: Persoonlijke inzet
    addSection('3. Persoonlijke Inzet, Samenwerking en Wederkerigheid');
    if (review.persoonlijke_inzet) addLabelValue('Inzet & betrokkenheid', `${review.persoonlijke_inzet}/7`);
    if (review.piek_ziektebezetting) addLabelValue('Flexibiliteit', `${review.piek_ziektebezetting}/7`);
    if (review.omgang_collega) addLabelValue('Samenwerking & houding', `${review.omgang_collega}/4`);
    if (review.ziekteverzuim) addLabelValue('Ziekteverzuim', `${review.ziekteverzuim}/5`);
    yPosition += 2;

    // Gemiddelde score
    if (review.gemiddelde_score) {
      addSection('Beoordeling');
      addLabelValue('Totaalscore', `${review.gemiddelde_score.toFixed(1)}/100`);
      if (review.trede_verhoging) {
        doc.setTextColor(34, 197, 94);
        doc.text('✓ In aanmerking voor trede verhoging', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }
    }

    // Section: Evaluatie
    addSection('4. Evaluatie en Afspraken');
    if (review.terugblik_vorige_periode) {
      addParagraph('Terugblik op doelen vorige periode', review.terugblik_vorige_periode);
    }
    if (review.nieuwe_doelen) {
      addParagraph('Nieuwe doelen (SMART)', review.nieuwe_doelen);
    }
    if (review.algemene_conclusie) {
      addParagraph('Algemene conclusie', review.algemene_conclusie);
    }
    if (review.ontwikkelpunten) {
      addParagraph('Ontwikkelpunten', review.ontwikkelpunten);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=beoordeling_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});