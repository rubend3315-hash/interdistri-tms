import React from "react";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDenied() {
  return (
    <div className="max-w-lg mx-auto p-6 mt-20">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center space-y-3">
          <Shield className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="text-xl font-bold text-red-900">Geen toegang</h2>
          <p className="text-red-700">
            Je hebt geen rechten om deze pagina te bekijken.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}