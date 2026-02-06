import React from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, getWeek, addMonths, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function WeekCalendar({ currentDate, onDateChange }) {
  const [viewMonth, setViewMonth] = React.useState(currentDate);

  React.useEffect(() => {
    setViewMonth(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekRows = [];
  for (let i = 0; i < calDays.length; i += 7) {
    weekRows.push(calDays.slice(i, i + 7));
  }

  const selectedWeek = getWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="bg-white border rounded-xl p-3">
      <h3 className="font-semibold text-slate-900 mb-2">Kalender</h3>
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">{format(viewMonth, "MMMM yyyy", { locale: nl })}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center text-xs">
        {["ma", "di", "wo", "do", "vr", "za", "zo"].map(d => (
          <div key={d} className="py-1 font-medium text-slate-500">{d}</div>
        ))}
        {calDays.map((day, i) => {
          const inMonth = isSameMonth(day, viewMonth);
          const today = isToday(day);
          const inSelectedWeek = getWeek(day, { weekStartsOn: 1 }) === selectedWeek && day.getFullYear() === currentDate.getFullYear();
          return (
            <button
              key={i}
              onClick={() => onDateChange(day)}
              className={`py-1 text-xs rounded transition-colors
                ${!inMonth ? 'text-slate-300' : 'text-slate-700'}
                ${inSelectedWeek ? 'bg-blue-100 text-blue-800 font-semibold' : ''}
                ${today ? 'bg-blue-600 text-white font-bold' : ''}
                hover:bg-blue-50
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="mt-2">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onDateChange(new Date())}>
          Vandaag
        </Button>
      </div>
    </div>
  );
}