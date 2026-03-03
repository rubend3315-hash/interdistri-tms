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
  // Alleen als business_role EXPLICIET op EMPLOYEE staat EN dat bewust is ingesteld,
  // wordt de gebruiker als EMPLOYEE behandeld.
  // Gebruikers zonder business_role krijgen SUPER_ADMIN (zoals vóór RBAC).
  if (user.business_role && user.business_role !== 'EMPLOYEE') {
    return user.business_role;
  }
  // business_role ontbreekt of is 'EMPLOYEE' (standaard) → volledige toegang
  // totdat admin handmatig een rol toewijst
  if (!user.business_role) return ROLES.SUPER_ADMIN;
  return user.business_role;
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