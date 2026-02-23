/**
 * RBAC Role Definitions — Interdistri TMS v2.2.0
 * 
 * Definieert de 4 systeem-rollen en hun permissions.
 * Elke rol bevat een vaste set permissions uit de permissionRegistry.
 * 
 * SUPER_ADMIN heeft ALLE permissions.
 * Andere rollen hebben een subset.
 */

import { PERMISSIONS, ALL_PERMISSIONS } from './permissionRegistry';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  PLANNER: 'PLANNER',
  EMPLOYEE: 'EMPLOYEE',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.HR_MANAGER]: 'HR Manager',
  [ROLES.PLANNER]: 'Planner',
  [ROLES.EMPLOYEE]: 'Medewerker',
};

/**
 * Permission mapping per rol.
 * SUPER_ADMIN krijgt automatisch alle permissions.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,

  [ROLES.HR_MANAGER]: [
    PERMISSIONS.MOBILE_ENTRY,
    PERMISSIONS.PLANNING_VIEW_OWN,
    PERMISSIONS.TIME_APPROVE,
    PERMISSIONS.CONTRACTS_GENERATE,
    PERMISSIONS.CONTRACTS_SEND,
    PERMISSIONS.EMPLOYEES_MANAGE,
    PERMISSIONS.ONBOARDING_COMPLETE,
    PERMISSIONS.PAYROLL_SEND,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AUDIT_READ,
  ],

  [ROLES.PLANNER]: [
    PERMISSIONS.MOBILE_ENTRY,
    PERMISSIONS.PLANNING_VIEW_OWN,
    PERMISSIONS.PLANNING_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.EMPLOYEE]: [
    PERMISSIONS.MOBILE_ENTRY,
    PERMISSIONS.PLANNING_VIEW_OWN,
    PERMISSIONS.TIME_SUBMIT,
    PERMISSIONS.CONTRACTS_SIGN_OWN,
  ],
};

/**
 * Haal permissions op voor een rol.
 * Onbekende rollen krijgen EMPLOYEE permissions als fallback.
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
}