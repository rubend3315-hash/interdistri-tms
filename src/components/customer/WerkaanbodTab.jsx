import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, MapPin, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { getISOWeek, getYear, parseISO, format } from "date-fns";
import DailyTrendChart from "@/components/werkaanbod/DailyTrendChart";
import WeeklyTrendChart from "@/components/werkaanbod/WeeklyTrendChart";
import YearComparisonChart from "@/components/werkaanbod/YearComparisonChart";
import YearChangeIndicator from "@/components/werkaanbod/YearChangeIndicator";

function parseDatum(datumStr) {
  if (!datumStr) return null;
  const parts = String(datumStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return parseISO(datumStr);
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function WerkaanbodTab({ importResults = [] }) {
  const currentYear = getYear(new Date());
  const [selectedYears, setSelectedYears] = useState([currentYear, currentYear - 1]);
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(new Date()));
  const [subTab, setSubTab] = useState("daily");

  // Parse all import data into chart-ready format
  const parsedData = useMemo(() => {
    return importResults.map(item => {
      if (!item?.data) return null;
      const innerData = item.data.data || item.data;
      if (!innerData) return null;

      const rawDate = innerData['Datum'];
      const dateObj = parseDatum(rawDate);
      if (!dateObj) return null;

      return {
        date: dateObj,
        dateStr: format(dateObj, 'yyyy-MM-dd'),
        year: getYear(dateObj),
        week: getISOWeek(dateObj),
        dayOfWeek: dateObj.getDay(),
        month: dateObj.getMonth(),
        stops: Number(innerData['Aantal tijdens route - stops']) || 0,
        stuks: Number(innerData['Aantal tijdens route - stuks']) || 0,
        ritnaam: item.ritnaam || innerData['Ritnaam'] || '',
      };
    }).filter(Boolean);
  }, [importResults]);

  // Available years from data
  const availableYears = useMemo(() => {
    const years = [...new Set(parsedData.map(d => d.year))].sort((a, b) => b - a);
    return years.length > 0 ? years : [currentYear];
  }, [parsedData, currentYear]);

  const addYear = () => {
    const minYear = Math.min(...selectedYears);
    const prevYear = minYear - 1;
    if (availableYears.includes(prevYear) && !selectedYears.includes(prevYear)) {
      setSelectedYears(prev => [...prev, prevYear].sort((a, b) => b - a));
    }
  };

  const removeYear = (year) => {
    if (selectedYears.length <= 1) return;
    setSelectedYears(prev => prev.filter(y => y !== year));
  };

  const prevWeek = () => setSelectedWeek(w => w > 1 ? w - 1 : 53);
  const nextWeek = () => setSelectedWeek(w => w < 53 ? w + 1 : 1);

  if (parsedData.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Geen importdata beschikbaar voor werkaanbod trends.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Year selection */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-600">Jaren vergelijken:</span>
        {selectedYears.map(year => (
          <Badge key={year} variant="outline" className="text-sm px-3 py-1 gap-1">
            {year}
            {selectedYears.length > 1 && (
              <button onClick={() => removeYear(year)} className="ml-1 hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        <Button variant="outline" size="sm" onClick={addYear} className="gap-1">
          <Plus className="w-3 h-3" /> Jaar toevoegen
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="daily">Dagtrend</TabsTrigger>
          <TabsTrigger value="weekly">Weektrend</TabsTrigger>
          <TabsTrigger value="yearly">Jaarvergelijking</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Stops per dag — Heel jaar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stops" />
              <DailyTrendChart data={parsedData} selectedYears={selectedYears} metric="stops" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Stuks per dag — Heel jaar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stuks" />
              <DailyTrendChart data={parsedData} selectedYears={selectedYears} metric="stuks" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Totaal stops per week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stops" />
              <WeeklyTrendChart data={parsedData} selectedYears={selectedYears} metric="stops" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Totaal stuks per week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stuks" />
              <WeeklyTrendChart data={parsedData} selectedYears={selectedYears} metric="stuks" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Jaarvergelijking stops per maand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stops" />
              <YearComparisonChart data={parsedData} selectedYears={selectedYears} metric="stops" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Jaarvergelijking stuks per maand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearChangeIndicator data={parsedData} selectedYears={selectedYears} metric="stuks" />
              <YearComparisonChart data={parsedData} selectedYears={selectedYears} metric="stuks" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}