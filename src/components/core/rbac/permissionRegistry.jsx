/**
 * RBAC Permission Registry — Interdistri TMS v2.2.0
 * 
 * Centrale bron van alle permissions in het systeem.
 * Elke permission is een unieke string die een specifieke actie vertegenwoordigt.
 * 
 * BELANGRIJK: Wijzig geen bestaande permissions zonder migratie.
 */

export const PERMISSIONS = {
  // Mobiel
  MOBILE_ENTRY: 'mobile.entry',

  // Planning
  PLANNING_VIEW_OWN: 'planning.view.own',
  PLANNING_MANAGE: 'planning.manage',

  // Tijdregistratie
  TIME_SUBMIT: 'time.submit',
  TIME_APPROVE: 'time.approve',

  // Contracten
  CONTRACTS_SIGN_OWN: 'contracts.sign.own',
  CONTRACTS_GENERATE: 'contracts.generate',
  CONTRACTS_SEND: 'contracts.send',

  // Medewerkers
  EMPLOYEES_MANAGE: 'employees.manage',

  // Onboarding
  ONBOARDING_COMPLETE: 'onboarding.complete',

  // Payroll
  PAYROLL_SEND: 'payroll.send',

  // Rapportage
  REPORTS_VIEW: 'reports.view',

  // Audit
  AUDIT_READ: 'audit.read',

  // Back-ups
  BACKUP_CREATE: 'backup.create',
  BACKUP_RESTORE: 'backup.restore',

  // RBAC beheer
  RBAC_MANAGE: 'rbac.manage',
};

/** Lijst van alle permission strings voor validatie */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);