// Zoekt de meest recente geldige prijsregel voor een artikel op een gegeven datum
export const getValidPriceRule = (priceRules, targetDate = new Date()) => {
  if (!priceRules || priceRules.length === 0) return null;

  const target = targetDate instanceof Date 
    ? targetDate.toISOString().split('T')[0] 
    : targetDate;

  // Filter regels die geldig zijn op de targetDate
  const validRules = priceRules.filter(rule => {
    const startOk = !rule.start_date || rule.start_date <= target;
    const endOk = !rule.end_date || rule.end_date >= target;
    return startOk && endOk;
  });

  if (validRules.length === 0) return null;

  // Return de meest recente startdatum
  return validRules.reduce((latest, current) => {
    return (!latest.start_date || current.start_date > latest.start_date) ? current : latest;
  });
};

// Parseert CSV en extraheert prijsregels (format: start_date,end_date,price,notes)
export const parseCSVPriceRules = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const rules = [];
  const errors = [];

  lines.forEach((line, index) => {
    if (!line.trim() || index === 0) return; // Skip empty lines en header

    const [start_date, end_date, price, notes] = line.split(',').map(v => v.trim());

    // Validatie
    if (!start_date) {
      errors.push(`Rij ${index + 1}: Startdatum is verplicht`);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push(`Rij ${index + 1}: Prijs moet een geldig getal zijn`);
      return;
    }

    // Datum validatie
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      errors.push(`Rij ${index + 1}: Startdatum moet YYYY-MM-DD zijn`);
      return;
    }

    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      errors.push(`Rij ${index + 1}: Einddatum moet YYYY-MM-DD zijn`);
      return;
    }

    rules.push({
      start_date,
      end_date: end_date || null,
      price: priceNum,
      notes: notes || ''
    });
  });

  return { rules, errors };
};