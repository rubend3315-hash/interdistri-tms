import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Trash2, Eye, Search } from "lucide-react";
import { format } from "date-fns";

export default function ImportHistory({ imports, onView, onDelete }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredImports = imports.filter(imp =>
    imp.import_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    imp.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Concept":
        return "bg-slate-100 text-slate-800";
      case "Verwerkt":
        return "bg-emerald-100 text-emerald-800";
      case "Gearchiveerd":
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (imports.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Geen importgeschiedenis</h3>
        <p className="text-slate-500 mt-1">Er zijn nog geen imports voor deze klant.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Zoeken in import naam of bestandsnaam..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Imports List */}
      <div className="space-y-2">
        {filteredImports.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-500">Geen imports gevonden</p>
          </Card>
        ) : (
          filteredImports.map(imp => (
            <Card key={imp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{imp.import_name}</h4>
                        <p className="text-sm text-slate-500 truncate">{imp.file_name}</p>
                      </div>
                      <Badge className={getStatusColor(imp.status)}>
                        {imp.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Rijen</p>
                        <p className="font-medium text-slate-900">{imp.total_rows}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Datum</p>
                        <p className="font-medium text-slate-900 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(imp.import_date), 'dd-MM-yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tijd</p>
                        <p className="font-medium text-slate-900">
                          {format(new Date(imp.import_date), 'HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Kolommen</p>
                        <p className="font-medium text-slate-900">
                          {imp.data && imp.data.length > 0 ? Object.keys(imp.data[0]).length : 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(imp)}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Bekijken</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(imp.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}