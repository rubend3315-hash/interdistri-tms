import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

export default function MobileMessagesTab({ myMessages, markMessageRead }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Berichten & Notificaties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myMessages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Geen berichten</p>
          ) : (
            <div className="space-y-2">
              {myMessages.slice(0, 20).map(message => {
                const messageDate = message.created_date ? new Date(message.created_date) : new Date();
                return (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border ${message.is_read ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}
                    onClick={() => { if (!message.is_read) markMessageRead(message.id); }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {!message.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                        <p className="font-semibold text-slate-900 text-sm">{message.subject || 'Bericht'}</p>
                      </div>
                      {message.priority === 'Urgent' && <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>}
                      {message.priority === 'Hoog' && <Badge className="bg-amber-100 text-amber-700 text-xs">Hoog</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-slate-400">{format(messageDate, "d MMM yyyy, HH:mm", { locale: nl })}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}