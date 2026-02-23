import React from "react";

const nodes = [
  { id: "db", label: "Database", sub: "Employee · TimeEntry · Trip\nStandplaatsWerk · Customer", x: 350, y: 30, w: 220, h: 70, type: "db" },
  { id: "data", label: "buildDailyPayrollReportData", sub: "Filter · Enrich · Aggregate · ISO dates", x: 350, y: 160, w: 280, h: 64, type: "fn" },
  { id: "schema", label: "AJV Schema Validation", sub: "v2.3 · additionalProperties: false", x: 350, y: 290, w: 260, h: 64, type: "validate" },
  { id: "pdf", label: "generateDailyPayrollReport", sub: "PDF (base64)", x: 120, y: 430, w: 240, h: 56, type: "output" },
  { id: "json", label: "downloadDailyPayrollReportJson", sub: "JSON (base64)", x: 400, y: 430, w: 260, h: 56, type: "output" },
  { id: "azure", label: "sendDailyPayrollReportToAzure", sub: "Azure POST + retry (3×)", x: 700, y: 430, w: 260, h: 56, type: "output" },
  { id: "verify", label: "verifyDeployment", sub: "Health check · altijd HTTP 200", x: 730, y: 160, w: 200, h: 56, type: "health" },
];

const arrows = [
  { from: "db", to: "data" },
  { from: "data", to: "schema" },
  { from: "schema", to: "pdf" },
  { from: "schema", to: "json" },
  { from: "schema", to: "azure" },
  { from: "verify", to: "data", dashed: true },
];

function getCenter(node) {
  return { cx: node.x + node.w / 2, cy: node.y + node.h / 2 };
}

function Arrow({ from, to, dashed }) {
  const f = nodes.find(n => n.id === from);
  const t = nodes.find(n => n.id === to);
  const fc = getCenter(f);
  const tc = getCenter(t);

  // Simple line from bottom of "from" to top of "to" (or side-to-side for verify)
  let x1 = fc.cx, y1 = f.y + f.h, x2 = tc.cx, y2 = t.y;
  if (from === "verify") { x1 = f.x; y1 = fc.cy; x2 = t.x + t.w; y2 = tc.cy; }

  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={dashed ? "#94a3b8" : "#475569"}
      strokeWidth={dashed ? 1.5 : 2}
      strokeDasharray={dashed ? "6 4" : "none"}
      markerEnd="url(#arrowhead)"
    />
  );
}

