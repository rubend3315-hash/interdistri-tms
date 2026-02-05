import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

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

    const addGrid = (items, cols = 2) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 10;
      }
      const colWidth = maxWidth / cols;
      let currentCol = 0;
      let currentRow = yPosition;

      items.forEach((item, index) => {
        const xPos = margin + (currentCol * colWidth);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`${item.label}:`, xPos, currentRow);
        doc.setFont(undefined, 'bold');
        doc.text(String(item.value), xPos + (colWidth * 0.6), currentRow);

        currentCol++;
        if (currentCol >= cols) {
          currentCol = 0;
          currentRow += 8;
        }
      });

      yPosition = currentRow + 5;
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
    const kpiItems = [
      ...(review.tvi_dag ? [{ label: 'TVI Dag', value: `${review.tvi_dag}%` }] : []),
      ...(review.uitreik_locatie ? [{ label: 'Uitreik locatie', value: `${review.uitreik_locatie}%` }] : []),
      ...(review.scankwaliteit ? [{ label: 'Scankwaliteit', value: `${review.scankwaliteit}%` }] : []),
      ...(review.pba_bezorgen ? [{ label: 'PBA-bezorgen', value: `${review.pba_bezorgen}%` }] : []),
      ...(review.hitrate ? [{ label: 'Hitrate', value: `${review.hitrate}%` }] : []),
      ...(review.procesverstoring_cat1 ? [{ label: 'Procesverstoring cat. 1', value: `${review.procesverstoring_cat1}` }] : []),
      ...(review.procesverstoring_cat2 ? [{ label: 'Procesverstoring cat. 2', value: `${review.procesverstoring_cat2}` }] : []),
      ...(review.betwiste_klachten ? [{ label: 'Betwiste klachten', value: `${review.betwiste_klachten}` }] : []),
      ...(review.onbetwiste_klachten ? [{ label: 'Onbetwiste klachten', value: `${review.onbetwiste_klachten}` }] : []),
      ...(review.contract_ratio ? [{ label: 'Contact ratio', value: `${review.contract_ratio}` }] : []),
      ...(review.claims ? [{ label: 'Claims', value: `${review.claims}` }] : []),
    ];
    if (kpiItems.length > 0) {
      addGrid(kpiItems, 2);
    }

    // Section 2: Vaardigheden
    addSection('2. Vaardigheden en Verantwoord Gebruik van het Voertuig');
    const skillItems = [
      ...(review.veilig_defensief_rijgedrag ? [{ label: 'Veilig rijgedrag', value: `${review.veilig_defensief_rijgedrag}/4` }] : []),
      ...(review.naleven_verkeersregels ? [{ label: 'Verkeersregels', value: `${review.naleven_verkeersregels}/4` }] : []),
      ...(review.schadevrij_rijden ? [{ label: 'Schadevrij rijden', value: `${review.schadevrij_rijden}/4` }] : []),
      ...(review.melden_schade_incidenten ? [{ label: 'Melden schade', value: `${review.melden_schade_incidenten}/4` }] : []),
      ...(review.representatief_gebruik_voertuig ? [{ label: 'Representatief gebruik', value: `${review.representatief_gebruik_voertuig}/4` }] : []),
      ...(review.periodieke_voertuig_controle ? [{ label: 'Voertuig controle', value: `${review.periodieke_voertuig_controle}/4` }] : []),
      ...(review.netheid_onderhoud_voertuig ? [{ label: 'Netheid voertuig', value: `${review.netheid_onderhoud_voertuig}/4` }] : []),
      ...(review.zuinig_verantwoord_rijgedrag ? [{ label: 'Zuinig rijgedrag', value: `${review.zuinig_verantwoord_rijgedrag}/4` }] : []),
      ...(review.bandenslijtage ? [{ label: 'Bandenslijtage', value: `${review.bandenslijtage}/4` }] : []),
    ];
    if (skillItems.length > 0) {
      addGrid(skillItems, 2);
    }

    // Section 3: Persoonlijke inzet
    addSection('3. Persoonlijke Inzet, Samenwerking en Wederkerigheid');
    const personalItems = [
      ...(review.persoonlijke_inzet ? [{ label: 'Inzet & betrokkenheid', value: `${review.persoonlijke_inzet}/7` }] : []),
      ...(review.piek_ziektebezetting ? [{ label: 'Flexibiliteit', value: `${review.piek_ziektebezetting}/7` }] : []),
      ...(review.omgang_veranderingen ? [{ label: 'Omgang veranderingen', value: `${review.omgang_veranderingen}/4` }] : []),
      ...(review.ziekteverzuim ? [{ label: 'Ziekteverzuim', value: `${review.ziekteverzuim}/5` }] : []),
      ...(review.omgang_collega ? [{ label: 'Samenwerking', value: `${review.omgang_collega}/4` }] : []),
      ...(review.nakomen_afspraken ? [{ label: 'Nakomen afspraken', value: `${review.nakomen_afspraken}/4` }] : []),
    ];
    if (personalItems.length > 0) {
      addGrid(personalItems, 2);
    }

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

    // Section 4: Werk-privé balans
    if (review.werk_prive_balans) {
      addSection('4. Werk-Privé Balans');
      addParagraph('Werk-privé balans en duurzame inzetbaarheid', review.werk_prive_balans);
    }

    // Section: Evaluatie
    addSection('5. Evaluatie en Afspraken');
    if (review.terugblik_vorige_periode) {
      addParagraph('Terugblik op doelen vorige periode', review.terugblik_vorige_periode);
    }
    if (review.nieuwe_doelen) {
      addParagraph('Nieuwe doelen (SMART)', review.nieuwe_doelen);
    }
    if (review.feedback_medewerker) {
      addParagraph('Feedback medewerker', review.feedback_medewerker);
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