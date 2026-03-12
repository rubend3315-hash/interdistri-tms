import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, User, ExternalLink } from "lucide-react";

export default function MobileLinksTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Snelle links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a href="https://mijn.bumper.nl" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium">Schade melden - Bumper</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a href="https://mijn.loket.nl" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Mijnloket</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}