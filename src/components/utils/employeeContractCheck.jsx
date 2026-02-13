/**
 * Check if an employee has an active contract rule for a given date.
 * Returns { hasActiveContract, hasActiveReiskosten, warnings }
 */
export function checkEmployeeActiveRules(employee, date) {
  const result = {
    hasActiveContract: false,
    hasActiveReiskosten: false,
    warnings: []
  };

  if (!employee) {
    result.warnings.push("Medewerker niet gevonden.");
    return result;
  }

  if (employee.status === 'Uit dienst' || employee.status === 'Inactief') {
    result.warnings.push(`Medewerker ${[employee.first_name, employee.prefix, employee.last_name].filter(Boolean).join(' ')} is ${employee.status.toLowerCase()}.`);
    return result;
  }

  const checkDate = date || new Date().toISOString().split('T')[0];

  // Check contractregels
  if (employee.contractregels && employee.contractregels.length > 0) {
    const activeContract = employee.contractregels.find(cr => {
      const start = cr.startdatum;
      const end = cr.einddatum;
      if (!start) return false;
      if (start > checkDate) return false;
      if (end && end < checkDate) return false;
      if (cr.status === 'Beëindigd') return false;
      return true;
    });
    result.hasActiveContract = !!activeContract;
  }

  if (!result.hasActiveContract) {
    result.warnings.push("Geen actieve contractregel voor deze datum. Diensten/ritten kunnen niet worden ingevoerd.");
  }

  // Check reiskostenregels
  if (employee.reiskostenregels && employee.reiskostenregels.length > 0) {
    const activeReiskosten = employee.reiskostenregels.find(rr => {
      const start = rr.startdatum;
      const end = rr.einddatum;
      if (!start) return false;
      if (start > checkDate) return false;
      if (end && end < checkDate) return false;
      if (rr.status === 'Beëindigd') return false;
      return true;
    });
    result.hasActiveReiskosten = !!activeReiskosten;
  }

  if (!result.hasActiveReiskosten) {
    result.warnings.push("Geen actieve reiskostenregel voor deze datum.");
  }

  return result;
}