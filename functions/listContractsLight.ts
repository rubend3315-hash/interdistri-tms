import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to fetch all contracts
    const contracts = await base44.asServiceRole.entities.Contract.list('-created_date');

    // Strip heavy contract_content field to keep response small
    const lightContracts = contracts.map(c => {
      const { contract_content, ...rest } = c;
      return rest;
    });

    return Response.json({ contracts: lightContracts });
  } catch (error) {
    console.error('listContractsLight error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});