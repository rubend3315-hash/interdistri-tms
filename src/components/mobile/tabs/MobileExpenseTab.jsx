import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function MobileExpenseTab({ expenseData, setExpenseData, currentEmployee }) {
  const queryClient = useQueryClient();

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] })
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Declaratie indienen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={expenseData.date} onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categorie</Label>
              <Select value={expenseData.category} onValueChange={(v) => setExpenseData({ ...expenseData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Brandstof", "Parkeren", "Tol", "Maaltijd", "Verblijf", "Materiaal", "Overig"].map(c =>
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Omschrijving</Label>
            <Input value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} placeholder="Korte omschrijving..." />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Bedrag (€)</Label>
            <Input type="number" step="0.01" value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} placeholder="0.00" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Bon / Factuur (optioneel)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setExpenseData({ ...expenseData, receipt_file: file });
              }} className="text-xs" />
              {expenseData.receipt_file && <Camera className="w-5 h-5 text-emerald-600" />}
            </div>
            {expenseData.receipt_file && <p className="text-xs text-emerald-600">✓ {expenseData.receipt_file.name}</p>}
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={async () => {
              let receiptUrl = "";
              if (expenseData.receipt_file) {
                const uploadResult = await base44.integrations.Core.UploadFile({ file: expenseData.receipt_file });
                receiptUrl = uploadResult.file_url;
              }
              createExpenseMutation.mutate({
                employee_id: currentEmployee?.id,
                date: expenseData.date,
                category: expenseData.category,
                description: expenseData.description,
                amount: Number(expenseData.amount) || 0,
                receipt_url: receiptUrl,
                status: "Ingediend"
              });
            }}
            disabled={!expenseData.amount || createExpenseMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {createExpenseMutation.isPending ? 'Bezig...' : 'Declaratie indienen'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}