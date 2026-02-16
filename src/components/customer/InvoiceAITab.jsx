import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import InvoiceAIAnalysis from "./InvoiceAIAnalysis";

export default function InvoiceAITab({ customerId }) {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['spotta-invoices-ai', customerId],
    queryFn: () => base44.entities.SpottaInvoice.filter({ customer_id: customerId }, '-created_date'),
    enabled: !!customerId,
  });

  const { data: allLines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['spotta-lines-ai', customerId],
    queryFn: () => base44.entities.SpottaInvoiceLine.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  if (loadingInvoices || loadingLines) {
    return <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>;
  }

  return <InvoiceAIAnalysis invoices={invoices} allLines={allLines} />;
}