const typeStyles = {
  db: { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e40af" },
  fn: { fill: "#ede9fe", stroke: "#7c3aed", text: "#5b21b6" },
  validate: { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
  output: { fill: "#dcfce7", stroke: "#16a34a", text: "#166534" },
  health: { fill: "#f1f5f9", stroke: "#64748b", text: "#334155" },
};

function Node({ node }) {
  const s = typeStyles[node.type];
  const isDb = node.type === "db";
  return (
    <g>
      {isDb ? (
        <>
          <ellipse cx={node.x + node.w / 2} cy={node.y + 14} rx={node.w / 2} ry={14} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
          <rect x={node.x} y={node.y + 14} width={node.w} height={node.h - 28} fill={s.fill} stroke="none" />
          <line x1={node.x} y1={node.y + 14} x2={node.x} y2={node.y + node.h - 14} stroke={s.stroke} strokeWidth={2} />
          <line x1={node.x + node.w} y1={node.y + 14} x2={node.x + node.w} y2={node.y + node.h - 14} stroke={s.stroke} strokeWidth={2} />
          <ellipse cx={node.x + node.w / 2} cy={node.y + node.h - 14} rx={node.w / 2} ry={14} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
        </>
      ) : (
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={10} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
      )}
      <text x={node.x + node.w / 2} y={node.y + (isDb ? 32 : 24)} textAnchor="middle" fontSize={12} fontWeight={600} fill={s.text}>
        {node.label}
      </text>
      {node.sub && node.sub.split("\n").map((line, i) => (
        <text key={i} x={node.x + node.w / 2} y={node.y + (isDb ? 48 : 40) + i * 14} textAnchor="middle" fontSize={10} fill="#64748b">
          {line}
        </text>
      ))}
    </g>
  );
}

const TOELICHTING = [
  { color: "#dbeafe", border: "#3b82f6", label: "Database", desc: "Brondata: Employee, TimeEntry (alleen Goedgekeurd), Trip, StandplaatsWerk, Customer" },
  { color: "#ede9fe", border: "#7c3aed", label: "Data Layer", desc: "buildDailyPayrollReportData — filtert, verrijkt met ISO-datums (Luxon/DST-aware) en aggregeert" },
  { color: "#fef3c7", border: "#d97706", label: "Schema Validation", desc: "AJV v8 runtime validatie met additionalProperties: false + version guard (v2.3)" },
  { color: "#dcfce7", border: "#16a34a", label: "Output", desc: "PDF (jsPDF), JSON download (base64) of Azure POST met retry (3× lineair backoff)" },
  { color: "#f1f5f9", border: "#64748b", label: "Health Check", desc: "verifyDeployment pingt alle functies, retourneert altijd HTTP 200" },
];

export default function PayrollDocArchitecture() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 border-b border-slate-200 pb-3 mb-2">
          Daily Payroll Export — Architectuurdiagram
        </h1>
        <p className="text-sm text-slate-500">Schema v2.3 · 2026-02-23 · Interdistri TMS</p>
      </div>

      {/* Diagram */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white p-4">
        <svg viewBox="0 0 1000 520" className="w-full max-w-4xl mx-auto" style={{ minWidth: 700 }}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#475569" />
            </marker>
          </defs>
          {arrows.map((a, i) => <Arrow key={i} {...a} />)}
          {nodes.map(n => <Node key={n.id} node={n} />)}
        </svg>
      </div>

      {/* Legenda */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Toelichting</h2>
        <div className="grid gap-3">
          {TOELICHTING.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2" style={{ background: t.color, borderColor: t.border }} />
              <div>
                <span className="font-medium text-sm text-slate-800">{t.label}</span>
                <span className="text-sm text-slate-600"> — {t.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data flow beschrijving */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Data Flow</h2>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-2"><span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">1</span> Database levert ruwe entiteiten voor de geselecteerde datum</div>
          <div className="flex items-center gap-2"><span className="font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">2</span> Data Layer filtert (alleen Actief + Goedgekeurd), verrijkt met ISO-datetimes en aggregeert totalen</div>
          <div className="flex items-center gap-2"><span className="font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">3</span> Schema Validation controleert versie (2.3) en structuur (AJV, additionalProperties: false)</div>
          <div className="flex items-center gap-2"><span className="font-mono bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">4</span> Output wordt geleverd als PDF, JSON download of Azure POST</div>
          <div className="flex items-center gap-2"><span className="font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs">⟳</span> verifyDeployment pingt de Data Layer om deployment health te controleren</div>
        </div>
      </div>

      {/* Error paden */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Error Paden</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-700">Punt</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Fout</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">HTTP</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Gevolg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-4 py-2">Schema Validation</td><td className="px-4 py-2 font-mono text-xs">SCHEMA_VERSION_MISMATCH</td><td className="px-4 py-2">422</td><td className="px-4 py-2">Export geblokkeerd</td></tr>
              <tr><td className="px-4 py-2">Schema Validation</td><td className="px-4 py-2 font-mono text-xs">SCHEMA_VALIDATION_FAILED</td><td className="px-4 py-2">422</td><td className="px-4 py-2">Export geblokkeerd</td></tr>
              <tr><td className="px-4 py-2">Azure Output</td><td className="px-4 py-2 font-mono text-xs">AZURE_NOT_CONFIGURED</td><td className="px-4 py-2">200</td><td className="px-4 py-2">Dry-run (data wel gevalideerd)</td></tr>
              <tr><td className="px-4 py-2">Azure Output</td><td className="px-4 py-2 font-mono text-xs">AZURE_PUSH_FAILED</td><td className="px-4 py-2">502</td><td className="px-4 py-2">Na 3 retries gefaald</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
        Architectuurdiagram v2.3 — Interdistri TMS — 2026-02-23
      </p>
    </div>
  );
}