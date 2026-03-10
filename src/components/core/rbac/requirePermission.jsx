/**
 * RBAC Permission Engine — Enterprise v2.2
 * 
 * Centrale permission check. Alle toegangscontrole gaat via dit bestand.
 * Geen directe role checks (user.role === ...) meer in de app.
 * 
 * Gebruik:
 *   import { hasPermission, requirePermission } from '@/components/core/rbac/requirePermission';
 *   import { PERMISSIONS } from '@/components/core/rbac/permissionRegistry';
 * 
 *   if (hasPermission(user, PERMISSIONS.PLANNING_MANAGE)) { ... }
 *   requirePermission(user, PERMISSIONS.GOVERNANCE_MANAGE);
 */

import { ROLES, ROLE_PERMISSIONS } from './roleDefinitions';
import { WILDCARD } from './permissionRegistry';

/**
 * Bepaal de effectieve RBAC rol van een gebruiker.
 * - Platform admin (user.role === 'admin') → SUPER_ADMIN (runtime mapping)
 * - Anders: user.business_role of fallback naar EMPLOYEE
 */
export function getEffectiveRole(user) {
  if (!user) return ROLES.EMPLOYEE;
  if (user.role === 'admin') return ROLES.SUPER_ADMIN;
  // Expliciete business_roles worden gerespecteerd
  if (user.business_role === ROLES.EMPLOYEE) return ROLES.EMPLOYEE;
  if (user.business_role === ROLES.HR_ADMIN) return ROLES.HR_ADMIN;
  if (user.business_role === ROLES.PLANNER) return ROLES.PLANNER;
  // OPERATIONS_MANAGER, FINANCE, SUPERVISOR → volledige rechten (SUPER_ADMIN)
  if (['ADMIN', 'OPERATIONS_MANAGER', 'FINANCE', 'SUPERVISOR'].includes(user.business_role)) {
    return ROLES.SUPER_ADMIN;
  }
  // Alle overige gebruikers (geen business_role) krijgen EMPLOYEE-rechten
  // totdat een admin hun rol toewijst via de Users-pagina.
  return ROLES.EMPLOYEE;
}

/**
 * Check of een gebruiker een specifieke permission heeft.
 * Ondersteunt wildcard (*) — SUPER_ADMIN heeft altijd toegang.
 */
export function hasPermission(user, permission) {
  const role = getEffectiveRole(user);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
  if (permissions.includes(WILDCARD)) return true;
  return permissions.includes(permission);
}

/**
 * Check meerdere permissions tegelijk (ALL moeten aanwezig zijn).
 */
export function hasAllPermissions(user, permissionList) {
  return permissionList.every(p => hasPermission(user, p));
}

/**
 * Check of gebruiker minstens één van de permissions heeft.
 */
export function hasAnyPermission(user, permissionList) {
  return permissionList.some(p => hasPermission(user, p));
}

/**
 * Guard: gooi een error als de permission ontbreekt.
 */
/**
 * Identity layer helper — abstracts EMPLOYEE role check.
 */
export function isEmployeeUser(user) {
  return getEffectiveRole(user) === ROLES.EMPLOYEE;
}

export function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) {
    const role = getEffectiveRole(user);
    throw new Error(`Forbidden: rol "${role}" mist permission "${permission}"`);
  }
}