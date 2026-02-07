import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { FileText, Download, Pencil, Trash2, User, Car, AlertTriangle } from "lucide-react";

function getExpiryBadge(expiryDate) {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return <Badge className="bg-red-100 text-red-700">Verlopen</Badge>;
  if (days <= 14) return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{days}d</Badge>;
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700">{days} dagen</Badge>;
  if (days <= 90) return <Badge className="bg-blue-100 text-blue-700">{days} dagen</Badge>;
  return <Badge className="bg-green-100 text-green-700">Geldig</Badge>;
}

export default function DocumentTable({ documents, onEdit, onDelete }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Geen documenten gevonden</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Document</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Gekoppeld aan</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Vervaldatum</th>
            <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
            <th className="text-right py-3 px-4 font-medium text-slate-600">Acties</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id} className="border-b hover:bg-slate-50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{doc.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant="outline">{doc.document_type}</Badge>
              </td>
              <td className="py-3 px-4">
                {doc.linked_entity_name ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    {doc.linked_employee_id ? <User className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                    {doc.linked_entity_name}
                  </div>
                ) : <span className="text-slate-400">-</span>}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {doc.expiry_date ? (
                    <>
                      <span className="text-slate-600">{format(new Date(doc.expiry_date), "d MMM yyyy", { locale: nl })}</span>
                      {getExpiryBadge(doc.expiry_date)}
                    </>
                  ) : <span className="text-slate-400">-</span>}
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge className={
                  doc.status === 'Actief' ? 'bg-green-100 text-green-700' :
                  doc.status === 'Verlopen' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }>{doc.status}</Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(doc)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => onDelete(doc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}