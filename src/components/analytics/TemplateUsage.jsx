import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default function TemplateUsage({ contracts }) {
  const templateStats = useMemo(() => {
    const usage = {};
    contracts.forEach(c => {
      const note = c.notes || '';
      const match = note.match(/Sjabloon:\s*(.+)/);
      const templateName = match ? match[1].trim() : 'Standaard (fallback)';
      if (!usage[templateName]) usage[templateName] = { name: templateName, count: 0, types: new Set() };
      usage[templateName].count++;
      if (c.contract_type) usage[templateName].types.add(c.contract_type);
    });
    return Object.values(usage)
      .map(u => ({ ...u, types: [...u.types] }))
      .sort((a, b) => b.count - a.count);
  }, [contracts]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Meest Gebruikte Sjablonen</CardTitle></CardHeader>
      <CardContent>
        {templateStats.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Nog geen contracten gegenereerd.</p>
        ) : (
          <div className="space-y-3">
            {templateStats.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{t.name}</p>
                    <div className="flex gap-1 mt-1">
                      {t.types.map(type => (
                        <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{t.count}x</p>
                  <p className="text-xs text-slate-500">gebruikt</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}