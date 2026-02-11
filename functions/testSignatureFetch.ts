import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    
    console.log('Testing fetch of:', url);
    const resp = await fetch(url);
    console.log('Status:', resp.status);
    console.log('Content-Type:', resp.headers.get('content-type'));
    const buf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    console.log('Size:', uint8.length);
    console.log('First 8 bytes:', Array.from(uint8.slice(0, 8)).map(b => b.toString(16)).join(' '));
    
    const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47;
    console.log('Is PNG:', isPng);
    
    return Response.json({ 
      status: resp.status,
      size: uint8.length,
      firstBytes: Array.from(uint8.slice(0, 8)).map(b => b.toString(16)).join(' '),
      isPng 
    });
  } catch (e) {
    console.error('Error:', e.message, e.stack);
    return Response.json({ error: e.message }, { status: 500 });
  }
});