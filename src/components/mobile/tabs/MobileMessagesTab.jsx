import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

export default function MobileMessagesTab({ myMessages, markMessageRead }) {
  return (
    <div className="-mx-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Berichten
        </h2>
      </div>

      {myMessages.length === 0 ? (
        <p className="text-[13px] text-slate-500 text-center py-10">Geen berichten</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {myMessages.slice(0, 20).map(message => {
            const messageDate = message.created_date ? new Date(message.created_date) : new Date();
            return (
              <div
                key={message.id}
                className={`px-4 py-3 bg-white ${!message.is_read ? 'bg-blue-50/50' : ''}`}
                onClick={() => { if (!message.is_read) markMessageRead(message.id); }}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {!message.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                    <p className="text-[13px] font-semibold text-slate-900">{message.subject || 'Bericht'}</p>
                  </div>
                  {message.priority === 'Urgent' && <Badge className="bg-red-50 text-red-700 text-[10px]">Urgent</Badge>}
                  {message.priority === 'Hoog' && <Badge className="bg-amber-50 text-amber-700 text-[10px]">Hoog</Badge>}
                </div>
                <p className="text-[12px] text-slate-600 whitespace-pre-wrap line-clamp-3">{message.content}</p>
                <p className="text-[10px] text-slate-400 mt-1">{format(messageDate, "d MMM yyyy, HH:mm", { locale: nl })}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}