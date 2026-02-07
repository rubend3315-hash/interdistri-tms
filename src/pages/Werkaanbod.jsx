import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, MapPin, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { getISOWeek, getYear, startOfYear, format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addYears, subYears } from "date-fns";
import { nl } from "date-fns/locale";
import DailyTrendChart from "@/components/werkaanbod/DailyTrendChart";
import WeeklyTrendChart from "@/components/werkaanbod/WeeklyTrendChart";
import YearComparisonChart from "@/components/werkaanbod/YearComparisonChart";

export default function Werkaanbod() {
  const currentYear = getYear(new Date());
  const [selectedYears, setSelectedYears] = useState([currentYear, currentYear - 1]);
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(new Date()));
  const [tab, setTab] = useState("daily");

  // Fetch ALL import results (paginated)
  const { data: allImports = [], isLoading } = useQuery({
    queryKey: ['werkaanbod-imports'],
    queryFn: async () => {
      let all = [];
      let skip = 0;
      const limit = 500;
      while (true) {
        const batch = await base44.entities.PostNLImportResult.list('-created_date', limit, skip);
        all = all.concat(batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      return all;
    }
  });

  // Parse all dates and extract stops/stuks
  const parsedData = useMemo(() => {
    return allImports.map(r => {
      const data = r.data || {};
      const rawDate = r.datum || data.Datum;
      if (!rawDate) return null;

      // Parse dd-MM-yyyy or yyyy-MM-dd
      let dateObj;
      if (rawDate.includes('-') && rawDate.length === 10) {
        const parts = rawDate.split('-');
        if (parts[0].length === 4) {
          dateObj = parseISO(rawDate);
        } else {
          dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
      if (!dateObj || isNaN(dateObj.getTime())) return null;

      return {
        date: dateObj,
        dateStr: format(dateObj, 'yyyy-MM-dd'),
        year: getYear(dateObj),
        week: getISOWeek(dateObj),
        dayOfWeek: dateObj.getDay(),
        month: dateObj.getMonth(),
        stops: Number(data['Aantal tijdens route - stops']) || 0,
        stuks: Number(data['Aantal tijdens route - stuks']) || 0,
        ritnaam: r.ritnaam || data.Ritnaam || '',
      };
    }).filter(Boolean);
  }, [allImports]);

  // Available years
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

  // Week navigation
  const maxWeek = 53;
  const prevWeek = () => setSelectedWeek(w => w > 1 ? w - 1 : maxWeek);
  const nextWeek = () => setSelectedWeek(w => w < maxWeek ? w + 1 : 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Werkaanbod</h1>
          <p className="text-slate-500 mt-1">Trends in stops en stuks uit PostNL importdata</p>
        </div>
      </div>

      {/* Year selection */}
      <Card>
        <CardContent className="py-4">
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
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="daily">Dagtrend</TabsTrigger>
            <TabsTrigger value="weekly">Weektrend</TabsTrigger>
            <TabsTrigger value="yearly">Jaarvergelijking</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Stops per dag — Week {selectedWeek}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium w-16 text-center">Week {selectedWeek}</span>
                    <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DailyTrendChart data={parsedData} selectedYears={selectedYears} selectedWeek={selectedWeek} metric="stops" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Stuks per dag — Week {selectedWeek}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DailyTrendChart data={parsedData} selectedYears={selectedYears} selectedWeek={selectedWeek} metric="stuks" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Totaal stops per week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeeklyTrendChart data={parsedData} selectedYears={selectedYears} metric="stops" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Totaal stuks per week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WeeklyTrendChart data={parsedData} selectedYears={selectedYears} metric="stuks" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Jaarvergelijking stops per maand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YearComparisonChart data={parsedData} selectedYears={selectedYears} metric="stops" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Jaarvergelijking stuks per maand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YearComparisonChart data={parsedData} selectedYears={selectedYears} metric="stuks" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}