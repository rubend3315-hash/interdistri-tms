/**
 * RBAC Violation Logger — voor gebruik in backend functies
 * 
 * Gebruik in backend functies bij een 403 response:
 * 
 *   import { logRbacDenied } from './rbacLogger.js';  // NIET GEBRUIKEN (local imports verboden)
 * 
 * In plaats daarvan, kopieer de inline helper naar je functie:
 * 
 *   async function logRbacDenied(base44, user, functionName) {
 *     try {
 *       await base44.asServiceRole.entities.AuditLog.create({
 *         action_type: 'cross_tenant_access_attempt',
 *         category: 'Permissies',
 *         description: `RBAC DENIED: ${user?.email || 'unknown'} (role: ${user?.role}, business_role: ${user?.business_role || 'none'}) tried to access ${functionName}`,
 *         performed_by_email: user?.email || 'unknown',
 *         performed_by_name: user?.full_name || 'unknown',
 *         performed_by_role: user?.role || 'unknown',
 *         metadata: {
 *           function_name: functionName,
 *           business_role: user?.business_role || null,
 *           denied_at: new Date().toISOString(),
 *         }
 *       });
 *     } catch (_) { /* silent fail to not block response */ }
 *   }
 * 
 * Dit bestand dient als documentatie. Backend functies kunnen GEEN local imports doen.
 */

export const RBAC_DENIED_TEMPLATE = {
  action_type: 'cross_tenant_access_attempt',
  category: 'Permissies',
};