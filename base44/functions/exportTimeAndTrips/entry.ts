import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: ADMIN, FINANCE
    if (user.role !== 'admin' && !['ADMIN', 'FINANCE'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) {
      return Response.json({ error: 'start_date en end_date zijn verplicht' }, { status: 400 });
    }

    // Paginated fetch helper — SDK bug workaround
    async function paginatedFilter(entity, query, sortField) {
      const all = [];
      let skip = 0;
      const PAGE = 20;
      while (true) {
        const page = await entity.filter(query, sortField || '-created_date', PAGE, skip);
        if (!Array.isArray(page) || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return all;
    }

    // Fetch all data
    const [employees, timeEntries, trips, vehicles, customers] = await Promise.all([
      paginatedFilter(base44.asServiceRole.entities.Employee, {}),
      paginatedFilter(base44.asServiceRole.entities.TimeEntry, {}),
      paginatedFilter(base44.asServiceRole.entities.Trip, {}),
      paginatedFilter(base44.asServiceRole.entities.Vehicle, {}),
      paginatedFilter(base44.asServiceRole.entities.Customer, {}),
    ]);

    const employeeMap = {};
    for (const emp of employees) {
      employeeMap[emp.id] = emp;
    }
    const vehicleMap = {};
    for (const v of vehicles) {
      vehicleMap[v.id] = v;
    }
    const customerMap = {};
    for (const c of customers) {
      customerMap[c.id] = c;
    }

    const getEmployeeLabel = (emp) => {
      if (!emp) return '';
      const num = emp.employee_number || '';
      const name = [emp.first_name, emp.prefix, emp.last_name].filter(Boolean).join(' ');
      return num ? `(${num}) ${name}` : name;
    };

    // Dutch day/date formatting
    const dutchDays = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    const dutchMonths = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    const formatDutchDateTime = (dateStr, timeStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = dutchDays[d.getDay()];
      const day = d.getDate();
      const month = dutchMonths[d.getMonth()];
      const year = d.getFullYear();
      const time = timeStr || '';
      return `${dayName} ${day} ${month} ${year}${time ? ' ' + time : ''}`;
    };

    const formatDutchDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = dutchDays[d.getDay()];
      const day = d.getDate();
      const month = dutchMonths[d.getMonth()];
      const year = d.getFullYear();
      return `${dayName} ${day} ${month} ${year}`;
    };

    // Filter time entries by date range
    const filteredEntries = timeEntries.filter(te => {
      return te.date >= start_date && te.date <= end_date;
    });

    // Filter trips by date range
    const filteredTrips = trips.filter(t => {
      return t.date >= start_date && t.date <= end_date;
    });

    // Build Tijdregistratie rows
    const timeRows = [];
    for (const entry of filteredEntries) {
      const emp = employeeMap[entry.employee_id];
      const empLabel = getEmployeeLabel(emp);
      const shiftType = entry.shift_type || 'gewerkte dag';

      const startDateTime = formatDutchDateTime(entry.date, entry.start_time);
      const endDateTime = formatDutchDateTime(entry.end_date || entry.date, entry.end_time);

      timeRows.push({
        'Medewerker': empLabel,
        'Start registratie': startDateTime,
        'Einde registratie': endDateTime,
        'Uursoort': shiftType,
        'Uren': entry.total_hours || 0,
      });
    }

    // Sort by employee label, then date
    timeRows.sort((a, b) => {
      if (a['Medewerker'] !== b['Medewerker']) return a['Medewerker'].localeCompare(b['Medewerker']);
      return a['Start registratie'].localeCompare(b['Start registratie']);
    });

    // Build Ritten rows
    const tripRows = [];
    for (const trip of filteredTrips) {
      const emp = employeeMap[trip.employee_id];
      const empLabel = getEmployeeLabel(emp);
      const vehicle = vehicleMap[trip.vehicle_id];
      const customer = customerMap[trip.customer_id];

      tripRows.push({
        'Medewerker': empLabel,
        'Voertuig': vehicle ? vehicle.license_plate : '',
        'Datum': formatDutchDate(trip.date),
        'Route naam': trip.route_name || '',
        'Klant': customer ? customer.company_name : '',
        'geplande stops': trip.planned_stops || '',
        'Begin km-stand': trip.start_km || '',
        'Eind km-stand': trip.end_km || '',
        'Vertrektijd': trip.departure_time || '',
        'Aankomsttijd': trip.arrival_time || '',
        'Getankte liters': trip.fuel_liters || '',
        'Opmerkingen': trip.notes || '',
      });
    }

    tripRows.sort((a, b) => {
      if (a['Medewerker'] !== b['Medewerker']) return a['Medewerker'].localeCompare(b['Medewerker']);
      return a['Datum'].localeCompare(b['Datum']);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    const wsTime = XLSX.utils.json_to_sheet(timeRows.length > 0 ? timeRows : [{ 'Medewerker': '', 'Start registratie': '', 'Einde registratie': '', 'Uursoort': '', 'Uren': '' }]);
    wsTime['!cols'] = [
      { wch: 30 },
      { wch: 40 },
      { wch: 40 },
      { wch: 20 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTime, 'Tijdregistratie');

    const wsTrips = XLSX.utils.json_to_sheet(tripRows.length > 0 ? tripRows : [{ 'Medewerker': '', 'Voertuig': '', 'Datum': '', 'Route naam': '', 'Klant': '', 'geplande stops': '', 'Begin km-stand': '', 'Eind km-stand': '', 'Vertrektijd': '', 'Aankomsttijd': '', 'Getankte liters': '', 'Opmerkingen': '' }]);
    wsTrips['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTrips, 'Ritten');

    // Write as base64 to avoid binary corruption
    const xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return Response.json({ 
      file_base64: xlsxBase64,
      filename: `ExportInterdistriTMS_${start_date}_${end_date}.xlsx`
    });
  } catch (error) {
    console.error('Export error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});