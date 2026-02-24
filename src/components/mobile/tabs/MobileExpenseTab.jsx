import React, { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, Camera, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MobileExpenseTab({ expenseData, setExpenseData, currentEmployee }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Declaratie ingediend');
    }
  });

  return (
    <div className="-mx-4 flex flex-col min-h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Declaratie indienen
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] text-slate-500">Datum</Label>
            <Input type="date" className="h-[44px] bg-white" value={expenseData.date} onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Categorie</Label>
            <Select value={expenseData.category} onValueChange={(v) => setExpenseData({ ...expenseData, category: v })}>
              <SelectTrigger className="h-[44px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Brandstof", "Parkeren", "Tol", "Maaltijd", "Verblijf", "Materiaal", "Overig"].map(c =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-slate-500">Omschrijving</Label>
          <Input className="h-[44px] bg-white" value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} placeholder="Korte omschrijving..." />
        </div>

        <div>
          <Label className="text-[11px] text-slate-500">Bedrag (€) *</Label>
          <Input type="number" step="0.01" className="h-[44px] bg-white" value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} placeholder="0.00" />
        </div>

        <div>
          <Label className="text-[11px] text-slate-500 mb-1.5 block">Bon / Factuur</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[12px] font-medium flex items-center justify-center gap-1.5 active:bg-slate-100"
          >
            <Upload className="w-4 h-4" />
            {expenseData.receipt_file ? expenseData.receipt_file.name : 'Foto uploaden'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setExpenseData({ ...expenseData, receipt_file: file });
            e.target.value = '';
          }} />
          {expenseData.receipt_file && (
            <p className="text-[11px] text-emerald-600 mt-1">✓ {expenseData.receipt_file.name}</p>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-1 px-4 border-t border-slate-100">
        <button
          type="button"
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
          className={`w-full h-[48px] rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${
            expenseData.amount && !createExpenseMutation.isPending
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-slate-200 text-slate-400'
          }`}
        >
          <Send className="w-4 h-4" />
          {createExpenseMutation.isPending ? 'Bezig...' : 'Declaratie indienen'}
        </button>
      </div>
    </div>
  );
}