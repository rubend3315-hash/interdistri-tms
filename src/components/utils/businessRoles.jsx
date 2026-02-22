/**
 * Enterprise RBAC - Business Role Definitions
 * 
 * Dit is de centrale bron voor alle business role logica in de frontend.
 * Backend enforcement via requireBusinessRole in backend functions.
 */

export const BUSINESS_ROLES = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  FINANCE: 'FINANCE',
  SUPERVISOR: 'SUPERVISOR',
  EMPLOYEE: 'EMPLOYEE',
};

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  HR_MANAGER: 'HR Manager',
  OPERATIONS_MANAGER: 'Operations Manager',
  FINANCE: 'Finance',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Medewerker',
};

/**
 * Bepaal de effectieve business role van een gebruiker.
 * Admin system role → altijd ADMIN business role.
 */
export function getBusinessRole(user) {
  if (!user) return null;
  if (user.role === 'admin') return BUSINESS_ROLES.ADMIN;
  return user.business_role || BUSINESS_ROLES.EMPLOYEE;
}

/**
 * Check of gebruiker een van de toegestane rollen heeft.
 */
export function hasBusinessRole(user, allowedRoles) {
  const role = getBusinessRole(user);
  if (!role) return false;
  if (role === BUSINESS_ROLES.ADMIN) return true; // Admin altijd toegang
  return allowedRoles.includes(role);
}

/**
 * Navigatie groep zichtbaarheidsregels per domein.
 */
export const NAV_GROUP_ROLES = {
  'Core Operations': [BUSINESS_ROLES.ADMIN, BUSINESS_ROLES.HR_MANAGER, BUSINESS_ROLES.OPERATIONS_MANAGER, BUSINESS_ROLES.FINANCE, BUSINESS_ROLES.SUPERVISOR],
  'HR': [BUSINESS_ROLES.ADMIN, BUSINESS_ROLES.HR_MANAGER],
  'Loon & Rapportage': [BUSINESS_ROLES.ADMIN, BUSINESS_ROLES.FINANCE],
  'Business': [BUSINESS_ROLES.ADMIN, BUSINESS_ROLES.OPERATIONS_MANAGER, BUSINESS_ROLES.SUPERVISOR],
  'Communicatie': [BUSINESS_ROLES.ADMIN, BUSINESS_ROLES.HR_MANAGER, BUSINESS_ROLES.OPERATIONS_MANAGER, BUSINESS_ROLES.FINANCE, BUSINESS_ROLES.SUPERVISOR],
  'Operationeel Beheer': [BUSINESS_ROLES.ADMIN],
  'Governance & Control': [BUSINESS_ROLES.ADMIN],
};

/**
 * Check of een navigatiegroep zichtbaar is voor de gebruiker.
 */
export function isNavGroupVisible(user, groupLabel) {
  const role = getBusinessRole(user);
  if (!role) return false;
  if (role === BUSINESS_ROLES.ADMIN) return true;
  const allowedRoles = NAV_GROUP_ROLES[groupLabel];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}