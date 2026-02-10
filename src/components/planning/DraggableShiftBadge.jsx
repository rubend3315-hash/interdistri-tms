import React from "react";
import { Badge } from "@/components/ui/badge";

export default function DraggableShiftBadge({ shift, employeeId, dayKey, dayIndex, className, children }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "shift",
      employeeId,
      dayKey,
      dayIndex,
      shiftValue: shift
    }));
    e.dataTransfer.effectAllowed = "copyMove";
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-grab active:cursor-grabbing ${className || ''}`}
    >
      {children}
    </div>
  );
}