/**
 * Enterprise RBAC — Bridge Module v2.2
 * 
 * DEPRECATED: Direct role checks via dit bestand worden uitgefaseerd.
 * Gebruik voortaan alleen:
 *   import { hasPermission } from '@/components/core/rbac/requirePermission';
 *   import { PERMISSIONS } from '@/components/core/rbac/permissionRegistry';
 * 
 * Dit bestand is behouden voor backward compatibility met bestaande imports.
 * Alle logica delegeert nu naar de centrale RBAC engine.
 */

import { ROLES, ROLE_LABELS as CORE_ROLE_LABELS } from '../core/rbac/roleDefinitions';
import { PERMISSIONS } from '../core/rbac/permissionRegistry';
import { getEffectiveRole, hasPermission, hasAnyPermission } from '../core/rbac/requirePermission';

// Re-export rollen onder oude naamgeving voor backward compatibility
export const BUSINESS_ROLES = {
  ADMIN: ROLES.SUPER_ADMIN,
  HR_MANAGER: ROLES.HR_ADMIN,
  HR_ADMIN: ROLES.HR_ADMIN,
  OPERATIONS_MANAGER: ROLES.PLANNER,
  PLANNER: ROLES.PLANNER,
  FINANCE: ROLES.HR_ADMIN,
  SUPERVISOR: ROLES.PLANNER,
  EMPLOYEE: ROLES.EMPLOYEE,
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.HR_ADMIN]: 'HR Admin',
  [ROLES.PLANNER]: 'Planner',
  [ROLES.EMPLOYEE]: 'Medewerker',
  // Legacy mappings
  ADMIN: 'Super Admin',
  HR_MANAGER: 'HR Admin',
  OPERATIONS_MANAGER: 'Planner',
  FINANCE: 'HR Admin',
  SUPERVISOR: 'Planner',
  EMPLOYEE: 'Medewerker',
};

/**
 * DEPRECATED — Gebruik getEffectiveRole() uit requirePermission.js
 */
export function getBusinessRole(user) {
  return getEffectiveRole(user);
}

/**
 * DEPRECATED — Gebruik hasPermission() of hasAnyPermission() uit requirePermission.js
 */
export function hasBusinessRole(user, allowedRoles) {
  const role = getEffectiveRole(user);
  if (role === ROLES.SUPER_ADMIN) return true;
  return allowedRoles.includes(role);
}

/**
 * Navigatie groep → permission mapping.
 * Vervangt oude role-based NAV_GROUP_ROLES.
 */
export const NAV_GROUP_PERMISSIONS = {
  'Core Operations': [
    PERMISSIONS.PLANNING_MANAGE,
    PERMISSIONS.PLANNING_READ,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CHARTERS_MANAGE,
    PERMISSIONS.MOBILE_READWRITE,
  ],
  'HR': [
    PERMISSIONS.ONBOARDING_MANAGE,
    PERMISSIONS.EMPLOYEES_MANAGE,
    PERMISSIONS.CONTRACTS_MANAGE,
    PERMISSIONS.DOCUMENTS_MANAGE,
  ],
  'Loon & Rapportage': [
    PERMISSIONS.CONTRACTS_MANAGE,
    PERMISSIONS.DOCUMENTS_MANAGE,
  ],
  'Business': [
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CHARTERS_MANAGE,
    PERMISSIONS.PLANNING_MANAGE,
  ],
  'Communicatie': [
    PERMISSIONS.MAIL_SEND,
    PERMISSIONS.MOBILE_READWRITE,
  ],
  'Operationeel Beheer': [
    PERMISSIONS.GOVERNANCE_MANAGE,
    PERMISSIONS.ENCRYPTION_MANAGE,
  ],
  'Governance & Control': [
    PERMISSIONS.GOVERNANCE_MANAGE,
    PERMISSIONS.AUDIT_READ,
  ],
};

// Legacy export — backward compatible
export const NAV_GROUP_ROLES = NAV_GROUP_PERMISSIONS;

/**
 * Permission-based navigatie check.
 * Vervangt oude role-based isNavGroupVisible.
 */
export function isNavGroupVisible(user, groupLabel) {
  const role = getEffectiveRole(user);
  if (role === ROLES.SUPER_ADMIN) return true;
  
  const requiredPermissions = NAV_GROUP_PERMISSIONS[groupLabel];
  if (!requiredPermissions) return false;
  return hasAnyPermission(user, requiredPermissions);
}