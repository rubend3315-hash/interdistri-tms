import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

interface PerformanceReview {
  employee_id: string;
  review_date: string;
  period_start?: string;
  period_end?: string;
  
  // KPI's met percentages en targets
  tvi_dag?: number;
  tvi_dag_punten?: number;
  uitreik_locatie?: number;
  uitreik_locatie_punten?: number;
  scankwaliteit?: number;
  scankwaliteit_punten?: number;
  pba_bezorgen?: number;
  pba_bezorgen_punten?: number;
  hitrate?: number;
  hitrate_punten?: number;
  
  // Ratio's
  procesverstoring_cat1?: number;
  procesverstoring_cat1_punten?: number;
  procesverstoring_cat2?: number;
  procesverstoring_cat2_punten?: number;
  betwiste_klachten?: number;
  betwiste_klachten_punten?: number;
  onbetwiste_klachten?: number;
  onbetwiste_klachten_punten?: number;
  contract_ratio?: number;
  contract_ratio_punten?: number;
  claims?: number;
  claims_punten?: number;
  
  // Gedrag scores (1-10)
  veilig_defensief_rijgedrag?: number;
  veilig_defensief_rijgedrag_punten?: number;
  naleven_verkeersregels?: number;
  naleven_verkeersregels_punten?: number;
  schadevrij_rijden?: number;
  schadevrij_rijden_punten?: number;
  melden_schade_incidenten?: number;
  melden_schade_incidenten_punten?: number;
  representatief_gebruik_voertuig?: number;
  representatief_gebruik_voertuig_punten?: number;
  periodieke_voertuig_controle?: number;
  periodieke_voertuig_controle_punten?: number;
  netheid_onderhoud_voertuig?: number;
  netheid_onderhoud_voertuig_punten?: number;
  zuinig_verantwoord_rijgedrag?: number;
  zuinig_verantwoord_rijgedrag_punten?: number;
  bandenslijtage?: number;
  bandenslijtage_punten?: number;
  
  // Persoonlijk
  persoonlijke_inzet?: number;
  persoonlijke_inzet_punten?: number;
  piek_ziektebezetting?: number;
  piek_ziektebezetting_punten?: number;
  omgang_veranderingen?: number;
  omgang_veranderingen_punten?: number;
  ziekteverzuim?: number;
  ziekteverzuim_punten?: number;
  omgang_collega?: number;
  omgang_collega_punten?: number;
  nakomen_afspraken?: number;
  nakomen_afspraken_punten?: number;
  
  // Tekstvelden
  werk_prive_balans?: string;
  terugblik_vorige_periode?: string;
  nieuwe_doelen?: string;
  feedback_medewerker?: string;
  
  // Resultaat
  gemiddelde_score?: number;
  trede_verhoging?: boolean;
  trede_verhoging_toelichting?: string;
  algemene_conclusie?: string;
  ontwikkelpunten?: string;
  
  // Meta
  reviewer_id?: string;
  manager_signature_url?: string;
  employee_signature_url?: string;
  status?: 'Concept' | 'Definitief' | 'Besproken';
}

