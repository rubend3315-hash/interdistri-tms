import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // RBAC: Governance/Admin → ADMIN only
    if (user.role !== 'admin' && !['ADMIN'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const payload = await req.json();
    const { type, from_date, to_date } = payload;

    if (!type || !from_date || !to_date) {
      return Response.json({ error: 'Missing type, from_date, or to_date' }, { status: 400 });
    }

    console.log(`Recalculation type=${type} from=${from_date} to=${to_date}`);

    if (type === 'time_entries') {
      return await recalculateTimeEntries(base44, from_date, to_date);
    } else if (type === 'salary_reports') {
      // Salary reports / weekoverzichten worden live berekend in frontend
      // Hier hoeven we alleen de time entries te herberekenen die eraan ten grondslag liggen
      return await recalculateTimeEntries(base44, from_date, to_date);
    } else if (type === 'project_prices') {
      return await recalculateProjectPrices(base44, from_date, to_date);
    } else if (type === 'article_prices') {
      return await recalculateArticlePrices(base44, from_date, to_date);
    } else {
      return Response.json({ error: `Unknown recalculation type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Recalculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function recalculateTimeEntries(base44, fromDate, toDate) {
  // Haal alle benodigde data op
  const [allEntries, holidays, employees, caoRules, breakSchedules] = await Promise.all([
    base44.asServiceRole.entities.TimeEntry.list(),
    base44.asServiceRole.entities.Holiday.list(),
    base44.asServiceRole.entities.Employee.list(),
    base44.asServiceRole.entities.CaoRule.list(),
    base44.asServiceRole.entities.BreakSchedule.list(),
  ]);

  const holidayDates = new Set(holidays.map(h => h.date));
  const employeeMap = {};
  employees.forEach(e => { employeeMap[e.id] = e; });

  const activeBreakSchedules = breakSchedules.filter(s => s.status === 'Actief');

  // Filter entries in datumbereik die al afgesloten/goedgekeurd zijn
  const entries = allEntries.filter(e => {
    if (!e.date) return false;
    return e.date >= fromDate && e.date <= toDate;
  });

  console.log(`Found ${entries.length} time entries in range`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const entry of entries) {
    try {
      if (!entry.start_time || !entry.end_time) continue;

      const employee = employeeMap[entry.employee_id];
      if (!employee) continue;

      // Bereken totale uren
      const [startH, startM] = entry.start_time.split(':').map(Number);
      const [endH, endM] = entry.end_time.split(':').map(Number);
      let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (totalMinutes < 0) totalMinutes += 24 * 60;

      // Herbereken pauze op basis van break schedule
      let breakMinutes = entry.break_minutes || 0;
      const rawHours = totalMinutes / 60;
      const applicableBreak = activeBreakSchedules.find(schedule => {
        return rawHours >= schedule.min_hours && 
          (schedule.max_hours === null || schedule.max_hours === undefined || rawHours <= schedule.max_hours);
      });
      if (applicableBreak) {
        breakMinutes = applicableBreak.break_minutes;
      }

      totalMinutes -= breakMinutes;
      const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

      // Nachturen (22:00-06:00)
      const nightHours = calculateNightHours(entry.start_time, entry.end_time);

      // Weekend uren
      const d = new Date(entry.date);
      const dayOfWeek = d.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
      const st = (entry.shift_type || '').toLowerCase();
      const isLeave = st.includes('verlof') || st.includes('ziek') || st === 'vrij';
      const weekendHours = (isWeekendDay && !isLeave) ? totalHours : 0;

      // Feestdag uren
      const isHoliday = holidayDates.has(entry.date);
      const holidayHours = (isHoliday && !isLeave) ? totalHours : 0;

      // Overuren (boven 9 uur per dag)
      const overtimeHours = Math.max(0, Math.round((totalHours - 9) * 100) / 100);

      // Verblijfskosten herberekenen
      const verblijfRules = caoRules.filter(r => 
        r.status === 'Actief' && 
        r.category === 'Verblijfkosten'
      );
      const subsistence = calculateSubsistence(
        entry.departure_time || entry.start_time,
        entry.expected_return_time || entry.end_time,
        entry.date,
        verblijfRules
      );

      // Reiskosten multiplier herberekenen
      let travelMultiplier = entry.travel_allowance_multiplier || 0;

      const updates = {
        total_hours: totalHours,
        night_hours: nightHours,
        weekend_hours: weekendHours,
        holiday_hours: holidayHours,
        overtime_hours: overtimeHours,
        break_minutes: breakMinutes,
        subsistence_allowance: subsistence,
      };

      // Check of er iets gewijzigd is
      const hasChanges = Object.keys(updates).some(key => {
        const oldVal = Math.round((entry[key] || 0) * 100) / 100;
        const newVal = Math.round((updates[key] || 0) * 100) / 100;
        return oldVal !== newVal;
      });

      if (hasChanges) {
        await base44.asServiceRole.entities.TimeEntry.update(entry.id, updates);
        updatedCount++;
      }
    } catch (err) {
      console.error(`Error processing entry ${entry.id}:`, err.message);
      errorCount++;
    }
  }

  return Response.json({
    success: true,
    type: 'time_entries',
    total: entries.length,
    updated: updatedCount,
    errors: errorCount,
    message: `${updatedCount} van ${entries.length} tijdregistraties herberekend${errorCount > 0 ? `, ${errorCount} fouten` : ''}`
  });
}

function calculateNightHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const nightStart = 22 * 60;
  const nightEnd = 6 * 60;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  let nightMinutes = 0;

  if (endMinutes < startMinutes) {
    // Nachtdienst (over middernacht)
    if (startMinutes < nightStart) {
      nightMinutes += (24 * 60 - nightStart);
    } else {
      nightMinutes += 24 * 60 - startMinutes;
    }
    if (endMinutes > nightEnd) {
      nightMinutes += nightEnd;
    } else {
      nightMinutes += endMinutes;
    }
  } else {
    if (startMinutes < nightEnd) {
      nightMinutes += Math.min(endMinutes, nightEnd) - startMinutes;
    }
    if (endMinutes > nightStart) {
      nightMinutes += endMinutes - Math.max(startMinutes, nightStart);
    }
  }

  return Math.round(Math.max(0, nightMinutes) / 60 * 100) / 100;
}

function calculateSubsistence(departureTime, arrivalTime, tripDate, caoRules) {
  if (!departureTime || !arrivalTime) return 0;
  if (!caoRules || caoRules.length === 0) return 0;

  const [depH, depM] = departureTime.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  let totalMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const tripHours = totalMinutes / 60;
  if (tripHours <= 4) return 0;

  const applicableRules = caoRules.filter(rule => {
    if (!rule || rule.status !== 'Actief') return false;
    if (rule.start_date && tripDate < rule.start_date) return false;
    if (rule.end_date && tripDate > rule.end_date) return false;
    const nameLower = (rule.name || '').toLowerCase();
    const isVerblijf = nameLower.includes('verblijfskosten') || nameLower.includes('verblijfkosten');
    const isMeerdaags = nameLower.includes('meerdaags');
    const isEendaags = (nameLower.includes('ndaagse') || nameLower.includes('eendaagse')) && !isMeerdaags;
    return isVerblijf && isEendaags;
  });

  if (applicableRules.length === 0) return 0;

  const depMinutes = depH * 60 + depM;
  const departsBefore14 = depMinutes < 14 * 60;
  let totalAllowance = 0;

  if (departsBefore14) {
    const basisRule = applicableRules.find(r => !r.start_time && !r.end_time);
    if (basisRule) {
      totalAllowance = tripHours * (basisRule.value || 0);
    }
  }

  if (tripHours >= 12) {
    const toeslagRule = applicableRules.find(r => {
      const nameLower = (r.name || '').toLowerCase();
      const descLower = (r.description || '').toLowerCase();
      return (nameLower.includes('toeslag') || descLower.includes('toeslag')) &&
        (descLower.includes('12 uur') || descLower.includes('12uur'));
    });
    if (toeslagRule) {
      totalAllowance += toeslagRule.value || toeslagRule.fixed_amount || 0;
    }
  }

  return Math.round(totalAllowance * 100) / 100;
}

async function recalculateProjectPrices(base44, fromDate, toDate) {
  // Haal rapportage ritten op die binnen het datumbereik vallen
  const allRits = await base44.asServiceRole.entities.RapportageRit.list();
  
  const rits = allRits.filter(r => {
    if (!r.datum) return false;
    // Normaliseer datum formaat
    let datum = r.datum;
    if (datum.includes('-') && datum.length === 10) {
      // Kan DD-MM-YYYY of YYYY-MM-DD zijn
      if (/^\d{2}-\d{2}-\d{4}$/.test(datum)) {
        const [dd, mm, yyyy] = datum.split('-');
        datum = `${yyyy}-${mm}-${dd}`;
      }
    }
    return datum >= fromDate && datum <= toDate;
  });

  console.log(`Found ${rits.length} rapportage ritten in range`);

  // Haal projecten en artikelen op
  const [projects, articles] = await Promise.all([
    base44.asServiceRole.entities.Project.list(),
    base44.asServiceRole.entities.Article.list(),
  ]);

  // Maak lookup maps
  const projectMap = {};
  projects.forEach(p => { projectMap[p.id] = p; });

  let updatedCount = 0;
  let errorCount = 0;

  // Voor elke rit: update project_naam als die gewijzigd is
  for (const rit of rits) {
    try {
      const project = projectMap[rit.project_id];
      if (!project) continue;

      const updates = {};
      if (project.name && project.name !== rit.project_naam) {
        updates.project_naam = project.name;
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.RapportageRit.update(rit.id, updates);
        updatedCount++;
      }
    } catch (err) {
      console.error(`Error processing rit ${rit.id}:`, err.message);
      errorCount++;
    }
  }

  return Response.json({
    success: true,
    type: 'project_prices',
    total: rits.length,
    updated: updatedCount,
    errors: errorCount,
    message: `${updatedCount} van ${rits.length} projectregistraties herberekend${errorCount > 0 ? `, ${errorCount} fouten` : ''}`
  });
}

async function recalculateArticlePrices(base44, fromDate, toDate) {
  // Haal rapportage ritten op met artikelen
  const allRits = await base44.asServiceRole.entities.RapportageRit.list();
  const [articles] = await Promise.all([
    base44.asServiceRole.entities.Article.list(),
  ]);

  const articleMap = {};
  articles.forEach(a => { articleMap[a.id] = a; });

  // Filter ritten in datumbereik
  const rits = allRits.filter(r => {
    if (!r.datum) return false;
    let datum = r.datum;
    if (/^\d{2}-\d{2}-\d{4}$/.test(datum)) {
      const [dd, mm, yyyy] = datum.split('-');
      datum = `${yyyy}-${mm}-${dd}`;
    }
    return datum >= fromDate && datum <= toDate;
  });

  console.log(`Found ${rits.length} ritten for article price recalculation`);

  let updatedCount = 0;
  let errorCount = 0;

  // Artikelen met charges herberekenen
  for (const rit of rits) {
    try {
      if (!rit.artikelen || rit.artikelen.length === 0) continue;

      // Check of er artikelen bijgewerkt moeten worden
      // De artikelprijzen zijn opgeslagen als referentie, herberekening update
      // de waarden op basis van huidige artikelprijzen
      let hasChanges = false;
      const updatedArtikelen = rit.artikelen.map(artItem => {
        // Zoek het artikel in de database
        const article = Object.values(articleMap).find(a => 
          a.description === artItem.kolom || a.article_number === artItem.kolom
        );
        if (!article || !article.price_rules) return artItem;

        // Zoek de geldige prijsregel voor de rit-datum
        let ritDatum = rit.datum;
        if (/^\d{2}-\d{2}-\d{4}$/.test(ritDatum)) {
          const [dd, mm, yyyy] = ritDatum.split('-');
          ritDatum = `${yyyy}-${mm}-${dd}`;
        }

        const validRules = article.price_rules.filter(rule => {
          const startOk = !rule.start_date || rule.start_date <= ritDatum;
          const endOk = !rule.end_date || rule.end_date >= ritDatum;
          return startOk && endOk;
        });

        if (validRules.length === 0) return artItem;

        const bestRule = validRules.reduce((latest, current) => {
          return (!latest.start_date || current.start_date > latest.start_date) ? current : latest;
        });

        // Vergelijk of de prijs gewijzigd is
        const currentPrice = parseFloat(artItem.waarde) || 0;
        if (currentPrice !== bestRule.price) {
          hasChanges = true;
          return { ...artItem, waarde: String(bestRule.price) };
        }
        return artItem;
      });

      if (hasChanges) {
        await base44.asServiceRole.entities.RapportageRit.update(rit.id, {
          artikelen: updatedArtikelen
        });
        updatedCount++;
      }
    } catch (err) {
      console.error(`Error processing rit ${rit.id} articles:`, err.message);
      errorCount++;
    }
  }

  return Response.json({
    success: true,
    type: 'article_prices',
    total: rits.length,
    updated: updatedCount,
    errors: errorCount,
    message: `${updatedCount} van ${rits.length} artikelprijzen herberekend${errorCount > 0 ? `, ${errorCount} fouten` : ''}`
  });
}