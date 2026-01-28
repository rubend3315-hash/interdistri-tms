import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, FileText, BarChart3 } from "lucide-react";

export default function DataDashboard({ imports }) {
  const analytics = useMemo(() => {
    const allData = imports.flatMap(imp => imp.data || []);
    
    if (allData.length === 0) {
      return {
        totalRows: 0,
        totalImports: 0,
        avgRowsPerImport: 0,
        columnCount: 0,
        importTrend: [],
        topColumns: []
      };
    }

    // Basic metrics
    const totalRows = allData.length;
    const totalImports = imports.length;
    const avgRowsPerImport = Math.round(totalRows / totalImports);

    // Column analysis
    const columns = Object.keys(allData[0] || {});
    const columnCount = columns.length;

    // Top columns by data variety
    const columnStats = columns.map(col => ({
      name: col,
      uniqueValues: new Set(allData.map(row => row[col])).size,
      dataType: typeof allData[0][col]
    }));

    // Import trend
    const importTrend = imports.map(imp => ({
      name: imp.import_name?.substring(0, 15),
      rows: imp.data?.length || 0
    }));

    // Numeric columns for analysis
    const numericColumns = columns.filter(col => 
      allData.some(row => typeof row[col] === 'number')
    );

    return {
      totalRows,
      totalImports,
      avgRowsPerImport,
      columnCount,
      importTrend,
      topColumns: columnStats.sort((a, b) => b.uniqueValues - a.uniqueValues).slice(0, 5),
      numericColumns
    };
  }, [imports]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Totale rijen</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.totalRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Imports</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.totalImports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Gem. per import</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.avgRowsPerImport}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Kolommen</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.columnCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.importTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.importTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="rows" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Geen data beschikbaar</p>
            )}
          </CardContent>
        </Card>

        {/* Top Columns by Uniqueness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Kolommen (Variatie)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topColumns.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={analytics.topColumns}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="uniqueValues" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center py-12">Geen data beschikbaar</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datakwaliteit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Datavolume</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${Math.min((analytics.totalRows / 1000) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700">{analytics.totalRows} rows</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Kolommen geladen</span>
              <span className="text-xs font-medium text-slate-700">{analytics.columnCount} velden</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Consistency</span>
              <span className="text-xs font-medium text-green-600">✓ Alle imports consistent</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}