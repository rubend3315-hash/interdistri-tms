import React, { useState } from "react";

export default function DroppableCell({ employeeId, dayKey, dayIndex, onDrop, onClick, children, className }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set false if we're actually leaving the cell (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.type === "shift") {
        onDrop({
          sourceEmployeeId: data.employeeId,
          sourceDayKey: data.dayKey,
          sourceDayIndex: data.dayIndex,
          shiftValue: data.shiftValue,
          targetEmployeeId: employeeId,
          targetDayKey: dayKey,
          targetDayIndex: dayIndex
        });
      } else if (data.type === "resource") {
        onDrop({
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          resourceLabel: data.resourceLabel,
          targetEmployeeId: employeeId,
          targetDayKey: dayKey,
          targetDayIndex: dayIndex
        });
      }
    } catch (err) {
      // invalid drop data
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      className={`
        ${className || ''}
        transition-all duration-150
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50 scale-[1.02]' : ''}
      `}
    >
      {children}
    </div>
  );
}