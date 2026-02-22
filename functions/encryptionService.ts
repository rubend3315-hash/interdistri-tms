// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM_LEVEL (INFRASTRUCTURE)                    ║
// ║ Called by: Other backend functions (not directly from frontend)  ║
// ║ Auth: Caller-dependent                                          ║
// ║ AES-256-GCM encryption for sensitive fields (BSN, IBAN)         ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const ENC_PREFIX = 'enc:v1:'; // Prefix to detect encrypted values

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getKey() {
  const keyHex = Deno.env.get('APP_ENCRYPTION_KEY');
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('APP_ENCRYPTION_KEY not set or invalid (must be 64 hex chars = 32 bytes)');
  }
  const keyBytes = hexToBytes(keyHex);
  return await crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM }, false, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string' || plaintext.trim() === '') return plaintext;
  // Already encrypted? Return as-is
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext;

  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuffer);

  // Format: enc:v1:<iv_hex>:<ciphertext_hex>
  return `${ENC_PREFIX}${bytesToHex(iv)}:${bytesToHex(cipherBytes)}`;
}

async function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  // Not encrypted? Return as-is (plaintext migration support)
  if (!ciphertext.startsWith(ENC_PREFIX)) return ciphertext;

  const key = await getKey();
  const parts = ciphertext.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted format');

  const iv = hexToBytes(parts[0]);
  const cipherBytes = hexToBytes(parts[1]);
  const decryptedBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, cipherBytes);
  return new TextDecoder().decode(decryptedBuffer);
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, values, employee_id } = body;

    // ── GLOBAL AUTH GATE ── All actions require authentication
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC helper: admin system role OR matching business_role
    function requireRole(allowedRoles) {
      if (user.role === 'admin') return null;
      if (allowedRoles.includes(user.business_role)) return null;
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    // Action: encrypt — ADMIN only
    if (action === 'encrypt') {
      const denied = requireRole(['ADMIN']);
      if (denied) return denied;
      const result = {};
      for (const [field, plaintext] of Object.entries(values || {})) {
        result[field] = await encrypt(plaintext);
      }
      return Response.json({ success: true, values: result });
    }

    // Action: decrypt — ADMIN only
    if (action === 'decrypt') {
      const denied = requireRole(['ADMIN']);
      if (denied) return denied;
      const result = {};
      for (const [field, ciphertext] of Object.entries(values || {})) {
        result[field] = await decrypt(ciphertext);
      }
      return Response.json({ success: true, values: result });
    }

    // Action: decrypt_employee — ADMIN + HR_MANAGER
    if (action === 'decrypt_employee') {
      if (!employee_id) return Response.json({ error: 'Missing employee_id' }, { status: 400 });
      const denied = requireRole(['ADMIN', 'HR_MANAGER']);
      if (denied) return denied;

      const emp = await base44.asServiceRole.entities.Employee.get(employee_id);
      const decrypted = { ...emp };
      if (emp.bsn) decrypted.bsn = await decrypt(emp.bsn);
      if (emp.bank_account) decrypted.bank_account = await decrypt(emp.bank_account);
      return Response.json({ success: true, employee: decrypted });
    }

    // Action: encrypt_and_save — ADMIN only
    if (action === 'encrypt_and_save') {
      if (!employee_id) return Response.json({ error: 'Missing employee_id' }, { status: 400 });
      const denied = requireRole(['ADMIN']);
      if (denied) return denied;

      const updateData = {};
      if (values?.bsn !== undefined) {
        updateData.bsn = await encrypt(values.bsn);
      }
      if (values?.bank_account !== undefined) {
        updateData.bank_account = await encrypt(values.bank_account);
      }

      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.Employee.update(employee_id, updateData);
      }

      return Response.json({ success: true });
    }

    // Action: migrate — ADMIN only
    if (action === 'migrate') {
      const denied = requireRole(['ADMIN']);
      if (denied) return denied;

      const employees = await base44.asServiceRole.entities.Employee.filter({});
      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const emp of employees) {
        const updates = {};
        let needsUpdate = false;

        // BSN: encrypt if plaintext
        if (emp.bsn && !isEncrypted(emp.bsn)) {
          updates.bsn = await encrypt(emp.bsn);
          needsUpdate = true;
        }
        // IBAN: encrypt if plaintext
        if (emp.bank_account && !isEncrypted(emp.bank_account)) {
          updates.bank_account = await encrypt(emp.bank_account);
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            await base44.asServiceRole.entities.Employee.update(emp.id, updates);
            migrated++;
          } catch (err) {
            console.error(`Migration failed for employee ${emp.id}: ${err.message}`);
            errors++;
          }
        } else {
          skipped++;
        }
      }

      // Audit log
      try {
        await base44.functions.invoke('auditService', {
          action_type: 'migrate',
          category: 'Security',
          description: `BSN/IBAN encryptie migratie: ${migrated} versleuteld, ${skipped} overgeslagen, ${errors} fouten`,
          performed_by_email: user.email,
          performed_by_name: user.full_name,
          performed_by_role: user.role,
          metadata: { migrated, skipped, errors, total: employees.length },
        });
      } catch (_) {}

      return Response.json({ success: true, migrated, skipped, errors, total: employees.length });
    }

    return Response.json({ error: 'Unknown action. Use: encrypt, decrypt, decrypt_employee, encrypt_and_save, migrate' }, { status: 400 });
  } catch (error) {
    console.error('encryptionService error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});