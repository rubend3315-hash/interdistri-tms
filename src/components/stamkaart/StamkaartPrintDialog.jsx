import React, { useRef, useCallback } from "react";
import StamkaartPrintView from "./StamkaartPrintView";

/**
 * StamkaartPrintDialog — renders StamkaartPrintView in a hidden iframe and triggers print.
 * This ensures print output is ALWAYS the same StamkaartPrintView component,
 * without opening a separate page/route.
 *
 * Usage: <StamkaartPrintDialog employee={emp} onboardingData={ob} trigger={<Button>Print</Button>} />
 */
export default function StamkaartPrintDialog({ employee, onboardingData, trigger }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const handlePrint = useCallback(() => {
    if (!containerRef.current) return;

    // Get the rendered HTML of StamkaartPrintView
    const content = containerRef.current.innerHTML;

    // Collect all stylesheets from the parent document
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch {
          // Cross-origin sheets can't be read; link them instead
          return sheet.href ? `@import url("${sheet.href}");` : '';
        }
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${styles}
    @page { margin: 10mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body, html { margin: 0; padding: 0; background: #fff; }
    }
    body { background: #fff; margin: 0; padding: 20px 0; }
  </style>
</head>
<body>${content}</body>
</html>`;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for images to load, then print
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 300);
  }, []);

  return (
    <>
      {/* Hidden render of StamkaartPrintView to capture its HTML */}
      <div ref={containerRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: 720 }}>
        <StamkaartPrintView employee={employee} onboardingData={onboardingData} />
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={iframeRef}
        style={{ position: 'absolute', left: '-9999px', top: 0, width: 0, height: 0, border: 'none' }}
        title="Stamkaart Print"
      />

      {/* Trigger button */}
      <span onClick={handlePrint} style={{ cursor: 'pointer' }}>
        {trigger}
      </span>
    </>
  );
}