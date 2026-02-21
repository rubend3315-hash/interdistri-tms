import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const TenantContext = createContext(null);

export function TenantProvider({ children, user }) {
  const [tenantId, setTenantId] = useState(user?.tenant_id || null);
  const [loading, setLoading] = useState(!user?.tenant_id);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.tenant_id) {
      setTenantId(user.tenant_id);
      setLoading(false);
      return;
    }
    // Fallback: resolve from backend
    base44.functions.invoke('tenantService', { action: 'getCurrentTenant' })
      .then(res => {
        setTenantId(res.data.tenant_id);
        setLoading(false);
      })
      .catch(err => {
        console.error('TenantContext error:', err);
        setError('Tenant context kon niet worden geladen');
        setLoading(false);
      });
  }, [user?.tenant_id]);

  return (
    <TenantContext.Provider value={{ tenantId, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    // Graceful fallback: return empty context (for components not wrapped in TenantProvider)
    return { tenantId: null, loading: false, error: null };
  }
  return ctx;
}

/**
 * Tenant-aware wrapper functions for frontend use.
 * These call the tenantService backend to ensure all queries are tenant-scoped.
 */
export const tenantAware = {
  async list(entityName, filters = {}, sort, limit) {
    const res = await base44.functions.invoke('tenantService', {
      action: 'list',
      entity_name: entityName,
      filters,
      sort,
      limit,
    });
    return res.data.data;
  },

  async get(entityName, entityId) {
    const res = await base44.functions.invoke('tenantService', {
      action: 'get',
      entity_name: entityName,
      entity_id: entityId,
    });
    return res.data.data;
  },

  async create(entityName, data) {
    const res = await base44.functions.invoke('tenantService', {
      action: 'create',
      entity_name: entityName,
      data,
    });
    return res.data.data;
  },

  async update(entityName, entityId, data) {
    const res = await base44.functions.invoke('tenantService', {
      action: 'update',
      entity_name: entityName,
      entity_id: entityId,
      data,
    });
    return res.data.data;
  },

  async delete(entityName, entityId) {
    const res = await base44.functions.invoke('tenantService', {
      action: 'delete',
      entity_name: entityName,
      entity_id: entityId,
    });
    return res.data;
  },
};