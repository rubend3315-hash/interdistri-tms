import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const DOT_COLORS = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  blue: "bg-blue-400",
};

const TEXT_COLORS = {
  red: "text-red-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
};

export default function NotificationsCard({ items = [] }) {
  if (items.length === 0) {
    return (
      <Card className="shadow-sm h-full">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            Meldingen
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-slate-400 text-center py-6">Geen meldingen</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-400" />
          Meldingen
          <span className="text-[10px] font-normal text-slate-400 ml-auto">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="max-h-[220px] overflow-y-auto space-y-0.5">
          {items.map((item, idx) => (
            <Link
              key={idx}
              to={createPageUrl(item.link)}
              className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLORS[item.severity] || DOT_COLORS.amber}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${TEXT_COLORS[item.severity] || 'text-slate-700'}`}>
                  {item.type} — {item.name}
                </p>
                {item.daysUntil !== null && item.expiry && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Verloopt over {item.daysUntil} dgn · {format(new Date(item.expiry), "d MMM", { locale: nl })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}