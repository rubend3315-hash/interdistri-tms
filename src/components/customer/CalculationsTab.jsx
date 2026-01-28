import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

const periodTypes = ["Dag", "Week", "Periode"];

export default function CalculationsTab({ customerId }) {
  const [periodType, setPeriodType] = useState("Week");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCalculate = () => {
    // Berekeningen worden hier later geprogrammeerd
    console.log("Berekenen voor:", { periodType, selectedDate, startDate, endDate });
  };

  return (
    <div className="space-y-4">
      {/* Periode Selectie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecteer periode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type periode</Label>
            <Select value={periodType || ""} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer periode type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dag">Dag</SelectItem>
                <SelectItem value="Week">Week</SelectItem>
                <SelectItem value="Periode">Periode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "Dag" && (
            <div className="space-y-2">
              <Label>Datum</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {periodType === "Week" && (
            <div className="space-y-2">
              <Label>Week startdatum</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {periodType === "Periode" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Van</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tot</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCalculate}
            className="bg-blue-600 hover:bg-blue-700 w-full"
          >
            Berekeningen uitvoeren
          </Button>
        </CardContent>
      </Card>

      {/* Placeholder voor resultaten */}
      <Card className="p-12 text-center">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Berekeningen</h3>
        <p className="text-slate-500 mt-1">Selecteer een periode en klik 'Berekeningen uitvoeren' om de gegevens te laden.</p>
      </Card>
    </div>
  );
}