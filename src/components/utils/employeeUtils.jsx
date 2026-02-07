/**
 * Geeft de volledige naam van een medewerker terug, inclusief tussenvoegsel.
 * Formaat: "Voornaam [tussenvoegsel] Achternaam"
 */
export function getFullName(employee) {
  if (!employee) return '';
  const parts = [employee.first_name];
  if (employee.prefix) parts.push(employee.prefix);
  parts.push(employee.last_name);
  return parts.filter(Boolean).join(' ');
}

/**
 * Geeft achternaam + voorletters terug (voor rapporten).
 * Formaat: "[tussenvoegsel] Achternaam, Voorletters"
 * bijv. "van Tour, R.A."
 */
export function getDisplayName(employee) {
  if (!employee) return '';
  const lastPart = employee.prefix 
    ? `${employee.prefix} ${employee.last_name}` 
    : employee.last_name;
  if (employee.initials) {
    return `${lastPart}, ${employee.initials}`;
  }
  return lastPart || '';
}