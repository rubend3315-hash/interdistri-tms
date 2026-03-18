import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297;
    const H = 210;
    const M = 15; // margin
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;

    // Colors
    const blue = [37, 99, 235];
    const green = [22, 163, 74];
    const red = [220, 38, 38];
    const amber = [217, 119, 6];
    const purple = [147, 51, 234];
    const slate = [71, 85, 105];
    const lightGray = [241, 245, 249];

    // Helper functions
    const drawBox = (x, y, w, h, fillColor, borderColor) => {
      doc.setFillColor(...fillColor);
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    };

    const drawBlock = (x, y, w, h, text, fillColor, textColor) => {
      doc.setFillColor(...fillColor);
      doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(...textColor);
      doc.text(text, x + w/2, y + h/2 + 1, { align: 'center' });
    };

    const drawArrow = (x, y1, y2) => {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(x, y1, x, y2);
      doc.line(x - 1.5, y2 - 2, x, y2);
      doc.line(x + 1.5, y2 - 2, x, y2);
    };

    // ========== PAGE 1: Title + Layer Model ==========
    // Title bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Interdistri TMS — Systeemarchitectuur', M, 12);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Logische architectuur | Versie 2.0 | Status per: ${dateStr}`, M, 20);
    doc.text('Confidential — Internal Use', W - M, 20, { align: 'right' });

    // Legend
    let ly = 34;
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    const legends = [
      { label: 'Encrypted Data', color: red },
      { label: 'Public Endpoint', color: blue },
      { label: 'Security Control', color: green },
      { label: 'External Service', color: purple },
      { label: 'Data Store', color: amber },
    ];
    let lx = M;
    legends.forEach(l => {
      doc.setFillColor(...l.color);
      doc.circle(lx + 2, ly, 1.5, 'F');
      doc.text(l.label, lx + 5, ly + 1);
      lx += 42;
    });

    // Layer Model
    ly = 44;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Logisch Lagenmodel', M, ly);
    ly += 5;

    // Layer 1 - Presentatie
    const layerW = W - 2 * M;
    const layerH = 14;
    drawBox(M, ly, layerW, layerH, [219, 234, 254], [147, 197, 253]);
    doc.setFontSize(6); doc.setTextColor(30, 64, 175);
    doc.text('LAAG 1 — PRESENTATIE', M + 3, ly + 4);
    drawBlock(M + 3, ly + 6, 35, 6, 'Desktop App', [191, 219, 254], [30, 64, 175]);
    drawBlock(M + 41, ly + 6, 35, 6, 'Mobiele App', [191, 219, 254], [30, 64, 175]);
    drawBlock(M + 79, ly + 6, 38, 6, 'Contract Ondertekening', [191, 219, 254], [30, 64, 175]);
    drawBlock(M + 120, ly + 6, 42, 6, 'Public SecureDownload', [191, 219, 254], [30, 64, 175]);
    ly += layerH;

    drawArrow(W/2, ly, ly + 5);
    ly += 6;

    // Layer 2 - Applicatielogica
    drawBox(M, ly, layerW, layerH, [220, 252, 231], [134, 239, 172]);
    doc.setFontSize(6); doc.setTextColor(21, 128, 61);
    doc.text('LAAG 2 — APPLICATIELOGICA', M + 3, ly + 4);
    const appBlocks = ['Onboarding', 'Contractbeheer', 'HRM', 'Tijdregistratie', 'Planning', 'Sleutelkast', 'Rapportages', 'Communicatie', 'Backup'];
    appBlocks.forEach((b, i) => {
      drawBlock(M + 3 + i * 30, ly + 6, 28, 6, b, [187, 247, 208], [21, 128, 61]);
    });
    ly += layerH;

    drawArrow(W/2, ly, ly + 5);
    ly += 6;

    // Layer 3 - Security
    drawBox(M, ly, layerW, layerH, [254, 226, 226], [252, 165, 165]);
    doc.setFontSize(6); doc.setTextColor(185, 28, 28);
    doc.text('LAAG 3 — SECURITY LAYER', M + 3, ly + 4);
    drawBlock(M + 3, ly + 6, 52, 6, 'Encryption Service (AES-256-GCM)', [254, 202, 202], [185, 28, 28]);
    drawBlock(M + 58, ly + 6, 48, 6, 'Secret Store (APP_ENCRYPTION_KEY)', [254, 202, 202], [185, 28, 28]);
    drawBlock(M + 109, ly + 6, 38, 6, 'Token Validation Layer', [254, 202, 202], [185, 28, 28]);
    drawBlock(M + 150, ly + 6, 30, 6, 'RBAC & Audit', [254, 202, 202], [185, 28, 28]);
    ly += layerH;

    drawArrow(W/2, ly, ly + 5);
    ly += 6;

    // Layer 4 - Datalaag
    const dataH = 20;
    drawBox(M, ly, layerW, dataH, [254, 243, 199], [253, 224, 71]);
    doc.setFontSize(6); doc.setTextColor(146, 64, 14);
    doc.text('LAAG 4 — DATALAAG (ENTITIES)', M + 3, ly + 4);
    const dataBlocks = ['Employee (encrypted)', 'Contract', 'KeylockerPincode', 'SecureDownloadToken', 'AuditLog', 'EmailLog'];
    dataBlocks.forEach((b, i) => {
      drawBlock(M + 3 + i * 44, ly + 6, 42, 6, b, [253, 230, 138], [146, 64, 14]);
    });
    const dataBlocks2 = ['TimeEntry', 'Trip', 'Schedule', 'Vehicle', 'Customer', '+45 overige'];
    dataBlocks2.forEach((b, i) => {
      drawBlock(M + 3 + i * 44, ly + 13, 42, 5, b, [253, 230, 138], [146, 64, 14]);
    });
    ly += dataH;

    drawArrow(W/2, ly, ly + 5);
    ly += 6;

    // Layer 5 - Externe services
    drawBox(M, ly, layerW, layerH, [243, 232, 255], [196, 181, 253]);
    doc.setFontSize(6); doc.setTextColor(107, 33, 168);
    doc.text('LAAG 5 — EXTERNE SERVICES', M + 3, ly + 4);
    drawBlock(M + 3, ly + 6, 40, 6, 'Gmail API (OAuth 2.0)', [233, 213, 255], [107, 33, 168]);
    drawBlock(M + 46, ly + 6, 30, 6, 'Supabase', [233, 213, 255], [107, 33, 168]);
    drawBlock(M + 79, ly + 6, 30, 6, 'File Storage', [233, 213, 255], [107, 33, 168]);
    drawBlock(M + 112, ly + 6, 40, 6, 'Base44 Core', [233, 213, 255], [107, 33, 168]);

    // Page number
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('Pagina 1/2', W - M, H - 5, { align: 'right' });
    doc.text('Confidential — Internal Use', M, H - 5);

    // ========== PAGE 2: Dataflows + Trust Boundaries ==========
    doc.addPage('landscape');

    // Title bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('Dataflows & Trust Boundaries', M, 13);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Status per: ${dateStr}`, W - M, 13, { align: 'right' });

    // Flow E - Beveiligde Documentverzending
    ly = 28;
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text('2. Beveiligde Documentverzending — Dataflow', M, ly);
    ly += 6;

    const flowBlocks = [
      { label: 'Admin: Document verzenden', color: [219, 234, 254], border: [147, 197, 253], tc: [30, 64, 175] },
      { label: 'Encryption Service', color: [254, 202, 202], border: [252, 165, 165], tc: [185, 28, 28] },
      { label: 'Database (encrypted fields)', color: [253, 230, 138], border: [253, 224, 71], tc: [146, 64, 14] },
      { label: 'SecureDownloadToken generator', color: [254, 202, 202], border: [252, 165, 165], tc: [185, 28, 28] },
      { label: 'MailService (link only)', color: [187, 247, 208], border: [134, 239, 172], tc: [21, 128, 61] },
      { label: 'Gmail API', color: [233, 213, 255], border: [196, 181, 253], tc: [107, 33, 168] },
      { label: 'Public SecureDownload Route', color: [219, 234, 254], border: [147, 197, 253], tc: [30, 64, 175] },
      { label: 'Token validation + decrypt', color: [254, 202, 202], border: [252, 165, 165], tc: [185, 28, 28] },
      { label: 'Document render', color: [187, 247, 208], border: [134, 239, 172], tc: [21, 128, 61] },
    ];

    // Draw flow horizontally
    const startX = M;
    const bw = 27;
    const bh = 12;
    const gap = 2.5;
    flowBlocks.forEach((fb, i) => {
      const x = startX + i * (bw + gap);
      doc.setFillColor(...fb.color);
      doc.setDrawColor(...fb.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, ly, bw, bh, 1, 1, 'FD');
      doc.setFontSize(5);
      doc.setTextColor(...fb.tc);
      const lines = doc.splitTextToSize(fb.label, bw - 2);
      doc.text(lines, x + bw/2, ly + bh/2 - (lines.length - 1) * 1.5 + 1, { align: 'center' });
      if (i < flowBlocks.length - 1) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        const ax = x + bw;
        const ay = ly + bh/2;
        doc.line(ax, ay, ax + gap, ay);
        doc.line(ax + gap - 1, ay - 1, ax + gap, ay);
        doc.line(ax + gap - 1, ay + 1, ax + gap, ay);
      }
    });

    // Security note
    ly += bh + 5;
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(M, ly, layerW, 8, 1.5, 1.5, 'FD');
    doc.setFontSize(7); doc.setTextColor(21, 128, 61);
    doc.text('Geen BSN/IBAN in e-mail — alleen een beveiligde, tijdelijke downloadlink (48 uur geldig, max 10 downloads)', W/2, ly + 5, { align: 'center' });

    // Trust Boundaries
    ly += 16;
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text('3. Trust Boundaries', M, ly);
    ly += 6;

    // Trusted zone
    doc.setDrawColor(134, 239, 172);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(M, ly, layerW, 55, 3, 3, 'FD');
    doc.setLineDashPattern([], 0);

    doc.setFontSize(7); doc.setTextColor(21, 128, 61);
    doc.text('VERTROUWDE ZONE — Interdistri TMS', M + 5, ly + 5);

    // Internal blocks
    const intBlocks = ['Employee (encrypted)', 'Contract', 'KeylockerPincode', 'SecureDownloadToken', 'AuditLog', 'Encryption Service', 'Secret Store', 'Token Validation'];
    intBlocks.forEach((b, i) => {
      const bx = M + 5 + (i % 4) * 65;
      const by = ly + 8 + Math.floor(i / 4) * 9;
      drawBlock(bx, by, 62, 7, b, i >= 5 ? [254, 202, 202] : [187, 247, 208], i >= 5 ? [185, 28, 28] : [21, 128, 61]);
    });

    // Boundary line
    const boundaryY = ly + 28;
    doc.setDrawColor(252, 165, 165);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.line(M + 3, boundaryY, W - M - 3, boundaryY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6); doc.setTextColor(185, 28, 28);
    doc.text('TRUST BOUNDARY — Data verlaat het systeem', M + 8, boundaryY - 1);

    // External channels
    const channels = [
      { label: 'E-mail (link only)', risk: 'Laag', color: green },
      { label: 'SecureDownload (publiek)', risk: 'Laag', color: blue },
      { label: 'PDF Download', risk: 'Medium', color: amber },
      { label: 'Supabase Export', risk: 'Medium', color: purple },
    ];
    channels.forEach((ch, i) => {
      const cx = M + 5 + i * 65;
      const cy = boundaryY + 5;
      const riskColor = ch.risk === 'Laag' ? green : amber;
      drawBlock(cx, cy, 62, 7, ch.label, [241, 245, 249], slate);
      doc.setFillColor(...riskColor);
      doc.roundedRect(cx + 45, cy + 9, 17, 5, 1, 1, 'F');
      doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
      doc.text(ch.risk, cx + 45 + 8.5, cy + 12.5, { align: 'center' });
    });

    // Page footer
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('Pagina 2/2', W - M, H - 5, { align: 'right' });
    doc.text('Confidential — Internal Use', M, H - 5);
    doc.text(`Architectuurstatus per: ${dateStr}`, W/2, H - 5, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Interdistri-TMS-Systeemarchitectuur-${dateStr}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});