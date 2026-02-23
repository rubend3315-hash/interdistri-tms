import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

/**
 * Shared data-fetching logic: builds the Azure-ready JSON structure.
 * Used by this function for PDF rendering and also duplicated in
 * buildDailyPayrollReportData for direct JSON access.
 */
async function buildReportData(base44, date) {
  const [employees, allTimeEntries, trips, standplaatsWerk, customers] = await Promise.all([
    base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
    base44.asServiceRole.entities.TimeEntry.filter({ date }),
    base44.asServiceRole.entities.Trip.filter({ date }),
    base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
    base44.asServiceRole.entities.Customer.filter({}),
  ]);

  // Only include approved time entries
  const timeEntries = allTimeEntries.filter(te => te.status === 'Goedgekeurd');

  const customerMap = {};
  for (const c of customers) customerMap[c.id] = c.company_name || '';

  employees.sort((a, b) => {
    const numA = a.employee_number || '';
    const numB = b.employee_number || '';
    return numA.localeCompare(numB, 'nl', { numeric: true });
  });

  const employeesWithData = [];

  for (const emp of employees) {
    const empTimeEntries = timeEntries.filter(t => t.employee_id === emp.id);
    const empTrips = trips.filter(t => t.employee_id === emp.id);
    const empStandplaats = standplaatsWerk.filter(s => s.employee_id === emp.id);

    if (empTimeEntries.length === 0 && empTrips.length === 0 && empStandplaats.length === 0) continue;

    const empName = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');

    const enrichedTrips = empTrips.map(trip => ({
      ...trip,
      customer_name: customerMap[trip.customer_id] || '-',
    }));

    employeesWithData.push({
      employeeNumber: emp.employee_number || '-',
      employeeId: emp.id,
      name: empName,
      department: emp.department || '-',
      timeEntries: empTimeEntries,
      trips: enrichedTrips,
      standplaatsWerk: empStandplaats,
    });
  }

  return {
    reportDate: date,
    generatedAt: new Date().toISOString(),
    employees: employeesWithData,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin' && !['ADMIN', 'HR_ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: alleen admin en hr_admin' }, { status: 403 });
    }

    const { date } = await req.json();
    if (!date) return Response.json({ error: 'date is verplicht (YYYY-MM-DD)' }, { status: 400 });

    // Build report data
    const reportData = await buildReportData(base44, date);
    const { employees: employeesWithData, reportDate } = reportData;

    // Format date for display
    const [yyyy, mm, dd] = reportDate.split('-');
    const displayDate = `${dd}-${mm}-${yyyy}`;

    // =============================================
    // LANDSCAPE A4 PDF — Professional table layout
    // =============================================
    const PAGE_WIDTH = 297;   // landscape A4
    const PAGE_HEIGHT = 210;
    const ML = 15;            // margin left
    const MR = 15;            // margin right
    const CONTENT_W = PAGE_WIDTH - ML - MR;
    const MARGIN_TOP = 30;
    const MARGIN_BOTTOM = 22;
    const ROW_H = 5;          // table row height
    const HDR_H = 6;          // header row height
    const SECTION_GAP = 6;

    // Helpers
    const fmt = (v) => v != null ? String(v) : '-';
    const fmtNum = (v, suffix) => v != null && v !== 0 ? `${v}${suffix || ''}` : '-';
    const fmtEur = (v) => v != null && v !== 0 ? `€${v.toFixed(2)}` : '-';
    const rText = (text, x, y) => doc.text(text, x, y, { align: 'right' });

    // ---- Column definitions ----
    // Tijdregistratie columns (x offsets from ML)
    const TE_COLS = [
      { label: 'Start',     x: 0,   w: 16 },
      { label: 'Eind',      x: 16,  w: 16 },
      { label: 'Pauze',     x: 32,  w: 14,  right: true },
      { label: 'Uren',      x: 46,  w: 14,  right: true },
      { label: 'Overuren',  x: 60,  w: 16,  right: true },
      { label: 'Nacht',     x: 76,  w: 14,  right: true },
      { label: 'Weekend',   x: 90,  w: 16,  right: true },
      { label: 'Feestdag',  x: 106, w: 16,  right: true },
      { label: 'Dienst',    x: 122, w: 22 },
      { label: 'Verblijf',  x: 144, w: 18,  right: true },
      { label: 'Voorschot', x: 162, w: 18,  right: true },
      { label: 'Inhoud.',   x: 180, w: 16,  right: true },
      { label: 'WKR',       x: 196, w: 14,  right: true },
      { label: 'Reiskosten', x: 210, w: 16, right: true },
      { label: 'Status',    x: 226, w: 20 },
    ];
    const TE_TABLE_W = 246;

    // Ritten columns
    const TR_COLS = [
      { label: 'Vertrek',   x: 0,   w: 16 },
      { label: 'Aankomst',  x: 16,  w: 16 },
      { label: 'Route',     x: 32,  w: 30 },
      { label: 'Klant',     x: 62,  w: 40 },
      { label: 'Start km',  x: 102, w: 20,  right: true },
      { label: 'Eind km',   x: 122, w: 20,  right: true },
      { label: 'Totaal km', x: 142, w: 20,  right: true },
      { label: 'Brandstof', x: 162, w: 18,  right: true },
      { label: 'Stops',     x: 180, w: 14,  right: true },
    ];
    const TR_TABLE_W = 194;

    // Standplaatswerk columns
    const SW_COLS = [
      { label: 'Start',  x: 0,   w: 16 },
      { label: 'Eind',   x: 16,  w: 16 },
      { label: 'Notities', x: 32, w: 100 },
    ];
    const SW_TABLE_W = 132;

    // ---- Estimate section height for page-break protection ----
    function estimateSectionHeight(emp) {
      let h = 14; // employee header block (nr + naam + afdeling)
      if (emp.timeEntries.length > 0) {
        h += 4 + HDR_H + emp.timeEntries.length * ROW_H + 2; // label + header + rows + gap
        h += ROW_H; // totals row
      }
      if (emp.trips.length > 0) {
        h += 4 + HDR_H + emp.trips.length * ROW_H + 2;
      }
      if (emp.standplaatsWerk.length > 0) {
        h += 4 + HDR_H + emp.standplaatsWerk.length * ROW_H + 2;
      }
      h += 8; // totals summary block
      h += SECTION_GAP;
      return h;
    }

    // Build sections
    const sections = employeesWithData.map(emp => ({
      ...emp,
      estimatedHeight: estimateSectionHeight(emp),
    }));

    // Phase 1: count pages
    let totalPages = 1;
    let calcY = MARGIN_TOP;
    for (const s of sections) {
      if (calcY + s.estimatedHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
        totalPages++;
        calcY = MARGIN_TOP;
      }
      calcY += s.estimatedHeight;
    }

    // Phase 2: render
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let currentPage = 1;
    let currentY = MARGIN_TOP;

    const renderHeader = () => {
      // Title bar
      doc.setFillColor(30, 58, 138); // dark blue
      doc.rect(0, 0, PAGE_WIDTH, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('DAGRAPPORT LOONADMINISTRATIE', ML, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Datum: ${displayDate}`, PAGE_WIDTH - MR, 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      // Thin line below
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.5);
      doc.line(ML, 20, PAGE_WIDTH - MR, 20);
    };

    const renderFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Pagina ${currentPage} / ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' });
      doc.text(`Gegenereerd: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`, PAGE_WIDTH - MR, PAGE_HEIGHT - 8, { align: 'right' });
      doc.text('Interdistri TMS — Vertrouwelijk', ML, PAGE_HEIGHT - 8);
      doc.setTextColor(0, 0, 0);
    };

    const addNewPage = () => {
      renderFooter();
      doc.addPage();
      currentPage++;
      currentY = MARGIN_TOP;
      renderHeader();
    };

    // Draw table header row with light background
    const drawTableHeader = (cols, baseX) => {
      doc.setFillColor(235, 238, 245);
      doc.rect(baseX, currentY - 4, cols[cols.length - 1].x + cols[cols.length - 1].w, HDR_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(50, 50, 80);
      for (const col of cols) {
        if (col.right) {
          rText(col.label, baseX + col.x + col.w - 1, currentY);
        } else {
          doc.text(col.label, baseX + col.x + 1, currentY);
        }
      }
      doc.setTextColor(0, 0, 0);
      currentY += HDR_H - 2;
    };

    // Draw a data row
    const drawRow = (cols, baseX, values) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const val = values[i] || '-';
        if (col.right) {
          rText(val, baseX + col.x + col.w - 1, currentY);
        } else {
          doc.text(val, baseX + col.x + 1, currentY);
        }
      }
      currentY += ROW_H;
    };

    // Draw a totals row (bold, with light line above)
    const drawTotalsRow = (cols, baseX, values) => {
      doc.setDrawColor(160, 160, 180);
      doc.setLineWidth(0.2);
      doc.line(baseX, currentY - 3, baseX + cols[cols.length - 1].x + cols[cols.length - 1].w, currentY - 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const val = values[i] || '';
        if (col.right) {
          rText(val, baseX + col.x + col.w - 1, currentY);
        } else {
          doc.text(val, baseX + col.x + 1, currentY);
        }
      }
      currentY += ROW_H;
    };

    renderHeader();

    for (const section of sections) {
      // Page-break protection: never split employee block
      if (currentY + section.estimatedHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
        addNewPage();
      }

      // ---- Employee header ----
      doc.setFillColor(245, 247, 250);
      doc.rect(ML, currentY - 4, CONTENT_W, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${section.employeeNumber}`, ML + 2, currentY);
      doc.text(`${section.name}`, ML + 22, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Afdeling: ${section.department}`, ML + 120, currentY);
      currentY += 10;

      // ---- Tijdregistratie ----
      if (section.timeEntries.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text('TIJDREGISTRATIE', ML, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 4;

        drawTableHeader(TE_COLS, ML);

        for (const te of section.timeEntries) {
          drawRow(TE_COLS, ML, [
            fmt(te.start_time),
            fmt(te.end_time),
            fmtNum(te.break_minutes, 'm'),
            fmtNum(te.total_hours, 'u'),
            fmtNum(te.overtime_hours, 'u'),
            fmtNum(te.night_hours, 'u'),
            fmtNum(te.weekend_hours, 'u'),
            fmtNum(te.holiday_hours, 'u'),
            fmt(te.shift_type),
            fmtEur(te.subsistence_allowance),
            fmtEur(te.advanced_costs),
            fmtEur(te.meals),
            fmtEur(te.wkr),
            fmtNum(te.travel_allowance_multiplier, 'x'),
            fmt(te.status),
          ]);
        }

        // Totals row for time entries
        const teSum = (fn) => section.timeEntries.reduce((s, te) => s + (te[fn] || 0), 0);
        drawTotalsRow(TE_COLS, ML, [
          '', 'Totaal:',
          fmtNum(teSum('break_minutes'), 'm'),
          fmtNum(teSum('total_hours'), 'u'),
          fmtNum(teSum('overtime_hours'), 'u'),
          fmtNum(teSum('night_hours'), 'u'),
          fmtNum(teSum('weekend_hours'), 'u'),
          fmtNum(teSum('holiday_hours'), 'u'),
          '',
          fmtEur(teSum('subsistence_allowance')),
          fmtEur(teSum('advanced_costs')),
          fmtEur(teSum('meals')),
          fmtEur(teSum('wkr')),
          '', '',
        ]);
        currentY += 2;
      }

      // ---- Ritten ----
      if (section.trips.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text('RITTEN', ML, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 4;

        drawTableHeader(TR_COLS, ML);

        for (const trip of section.trips) {
          drawRow(TR_COLS, ML, [
            fmt(trip.departure_time),
            fmt(trip.arrival_time),
            fmt(trip.route_name),
            fmt(trip.customer_name),
            fmtNum(trip.start_km),
            fmtNum(trip.end_km),
            fmtNum(trip.total_km, ' km'),
            fmtNum(trip.fuel_liters, ' L'),
            fmtNum(trip.planned_stops),
          ]);
        }

        // Totals row for trips
        const trTotalKm = section.trips.reduce((s, t) => s + (t.total_km || 0), 0);
        const trTotalFuel = section.trips.reduce((s, t) => s + (t.fuel_liters || 0), 0);
        drawTotalsRow(TR_COLS, ML, [
          '', '', '', 'Totaal:',
          '', '',
          fmtNum(trTotalKm, ' km'),
          trTotalFuel ? fmtNum(trTotalFuel, ' L') : '',
          '',
        ]);
        currentY += 2;
      }

      // ---- Standplaatswerk ----
      if (section.standplaatsWerk.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text('STANDPLAATSWERK', ML, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 4;

        drawTableHeader(SW_COLS, ML);

        for (const sw of section.standplaatsWerk) {
          drawRow(SW_COLS, ML, [
            fmt(sw.start_time),
            fmt(sw.end_time),
            fmt(sw.notes),
          ]);
        }
        currentY += 2;
      }

      // ---- Medewerker financieel totaal ----
      const teTotal = (fn) => section.timeEntries.reduce((s, te) => s + (te[fn] || 0), 0);
      const totalHours = teTotal('total_hours');
      const totalOvertime = teTotal('overtime_hours');
      const totalNight = teTotal('night_hours');
      const totalWeekend = teTotal('weekend_hours');
      const totalHoliday = teTotal('holiday_hours');
      const totalSubsistence = teTotal('subsistence_allowance');
      const totalAdvanced = teTotal('advanced_costs');
      const totalMeals = teTotal('meals');
      const totalWkr = teTotal('wkr');
      const totalTripKm = section.trips.reduce((s, t) => s + (t.total_km || 0), 0);

      const summaryParts = [];
      if (totalHours) summaryParts.push(`Uren: ${totalHours}u`);
      if (totalOvertime) summaryParts.push(`Overuren: ${totalOvertime}u`);
      if (totalNight) summaryParts.push(`Nacht: ${totalNight}u`);
      if (totalWeekend) summaryParts.push(`Weekend: ${totalWeekend}u`);
      if (totalHoliday) summaryParts.push(`Feestdag: ${totalHoliday}u`);
      if (totalTripKm) summaryParts.push(`Km: ${totalTripKm}`);
      if (totalSubsistence) summaryParts.push(`Verblijf: €${totalSubsistence.toFixed(2)}`);
      if (totalAdvanced) summaryParts.push(`Voorschot: €${totalAdvanced.toFixed(2)}`);
      if (totalMeals) summaryParts.push(`Inhoud.: €${totalMeals.toFixed(2)}`);
      if (totalWkr) summaryParts.push(`WKR: €${totalWkr.toFixed(2)}`);

      if (summaryParts.length > 0) {
        doc.setFillColor(240, 245, 255);
        doc.rect(ML, currentY - 3.5, CONTENT_W, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 58, 138);
        doc.text(`TOTAAL ${section.name}:  ${summaryParts.join('   |   ')}`, ML + 2, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 5;
      }

      // Separator line
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.3);
      doc.line(ML, currentY, PAGE_WIDTH - MR, currentY);
      currentY += SECTION_GAP;
    }

    renderFooter();

    const fileBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({
      success: true,
      fileBase64,
      fileName: `Dagrapport_Loonadministratie_${date}.pdf`,
    });
  } catch (error) {
    console.error('generateDailyPayrollReport error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});