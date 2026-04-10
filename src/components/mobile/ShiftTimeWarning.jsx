import React from 'react';
import { cn } from '@/lib/utils';
import { TriangleAlert } from 'lucide-react';

/**
 * Presentational warning component for shift-time deviations.
 * "Dumb" component — receives all data via props, no internal logic.
 */
export default function ShiftTimeWarning({
  enteredStartTime,
  shiftStartTime,
  diff,
  isWarning,
  messageFormatter
}) {
  if (!isWarning) return null;

  const minutenWoord = diff === 1 ? 'minuut' : 'minuten';

  const message = messageFormatter
    ? messageFormatter(diff, enteredStartTime, shiftStartTime)
    : `Ingevoerde tijd (${enteredStartTime}) wijkt ${diff} ${minutenWoord} af van de geplande diensttijd (${shiftStartTime}).`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-orange-100 border border-orange-300 text-orange-800 text-[11px] mt-2"
      )}
    >
      <TriangleAlert className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}