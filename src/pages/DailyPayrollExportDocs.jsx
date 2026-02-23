import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, BookOpen } from "lucide-react";
import PayrollDocTechnical from "../components/docs/PayrollDocTechnical";
import PayrollDocUserManual from "../components/docs/PayrollDocUserManual";

export default function DailyPayrollExportDocs() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Tabs defaultValue="user-manual">
        <TabsList className="mb-6">
          <TabsTrigger value="user-manual" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Gebruikershandleiding
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2">
            <FileText className="w-4 h-4" />
            Technische Documentatie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-manual">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <PayrollDocUserManual />
          </div>
        </TabsContent>

        <TabsContent value="technical">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <PayrollDocTechnical />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}