Deno.serve(async (req) => {
  try {
    // Valideer HTTP method
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed. Use POST.' },
        { status: 405 }
      );
    }

    // Authenticatie
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { review_id, review_data } = await req.json();

    if (!review_data) {
      return Response.json(
        { error: 'review_data is required' },
        { status: 400 }
      );
    }

    const review: PerformanceReview = review_data;

    console.log(`Generating PDF for review ${review_id || 'new'}`);

    // Genereer PDF met Python script
    const pythonScript = generatePythonScript(review);
    
    // Schrijf Python script naar bestand
    await Deno.writeTextFile('/tmp/generate_pdf.py', pythonScript);
    
    // Voer Python script uit
    const command = new Deno.Command('python3', {
      args: ['/tmp/generate_pdf.py'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error('PDF generation failed:', errorText);
      return Response.json(
        { error: 'PDF generation failed', details: errorText },
        { status: 500 }
      );
    }

    // Lees gegenereerde PDF
    const pdfData = await Deno.readFile('/tmp/performance_review.pdf');

    // Upload naar Base44 (optioneel)
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const file = new File([blob], `performance_review_${review.employee_id}_${review.review_date}.pdf`, {
      type: 'application/pdf'
    });

    const uploadResponse = await base44.integrations.Core.UploadFile({ file });

    console.log(`PDF generated successfully: ${uploadResponse.file_url}`);

    // Return PDF als download
    return new Response(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="performance_review_${review.employee_id}_${review.review_date}.pdf"`,
        'X-File-URL': uploadResponse.file_url // URL voor opslag
      }
    });

  } catch (error) {
    console.error('PDF export error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return Response.json({
      error: 'PDF export failed',
      message: errorMessage,
      ...(Deno.env.get('ENV') === 'development' && { stack: errorStack })
    }, { status: 500 });
  }
});

/**
 * Genereer Python script voor PDF creatie met ReportLab
 */
function generatePythonScript(review: PerformanceReview): string {
  // Escape strings voor Python
  const escape = (str: string | undefined): string => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  };

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, KeepTogether, Image
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from datetime import datetime

# Review data
review = ${JSON.stringify(review, null, 2)}

def create_pdf():
    """Genereer Performance Review PDF"""
    
    # Configuratie
    filename = '/tmp/performance_review.pdf'
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=12,
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2c5282'),
        spaceAfter=10,
        spaceBefore=15,
        borderWidth=0,
        borderColor=colors.HexColor('#2c5282'),
        borderPadding=5,
        backColor=colors.HexColor('#edf2f7')
    ))
    
    styles.add(ParagraphStyle(
        name='SubHeader',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=6,
        spaceBefore=8
    ))
    
    styles.add(ParagraphStyle(
        name='BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#718096')
    ))
    
    # Story (content)
    story = []
    
    # === HEADER ===
    story.append(Paragraph('FUNCTIONERINGSGESPREK', styles['CustomTitle']))
    story.append(Spacer(1, 10))
    
    # Info table
    info_data = [
        ['Medewerker ID:', review.get('employee_id', 'N/A')],
        ['Beoordelingsdatum:', review.get('review_date', 'N/A')],
        ['Periode:', f"{review.get('period_start', 'N/A')} t/m {review.get('period_end', 'N/A')}"],
        ['Status:', review.get('status', 'Concept')]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2d3748')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 20))
    
    # === KPI SECTIE ===
    story.append(Paragraph('1. Key Performance Indicators (KPI)', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    # KPI data met targets
    kpi_data = [
        ['KPI', 'Target', 'Resultaat', 'Punten'],
        ['TVI Dag', '93%', f"{review.get('tvi_dag', 0):.1f}%" if review.get('tvi_dag') else 'N/A', 
         f"{review.get('tvi_dag_punten', 0):.1f}" if review.get('tvi_dag_punten') else 'N/A'],
        ['Uitreik locatie', '98%', f"{review.get('uitreik_locatie', 0):.1f}%" if review.get('uitreik_locatie') else 'N/A',
         f"{review.get('uitreik_locatie_punten', 0):.1f}" if review.get('uitreik_locatie_punten') else 'N/A'],
        ['Scankwaliteit', '99,2%', f"{review.get('scankwaliteit', 0):.1f}%" if review.get('scankwaliteit') else 'N/A',
         f"{review.get('scankwaliteit_punten', 0):.1f}" if review.get('scankwaliteit_punten') else 'N/A'],
        ['PBA-bezorgen', '93%', f"{review.get('pba_bezorgen', 0):.1f}%" if review.get('pba_bezorgen') else 'N/A',
         f"{review.get('pba_bezorgen_punten', 0):.1f}" if review.get('pba_bezorgen_punten') else 'N/A'],
        ['Hitrate', '97,9%', f"{review.get('hitrate', 0):.1f}%" if review.get('hitrate') else 'N/A',
         f"{review.get('hitrate_punten', 0):.1f}" if review.get('hitrate_punten') else 'N/A'],
    ]
    
    kpi_table = create_score_table(kpi_data)
    story.append(kpi_table)
    story.append(Spacer(1, 15))
    
    # === RATIO'S ===
    story.append(Paragraph('2. Ratio\\'s en Klachten', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    ratio_data = [
        ['Indicator', 'Target', 'Resultaat', 'Punten'],
        ['Procesverstoring cat. 1', '≤ 3', f"{review.get('procesverstoring_cat1', 0):.1f}" if review.get('procesverstoring_cat1') else 'N/A',
         f"{review.get('procesverstoring_cat1_punten', 0):.1f}" if review.get('procesverstoring_cat1_punten') else 'N/A'],
        ['Procesverstoring cat. 2', '≤ 1', f"{review.get('procesverstoring_cat2', 0):.1f}" if review.get('procesverstoring_cat2') else 'N/A',
         f"{review.get('procesverstoring_cat2_punten', 0):.1f}" if review.get('procesverstoring_cat2_punten') else 'N/A'],
        ['Betwiste klachten', '≤ 10', f"{review.get('betwiste_klachten', 0):.1f}" if review.get('betwiste_klachten') else 'N/A',
         f"{review.get('betwiste_klachten_punten', 0):.1f}" if review.get('betwiste_klachten_punten') else 'N/A'],
        ['Onbetwiste klachten', '≤ 5', f"{review.get('onbetwiste_klachten', 0):.1f}" if review.get('onbetwiste_klachten') else 'N/A',
         f"{review.get('onbetwiste_klachten_punten', 0):.1f}" if review.get('onbetwiste_klachten_punten') else 'N/A'],
        ['Contact ratio', '22,8', f"{review.get('contract_ratio', 0):.1f}" if review.get('contract_ratio') else 'N/A',
         f"{review.get('contract_ratio_punten', 0):.1f}" if review.get('contract_ratio_punten') else 'N/A'],
        ['Claims', '≤ 1,5', f"{review.get('claims', 0):.1f}" if review.get('claims') else 'N/A',
         f"{review.get('claims_punten', 0):.1f}" if review.get('claims_punten') else 'N/A'],
    ]
    
    ratio_table = create_score_table(ratio_data)
    story.append(ratio_table)
    story.append(Spacer(1, 15))
    
    # === RIJGEDRAG EN VOERTUIG ===
    story.append(Paragraph('3. Rijgedrag en Voertuigbeheer', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    rijgedrag_data = [
        ['Aspect', 'Score (1-10)', 'Punten'],
        ['Veilig en defensief rijgedrag', str(review.get('veilig_defensief_rijgedrag', 'N/A')),
         f"{review.get('veilig_defensief_rijgedrag_punten', 0):.1f}" if review.get('veilig_defensief_rijgedrag_punten') else 'N/A'],
        ['Naleven verkeersregels', str(review.get('naleven_verkeersregels', 'N/A')),
         f"{review.get('naleven_verkeersregels_punten', 0):.1f}" if review.get('naleven_verkeersregels_punten') else 'N/A'],
        ['Schadevrij rijden', str(review.get('schadevrij_rijden', 'N/A')),
         f"{review.get('schadevrij_rijden_punten', 0):.1f}" if review.get('schadevrij_rijden_punten') else 'N/A'],
        ['Melden schade/incidenten', str(review.get('melden_schade_incidenten', 'N/A')),
         f"{review.get('melden_schade_incidenten_punten', 0):.1f}" if review.get('melden_schade_incidenten_punten') else 'N/A'],
        ['Representatief gebruik voertuig', str(review.get('representatief_gebruik_voertuig', 'N/A')),
         f"{review.get('representatief_gebruik_voertuig_punten', 0):.1f}" if review.get('representatief_gebruik_voertuig_punten') else 'N/A'],
        ['Periodieke voertuig controle', str(review.get('periodieke_voertuig_controle', 'N/A')),
         f"{review.get('periodieke_voertuig_controle_punten', 0):.1f}" if review.get('periodieke_voertuig_controle_punten') else 'N/A'],
        ['Netheid en onderhoud', str(review.get('netheid_onderhoud_voertuig', 'N/A')),
         f"{review.get('netheid_onderhoud_voertuig_punten', 0):.1f}" if review.get('netheid_onderhoud_voertuig_punten') else 'N/A'],
        ['Zuinig rijgedrag', str(review.get('zuinig_verantwoord_rijgedrag', 'N/A')),
         f"{review.get('zuinig_verantwoord_rijgedrag_punten', 0):.1f}" if review.get('zuinig_verantwoord_rijgedrag_punten') else 'N/A'],
        ['Bandenslijtage', str(review.get('bandenslijtage', 'N/A')),
         f"{review.get('bandenslijtage_punten', 0):.1f}" if review.get('bandenslijtage_punten') else 'N/A'],
    ]
    
    rijgedrag_table = create_score_table(rijgedrag_data, col_widths=[10*cm, 3*cm, 3*cm])
    story.append(rijgedrag_table)
    story.append(Spacer(1, 15))
    
    # === PERSOONLIJK FUNCTIONEREN ===
    story.append(Paragraph('4. Persoonlijk Functioneren', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    persoonlijk_data = [
        ['Aspect', 'Score (1-10)', 'Punten'],
        ['Inzet & betrokkenheid', str(review.get('persoonlijke_inzet', 'N/A')),
         f"{review.get('persoonlijke_inzet_punten', 0):.1f}" if review.get('persoonlijke_inzet_punten') else 'N/A'],
        ['Flexibiliteit piek/ziekte', str(review.get('piek_ziektebezetting', 'N/A')),
         f"{review.get('piek_ziektebezetting_punten', 0):.1f}" if review.get('piek_ziektebezetting_punten') else 'N/A'],
        ['Omgang veranderingen', str(review.get('omgang_veranderingen', 'N/A')),
         f"{review.get('omgang_veranderingen_punten', 0):.1f}" if review.get('omgang_veranderingen_punten') else 'N/A'],
        ['Ziekteverzuim', str(review.get('ziekteverzuim', 'N/A')),
         f"{review.get('ziekteverzuim_punten', 0):.1f}" if review.get('ziekteverzuim_punten') else 'N/A'],
        ['Samenwerking & houding', str(review.get('omgang_collega', 'N/A')),
         f"{review.get('omgang_collega_punten', 0):.1f}" if review.get('omgang_collega_punten') else 'N/A'],
        ['Nakomen afspraken', str(review.get('nakomen_afspraken', 'N/A')),
         f"{review.get('nakomen_afspraken_punten', 0):.1f}" if review.get('nakomen_afspraken_punten') else 'N/A'],
    ]
    
    persoonlijk_table = create_score_table(persoonlijk_data, col_widths=[10*cm, 3*cm, 3*cm])
    story.append(persoonlijk_table)
    story.append(Spacer(1, 20))
    
    # === PAGE BREAK ===
    story.append(PageBreak())
    
    # === TEKST VELDEN ===
    story.append(Paragraph('5. Bespreekpunten', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    if review.get('werk_prive_balans'):
        story.append(Paragraph('Werk-privé balans:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.werk_prive_balans || '')}", styles['BodyText']))
        story.append(Spacer(1, 10))
    
    if review.get('terugblik_vorige_periode'):
        story.append(Paragraph('Terugblik vorige periode:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.terugblik_vorige_periode || '')}", styles['BodyText']))
        story.append(Spacer(1, 10))
    
    if review.get('nieuwe_doelen'):
        story.append(Paragraph('SMART doelen komende periode:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.nieuwe_doelen || '')}", styles['BodyText']))
        story.append(Spacer(1, 10))
    
    if review.get('feedback_medewerker'):
        story.append(Paragraph('Feedback medewerker:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.feedback_medewerker || '')}", styles['BodyText']))
        story.append(Spacer(1, 15))
    
    # === RESULTAAT ===
    story.append(Paragraph('6. Beoordeling en Conclusie', styles['SectionHeader']))
    story.append(Spacer(1, 10))
    
    # Gemiddelde score (groot en prominent)
    gem_score = review.get('gemiddelde_score', 0)
    score_data = [
        [Paragraph(f'<b>Gemiddelde Score: {gem_score:.2f}</b>', styles['Heading2'])]
    ]
    score_table = Table(score_data, colWidths=[16*cm])
    score_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#2c5282')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#edf2f7')),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 15))
    
    # Trede verhoging
    if review.get('trede_verhoging'):
        story.append(Paragraph('✓ In aanmerking voor trede verhoging', styles['SubHeader']))
        if review.get('trede_verhoging_toelichting'):
            story.append(Paragraph("${escape(review.trede_verhoging_toelichting || '')}", styles['BodyText']))
        story.append(Spacer(1, 10))
    
    # Algemene conclusie
    if review.get('algemene_conclusie'):
        story.append(Paragraph('Algemene conclusie:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.algemene_conclusie || '')}", styles['BodyText']))
        story.append(Spacer(1, 10))
    
    # Ontwikkelpunten
    if review.get('ontwikkelpunten'):
        story.append(Paragraph('Ontwikkelpunten:', styles['SubHeader']))
        story.append(Paragraph("${escape(review.ontwikkelpunten || '')}", styles['BodyText']))
        story.append(Spacer(1, 20))
    
    # === HANDTEKENINGEN ===
    story.append(Paragraph('7. Handtekeningen', styles['SectionHeader']))
    story.append(Spacer(1, 20))
    
    # Signature table
    sig_data = [
        ['Manager:', 'Medewerker:'],
        ['', ''],
        ['Datum: _______________', 'Datum: _______________']
    ]
    
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm], rowHeights=[0.8*cm, 3*cm, 0.8*cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black),
    ]))
    story.append(sig_table)
    
    # === FOOTER ===
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        f'Gegenereerd op {datetime.now().strftime("%d-%m-%Y %H:%M")}',
        styles['SmallText']
    ))
    
    # Build PDF
    doc.build(story)
    print(f"PDF created: {filename}")

def create_score_table(data, col_widths=None):
    """Helper om score tabel te maken met styling"""
    if col_widths is None:
        col_widths = [8*cm, 3*cm, 3*cm, 2*cm]
    
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        
        # All cells
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    return table

if __name__ == '__main__':
    try:
        create_pdf()
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
`;
}