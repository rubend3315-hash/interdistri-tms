import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: nl });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'd-M-yyyy', { locale: nl });
}

export default function ContractPdfDownload({ contractId, contractNumber }) {
  const [downloading, setDownloading] = useState(false);
  const [renderData, setRenderData] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);

    // 1. Fetch full contract data via service
    const response = await base44.functions.invoke('getContractForPdf', { contract_id: contractId });
    const data = response.data;

    // 2. Set render data to trigger hidden render
    setRenderData(data);

    // 3. Wait for images to load and DOM to render
    await new Promise(r => setTimeout(r, 800));

    // 4. Capture the hidden div with html2canvas
    const el = document.getElementById('pdf-render-target');
    if (!el) {
      setDownloading(false);
      setRenderData(null);
      return;
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794, // A4 at 96dpi
      windowWidth: 794,
    });

    // 5. Convert canvas to multi-page PDF with margins
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15; // 15mm margins
    const printW = pageWidth - margin * 2;
    const printH = pageHeight - margin * 2;

    // How many canvas pixels per mm of print area
    const pxPerMM = canvas.width / printW;
    // How many canvas pixels fit in one page's printable height
    const sliceHeightPx = Math.floor(printH * pxPerMM);

    // Scan for "safe" cut points - look for rows that are mostly white
    // This prevents cutting through text
    function findSafeCutY(targetY) {
      // Search within ±40px of target for the whitest horizontal line
      const scanRange = 80;
      const startY = Math.max(0, targetY - scanRange);
      const endY = Math.min(canvas.height, targetY + scanRange);
      
      let bestY = targetY;
      let bestWhiteness = -1;
      
      const ctx = canvas.getContext('2d');
      
      for (let y = startY; y < endY; y++) {
        const row = ctx.getImageData(0, y, canvas.width, 1).data;
        let whiteCount = 0;
        for (let x = 0; x < canvas.width * 4; x += 4) {
          // Check if pixel is near-white (R, G, B all > 240)
          if (row[x] > 240 && row[x + 1] > 240 && row[x + 2] > 240) {
            whiteCount++;
          }
        }
        const whiteness = whiteCount / canvas.width;
        if (whiteness > bestWhiteness) {
          bestWhiteness = whiteness;
          bestY = y;
        }
      }
      return bestY;
    }

    // Build list of page cuts
    const cuts = [0];
    let nextCut = sliceHeightPx;
    while (nextCut < canvas.height) {
      const safeCut = findSafeCutY(nextCut);
      cuts.push(safeCut);
      nextCut = safeCut + sliceHeightPx;
    }
    cuts.push(canvas.height);

    for (let i = 0; i < cuts.length - 1; i++) {
      if (i > 0) pdf.addPage();

      const srcY = cuts[i];
      const srcH = cuts[i + 1] - srcY;
      if (srcH <= 0) continue;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      const pCtx = pageCanvas.getContext('2d');
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pCtx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      const sliceH_MM = srcH / pxPerMM;

      pdf.addImage(pageImgData, 'JPEG', margin, margin, printW, sliceH_MM);
    }

    pdf.save(`contract_${contractNumber || contractId}.pdf`);
    setRenderData(null);
    setDownloading(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} title="Download PDF">
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </Button>

      {/* Hidden render target for PDF generation */}
      {renderData && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div
            id="pdf-render-target"
            style={{
              width: '794px',
              padding: '0',
              backgroundColor: 'white',
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#1e293b',
              fontSize: '11px',
              lineHeight: '1.5',
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#1e293b',
              color: 'white',
              padding: '24px 50px',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                Interdistri Transport
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Arbeidscontract
              </div>
            </div>

            <div style={{ padding: '30px 50px' }}>
              {/* Info box */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '14px 18px',
                marginBottom: '20px',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold', width: '120px' }}>Medewerker:</td>
                      <td style={{ padding: '4px 8px' }}>{renderData.employeeName}</td>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold', width: '120px' }}>Contractnummer:</td>
                      <td style={{ padding: '4px 8px' }}>{renderData.contract_number}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold' }}>Contracttype:</td>
                      <td style={{ padding: '4px 8px' }}>{renderData.contract_type}</td>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold' }}>Startdatum:</td>
                      <td style={{ padding: '4px 8px' }}>{formatDate(renderData.start_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold' }}>Status:</td>
                      <td style={{ padding: '4px 8px' }}>{renderData.status}</td>
                      <td style={{ padding: '4px 8px', color: '#64748b', fontWeight: 'bold' }}>Uren/week:</td>
                      <td style={{ padding: '4px 8px' }}>{renderData.hours_per_week || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Contract content */}
              <div
                className="contract-pdf-content"
                dangerouslySetInnerHTML={{ __html: renderData.contract_content_clean }}
              />
              <style>{`
                .contract-pdf-content {
                  font-size: 10.5px;
                  line-height: 1.55;
                  color: #1e293b;
                }
                .contract-pdf-content h2 {
                  font-size: 14px;
                  font-weight: bold;
                  margin: 18px 0 8px 0;
                  color: #0f172a;
                  text-transform: uppercase;
                }
                .contract-pdf-content h3 {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 14px 0 4px 0;
                  color: #0f172a;
                }
                .contract-pdf-content p {
                  margin: 0 0 6px 0;
                }
                .contract-pdf-content ul, .contract-pdf-content ol {
                  margin: 4px 0 8px 20px;
                  padding: 0;
                }
                .contract-pdf-content li {
                  margin: 2px 0;
                }
              `}</style>

              {/* Signatures */}
              <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                {/* Manager */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Voor akkoord werkgever
                  </div>
                  {renderData.manager_signature_url ? (
                    <img
                      src={renderData.manager_signature_url}
                      crossOrigin="anonymous"
                      style={{ width: '200px', height: '80px', objectFit: 'contain', display: 'block', marginBottom: '8px' }}
                      alt="Handtekening werkgever"
                    />
                  ) : (
                    <div style={{ height: '60px' }} />
                  )}
                  <div style={{ borderBottom: '1px dotted #94a3b8', width: '250px', marginBottom: '4px' }} />
                  <div style={{ fontSize: '10px', color: '#475569' }}>Van Dooren Transport Zeeland B.V.</div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>Namens deze:</div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    De heer M. Schetters
                    {renderData.manager_signed_date && (
                      <span style={{ marginLeft: '20px', color: '#94a3b8', fontSize: '9px' }}>
                        Ondertekend op {formatDateShort(renderData.manager_signed_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Employee */}
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Voor akkoord werknemer
                  </div>
                  {renderData.employee_signature_url ? (
                    <img
                      src={renderData.employee_signature_url}
                      crossOrigin="anonymous"
                      style={{ width: '200px', height: '80px', objectFit: 'contain', display: 'block', marginBottom: '8px' }}
                      alt="Handtekening werknemer"
                    />
                  ) : (
                    <div style={{ height: '60px' }} />
                  )}
                  <div style={{ borderBottom: '1px dotted #94a3b8', width: '250px', marginBottom: '4px' }} />
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    De heer/mevrouw {renderData.employeeName}
                    {renderData.employee_signed_date && (
                      <span style={{ marginLeft: '20px', color: '#94a3b8', fontSize: '9px' }}>
                        Ondertekend op {formatDateShort(renderData.employee_signed_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', marginTop: '20px' }}>
                Gegenereerd op {format(new Date(), 'd-M-yyyy', { locale: nl })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}