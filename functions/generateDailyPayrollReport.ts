import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

/**
 * Shared data-fetching logic: builds the Azure-ready JSON structure.
 * Used by this function for PDF rendering and also duplicated in
 * buildDailyPayrollReportData for direct JSON access.
 */
async function buildReportData(base44, date) {
  const [employees, timeEntries, trips, standplaatsWerk, customers] = await Promise.all([
    base44.asServiceRole.entities.Employee.filter({ status: 'Actief' }),
    base44.asServiceRole.entities.TimeEntry.filter({ date }),
    base44.asServiceRole.entities.Trip.filter({ date }),
    base44.asServiceRole.entities.StandplaatsWerk.filter({ date }),
    base44.asServiceRole.entities.Customer.filter({}),
  ]);

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

    // Build sections with estimated heights for pagination
    const LINE_HEIGHT = 15;
    const SECTION_SPACING = 25;

    const sections = [];

    for (const emp of employeesWithData) {
      let lines = 0;
      lines += 3;
      lines += 1;

      if (emp.timeEntries.length > 0) {
        lines += 1;
        lines += emp.timeEntries.length;
        lines += 1;
      }
      if (emp.trips.length > 0) {
        lines += 1;
        lines += emp.trips.length;
        lines += 1;
      }
      if (emp.standplaatsWerk.length > 0) {
        lines += 1;
        lines += emp.standplaatsWerk.length;
      }

      sections.push({
        employeeNumber: emp.employeeNumber,
        employeeName: emp.name,
        department: emp.department,
        timeEntries: emp.timeEntries,
        trips: emp.trips,
        standplaatsWerk: emp.standplaatsWerk,
        estimatedHeight: lines * LINE_HEIGHT + SECTION_SPACING,
      });
    }

    // PDF constants
    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;
    const MARGIN_TOP = 60;
    const MARGIN_BOTTOM = 60;
    const MARGIN_LEFT = 20;

    // Phase 1: Calculate total pages
    let totalPages = 1;
    let calcY = MARGIN_TOP;
    for (const section of sections) {
      if (calcY + section.estimatedHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
        totalPages++;
        calcY = MARGIN_TOP;
      }
      calcY += section.estimatedHeight;
    }

    // Phase 2: Render PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentPage = 1;
    let currentY = MARGIN_TOP;

    const renderHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('DAGRAPPORT LOONADMINISTRATIE', PAGE_WIDTH / 2, 25, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Datum: ${displayDate}`, PAGE_WIDTH / 2, 35, { align: 'center' });
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, 42, PAGE_WIDTH - MARGIN_LEFT, 42);
    };

    const renderFooter = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Pagina ${currentPage} van ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 20, { align: 'center' });
      doc.text(`Gegenereerd: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    const addNewPage = () => {
      renderFooter();
      doc.addPage();
      currentPage++;
      currentY = MARGIN_TOP;
      renderHeader();
    };

    renderHeader();

    for (const section of sections) {
      if (currentY + section.estimatedHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
        addNewPage();
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Personeelsnummer: ${section.employeeNumber}`, MARGIN_LEFT, currentY);
      currentY += LINE_HEIGHT * 0.7;
      doc.text(`Naam: ${section.employeeName}`, MARGIN_LEFT, currentY);
      currentY += LINE_HEIGHT * 0.7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Afdeling: ${section.department}`, MARGIN_LEFT, currentY);
      currentY += LINE_HEIGHT;

      if (section.timeEntries.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text('--- Tijdregistratie ---', MARGIN_LEFT, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += LINE_HEIGHT * 0.7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        for (const te of section.timeEntries) {
          const start = te.start_time || '-';
          const end = te.end_time || '-';
          const hours = te.total_hours != null ? `${te.total_hours}u` : '-';
          const shift = te.shift_type || '';
          doc.text(`${start} – ${end}  |  ${hours}  |  ${shift}`, MARGIN_LEFT + 4, currentY);
          currentY += LINE_HEIGHT * 0.65;
        }
        currentY += LINE_HEIGHT * 0.35;
      }

      if (section.trips.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text('--- Ritten ---', MARGIN_LEFT, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += LINE_HEIGHT * 0.7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        for (const trip of section.trips) {
          const dep = trip.departure_time || '-';
          const arr = trip.arrival_time || '-';
          const km = trip.total_km != null ? `${trip.total_km} km` : '-';
          const cust = trip.customer_name || '-';
          doc.text(`${dep} – ${arr}  |  ${km}  |  ${cust}`, MARGIN_LEFT + 4, currentY);
          currentY += LINE_HEIGHT * 0.65;
        }
        currentY += LINE_HEIGHT * 0.35;
      }

      if (section.standplaatsWerk.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text('--- Standplaatswerk ---', MARGIN_LEFT, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += LINE_HEIGHT * 0.7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        for (const sw of section.standplaatsWerk) {
          const start = sw.start_time || '-';
          const end = sw.end_time || '-';
          const notes = sw.notes || '-';
          doc.text(`${start} – ${end}  |  ${notes}`, MARGIN_LEFT + 4, currentY);
          currentY += LINE_HEIGHT * 0.65;
        }
        currentY += LINE_HEIGHT * 0.35;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_LEFT, currentY);
      currentY += SECTION_SPACING * 0.4;
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