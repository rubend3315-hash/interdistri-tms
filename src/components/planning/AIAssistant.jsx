import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Route, AlertTriangle, Eraser } from "lucide-react";

export default function AIAssistant() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-900">AI Planning Assistent</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button className="bg-purple-600 hover:bg-purple-700 justify-start gap-2">
            <Sparkles className="w-4 h-4" />
            Optimaliseer Planning
          </Button>
          <Button variant="outline" className="justify-start gap-2">
            <Route className="w-4 h-4" />
            Optimaliseer Routes
          </Button>
          <Button variant="outline" className="justify-start gap-2">
            <AlertTriangle className="w-4 h-4" />
            Detecteer Conflicten
          </Button>
          <Button variant="outline" className="justify-start gap-2">
            <Eraser className="w-4 h-4" />
            Wissen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}