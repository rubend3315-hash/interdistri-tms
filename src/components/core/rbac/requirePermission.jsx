/**
 * RBAC Permission Check Helper — Interdistri TMS v2.2.0
 * 
 * Frontend helper om te checken of een gebruiker een bepaalde permission heeft.
 * 
 * Gebruik:
 *   import { hasPermission, requirePermission } from '@/components/core/rbac/requirePermission';
 * 
 *   // Boolean check
 *   if (hasPermission(user, PERMISSIONS.TIME_APPROVE)) { ... }
 * 
 *   // Throws bij ontbreken (voor guards)
 *   requirePermission(user, PERMISSIONS.BACKUP_CREATE);
 */

import { ROLES, ROLE_PERMISSIONS } from './roleDefinitions';

/**
 * Bepaal de effectieve RBAC rol van een gebruiker.
 * - Platform admin (user.role === 'admin') → SUPER_ADMIN
 * - Anders: user.business_role of fallback naar EMPLOYEE
 */
export function getEffectiveRole(user) {
  if (!user) return ROLES.EMPLOYEE;
  if (user.role === 'admin') return ROLES.SUPER_ADMIN;
  return user.business_role || ROLES.EMPLOYEE;
}

/**
 * Check of een gebruiker een specifieke permission heeft.
 * Returns boolean.
 */
export function hasPermission(user, permission) {
  const role = getEffectiveRole(user);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
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
 * Gebruik voor kritieke acties waar je wilt dat de flow stopt.
 */
export function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) {
    const role = getEffectiveRole(user);
    throw new Error(`Forbidden: rol "${role}" mist permission "${permission}"`);
  }
}