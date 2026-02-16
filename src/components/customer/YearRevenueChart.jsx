import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CalendarDays } from "lucide-react";
import { getISOWeek, getYear, parseISO } from "date-fns";

export default function YearRevenueChart({ invoices = [], allLines = [] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Get available years from invoices
  const availableYears = useMemo(() => {
    const years = new Set();
    invoices.forEach(inv => {
      if (inv.invoice_date) {
        years.add(String(getYear(parseISO(inv.invoice_date))));
      }
    });
    if (years.size === 0) years.add(String(currentYear));
    return Array.from(years).sort().reverse();
  }, [invoices, currentYear]);

  // Map invoice_id -> invoice week number for the selected year
  const invoiceWeekMap = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      if (!inv.invoice_date) return;
      const d = parseISO(inv.invoice_date);
      const year = getYear(d);
      if (String(year) !== selectedYear) return;
      const week = getISOWeek(d);
      map[inv.id] = week;
    });
    return map;
  }, [invoices, selectedYear]);

  // Aggregate line totals per week
  const weekData = useMemo(() => {
    // Initialize all 52 weeks
    const weeks = {};
    for (let w = 1; w <= 52; w++) {
      weeks[w] = { week: `W${w}`, weekNum: w, omzet: 0 };
    }

    allLines.forEach(line => {
      const week = invoiceWeekMap[line.invoice_id];
      if (week && weeks[week]) {
        weeks[week].omzet += line.total_price || 0;
      }
    });

    return Object.values(weeks);
  }, [allLines, invoiceWeekMap]);

  const totalYear = useMemo(() => weekData.reduce((s, w) => s + w.omzet, 0), [weekData]);
  const avgWeek = useMemo(() => {
    const weeksWithData = weekData.filter(w => w.omzet > 0).length;
    return weeksWithData > 0 ? totalYear / weeksWithData : 0;
  }, [weekData, totalYear]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-blue-600">€ {payload[0].value.toFixed(2)}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          Jaaromzet per week (excl. BTW)
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500">Jaar totaal</p>
            <p className="text-sm font-bold text-slate-900">€ {totalYear.toFixed(2)}</p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weekData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 9 }}
              interval={3}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            {avgWeek > 0 && (
              <ReferenceLine
                y={avgWeek}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Gem. €${avgWeek.toFixed(0)}`, position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
              />
            )}
            <Bar dataKey="omzet" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}