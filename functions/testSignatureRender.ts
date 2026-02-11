import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    
    // Fetch PNG
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    console.log('PNG size:', uint8.length);
    
    // Try method 1: direct addImage with raw PNG bytes as base64
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    
    pdf.setFontSize(14);
    pdf.text('Test 1: Direct PNG addImage', 20, 20);
    
    try {
      pdf.addImage('data:image/png;base64,' + base64, 'PNG', 20, 30, 60, 20);
      console.log('Method 1 (direct PNG) succeeded');
    } catch(e) {
      console.error('Method 1 failed:', e.message);
      pdf.text('FAILED: ' + e.message.substring(0, 60), 20, 40);
    }
    
    // Method 2: Try with raw arraybuffer
    pdf.text('Test 2: ArrayBuffer addImage', 20, 70);
    try {
      // jsPDF accepts raw arraybuffer
      pdf.addImage(new Uint8Array(arrayBuf), 'PNG', 20, 80, 60, 20);
      console.log('Method 2 (arraybuffer) succeeded');
    } catch(e) {
      console.error('Method 2 failed:', e.message);
      pdf.text('FAILED: ' + e.message.substring(0, 60), 20, 90);
    }

    const pdfBytes = pdf.output('arraybuffer');
    console.log('PDF size:', pdfBytes.byteLength);
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=test_signature.pdf'
      }
    });
  } catch (e) {
    console.error('Error:', e.message, e.stack);
    return Response.json({ error: e.message }, { status: 500 });
  }
});