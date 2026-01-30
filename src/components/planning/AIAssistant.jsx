import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Route, AlertTriangle, Eraser } from "lucide-react";

export default function AIAssistant() {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="font-medium text-sm text-slate-900">AI Planning Assistent</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 justify-start gap-2 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Optimaliseer Planning
          </Button>
          <Button size="sm" variant="outline" className="justify-start gap-2 text-sm">
            <Route className="w-3.5 h-3.5" />
            Optimaliseer Routes
          </Button>
          <Button size="sm" variant="outline" className="justify-start gap-2 text-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            Detecteer Conflicten
          </Button>
          <Button size="sm" variant="outline" className="justify-start gap-2 text-sm">
            <Eraser className="w-3.5 h-3.5" />
            Wissen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}