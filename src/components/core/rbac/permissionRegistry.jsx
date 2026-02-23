/**
 * RBAC Permission Registry — Enterprise v2.2
 * 
 * Centrale bron van alle permissions in het systeem.
 * Elke permission is een unieke dot-notatie string.
 * 
 * BELANGRIJK: Wijzig geen bestaande permissions zonder migratie.
 */

export const PERMISSIONS = {
  // Planning
  PLANNING_MANAGE: 'planning.manage',
  PLANNING_READ: 'planning.read',
  PLANNING_OWN_READ: 'planning.own.read',

  // Mobiel
  MOBILE_READWRITE: 'mobile.readwrite',
  MOBILE_OWN: 'mobile.own',

  // Klanten & Charters
  CUSTOMERS_MANAGE: 'customers.manage',
  CHARTERS_MANAGE: 'charters.manage',

  // Onboarding & Medewerkers
  ONBOARDING_MANAGE: 'onboarding.manage',
  EMPLOYEES_MANAGE: 'employees.manage',

  // Contracten
  CONTRACTS_MANAGE: 'contracts.manage',
  CONTRACT_OWN_SIGN: 'contract.own.sign',

  // Documenten & ID
  DOCUMENTS_MANAGE: 'documents.manage',
  ID_SHARE: 'id.share',

  // Communicatie
  MAIL_SEND: 'mail.send',

  // Audit
  AUDIT_READ: 'audit.read',

  // Governance & Encryptie
  GOVERNANCE_MANAGE: 'governance.manage',
  ENCRYPTION_MANAGE: 'encryption.manage',

  // Services (medewerker-eigen)
  SERVICES_OWN_READ: 'services.own.read',
};

/** Wildcard — geeft volledige toegang */
export const WILDCARD = '*';

/** Lijst van alle permission strings voor validatie */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);